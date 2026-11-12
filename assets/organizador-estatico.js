/*
  Página longa do Organizador Tático (/produtos/organizador): o conteúdo é HTML fixo e este script
  liga o seletor de versão, que troca preço, foto, textos e a mensagem do WhatsApp a partir do cadastro único.
*/
(() => {
  "use strict";

  const C = window.FortDomusCatalog;
  const root = document.querySelector("[data-organizador-estatico]");
  if (!C || !root) return;
  const product = C.productBySlug(root.dataset.organizadorEstatico);
  if (!product) return;
  let version = C.versionOf(product, C.readKey(product));

  const verSlot = root.querySelector("[data-ver-slot]");
  const priceSlot = root.querySelector("[data-price-slot]");
  const buy = root.querySelector("[data-buy]");
  const desc = root.querySelector("[data-versao-desc]");
  const panel = root.querySelector(".product-price-panel");
  const panelEyebrow = panel && panel.querySelector(".eyebrow");
  const cash = panel && panel.querySelector(".price-cash strong");
  const cardBox = panel && panel.querySelector(".price-card");

  function setPhotos() {
    const photo = C.photoOf(version);
    root.querySelectorAll("[data-versao-foto]").forEach((holder) => {
      const current = holder.querySelector("picture, img");
      if (photo && current) {
        const next = C.pictureEl(photo, { sizes: holder.dataset.sizes || "(min-width: 900px) 40vw, 100vw", eager: holder.dataset.eager === "true" });
        current.replaceWith(next);
      }
      const badge = holder.querySelector(".ilus-badge");
      if (badge) badge.hidden = !(version.ilustrativa === true && photo);
      if (holder.matches("button[data-gallery]")) holder.setAttribute("aria-label", `${badge && !badge.hidden ? "Imagem ilustrativa. " : ""}Ampliar foto do ${product.name}`);
    });
  }

  function apply(initial) {
    if (priceSlot) priceSlot.replaceChildren(C.priceEl(version));
    C.syncBuy(buy, product, version);
    C.syncDuvidaLinks(product, version);
    if (desc) desc.textContent = version.descricaoCurta;
    root.querySelectorAll("[data-somente-versao]").forEach((node) => { node.hidden = node.dataset.somenteVersao !== version.key; });
    if (panelEyebrow) panelEyebrow.textContent = `Condições de pagamento · ${version.label}`;
    if (cash) cash.textContent = C.brl(version.precoPix);
    if (cardBox) {
      cardBox.hidden = !C.hasCard(version);
      if (C.hasCard(version)) {
        cardBox.querySelector("strong").textContent = `${version.parcelas}x de ${C.brl(version.valorParcela)}`;
        cardBox.querySelector("small").textContent = `Total de ${C.brl(version.precoCartao)}`;
      }
    }
    setPhotos();
    if (!initial) {
      C.writeKey(product, version);
      C.swap(priceSlot);
      C.swap(panel && panel.querySelector(".price"));
    }
  }

  const selector = C.buildSelector(product, version.key, (next) => { version = next; apply(false); });
  if (verSlot) verSlot.replaceChildren(selector.element);
  apply(true);
})();
