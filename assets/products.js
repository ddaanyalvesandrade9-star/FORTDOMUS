/*
  Página de produto (/produtos/organizador-cofre-simples e /produtos/organizador-cofre-premium).
  Tudo vem do cadastro único (assets/products-data.js) pelos componentes de assets/catalogo.js.
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
  document.title = `${product.name} | Fort Domus`;
  document.querySelector('meta[name="description"]')?.setAttribute("content", product.summary);

  /* ---------- Foto (4:5) com aviso "Imagem ilustrativa" ---------- */
  const media = C.mediaBox(version, { sizes: "(min-width: 900px) 48vw, 100vw", eager: true });
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
  syncZoom();
  const gallery = el("div", "pdp-gallery");
  gallery.append(zoom);

  /* ---------- Informações ---------- */
  const block = (title, content) => {
    const section = el("section", "pi-block");
    section.append(el("h2", "", title), content);
    return section;
  };
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

  const descSlot = el("p", "pi-description", version.descricaoCurta);
  const priceSlot = el("div", "pi-price-slot");
  priceSlot.append(C.priceEl(version));
  const buy = el("a", "button pi-cta pi-buy", "Comprar pelo WhatsApp");
  buy.href = C.whatsappUrl(product, version);
  buy.target = "_blank";
  buy.rel = "noopener noreferrer";
  const arrow = el("span", "", " ↗");
  arrow.setAttribute("aria-hidden", "true");
  buy.append(arrow);
  const sections = el("div", "pi-variant-sections");
  const renderSections = () => sections.replaceChildren(
    block("Principais características", list(highlights())),
    block("Especificações técnicas", specs()),
    block("Entrega e garantia", delivery()),
  );
  renderSections();

  const selector = C.buildSelector(product, version.key, (next) => {
    version = next;
    descSlot.textContent = version.descricaoCurta;
    priceSlot.replaceChildren(C.priceEl(version));
    renderSections();
    buy.href = C.whatsappUrl(product, version);
    media.show(version);
    syncZoom();
    C.writeKey(product, version);
    C.swap(priceSlot);
    C.swap(descSlot);
    C.swap(sections);
  });

  const info = el("div", "product-info");
  info.append(el("span", "eyebrow", product.category), el("h1", "", product.name), selector.element, priceSlot, buy, descSlot, sections);

  const back = el("a", "product-back");
  back.href = "/equipamentos";
  back.textContent = "Todos os equipamentos";
  const grid = el("div", "product-catalog-grid");
  grid.append(gallery, info);
  page.replaceChildren(back, grid);
  page.dataset.pronto = "";

  C.injectLd(C.productLd(product));
  document.querySelector("[data-product-videos]")?.remove();
})();
