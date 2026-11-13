/*
  Página de produto (/produtos/organizador, /produtos/organizador-cofre-simples e /produtos/organizador-cofre-premium).
  Tudo vem do cadastro único (assets/products-data.js) pelos componentes de assets/catalogo.js.

  Layout: miniaturas + foto grande à esquerda; nome, preço, versão e botão Comprar à direita;
  descrição, dados técnicos e entrega em blocos que abrem e fecham; barra fixa de compra no celular.
  Fotos: cada versão pode ter várias em "fotos" (products-data.js). As que ainda não existem aparecem
  como "Foto em breve" e viram miniatura clicável assim que a foto for cadastrada.
*/
(() => {
  "use strict";

  const C = window.FortDomusCatalog;
  const page = document.querySelector("[data-product-page]");
  if (!C || !page) return;
  const { el } = C;

  const slug = page.dataset.slug
    || (location.protocol === "file:"
      ? new URLSearchParams(location.search).get("produto")
      : location.pathname.replace(/\/+$/, "").split("/").pop());
  const product = C.productBySlug(slug);

  if (!product) {
    const missing = el("div", "product-missing");
    const link = el("a", "button", "Ver todos os equipamentos");
    link.href = "/equipamentos";
    missing.append(el("span", "eyebrow", "Produto não encontrado"), el("h1", "", "Não encontramos esse produto."), link);
    page.replaceChildren(missing);
    return;
  }

  let version = C.versionOf(product, C.readKey(product));
  let photoIndex = 0;
  document.title = `${product.name} | Fort Domus`;
  document.querySelector('meta[name="description"]')?.setAttribute("content", product.summary);

  const MAIN_SIZES = "(min-width: 1229px) 42vw, (min-width: 900px) 48vw, 100vw";
  const SOON = ["Vista lateral", "Vista traseira", "Detalhes", "Em ambiente real"];

  /* ---------- Galeria: foto grande (4:5) + miniaturas ---------- */
  const media = C.mediaBox(version, { sizes: MAIN_SIZES, eager: true });
  media.element.classList.add("pdp-media");
  const zoom = el("button", "pdp-zoom");
  zoom.type = "button";
  zoom.dataset.gallerySource = ".pdp-media .eq-layer.is-current img";
  zoom.append(media.element);
  // O visor de fotos só abre quando há imagem; sem foto, o botão não faz nada.
  zoom.addEventListener("click", (event) => { if (!zoom.querySelector("img")) { event.stopPropagation(); event.preventDefault(); } }, true);
  const syncZoom = () => {
    zoom.toggleAttribute("data-gallery", Boolean(C.photoOf(version)));
    const ilustrativa = version.ilustrativa === true && Boolean(C.photoOf(version));
    zoom.setAttribute("aria-label", `${ilustrativa ? "Imagem ilustrativa. " : ""}Ampliar foto: ${product.name}`);
  };

  const thumbs = el("div", "pdp-thumbs");
  thumbs.setAttribute("role", "group");
  thumbs.setAttribute("aria-label", "Fotos do produto");

  function showPhoto(index) {
    photoIndex = index;
    const photo = (version.fotos || [])[index];
    const layer = media.element.querySelector(".eq-layer.is-current");
    if (layer && photo) layer.replaceChildren(C.pictureEl(photo, { sizes: MAIN_SIZES, eager: true }));
    paintThumbs();
  }

  function paintThumbs() {
    const fotos = Array.isArray(version.fotos) ? version.fotos : [];
    const slots = Math.max(4, fotos.length);
    const items = [];
    for (let i = 0; i < slots; i += 1) {
      if (fotos[i]) {
        const button = el("button", "pdp-thumb");
        button.type = "button";
        button.setAttribute("aria-label", `Ver foto ${i + 1} de ${fotos.length}`);
        if (i === photoIndex) button.setAttribute("aria-current", "true");
        button.append(C.pictureEl(fotos[i], { sizes: "96px" }));
        button.addEventListener("click", () => showPhoto(i));
        items.push(button);
      } else {
        const soon = el("div", "pdp-thumb is-soon");
        const label = SOON[i - 1] || "Foto";
        soon.setAttribute("role", "img");
        soon.setAttribute("aria-label", `Foto em breve: ${label.toLowerCase()}`);
        soon.append(el("span", "pdp-soon-icon"), el("span", "pdp-soon-text", "Em breve"), el("small", "", label));
        items.push(soon);
      }
    }
    thumbs.replaceChildren(...items);
  }

  const gallery = el("div", "pdp-gallery");
  const stage = el("div", "pdp-stage");
  stage.append(thumbs, zoom);
  gallery.append(stage);

  /* ---------- Blocos de informação (abrem e fecham) ---------- */
  const list = (items) => {
    const ul = el("ul", "pi-list");
    items.forEach((text) => ul.append(el("li", "", text)));
    return ul;
  };
  const specs = () => {
    const rows = [];
    product.specs.forEach((spec) => {
      rows.push(spec);
      if (spec.label === "Base") rows.push(...(version.specs || []));
    });
    const dl = el("dl", "pi-specs");
    rows.forEach((spec) => dl.append(el("dt", "", spec.label), el("dd", "", spec.value)));
    return dl;
  };
  const delivery = () => {
    const box = el("div", "pi-delivery");
    [product.entrega, product.garantia].filter(Boolean).forEach((text) => box.append(el("p", "", text)));
    return box;
  };
  const highlights = () => [...new Set([...(product.highlights || []), ...(version.destaques || [])])];

  const accordion = (title, open) => {
    const details = el("details", "pdp-acc");
    if (open) details.open = true;
    const body = el("div", "pdp-acc-body");
    details.append(el("summary", "", title), body);
    return { details, body };
  };
  const accDesc = accordion("Descrição", true);
  const accSpecs = accordion("Características e dados técnicos", false);
  const accDelivery = accordion("Entrega e garantia", false);
  const renderBlocks = () => {
    const desc = [el("p", "", product.summary), el("p", "", version.descricaoCurta)];
    if (product.uso) desc.push(el("p", "", product.uso));
    accDesc.body.replaceChildren(...desc);
    accSpecs.body.replaceChildren(list(highlights()), specs());
    accDelivery.body.replaceChildren(delivery());
  };
  renderBlocks();

  /* ---------- Preço, versão e compra ---------- */
  const priceSlot = el("div", "pi-price-slot");
  priceSlot.append(C.priceEl(version));

  const baseLabel = el("p", "pdp-label");
  const syncLabel = () => { baseLabel.textContent = `Base: ${version.label}`; };
  syncLabel();

  const makeBuy = (className) => {
    const link = el("a", `button pi-cta ${className}`, "Comprar");
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const arrow = el("span", "", " ↗");
    arrow.setAttribute("aria-hidden", "true");
    link.append(arrow);
    return link;
  };
  const buy = makeBuy("pi-buy");
  const stickyBuy = makeBuy("pdp-sticky-buy");
  const buyNote = el("p", "pdp-buy-note");
  const syncBuyAll = () => {
    C.syncBuy(buy, product, version);
    C.syncBuy(stickyBuy, product, version);
    buyNote.textContent = C.lojaUrlOf(version)
      ? "Você finaliza a compra na loja da Fort Domus na InfinitePay. O frete é calculado pelo seu CEP antes do pagamento."
      : "Atendimento e compra pelo WhatsApp.";
  };
  syncBuyAll();

  const facts = el("ul", "pdp-facts");
  [product.garantia, product.entrega && product.entrega.split(". ")[0].replace(/\.$/, "")].filter(Boolean)
    .forEach((text) => facts.append(el("li", "", text)));

  const sticky = el("div", "pdp-sticky");
  const stickyPrice = el("div", "pdp-sticky-price");
  const syncSticky = () => {
    const economia = version.precoCartao - version.precoPix;
    const pct = Math.round((economia / version.precoCartao) * 100);
    stickyPrice.replaceChildren(
      el("strong", "", C.brl(version.precoCartao)),
      el("span", "", economia > 0 ? `Pix ${pct}% OFF` : `${version.parcelas}x sem juros`),
    );
  };
  syncSticky();
  sticky.append(stickyPrice, stickyBuy);

  const selector = C.buildSelector(product, version.key, (next) => {
    version = next;
    photoIndex = 0;
    priceSlot.replaceChildren(C.priceEl(version));
    renderBlocks();
    syncLabel();
    syncBuyAll();
    syncSticky();
    C.syncDuvidaLinks(product, version);
    media.show(version);
    syncZoom();
    paintThumbs();
    C.writeKey(product, version);
    C.swap(priceSlot);
    C.swap(accDesc.details);
    document.dispatchEvent(new CustomEvent("fd:versao", { detail: { product, version } }));
  });

  const crumbs = el("nav", "pdp-crumbs");
  crumbs.setAttribute("aria-label", "Caminho");
  const crumbHome = el("a", "", "Equipamentos");
  crumbHome.href = "/equipamentos";
  crumbs.append(crumbHome, el("span", "", "/"), el("span", "", product.name));

  const info = el("div", "product-info");
  info.append(
    el("span", "eyebrow", product.category),
    el("h1", "", product.name),
    priceSlot,
    baseLabel,
    selector.element,
    buy,
    buyNote,
    facts,
    el("div", "pdp-accs"),
  );
  info.querySelector(".pdp-accs").append(accDesc.details, accSpecs.details, accDelivery.details);

  const grid = el("div", "product-catalog-grid");
  grid.append(gallery, info);
  page.replaceChildren(crumbs, grid, sticky);
  syncZoom();
  paintThumbs();
  C.syncDuvidaLinks(product, version);
  page.dataset.pronto = "";
  document.dispatchEvent(new CustomEvent("fd:versao", { detail: { product, version } }));

  C.injectLd(C.productLd(product));
  document.querySelector("[data-product-videos]")?.remove();
})();
