/*
  Catálogo de produtos Fort Domus — única fonte de dados da lista (/produtos)
  e das páginas individuais (/produtos/<slug>).

  Para adicionar um produto: copie um bloco, troque o "slug" e preencha os dados.
  A rota /produtos/<slug> passa a existir sozinha (ver vercel.json: /produtos/:slug).

  Fotos:   coloque os arquivos em assets/products/<slug>/ e informe o caminho em "src".
           A galeria mostra no mínimo 5 espaços; entradas sem "src" aparecem como espaço reservado.
           Para mais de 5 fotos, basta acrescentar itens ao array.
  Vídeos:  arquivos MP4 em assets/products/<slug>/ (reproduzidos no próprio site).
           Mínimo de 2 espaços; "poster" (imagem de capa) é opcional.
  Campos vazios ("" / [] / null) aparecem como "Informação em breve." na página.
  Preço:   preencha "price" quando definido; com null a página convida a consultar pelo WhatsApp.
  Versões: cada produto tem "variants" (acabamento da base). Cada versão é uma variação independente, com
           id estável "<slug>:<chave>" e preços em CENTAVOS (pixCents e, quando definido, cardCents).
           Os textos de preço ("R$ 599,90", "5x de R$ 129,98 sem juros") são gerados por assets/variantes.js.
           Opcionais por versão (se ausentes, vale o do produto): photos, features, dimensions, specs,
           material, differentials, description.
           Este valor é só de exibição: qualquer cobrança futura deve revalidar o preço pelo id no servidor.
*/
window.FORT_DOMUS_PRODUCTS = [
  {
    slug: "organizador-tatico",
    name: "Organizador Tático",
    eyebrow: "Organização para a sua rotina",
    summary: "Um organizador vertical para acomodar farda, colete, cinto, boné e coturno, aproveitando melhor o espaço.",
    cardImage: { src: "assets/fort-domus-produto.jpg", alt: "Organizador Tático com uniforme, colete, cinto, boné e coturnos", width: 1300, height: 1734 },
    description: "Muito mais que um organizador. Uma estrutura desenvolvida para acomodar seus equipamentos com resistência, praticidade e qualidade.",
    photos: [
      { src: "assets/fort-domus-produto.jpg", alt: "Vista completa do Organizador Tático", width: 1300, height: 1734 },
      { label: "Vista lateral" },
      { label: "Detalhes da estrutura" },
      { label: "Detalhes dos ganchos" },
      { label: "Em ambiente real" },
    ],
    videos: [
      { title: "Vídeo demonstrativo 1" },
      { title: "Vídeo demonstrativo 2" },
    ],
    features: [
      "Organizador vertical",
      "Acomoda farda, colete, cinto, boné e coturno",
      "Ganchos sob medida para cada equipamento",
      "Pintura de qualidade",
    ],
    specs: [
      { label: "Estrutura", value: "Tubos de aço 20x20 mm e chapa de aço 18" },
      { label: "Proteção", value: "Aço galvanizado, com camada de zinco contra corrosão e ferrugem" },
      { label: "Madeira", value: "Aplicação de stain para ajudar a proteger contra a umidade" },
    ],
    dimensions: [
      { label: "Altura", value: "≈ 105 cm" },
      { label: "Largura", value: "45 cm" },
      { label: "Profundidade", value: "45 cm" },
    ],
    material: "Aço galvanizado e madeira tratada com stain.",
    differentials: [
      "Ganchos sob medida, sem improvisações",
      "Acabamento cuidadosamente executado, com camada adicional de proteção",
    ],
    defaultVariant: "aco",
    variants: [
      { key: "aco", label: "Base de aço", id: "organizador-tatico:aco", pixCents: 59990, cardCents: 64990 },
      // Cartão da base de madeira: preencher cardCents quando o valor for definido.
      { key: "madeira", label: "Base de madeira", id: "organizador-tatico:madeira", pixCents: 54990 },
    ],
    price: {
      cashLabel: "No Pix, dinheiro ou boleto",
      cardLabel: "No cartão de crédito",
      installments: 5,
      note: "Entrega grátis em Campina Grande. Demais localidades: frete e prazo sob consulta pelo WhatsApp.",
    },
  },
  {
    slug: "organizador-tatico-com-cofre",
    name: "Organizador Tático com Cofre",
    eyebrow: "Organização para a sua rotina",
    cardEyebrow: "Organização e segurança para a sua rotina",
    summary: "Um organizador vertical completo para acomodar farda, colete, cinto, boné e coturno, integrando um compartimento com cofre para o armazenamento seguro da sua pistola / arma curta e munição.",
    cardImage: null,
    description: "Muito mais que um organizador. Uma estrutura desenvolvida para acomodar seus equipamentos com resistência, praticidade e a segurança de um compartimento dedicado.",
    photos: [
      { label: "Vista completa" },
      { label: "Vista lateral" },
      { label: "Detalhes do cofre" },
      { label: "Detalhes da estrutura" },
      { label: "Em ambiente real" },
    ],
    videos: [
      { title: "Vídeo demonstrativo 1" },
      { title: "Vídeo demonstrativo 2" },
    ],
    features: [
      "Organizador vertical com cofre integrado",
      "Acomoda farda, colete, cinto, boné, coturno e pistola / arma curta (no cofre)",
      "Ganchos sob medida para cada equipamento",
      "Compartimento com cofre para armazenamento seguro de arma curta e munição",
      "Pintura de qualidade",
    ],
    specs: [
      { label: "Estrutura", value: "Tubos de aço 20x20 mm e chapa de aço 18" },
      { label: "Proteção", value: "Aço galvanizado, com camada de zinco contra corrosão e ferrugem" },
      { label: "Madeira", value: "Aplicação de stain para ajudar a proteger contra a umidade" },
      { label: "Segurança", value: "Cofre de alta resistência acoplado à estrutura metálica" },
    ],
    dimensions: [
      { label: "Altura", value: "≈ 105 cm" },
      { label: "Largura", value: "45 cm" },
      { label: "Profundidade", value: "45 cm" },
    ],
    material: "Aço galvanizado, madeira tratada com stain e cofre em chapa reforçada.",
    differentials: [
      "Compartimento com cofre integrado para restrição de acesso e segurança da arma",
      "Ganchos sob medida, sem improvisações",
      "Acabamento cuidadosamente executado, com camada adicional de proteção",
    ],
    defaultVariant: "aco",
    variants: [
      { key: "aco", label: "Base de aço", id: "organizador-tatico-com-cofre:aco", pixCents: 119990, cardCents: 129990 },
      // Cartão da base de madeira: preencher cardCents quando o valor for definido.
      { key: "madeira", label: "Base de madeira", id: "organizador-tatico-com-cofre:madeira", pixCents: 114990 },
    ],
    price: {
      cashLabel: "No Pix, dinheiro ou boleto",
      cardLabel: "No cartão de crédito",
      installments: 5,
      note: "Entrega grátis em Campina Grande. Demais localidades: frete e prazo sob consulta pelo WhatsApp.",
    },
  },
];
