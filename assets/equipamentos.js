/* Vitrine /equipamentos: grade de cards gerada do cadastro único (assets/products-data.js). */
(() => {
  "use strict";

  const C = window.FortDomusCatalog;
  const grid = document.querySelector("[data-eq-grid]");
  if (!C || !grid) return;

  grid.replaceChildren(...C.products.map((product, index) => C.buildCard(product, { eager: index === 0 })));
  grid.dataset.pronto = "";

  // Quantidade de produtos calculada do cadastro (não fixa no código).
  const total = C.products.length;
  const count = document.querySelector("[data-eq-count]");
  if (count) count.textContent = `${total} ${total === 1 ? "produto" : "produtos"}`;

  C.injectLd({
    "@type": "ItemList",
    itemListElement: C.products.map((product, position) => ({ "@type": "ListItem", position: position + 1, item: C.productLd(product) })),
  });
})();
