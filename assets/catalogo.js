/*
  Componentes compartilhados da vitrine Fort Domus: preço, seletor de versão, foto com aviso
  "Imagem ilustrativa", card de produto, mensagem do WhatsApp e dados estruturados (SEO).
  Tudo é lido de assets/products-data.js (cadastro único). Nenhum valor é repetido aqui.
*/
(() => {
  "use strict";

  const PRODUCTS = Array.isArray(window.FORT_DOMUS_PRODUCTS) ? window.FORT_DOMUS_PRODUCTS : [];
  const WHATSAPP = "https://wa.me/5583999018926";
  const WIDTHS = [360, 540, 720, 1136];
  const PARAM = "versao";
  const STORE = "fd-versao:";
  const SIZES_CARD = "(min-width: 1229px) 31vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

  /* ---------- Utilitários ---------- */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // R$ com milhar em ponto e centavos em vírgula (sem depender do idioma do navegador).
  function brl(cents) {
    const total = Math.round(Number(cents));
    const reais = Math.floor(total / 100);
    return `R$ ${String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${String(total % 100).padStart(2, "0")}`;
  }

  const productBySlug = (slug) => PRODUCTS.find((item) => item.slug === slug) || null;
  const versionOf = (product, key) =>
    product.versions.find((item) => item.key === key)
    || product.versions.find((item) => item.key === product.defaultVersion)
    || product.versions[0];
  const hasCard = (version) => Number.isInteger(version.precoCartao) && Number.isInteger(version.parcelas) && Number.isInteger(version.valorParcela);
  const minPix = () => Math.min(...PRODUCTS.flatMap((product) => product.versions.map((version) => version.precoPix)));

  /* ---------- Versão na URL (?versao=aco | madeira) ---------- */
  const keyIsValid = (product, key) => typeof key === "string" && /^[a-z]{1,16}$/.test(key) && product.versions.some((item) => item.key === key);

  // URL primeiro; depois sessionStorage (só como reserva); senão a versão padrão.
  function readKey(product, { useStorage = true } = {}) {
    const fromUrl = new URLSearchParams(location.search).get(PARAM);
    if (keyIsValid(product, fromUrl)) return fromUrl;
    if (useStorage) {
      try {
        const saved = sessionStorage.getItem(STORE + product.slug);
        if (keyIsValid(product, saved)) return saved;
      } catch (error) { /* armazenamento indisponível: segue com o padrão */ }
    }
    return product.defaultVersion;
  }

  function writeKey(product, version) {
    try {
      const url = new URL(location.href);
      if (version.key === product.defaultVersion) url.searchParams.delete(PARAM);
      else url.searchParams.set(PARAM, version.key);
      history.replaceState(history.state, "", url);
    } catch (error) { /* sem histórico (ex.: arquivo local) */ }
    try { sessionStorage.setItem(STORE + product.slug, version.key); } catch (error) { /* ignora */ }
  }

  // explicit = true: o link sempre leva a versão na URL (assim ela vale mais que a reserva do sessionStorage).
  const productPath = (product, version, explicit = false) => `/produtos/${product.slug}${explicit || version.key !== product.defaultVersion ? `?${PARAM}=${version.key}` : ""}`;

  /* ---------- Preço (regra legal) ----------
     Cartão: acima, menor, cinza, SEM risco, com parcelamento. Pix: grande, negrito, "no Pix". */
  function priceEl(version) {
    const box = el("div", "fd-price");
    if (hasCard(version)) {
      box.append(el("p", "fd-price-card", `${brl(version.precoCartao)} no cartão · ${version.parcelas}x de ${brl(version.valorParcela)} sem juros`));
    }
    const pix = el("p", "fd-price-pix");
    pix.append(el("strong", "", brl(version.precoPix)), el("span", "", "no Pix"));
    box.append(pix);
    return box;
  }

  // Reinicia a animação suave de troca (o CSS desliga com "reduzir movimento").
  function swap(node) {
    if (!node) return;
    node.classList.remove("is-swapping");
    void node.offsetWidth;
    node.classList.add("is-swapping");
  }

  /* ---------- Foto ---------- */
  const baseOf = (photo) => photo.src.replace(/\.[a-z0-9]+$/i, "");
  const srcsetOf = (photo, ext) => WIDTHS.map((w) => `${baseOf(photo)}-${w}.${ext} ${w}w`).join(", ");

  function placeholderEl() {
    const box = el("div", "foto-producao");
    box.append(el("span", "", "Foto em produção"));
    return box;
  }

  function pictureEl(photo, { sizes, eager = false, className = "" } = {}) {
    const picture = el("picture", className);
    const avif = document.createElement("source");
    avif.type = "image/avif";
    avif.srcset = srcsetOf(photo, "avif");
    avif.sizes = sizes;
    const webp = document.createElement("source");
    webp.type = "image/webp";
    webp.srcset = srcsetOf(photo, "webp");
    webp.sizes = sizes;
    const img = document.createElement("img");
    img.src = `${baseOf(photo)}-720.webp`;
    img.srcset = srcsetOf(photo, "webp");
    img.sizes = sizes;
    img.alt = photo.alt || "";
    img.width = photo.width;
    img.height = photo.height;
    img.decoding = "async";
    img.loading = eager ? "eager" : "lazy";
    if (eager) img.fetchPriority = "high";
    // Arquivo ausente: mostra o espaço "Foto em produção" em vez de uma imagem quebrada.
    img.addEventListener("error", () => { if (picture.isConnected) picture.replaceWith(placeholderEl()); }, { once: true });
    picture.append(avif, webp, img);
    return picture;
  }

  const photoOf = (version) => (Array.isArray(version.fotos) && version.fotos.length ? version.fotos[0] : null);

  /* Moldura da foto (4:5) com troca suave entre versões e aviso "Imagem ilustrativa". */
  function mediaBox(version, { sizes = SIZES_CARD, eager = false } = {}) {
    const box = el("div", "eq-media");
    const layer = el("div", "eq-layer is-current");
    const badge = el("span", "ilus-badge", "Imagem ilustrativa");
    badge.dataset.ilustrativa = "";
    box.append(layer, badge);

    function fill(target, ver) {
      const photo = photoOf(ver);
      target.replaceChildren(photo ? pictureEl(photo, { sizes, eager }) : placeholderEl());
    }
    function setBadge(ver) {
      badge.hidden = !(ver.ilustrativa === true && photoOf(ver));
    }
    fill(layer, version);
    setBadge(version);

    return {
      element: box,
      show(next) {
        const incoming = el("div", "eq-layer");
        fill(incoming, next);
        box.insertBefore(incoming, badge);
        void incoming.offsetWidth;
        incoming.classList.add("is-current");
        box.querySelectorAll(".eq-layer.is-current").forEach((old) => { if (old !== incoming) old.classList.remove("is-current"); });
        setBadge(next);
        // Remove a camada antiga quando o fade termina (ou logo, se o movimento estiver reduzido).
        window.setTimeout(() => box.querySelectorAll(".eq-layer:not(.is-current)").forEach((old) => old.remove()), 450);
      },
    };
  }

  /* ---------- Seletor [ BASE DE AÇO ] [ BASE DE MADEIRA ] ----------
     role="radiogroup"/"radio", setas, Home, End, Tab e foco visível. Mesmo componente em todo o site. */
  function buildSelector(product, selectedKey, onChange) {
    const root = el("div", "ver-sel");
    root.dataset.produto = product.slug;
    const group = el("div", "ver-sel-group");
    group.setAttribute("role", "radiogroup");
    group.setAttribute("aria-label", `Acabamento da base: ${product.name}`);
    const buttons = product.versions.map((version) => {
      const button = el("button", "ver-sel-opt");
      button.type = "button";
      button.setAttribute("role", "radio");
      button.dataset.versao = version.key;
      button.textContent = version.label;
      return button;
    });
    group.append(...buttons);
    root.append(group);

    let current = selectedKey;
    function paint(key) {
      current = key;
      buttons.forEach((button) => {
        const active = button.dataset.versao === key;
        button.setAttribute("aria-checked", active ? "true" : "false");
        button.tabIndex = active ? 0 : -1;
      });
    }
    function select(key, focus) {
      const version = product.versions.find((item) => item.key === key);
      if (!version || key === current) { if (focus && version) buttons[product.versions.indexOf(version)].focus(); return; }
      paint(key);
      if (focus) buttons[product.versions.indexOf(version)].focus();
      onChange(version);
    }
    buttons.forEach((button, index) => {
      button.addEventListener("click", () => select(button.dataset.versao, false));
      button.addEventListener("keydown", (event) => {
        let target = null;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") target = (index + 1) % buttons.length;
        else if (event.key === "ArrowLeft" || event.key === "ArrowUp") target = (index - 1 + buttons.length) % buttons.length;
        else if (event.key === "Home") target = 0;
        else if (event.key === "End") target = buttons.length - 1;
        if (target === null) return;
        event.preventDefault();
        select(buttons[target].dataset.versao, true);
      });
    });
    paint(selectedKey);
    return { element: root, set: (key) => select(key, false), get: () => current };
  }

  /* ---------- WhatsApp: compra com mensagem pronta ---------- */
  function whatsappUrl(product, version) {
    const pagamento = hasCard(version)
      ? `${brl(version.precoPix)} no Pix ou ${version.parcelas}x de ${brl(version.valorParcela)} sem juros no cartão`
      : `${brl(version.precoPix)} no Pix`;
    // A cidade fica no fim: o cursor já para ali e o cliente só completa.
    const texto = `Olá! Vim pelo site e quero comprar o ${product.name} – ${version.label}: ${pagamento}. Qual o prazo de entrega? Minha cidade é: `;
    return `${WHATSAPP}?text=${encodeURIComponent(texto)}`;
  }

  /* ---------- Card da vitrine ---------- */
  function buildCard(product, { eager = false, headingLevel = 2 } = {}) {
    let version = versionOf(product, product.defaultVersion);
    const card = el("article", "eq-card");
    card.dataset.produto = product.slug;

    const media = mediaBox(version, { eager });
    const body = el("div", "eq-body");
    const title = el(`h${headingLevel}`, "eq-name");
    const link = el("a", "eq-link", product.name);
    link.href = productPath(product, version, true);
    title.append(link);
    const priceSlot = el("div", "eq-price-slot");
    priceSlot.append(priceEl(version));
    const cta = el("p", "eq-cta");
    cta.append(el("span", "", "Ver produto"), el("span", "eq-cta-arrow", "→"));
    cta.querySelector(".eq-cta-arrow").setAttribute("aria-hidden", "true");

    const selector = buildSelector(product, version.key, (next) => {
      version = next;
      priceSlot.replaceChildren(priceEl(version));
      swap(priceSlot);
      media.show(version);
      link.href = productPath(product, version, true);
      card.dataset.versao = version.key;
    });
    card.dataset.versao = version.key;

    body.append(el("p", "eq-category", product.category), title, selector.element, priceSlot, cta);
    card.append(media.element, body);
    return card;
  }

  /* ---------- Dados estruturados (SEO) gerados do cadastro ----------
     Uma Offer por versão, com o preço do Pix. Sem disponibilidade (estoque não informado). */
  const abs = (path) => new URL(path, location.origin).href;
  const ogImage = (version) => { const photo = photoOf(version); return photo ? abs(`${baseOf(photo)}-og.jpg`) : abs("assets/fort-domus-logo.png"); };

  function productLd(product) {
    return {
      "@type": "Product",
      name: product.name,
      description: product.summary,
      brand: { "@type": "Brand", name: "Fort Domus" },
      image: product.versions.map(ogImage),
      offers: product.versions.map((version) => ({
        "@type": "Offer",
        name: `${product.name} · ${version.label}`,
        price: (version.precoPix / 100).toFixed(2),
        priceCurrency: "BRL",
        url: abs(productPath(product, version)),
      })),
    };
  }

  function injectLd(data) {
    document.getElementById("fd-jsonld")?.remove();
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "fd-jsonld";
    script.textContent = JSON.stringify(Object.assign({ "@context": "https://schema.org" }, data));
    document.head.append(script);
  }

  /* ---------- Ganchos para páginas estáticas ----------
     O aviso "Imagem ilustrativa" e o "a partir de" dessas páginas também vêm do cadastro. */
  function initStaticHooks() {
    document.querySelectorAll("[data-ilus-id]").forEach((node) => {
      const [slug, key] = node.dataset.ilusId.split(":");
      const product = productBySlug(slug);
      const version = product && product.versions.find((item) => item.key === key);
      node.hidden = !(version && version.ilustrativa === true);
    });
    document.querySelectorAll("[data-min-pix]").forEach((node) => { node.textContent = `a partir de ${brl(minPix())} no Pix`; });
  }
  initStaticHooks();

  window.FortDomusCatalog = {
    products: PRODUCTS, brl, el, productBySlug, versionOf, hasCard, minPix, readKey, writeKey, productPath,
    priceEl, swap, pictureEl, placeholderEl, photoOf, mediaBox, buildSelector, whatsappUrl, buildCard,
    productLd, injectLd, ogImage, abs, SIZES_CARD,
  };
})();
