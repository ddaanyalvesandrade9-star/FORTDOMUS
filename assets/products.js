(() => {
  const products = window.FORT_DOMUS_PRODUCTS || [];
  const WHATSAPP = "https://wa.me/5583987234968";
  const MIN_PHOTOS = 5;
  const MIN_VIDEOS = 2;
  const isLocalFile = location.protocol === "file:";
  const SVG_NS = "http://www.w3.org/2000/svg";

  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(props).forEach(([key, value]) => {
      if (value === null || value === undefined || value === false) return;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key === "dataset") Object.assign(node.dataset, value);
      else node.setAttribute(key, value === true ? "" : value);
    });
    [].concat(children).forEach((child) => {
      if (child) node.append(child);
    });
    return node;
  }

  function icon(path, className) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    if (className) svg.setAttribute("class", className);
    const shape = document.createElementNS(SVG_NS, "path");
    shape.setAttribute("d", path);
    svg.append(shape);
    return svg;
  }

  const productUrl = (product) => `/produtos/${product.slug}`;
  const whatsappUrl = (product) => `${WHATSAPP}?text=${encodeURIComponent(`Olá! Tenho interesse no ${product.name} e gostaria de conhecer melhor as opções disponíveis e seus valores.`)}`;
  const placeholder = (label, hint) => el("div", { class: "photo-slot" }, [
    el("span", { class: "photo-icon", "aria-hidden": "true" }),
    el("strong", { text: label }),
    el("span", { text: hint }),
  ]);

  /* ---------- Lista de produtos (/produtos) ---------- */
  const grid = document.querySelector("[data-product-grid]");
  if (grid) {
    grid.replaceChildren(...products.map((product) => {
      const image = product.cardImage;
      const photo = el("a", { class: "catalog-card-photo", href: productUrl(product), "aria-label": `Conhecer ${product.name}` },
        image
          ? el("img", { src: image.src, alt: image.alt, width: image.width, height: image.height, loading: grid.children.length ? "lazy" : null })
          : placeholder("Fotografia em breve", "Espaço para a fotografia do produto"));
      const copy = el("div", { class: "catalog-card-copy" }, [
        el("span", { class: "eyebrow", text: product.cardEyebrow || product.eyebrow }),
        el("h2", { text: product.name }),
        el("p", { text: product.summary || "Informações e fotografias em breve." }),
        el("a", { class: "button", href: productUrl(product) }, ["Conhecer produto ", el("span", { "aria-hidden": "true", text: "↗" })]),
      ]);
      return el("article", { class: "catalog-card", "data-reveal": "" }, [photo, copy]);
    }));
    // A primeira imagem carrega com prioridade; as demais sob demanda.
    grid.querySelector("img")?.setAttribute("fetchpriority", "high");
  }

  /* ---------- Página individual (/produtos/<slug>) ---------- */
  const page = document.querySelector("[data-product-page]");
  if (!page) return;

  const slug = isLocalFile
    ? new URLSearchParams(location.search).get("produto")
    : location.pathname.replace(/\/+$/, "").split("/").pop();
  const product = products.find((item) => item.slug === slug);

  if (!product) {
    page.replaceChildren(el("div", { class: "product-missing" }, [
      el("span", { class: "eyebrow", text: "Produto não encontrado" }),
      el("h1", { text: "Não encontramos esse produto." }),
      el("a", { class: "button", href: "/produtos" }, "Ver todos os produtos"),
    ]));
    return;
  }

  document.title = `${product.name} | Fort Domus`;
  document.querySelector('meta[name="description"]')?.setAttribute("content", product.summary || `Conheça o ${product.name} da Fort Domus.`);

  /* Galeria de fotografias */
  const photos = [...product.photos];
  while (photos.length < MIN_PHOTOS) photos.push({ label: `Foto ${photos.length + 1}` });
  let activePhoto = 0;

  const mainImage = el("img", { class: "pg-main-image", alt: "", decoding: "async" });
  const mainButton = el("button", { class: "pg-main-button", type: "button", "data-gallery": "", "data-gallery-source": ".pg-thumb img", "aria-label": `Ampliar foto do ${product.name}` }, mainImage);
  const mainEmpty = el("div", { class: "pg-main-empty" });
  const counter = el("span", { class: "pg-counter", "aria-live": "polite" });
  const previous = el("button", { class: "pg-arrow pg-arrow-previous", type: "button", "aria-label": "Foto anterior" }, icon("m15 5-7 7 7 7"));
  const next = el("button", { class: "pg-arrow pg-arrow-next", type: "button", "aria-label": "Próxima foto" }, icon("m9 5 7 7-7 7"));
  const stage = el("div", { class: "pg-stage", tabindex: "0", role: "group", "aria-roledescription": "galeria", "aria-label": `Fotografias de ${product.name}` }, [mainButton, mainEmpty, previous, next, counter]);

  const thumbButtons = photos.map((photo, index) => {
    const content = photo.src
      ? el("img", { src: photo.src, alt: photo.alt || `${product.name}, foto ${index + 1}`, width: photo.width, height: photo.height, loading: "lazy", decoding: "async" })
      : el("span", { class: "pg-thumb-empty", "aria-hidden": "true" }, el("span", { class: "photo-icon" }));
    return el("button", { class: "pg-thumb", type: "button", "aria-label": `Ver foto ${index + 1}${photo.src ? "" : " (em breve)"}` }, content);
  });
  const thumbs = el("div", { class: "pg-thumbs", role: "group", "aria-label": "Miniaturas" }, thumbButtons);

  function showPhoto(index) {
    activePhoto = (index + photos.length) % photos.length;
    const photo = photos[activePhoto];
    thumbButtons.forEach((button, i) => {
      if (i === activePhoto) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    });
    thumbButtons[activePhoto].scrollIntoView({ block: "nearest", inline: "nearest" });
    counter.textContent = `${activePhoto + 1} / ${photos.length}`;
    mainButton.hidden = !photo.src;
    mainEmpty.hidden = Boolean(photo.src);
    if (photo.src) {
      mainImage.src = photo.src;
      mainImage.alt = photo.alt || `${product.name}, foto ${activePhoto + 1}`;
      if (photo.width) mainImage.width = photo.width;
      if (photo.height) mainImage.height = photo.height;
    } else {
      mainEmpty.replaceChildren(placeholder(photo.label || `Foto ${activePhoto + 1}`, "Espaço para fotografia real do produto"));
    }
  }

  thumbButtons.forEach((button, index) => button.addEventListener("click", () => showPhoto(index)));
  previous.addEventListener("click", () => showPhoto(activePhoto - 1));
  next.addEventListener("click", () => showPhoto(activePhoto + 1));
  stage.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") showPhoto(activePhoto - 1);
    if (event.key === "ArrowRight") showPhoto(activePhoto + 1);
  });
  let swipeStartX = null;
  stage.addEventListener("pointerdown", (event) => { swipeStartX = event.pointerType === "touch" ? event.clientX : null; });
  stage.addEventListener("pointerup", (event) => {
    if (swipeStartX === null) return;
    const delta = event.clientX - swipeStartX;
    swipeStartX = null;
    if (Math.abs(delta) > 50) showPhoto(activePhoto + (delta < 0 ? 1 : -1));
  });

  const gallery = el("div", { class: "pg", "data-reveal": "" }, [thumbs, stage]);

  /* Informações do produto */
  const soon = () => el("p", { class: "pi-soon", text: "Informação em breve." });
  const block = (title, content) => el("section", { class: "pi-block" }, [el("h2", { text: title }), content || soon()]);
  const list = (items) => items.length ? el("ul", { class: "pi-list" }, items.map((item) => el("li", { text: item }))) : null;

  const specList = product.specs.length
    ? el("dl", { class: "pi-specs" }, product.specs.flatMap((spec) => [el("dt", { text: spec.label }), el("dd", { text: spec.value })]))
    : null;
  const dimensions = product.dimensions.length
    ? el("div", { class: "specs", style: `grid-template-columns: repeat(${Math.min(product.dimensions.length, 3)}, minmax(0, 1fr))`, "aria-label": "Dimensões" },
      product.dimensions.map((item) => el("div", { class: "spec" }, [el("strong", { text: item.value }), el("span", { text: item.label })])))
    : null;

  let priceBlock;
  if (product.price) {
    const price = product.price;
    priceBlock = el("div", { class: "pi-price" }, [
      price.cash
        ? el("div", { class: "pi-price-cash" }, [el("span", { class: "pi-price-label", text: price.cashLabel }), el("strong", { text: price.cash })])
        : el("p", { class: "pi-price-note", text: "Valor sob consulta. Fale com a gente pelo WhatsApp." }),
      price.card && el("div", { class: "pi-price-card" }, [
        el("span", { class: "pi-price-label", text: price.cardLabel }),
        el("strong", { text: price.card }),
        price.cardTotal && el("small", { text: price.cardTotal }),
      ]),
      price.note && el("p", { class: "pi-price-note", text: price.note }),
    ]);
  } else {
    priceBlock = el("div", { class: "pi-price" }, el("p", { class: "pi-price-note", text: "Valor sob consulta. Fale com a gente pelo WhatsApp." }));
  }

  const info = el("div", { class: "product-info", "data-reveal": "" }, [
    el("span", { class: "eyebrow", text: product.eyebrow }),
    el("h1", { text: product.name }),
    priceBlock,
    product.description && el("p", { class: "pi-description", text: product.description }),
    block("Principais características", list(product.features)),
    block("Dimensões", dimensions),
    block("Especificações técnicas", specList),
    block("Material de fabricação", product.material ? el("p", { text: product.material }) : null),
    block("Diferenciais", list(product.differentials)),
    el("a", { class: "button pi-cta", href: whatsappUrl(product), target: "_blank", rel: "noopener noreferrer" }, ["SOLICITAR ORÇAMENTO ", el("span", { "aria-hidden": "true", text: "↗" })]),
  ]);

  const back = el("a", { class: "product-back", href: "/produtos" }, [icon("m15 5-7 7 7 7"), "Todos os produtos"]);
  page.replaceChildren(back, el("div", { class: "product-catalog-grid" }, [gallery, info]));
  showPhoto(0);
  mainImage.setAttribute("fetchpriority", "high");

  /* Galeria de vídeos */
  const videoSection = document.querySelector("[data-product-videos]");
  if (videoSection) {
    const videos = [...product.videos];
    while (videos.length < MIN_VIDEOS) videos.push({ title: `Vídeo demonstrativo ${videos.length + 1}` });
    const frames = [];

    function stopOthers(except) {
      frames.forEach((frame) => {
        if (frame === except) return;
        const video = frame.querySelector("video");
        if (video) { video.pause(); frame.restore(); }
      });
    }

    const playIcon = () => el("span", { class: "pv-play-icon", "aria-hidden": "true" }, icon("M8 5v14l11-7z"));

    const items = videos.map((video, index) => {
      const frame = el("div", { class: "pv-frame" });
      const title = video.title || `Vídeo demonstrativo ${index + 1}`;
      if (!video.src) {
        frame.classList.add("is-empty");
        frame.append(placeholder(title, "Espaço para vídeo demonstrativo"), playIcon());
      } else {
        frame.restore = () => {
          const trigger = el("button", { class: "pv-trigger", type: "button", "aria-label": `Reproduzir: ${title}` }, [
            video.poster && el("img", { src: video.poster, alt: "", loading: "lazy", decoding: "async" }),
            playIcon(),
          ]);
          trigger.addEventListener("click", () => {
            stopOthers(frame);
            const player = el("video", { controls: true, playsinline: true, preload: "metadata", poster: video.poster, "aria-label": title, src: video.src });
            frame.replaceChildren(player);
            player.play().catch(() => {});
          });
          frame.replaceChildren(trigger);
        };
        frame.restore();
      }
      frames.push(frame);
      return el("figure", { class: "pv-item" }, [frame, el("figcaption", { text: title })]);
    });

    videoSection.querySelector("[data-product-video-grid]").replaceChildren(...items);
    videoSection.hidden = false;
  }
})();
