# Publicação e manutenção

## Site estático na Vercel

1. Mantenha a raiz do projeto como diretório estático de publicação; não há
   comando de build nem framework.
2. `vercel.json` preserva as URLs limpas e rewrites atuais, e aplica cabeçalhos
   HTTP. O HTML mantém o padrão da Vercel
   `public, max-age=0, must-revalidate`; os recursos em `/assets/` usam TTL
   público de uma hora porque seus nomes não têm hash de conteúdo.
   `Vary: Accept-Encoding` identifica a representação Brotli/Gzip negociada
   pela CDN da Vercel, que já realiza a compressão automaticamente; não adicione
   uma segunda camada.
3. `.vercelignore` impede que migrations, código Supabase, documentação,
   arquivos de ambiente, ZIPs, páginas internas de design e `REVISÃO/` sejam
   publicados como conteúdo.
4. Após publicar, teste todas as rotas limpas, vídeo do hero, imagens, menu,
   rodapé, política de privacidade, formulário de leads e cabeçalhos no domínio
   efetivo. A pré-visualização por `file://` não valida Vercel, streaming de
   vídeo, CSP nem integrações remotas.

## Supabase

Use o projeto/ref correto antes de executar a migração:

1. Leia `supabase/LEADS_SETUP.md`, em especial o impacto sobre registros
   existentes: consentimentos antigos sem comprovação são desautorizados e
   precisarão de nova confirmação.
2. Revise e aplique
   `supabase/migrations/20261101210000_leads_security.sql` no SQL Editor de
   homologação/produção conforme o procedimento aprovado.
3. Configure secrets Supabase e publique as funções conforme o guia de setup.
4. Configure a chave de site Cloudflare Turnstile pública em
   `assets/supabase-config.js`; os secrets de servidor permanecem somente no
   Supabase.
5. Teste negação da API REST, CAPTCHA inválido, cadastro pendente, entrega do
   WhatsApp e confirmação de uso único. Não declare persistência até confirmar
   os registros no painel Supabase e o resultado do endpoint.

## Validação de regressão

Não há package manifest ou runner de testes local. Valide o HTML servido por
HTTP nos viewports móveis, tablet e desktop; monitore Console/Network; percorra
links internos; e verifique imagem, vídeo e funcionamento dos formulários. Use
Lighthouse em URL de preview/produção para medir LCP, INP e CLS. Nenhuma
pontuação foi medida nesta reorganização.
