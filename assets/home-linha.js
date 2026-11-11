/*
  Início: linha de produtos. Monta os cards com o MESMO componente da vitrine (FortDomusCatalog.buildCard),
  lendo tudo do cadastro único (assets/products-data.js). Os dados estruturados (JSON-LD) ficam só em /equipamentos.
*/
(() => {
  "use strict";

  const C = window.FortDomusCatalog;
  const grid = document.querySelector("[data-home-grid]");
  if (!C || !grid) return;

  // Fotos abaixo da primeira dobra: carregamento sob demanda (só a foto do início tem prioridade).
  grid.replaceChildren(...C.products.map((product) => C.buildCard(product, { eager: false, headingLevel: 3 })));
  grid.dataset.pronto = "";
})();
