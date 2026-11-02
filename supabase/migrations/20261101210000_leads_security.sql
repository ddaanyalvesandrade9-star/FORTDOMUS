-- Migration segura para submissão de leads exclusivamente via Edge Function.
-- Não apaga registros. Revoga o acesso público direto e invalida qualquer
-- autorização antiga não confirmada pelo titular do WhatsApp. Em registros
-- legados, autorizacao_contato passa a false e data_autorizacao a NULL; a data
-- histórica fica preservada em consentimento_solicitado_em. Isso exige nova
-- confirmação antes de contatos e deve ser revisado antes de aplicar o SQL.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated, service_role;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) between 3 and 120),
  whatsapp text not null check (whatsapp ~ '^(11|12|13|14|15|16|17|18|19|21|22|24|27|28|31|32|33|34|35|37|38|41|42|43|44|45|46|47|48|49|51|53|54|55|61|62|63|64|65|66|67|68|69|71|73|74|75|77|79|81|82|83|84|85|86|87|88|89|91|92|93|94|95|96|97|98|99)([2-5][0-9]{7}|9[0-9]{8})$'),
  autorizacao_contato boolean not null default false,
  data_autorizacao timestamptz,
  origem text not null default 'site_fortdomus' check (origem = 'site_fortdomus'),
  created_at timestamptz not null default now(),
  consentimento_solicitado_em timestamptz not null default now(),
  finalidade_contato text not null default 'legacy-unverified',
  versao_consentimento text not null default 'legacy-unverified',
  texto_consentimento text not null default 'Registro anterior sem comprovação de consentimento versionado.',
  status_whatsapp text not null default 'pending_confirmation',
  whatsapp_confirmado_em timestamptz,
  token_confirmacao_hash text,
  token_confirmacao_expira_em timestamptz
);

alter table public.leads
  add column if not exists finalidade_contato text not null default 'legacy-unverified',
  add column if not exists versao_consentimento text not null default 'legacy-unverified',
  add column if not exists texto_consentimento text not null default 'Registro anterior sem comprovação de consentimento versionado.',
  add column if not exists consentimento_solicitado_em timestamptz,
  add column if not exists status_whatsapp text not null default 'pending_confirmation',
  add column if not exists whatsapp_confirmado_em timestamptz,
  add column if not exists token_confirmacao_hash text,
  add column if not exists token_confirmacao_expira_em timestamptz;

update public.leads
set consentimento_solicitado_em = coalesce(consentimento_solicitado_em, data_autorizacao, created_at)
where consentimento_solicitado_em is null;

alter table public.leads
  alter column consentimento_solicitado_em set default now(),
  alter column consentimento_solicitado_em set not null,
  alter column data_autorizacao drop not null,
  alter column data_autorizacao drop default,
  drop constraint if exists leads_autorizacao_contato_check;

-- Consentimentos legados sem texto versionado/confirmacao sao mantidos,
-- mas deixam de autorizar contato ate uma nova confirmacao do titular.
update public.leads
set autorizacao_contato = false,
    data_autorizacao = null,
    status_whatsapp = 'pending_confirmation'
where versao_consentimento = 'legacy-unverified'
  and status_whatsapp = 'pending_confirmation';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'leads_status_whatsapp_check'
      and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads
      add constraint leads_status_whatsapp_check
      check (status_whatsapp in ('pending_confirmation', 'confirmed', 'delivery_failed', 'revoked'));
  end if;
end
$$;

create index if not exists leads_confirmation_token_hash_idx
  on public.leads (token_confirmacao_hash)
  where token_confirmacao_hash is not null;

alter table public.leads enable row level security;

-- A policy antiga de INSERT é removida, sem apagar linhas da tabela.
drop policy if exists leads_public_insert on public.leads;
drop policy if exists leads_deny_public_access on public.leads;
create policy leads_deny_public_access
  on public.leads
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.leads from public, anon, authenticated;
revoke all on table public.leads from service_role;
grant select, insert, update on table public.leads to service_role;

create table if not exists private.lead_rate_limits (
  bucket_key text primary key check (bucket_key ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0)
);

create index if not exists lead_rate_limits_window_started_at_idx
  on private.lead_rate_limits (window_started_at);

alter table private.lead_rate_limits enable row level security;
revoke all on table private.lead_rate_limits from public, anon, authenticated;
revoke all on table private.lead_rate_limits from service_role;

create or replace function public.consume_lead_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_count integer;
begin
  if p_bucket_key !~ '^[0-9a-f]{64}$'
    or p_limit < 1 or p_limit > 100
    or p_window_seconds < 60 or p_window_seconds > 86400 then
    return false;
  end if;

  delete from private.lead_rate_limits
  where window_started_at < pg_catalog.now() - interval '1 day';

  insert into private.lead_rate_limits as current_bucket (bucket_key, window_started_at, request_count)
  values (p_bucket_key, pg_catalog.now(), 1)
  on conflict (bucket_key) do update
  set window_started_at = case
        when current_bucket.window_started_at
          <= pg_catalog.now() - pg_catalog.make_interval(secs => p_window_seconds)
        then pg_catalog.now()
        else current_bucket.window_started_at
      end,
      request_count = case
        when current_bucket.window_started_at
          <= pg_catalog.now() - pg_catalog.make_interval(secs => p_window_seconds)
        then 1
        else current_bucket.request_count + 1
      end
  returning request_count into v_count;

  return v_count <= p_limit;
end
$$;

revoke all on function public.consume_lead_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_lead_rate_limit(text, integer, integer)
  to service_role;
