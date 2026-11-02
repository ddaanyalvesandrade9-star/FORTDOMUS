# Supabase

Este diretório contém configuração do Supabase CLI, migrations SQL e Edge
Functions. Ele é necessário no workspace para operações do backend, mas é
excluído do deploy estático da Vercel pelo `.vercelignore`.

- `migrations/`: alterações versionadas de schema e permissões.
- `functions/submit-lead/`: valida e recebe solicitações pendentes.
- `functions/confirm-lead/`: efetiva a autorização depois da confirmação
  explícita do telefone.
- `LEADS_SETUP.md`: pré-requisitos, secrets e testes pós-implantação.

Leia o impacto da migration e o roteiro de setup antes de aplicar alterações ao
banco. Não armazene credenciais administrativas nos arquivos deste diretório.
