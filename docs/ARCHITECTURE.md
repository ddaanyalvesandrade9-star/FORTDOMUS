# Arquitetura atual

## Decisão estrutural

O site é uma vitrine estática pequena, sem framework, bundler ou dependências de
build. As páginas ficam na raiz porque as rotas limpas da Vercel reescrevem para
esses arquivos, os links HTML usam caminhos absolutos e `assets/site.js` possui
uma tabela de destinos locais para pré-visualização via `file://`. Mover as
páginas para `pages/` exigiria alterar referências e rotas em todas elas sem
benefício de desempenho. Portanto, a separação é aplicada onde já é segura:
backend/migrações em `supabase/`, documentação em `docs/` e recursos web em
`assets/`.

## Mapa de diretórios

```text
/
├── *.html                   Páginas estáticas e rotas existentes
├── assets/
│   ├── site.css             Identidade visual compartilhada
│   ├── site.js              Navegação e interações compartilhadas
│   ├── confirm-lead.js      Confirmação explícita do WhatsApp
│   ├── supabase-config.js   URL e chave publicável; sem segredos
│   ├── fort-domus-hero.mp4  Vídeo de fundo do hero
│   ├── fort-domus-logo.png
│   ├── fort-domus-wordmark.png
│   └── fort-domus-produto.jpg
├── docs/                    Arquitetura, segurança e publicação
├── supabase/
│   ├── config.toml          Configuração local do Supabase CLI
│   ├── migrations/          Migrações SQL versionadas
│   └── functions/           Edge Functions e helpers
├── vercel.json              Rewrites e cabeçalhos
├── .vercelignore            Exclusão de código interno do deploy estático
└── .gitignore               Exclusões locais e arquivos secretos
```

## Páginas e responsabilidades

- `index.html` é a home ativa. `index(1).html` é mantida como cópia local
  compatível com o histórico do projeto; ambas carregam os mesmos recursos.
- `produto-organizador.html`, `produtos.html`, `duvidas.html` e `sobre-nos.html`
  cobrem produto, catálogo, suporte e conteúdo institucional.
- As políticas legais e `termos-de-uso.html` permanecem na raiz para preservar
  as URLs públicas.
- `confirmar-whatsapp.html` apresenta o passo explícito de confirmação.
- `design-system.html` e `design_system4.html` são artefatos HTML existentes e
  não foram removidos nem movidos. São excluídos do deploy por serem páginas de
  referência não ligadas ao site e dependerem de recursos locais ausentes.
- `REVISÃO/` contém cópia de revisão e arquivos ZIP antigos. É preservada no
  workspace, mas excluída do deploy.

## Ativos e duplicações

As páginas ativas usam uma folha CSS e um script compartilhados; as páginas que
capturam leads carregam adicionalmente a configuração pública e o captcha sob
demanda. O vídeo principal tem aproximadamente 5,4 MB, usa `preload="auto"` e
preenche o fundo do hero com corte proporcional também em telas móveis, com
menos sobreposição branca para manter o movimento visível. O script
reafirma `muted` e `playsInline`, tenta reproduzir após o carregamento e ao
retornar à página, e oferece o botão de reprodução se o navegador bloquear,
falhar ao carregar ou não iniciar o vídeo em até seis segundos. O pôster
permanece como alternativa visual. A imagem
principal tem dimensões explícitas e prioridade alta, enquanto imagens abaixo do
hero usam carregamento diferido. Logotipos repetidos dentro de `REVISÃO/` são idênticos
aos ativos ativos, mas foram mantidos para preservar o snapshot.

## Restrições de publicação

O diretório de publicação não foi alterado. `.vercelignore` exclui backend,
SQL, documentação, arquivos ZIP e snapshots da revisão do site estático; o
Supabase CLI continua lendo `supabase/` do workspace. URLs limpas mantêm seus
destinos em `vercel.json`.
