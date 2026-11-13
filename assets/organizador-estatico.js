/*
  Página longa do Organizador Tático (/produtos/organizador): o topo (foto, preço, versão e compra) é montado por
  assets/products.js. As seções fixas abaixo (galeria, qualidade) acompanham a versão escolhida: este script
  troca as fotos e mostra/esconde os textos da versão (aço ou madeira) a partir do cadastro único.
*/
(() => {
  "use strict";

  const C = window.FortDomusCatalog;
  const root = document.querySelector("[data-organizador-estatico]");
  if (!C || !root) return;
  const product = C.productBySlug(root.dataset.organizadorEstatico);
  if (!product) return;

  function apply(version) {
    const photo = C.photoOf(version);
    root.querySelectorAll("[data-versao-foto]").forEach((holder) => {
      const current = holder.querySelector("picture, img");
      if (photo && current) {
        current.replaceWith(C.pictureEl(photo, { sizes: holder.dataset.sizes || "(min-width: 900px) 40vw, 100vw", eager: holder.dataset.eager === "true" }));
      }
      const badge = holder.querySelector(".ilus-badge");
      if (badge) badge.hidden = !(version.ilustrativa === true && photo);
    });
    root.querySelectorAll("[data-somente-versao]").forEach((node) => { node.hidden = node.dataset.somenteVersao !== version.key; });
  }

  apply(C.versionOf(product, C.readKey(product)));
  document.addEventListener("fd:versao", (event) => {
    if (event.detail && event.detail.product && event.detail.product.slug === product.slug) apply(event.detail.version);
  });
})();
