# Formulário "Novidades Fort Domus" → `leads_novidades`

Substitui o fluxo anterior (`submit-lead`, Twilio e confirmação). As funções e a
tabela antigas não foram removidas nem alteradas.

## Ativar (3 passos)

1. SQL Editor do projeto `dcgjpknwhociepmakuyz`: execute
   `supabase/migrations/20261103120000_leads_novidades.sql` (idempotente; não
   mexe em `public.leads`).
2. Publique a função:
   `supabase functions deploy submit-novidades --project-ref dcgjpknwhociepmakuyz`
   (`verify_jwt = false` já está em `supabase/config.toml`).
3. (Recomendado) `supabase secrets set ALLOWED_ORIGINS="https://seu-dominio"`.

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são fornecidos pelo ambiente das
Edge Functions; a service_role nunca vai ao navegador. O frontend usa só a chave
publishable em `assets/supabase-config.js`.

## Variáveis opcionais

| Onde | Nome | Efeito |
|---|---|---|
| Secret da função | `ALLOWED_ORIGINS` | Lista de origens (vírgula). Vazio = qualquer origem. |
| Secret da função | `TURNSTILE_SECRET_KEY` | Ativa a verificação do CAPTCHA no servidor. |
| `assets/supabase-config.js` | `turnstileSiteKey` | Exibe o CAPTCHA. Deve ser definido junto com o secret. |
| Secret da função | `RATE_LIMIT_HMAC_SECRET` | Segredo (32+ caracteres) para os buckets de rate limit. |

Sem `turnstileSiteKey` o formulário funciona normalmente, protegido por
honeypot, validação no servidor e limite de 10 envios/h por IP e 5/h por número.

## Segurança

- RLS ativado; policy restritiva negando tudo a `anon`/`authenticated`; permissões
  revogadas. Somente a função (service_role) insere.
- Constraints no banco: nome 3–120 caracteres, WhatsApp `55`+DDD+número válido,
  `consentimento = true`, índice único em `whatsapp` (sem duplicados).
- Número já cadastrado: a função responde sucesso (o registro existe).

## Consultar os leads

Table Editor → `leads_novidades`, ou `select * from leads_novidades order by created_at desc;`
