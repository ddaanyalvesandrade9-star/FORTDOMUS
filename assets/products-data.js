/*
  Cadastro único de produtos e versões da Fort Domus.
  É a ÚNICA fonte de preços, textos e fotos: a vitrine (/equipamentos), as páginas de produto, a página inicial,
  os dados estruturados (SEO) e a mensagem do WhatsApp leem tudo daqui. Nenhum componente repete valores.

  Cada produto tem duas versões (acabamento da base): "aco" e "madeira".
  Cada versão é uma variação independente, com:
    id            identificador estável "<slug do produto>:<chave da versão>"
    key / label   chave usada na URL (?versao=aco | ?versao=madeira) e nome exibido
    precoPix      preço no Pix, em CENTAVOS
    precoCartao   preço no cartão, em CENTAVOS (null = não exibir)
    parcelas      número de parcelas sem juros (5)
    valorParcela  valor de cada parcela, em CENTAVOS (parcelas x valorParcela = precoCartao)
    fotos         lista de fotos { src, alt, width, height }. O arquivo .png é o original; o site usa as
                  versões -360/-540/-720/-1136 em .avif e .webp geradas a partir dele.
                  Sem fotos (ou arquivo ausente), o site mostra o espaço "Foto em produção".
    ilustrativa   true = mostra "Imagem ilustrativa" no card e na galeria. Troque para false ao usar foto real.
    descricaoCurta, destaques, specs   textos da versão (só o que foi confirmado)
    status        reservado (disponível / sob encomenda / em breve). Vazio: não é exibido.

  Para trocar uma imagem: salve o arquivo em assets/produtos/ com o nome indicado em "src", gere os tamanhos
  responsivos e, se for foto real, mude "ilustrativa" para false. Detalhes em docs/roteiro-imagens.md.
*/
window.FORT_DOMUS_PRODUCTS = [
  {
    slug: "organizador",
    name: "Organizador Tático",
    category: "Organização para a sua rotina",
    summary: "Um organizador vertical para acomodar farda, colete, cinto, boné e coturno, aproveitando melhor o espaço.",
    defaultVersion: "aco",
    highlights: [
      "Estrutura em tubo de aço galvanizado 20×20 mm e chapa de aço 18",
      "Pintura de alta qualidade",
      "Ganchos sob medida",
      "Para farda, colete, cinto, boné, coturnos e acessórios",
    ],
    specs: [
      { label: "Estrutura", value: "Tubo de aço galvanizado 20×20 mm e chapa de aço 18" },
      { label: "Pintura", value: "Pintura de alta qualidade" },
      { label: "Ganchos", value: "Ganchos sob medida" },
      { label: "Base", value: "45 × 45 cm" },
    ],
    uso: "Para farda, colete, cinto, boné, coturnos e acessórios.",
    garantia: "Garantia de 90 dias contra defeito de fabricação.",
    entrega: "Entrega grátis em Campina Grande. Outras cidades: frete e prazo sob consulta no WhatsApp.",
    versions: [
      {
        id: "organizador:aco", key: "aco", label: "Base de aço",
        precoPix: 59990, precoCartao: 64990, parcelas: 5, valorParcela: 12998,
        fotos: [{ src: "assets/produtos/organizador-aco.png", alt: "Organizador Tático com base de aço: bandeja superior preta e prateleira inferior em grade de aço, com farda, colete, cinto, boné e coturnos", width: 1136, height: 1408 }],
        ilustrativa: true,
        descricaoCurta: "Bandeja superior em aço e prateleira inferior em grade de aço.",
        destaques: ["Bandeja superior em aço", "Prateleira inferior em grade de aço"],
        specs: [{ label: "Bandeja e prateleira", value: "Bandeja superior em aço e prateleira inferior em grade de aço" }],
        status: "",
      },
      {
        id: "organizador:madeira", key: "madeira", label: "Base de madeira",
        precoPix: 54990, precoCartao: 59990, parcelas: 5, valorParcela: 11998,
        fotos: [{ src: "assets/produtos/organizador-madeira.png", alt: "Organizador Tático com base de madeira: bandeja superior e prateleira inferior em madeira clara sobre estrutura metálica preta, com farda, colete, cinto, boné e coturnos", width: 1136, height: 1408 }],
        ilustrativa: true,
        descricaoCurta: "Bandeja superior e prateleira inferior em madeira tratada com stain, sobre estrutura metálica preta.",
        destaques: ["Bandeja superior e prateleira inferior em madeira tratada com stain (proteção contra umidade)", "Estrutura metálica preta"],
        specs: [{ label: "Bandeja e prateleira", value: "Bandeja superior e prateleira inferior em madeira tratada com stain (proteção contra umidade), sobre estrutura metálica preta" }],
        status: "",
      },
    ],
  },
  {
    slug: "organizador-cofre-simples",
    name: "Organizador Tático com Cofre Simples",
    category: "Organização e segurança para a sua rotina",
    summary: "Organizador com cofre eletrônico compacto fixado no topo, para guardar documentos, dinheiro e objetos de valor.",
    defaultVersion: "aco",
    highlights: [
      "Cofre eletrônico compacto fixado no topo, com abertura por senha e chave",
      "Para guardar documentos, dinheiro e objetos de valor",
      "Estrutura em tubo de aço galvanizado 20×20 mm e chapa de aço 18",
      "Pintura de alta qualidade",
      "Ganchos sob medida",
      "Para farda, colete, cinto, boné, coturnos e acessórios",
    ],
    specs: [
      { label: "Estrutura", value: "Tubo de aço galvanizado 20×20 mm e chapa de aço 18" },
      { label: "Pintura", value: "Pintura de alta qualidade" },
      { label: "Ganchos", value: "Ganchos sob medida" },
      { label: "Base", value: "45 × 45 cm" },
      { label: "Cofre", value: "Cofre eletrônico compacto fixado no topo" },
      { label: "Abertura do cofre", value: "Senha e chave" },
      { label: "Medidas do cofre", value: "20 × 35 × 20 cm (aproximadas)" },
    ],
    uso: "Cofre para guardar documentos, dinheiro e objetos de valor. Organizador para farda, colete, cinto, boné, coturnos e acessórios.",
    garantia: "Garantia de 90 dias contra defeito de fabricação.",
    entrega: "Entrega grátis em Campina Grande. Outras cidades: frete e prazo sob consulta no WhatsApp.",
    versions: [
      {
        id: "organizador-cofre-simples:aco", key: "aco", label: "Base de aço",
        precoPix: 99990, precoCartao: 109990, parcelas: 5, valorParcela: 21998,
        fotos: [{ src: "assets/produtos/organizador-cofre-simples-aco.png", alt: "Organizador Tático com Cofre Simples e base de aço: cofre eletrônico de porta frontal, com teclado e chave, fixado na bandeja superior, e prateleira inferior em grade de aço", width: 1136, height: 1408 }],
        ilustrativa: true,
        descricaoCurta: "Bandeja superior em aço e prateleira inferior em grade de aço.",
        destaques: ["Bandeja superior em aço", "Prateleira inferior em grade de aço"],
        specs: [{ label: "Bandeja e prateleira", value: "Bandeja superior em aço e prateleira inferior em grade de aço" }],
        status: "",
      },
      {
        id: "organizador-cofre-simples:madeira", key: "madeira", label: "Base de madeira",
        precoPix: 94990, precoCartao: 104990, parcelas: 5, valorParcela: 20998,
        fotos: [{ src: "assets/produtos/organizador-cofre-simples-madeira.png", alt: "Organizador Tático com Cofre Simples e base de madeira: cofre eletrônico de porta frontal, com teclado e chave, sobre bandeja de madeira clara, e prateleira inferior de madeira sobre estrutura metálica preta", width: 1136, height: 1408 }],
        ilustrativa: true,
        descricaoCurta: "Bandeja superior e prateleira inferior em madeira tratada com stain, sobre estrutura metálica preta.",
        destaques: ["Bandeja superior e prateleira inferior em madeira tratada com stain (proteção contra umidade)", "Estrutura metálica preta"],
        specs: [{ label: "Bandeja e prateleira", value: "Bandeja superior e prateleira inferior em madeira tratada com stain (proteção contra umidade), sobre estrutura metálica preta" }],
        status: "",
      },
    ],
  },
  {
    slug: "organizador-cofre-premium",
    name: "Organizador Tático com Cofre Premium",
    category: "Organização e segurança para a sua rotina",
    summary: "Organizador com cofre eletrônico fixado no topo, com abertura por biometria, para guardar documentos, dinheiro e objetos de valor.",
    defaultVersion: "aco",
    highlights: [
      "Cofre eletrônico fixado no topo, com abertura superior por biometria (impressão digital), senha ou chave de emergência",
      "Entrada USB-C para emergência",
      "Interior do cofre forrado com espuma",
      "Para guardar documentos, dinheiro e objetos de valor",
      "Estrutura em tubo de aço galvanizado 20×20 mm e chapa de aço 18",
      "Pintura de alta qualidade",
      "Ganchos sob medida",
      "Para farda, colete, cinto, boné, coturnos e acessórios",
    ],
    specs: [
      { label: "Estrutura", value: "Tubo de aço galvanizado 20×20 mm e chapa de aço 18" },
      { label: "Pintura", value: "Pintura de alta qualidade" },
      { label: "Ganchos", value: "Ganchos sob medida" },
      { label: "Base", value: "45 × 45 cm" },
      { label: "Cofre", value: "Cofre eletrônico fixado no topo" },
      { label: "Abertura do cofre", value: "Superior, por biometria (impressão digital), senha ou chave de emergência" },
      { label: "Emergência", value: "Entrada USB-C" },
      { label: "Interior do cofre", value: "Forrado com espuma" },
      { label: "Medidas do cofre", value: "31,5 × 29 × 9,5 cm (externas)" },
    ],
    uso: "Cofre para guardar documentos, dinheiro e objetos de valor. Organizador para farda, colete, cinto, boné, coturnos e acessórios.",
    garantia: "Garantia de 90 dias contra defeito de fabricação.",
    entrega: "Entrega grátis em Campina Grande. Outras cidades: frete e prazo sob consulta no WhatsApp.",
    versions: [
      {
        id: "organizador-cofre-premium:aco", key: "aco", label: "Base de aço",
        precoPix: 129990, precoCartao: 139990, parcelas: 5, valorParcela: 27998,
        fotos: [{ src: "assets/produtos/organizador-cofre-premium-aco.png", alt: "Organizador Tático com Cofre Premium e base de aço: cofre baixo com tampa superior e leitor de impressão digital fixado no topo, e prateleira inferior em grade de aço", width: 1136, height: 1408 }],
        ilustrativa: true,
        descricaoCurta: "Bandeja superior em aço e prateleira inferior em grade de aço.",
        destaques: ["Bandeja superior em aço", "Prateleira inferior em grade de aço"],
        specs: [{ label: "Bandeja e prateleira", value: "Bandeja superior em aço e prateleira inferior em grade de aço" }],
        status: "",
      },
      {
        id: "organizador-cofre-premium:madeira", key: "madeira", label: "Base de madeira",
        precoPix: 124990, precoCartao: 134990, parcelas: 5, valorParcela: 26998,
        fotos: [{ src: "assets/produtos/organizador-cofre-premium-madeira.png", alt: "Organizador Tático com Cofre Premium e base de madeira: cofre baixo com tampa aberta, teclado e leitor de impressão digital, sobre bandeja de madeira clara, e prateleira inferior de madeira sobre estrutura metálica preta", width: 1136, height: 1408 }],
        ilustrativa: true,
        descricaoCurta: "Bandeja superior e prateleira inferior em madeira tratada com stain, sobre estrutura metálica preta.",
        destaques: ["Bandeja superior e prateleira inferior em madeira tratada com stain (proteção contra umidade)", "Estrutura metálica preta"],
        specs: [{ label: "Bandeja e prateleira", value: "Bandeja superior e prateleira inferior em madeira tratada com stain (proteção contra umidade), sobre estrutura metálica preta" }],
        status: "",
      },
    ],
  },
];
