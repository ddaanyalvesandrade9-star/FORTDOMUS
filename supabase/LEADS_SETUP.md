# Ativação segura do formulário de leads

## Efeito da migração SQL

Execute `migrations/20261101210000_leads_security.sql` no SQL Editor do projeto
Supabase antes de publicar as funções.
Ela **não apaga linhas** de `public.leads`. Ela revoga as permissões REST de
`PUBLIC`, `anon` e `authenticated`, remove a policy antiga `leads_public_insert`,
e adiciona uma policy restritiva que nega acesso público. Isso interrompe
imediatamente inserções diretas e consultas públicas à tabela. A função de
servidor continua podendo operar com a credencial privilegiada guardada em
secrets.

Registros já existentes permanecem na tabela e recebem o estado
`pending_confirmation`; eles não passam a ser contatos autorizados. A migração
define `autorizacao_contato = false` e `data_autorizacao = NULL` para esses
registros legados, preservando a data histórica anterior em
`consentimento_solicitado_em`. **Impacto:** consentimentos antigos sem versão do
texto e confirmação do número deixam de habilitar mensagens; o titular precisa
confirmar novamente. Isso altera os registros, mas não apaga leads. A migração
adiciona o registro versionado da autorização, confirmação do WhatsApp e uma
tabela privada para rate limiting. Revise esse efeito antes de aplicar o SQL no
projeto Supabase correto.

## Serviços e configuração necessários

1. Crie uma chave de site Cloudflare Turnstile para os domínios publicados e
   coloque a chave pública em `turnstileSiteKey` em
   `assets/supabase-config.js`. Mantenha a chave secreta apenas nos secrets da
   Edge Function.
2. Configure uma conta/provedor Twilio WhatsApp e um template de mensagem
   aprovado que inclua uma única variável `{{1}}` com o link de confirmação.
   Configure o identificador `HX...` desse template.
3. Configure os secrets abaixo no projeto Supabase. Use um segredo aleatório
   com pelo menos 32 caracteres para `RATE_LIMIT_HMAC_SECRET`.

```text
TURNSTILE_SECRET_KEY
RATE_LIMIT_HMAC_SECRET
ALLOWED_ORIGINS=https://seu-dominio-publicado
SITE_PUBLIC_URL=https://seu-dominio-publicado
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_WHATSAPP_FROM=whatsapp:+...
TWILIO_CONFIRMATION_TEMPLATE_SID=HX...
```

`SUPABASE_URL` é fornecido pelo ambiente das Edge Functions. A chave
`SUPABASE_SERVICE_ROLE_KEY` é fornecida pelo ambiente Supabase; confirme que
está disponível para as funções. Se o ambiente exigir configuração manual,
guarde-a somente como secret da função. Nunca coloque essa chave, o segredo
Turnstile, o HMAC ou o token Twilio em HTML, JavaScript público, Git ou Vercel
como variável exposta ao navegador. A chave `publishable` em
`assets/supabase-config.js` é pública e depende das permissões/RLS restritas.
O rate limiter precisa receber `cf-connecting-ip` ou `x-real-ip` confiável do
gateway; sem esse cabeçalho, o endpoint falha fechado.

Exemplo de publicação pelo Supabase CLI (preencha somente em seu terminal e
nunca compartilhe os valores secretos):

```powershell
supabase link --project-ref dcgjpknwhociepmakuyz
supabase secrets set --project-ref dcgjpknwhociepmakuyz `
  TURNSTILE_SECRET_KEY="<segredo-turnstile>" `
  RATE_LIMIT_HMAC_SECRET="<segredo-aleatorio-com-32-caracteres-ou-mais>" `
  ALLOWED_ORIGINS="https://seu-dominio-publicado" `
  SITE_PUBLIC_URL="https://seu-dominio-publicado" `
  TWILIO_ACCOUNT_SID="<sid>" `
  TWILIO_AUTH_TOKEN="<token-twilio>" `
  TWILIO_WHATSAPP_FROM="whatsapp:+<numero-aprovado>" `
  TWILIO_CONFIRMATION_TEMPLATE_SID="HX<template-aprovado>"
supabase functions deploy submit-lead --project-ref dcgjpknwhociepmakuyz
supabase functions deploy confirm-lead --project-ref dcgjpknwhociepmakuyz
```

Configure `turnstileSiteKey` em `assets/supabase-config.js` com a chave pública
do mesmo site Turnstile. O `SITE_PUBLIC_URL` precisa coincidir exatamente com
uma origem de `ALLOWED_ORIGINS`, sem barra ou caminho ao final.

4. Publique `submit-lead` e `confirm-lead`. `supabase/config.toml` desativa a
   verificação JWT do gateway para essas duas rotas públicas; a proteção é
   feita pela allowlist de origem, CAPTCHA verificado no servidor, rate limit e
   fluxo de confirmação do WhatsApp.
5. Publique o site somente depois que SQL, secrets e ambas as funções estiverem
   configurados. Sem CAPTCHA ou confirmação Twilio, o formulário falha de forma
   fechada e não mostra sucesso.

## Fluxo e dados registrados

O navegador envia nome, telefone, a declaração de autorização, sua versão e o
token Turnstile. A função verifica os dados e o CAPTCHA, aplica limites de cinco
solicitações por hora por IP e por telefone, e registra o instante da
solicitação, finalidade, versão e cópia exata do texto exibido. Em seguida,
envia um link para `confirmar-whatsapp.html` por Twilio WhatsApp. O token
aleatório tem validade de 30 minutos; só seu hash é salvo. Abrir o link apenas
exibe a página; um botão de confirmação explícito grava `data_autorizacao`, ativa a autorização e
altera o estado, evitando que pré-visualizações automáticas do WhatsApp
confirmem o cadastro. Cadastros pendentes não habilitam mensagens promocionais.

A resposta da função não inclui os dados do lead. A rota de confirmação retorna
somente um status genérico, nunca nome ou telefone.

## Verificações pós-implantação

Execute os testes no projeto de homologação primeiro:

- `POST /rest/v1/leads` com a chave pública: deve ser negado.
- `GET /rest/v1/leads?select=id&limit=0` com a chave pública: deve ser negado.
- `POST /functions/v1/submit-lead` com token CAPTCHA inválido: deve ser negado,
  sem linha nova.
- CAPTCHA válido e cadastro válido: a função retorna `202` sem dados pessoais;
  confira no painel restrito o registro `pending_confirmation`, a data, a
  finalidade, a versão e o texto de consentimento.
- Abra o link recebido pelo WhatsApp: a abertura sozinha não deve alterar o
  cadastro. Após tocar em “Confirmar autorização”, o estado deve mudar para
  `confirmed` e gravar `whatsapp_confirmado_em`; o mesmo link não pode ser
  reutilizado.
- Confirme que nenhuma consulta ou mutação de `public.leads` funciona com a
  chave pública e que respostas públicas não contêm PII.

Os testes que dependem de banco real, CAPTCHA e Twilio não podem ser
considerados concluídos até que a migração e as funções estejam implantadas e
as credenciais dos serviços tenham sido configuradas.
