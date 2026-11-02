# Segurança e proteção de dados

## Arquivos e credenciais

- `.env` e `.env.*` são ignorados pelo Git, exceto o modelo `.env.example`.
- `.env.example` contém somente placeholders. Não é carregado pelo site.
- `.vercelignore` exclui as Edge Functions, SQL, documentação e snapshots do
  deploy estático.
- `assets/supabase-config.js` contém somente a URL do projeto, chave
  `publishable` pública e chave Turnstile pública. Não adicione ali credenciais
  `service_role`, `sb_secret_`, Turnstile secret ou Twilio.
- Segredos de backend devem ser configurados como secrets do projeto Supabase,
  nunca em variáveis Vercel expostas ao navegador.

## Proteção de leads

A migração em `supabase/migrations/` remove a policy antiga de inserção anônima,
revoga permissões REST de `PUBLIC`, `anon` e `authenticated` e define negação
RLS restritiva para a tabela. A credencial da Edge Function recebe apenas
`SELECT`, `INSERT` e `UPDATE` em `public.leads`; a tabela privada de rate limit
não concede acesso direto a essa credencial. A única entrada pública prevista é
`submit-lead`, que verifica origem permitida, campos, versão e texto de
consentimento, CAPTCHA Turnstile no servidor e rate limit persistido. Os leads
permanecem pendentes até o titular confirmar o WhatsApp por uma ação explícita.
`confirm-lead` retorna somente uma mensagem/status, sem nome ou telefone.

Isso descreve o código preparado, não prova que a migração, secrets ou funções
estejam ativos no projeto Supabase. Faça os testes pós-implantação descritos em
`supabase/LEADS_SETUP.md` antes de considerar a proteção efetiva em produção.

## Cabeçalhos web

`vercel.json` aplica CSP e cabeçalhos de defesa em profundidade. Scripts inline
são bloqueados por padrão; somente o hash do inicializador compartilhado da
tag `<base>` é autorizado. Estilos inline permanecem permitidos para preservar
os estilos dinâmicos da interface. O domínio Supabase e Cloudflare Turnstile
estão explicitamente permitidos para as requisições do formulário.

HSTS não foi definido porque a configuração de domínio e subdomínios ainda não
foi verificada. Confirme cabeçalhos reais após a publicação.
