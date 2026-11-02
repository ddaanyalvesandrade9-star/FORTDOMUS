# Fort Domus

Site estático da Fort Domus, construído com HTML, CSS e JavaScript nativos e
publicado pela Vercel. O projeto não requer framework, pacote npm nem etapa de
compilação.

## Pré-visualização

Sirva a pasta raiz por HTTP usando uma extensão de servidor estático do VS Code
ou o fluxo de pré-visualização da Vercel. O uso de `file://` pode impedir a
reprodução do vídeo do hero e não equivale ao ambiente de produção.

## Conteúdo principal

- `index.html`: página inicial.
- `produto-organizador.html`, `produtos.html`, `duvidas.html`, `sobre-nos.html`:
  páginas de produto e institucionais.
- `politica-*.html` e `termos-de-uso.html`: páginas legais.
- `confirmar-whatsapp.html`: confirmação explícita de autorização promocional.
- `assets/`: estilos, scripts e mídia do site.
- `supabase/`: migração e código-fonte das Edge Functions; não faz parte do
  conteúdo estático publicado.

As URLs amigáveis e os cabeçalhos HTTP da Vercel estão em `vercel.json`.
Detalhes do mapeamento e da escolha de manter as páginas no diretório raiz estão
em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Publicação

O diretório raiz continua sendo a raiz estática de publicação. Os arquivos
internos são excluídos pelo `.vercelignore`. Consulte
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) antes de publicar mudanças no Supabase.

## Segurança

A chave publicável Supabase no navegador é pública por definição. Nunca coloque
`service_role`, `sb_secret_`, tokens Twilio ou segredos Turnstile nos arquivos
HTML/JS. Consulte [docs/SECURITY.md](docs/SECURITY.md) e
[supabase/LEADS_SETUP.md](supabase/LEADS_SETUP.md).
