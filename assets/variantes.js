/*
  Seletor de versões dos produtos Fort Domus (acabamento da base: aço ou madeira).

  Cada versão é uma variação independente do produto, com id estável "<slug>:<chave>" e preço em centavos
  (ver assets/products-data.js). Este arquivo só cuida da exibição: formata os preços, monta o seletor e
  mantém a versão escolhida na URL (?versao=madeira), sem recarregar a página.

  Importante: o preço mostrado aqui é apenas informativo. Qualquer cobrança futura deve receber só o id da
  versão e a quantidade, e o servidor deve buscar o preço numa tabela própria, nunca no navegador.
*/
(() => {
  "use strict";

  const PARAM = "versao";

  // R$ com milhar em ponto e centavos em vírgula (sem depender do idioma do navegador).
  function brl(cents) {
    const total = Math.round(Number(cents));
    const reais = Math.floor(total / 100);
    const centavos = String(total % 100).padStart(2, "0");
    return `R$ ${String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${centavos}`;
  }

  const variantsOf = (product) => (product && Array.isArray(product.variants) ? product.variants : []);

  // Versão pedida (se existir); senão a padrão do produto; senão a primeira.
  function pick(product, key) {
    const list = variantsOf(product);
    return list.find((item) => item.key === key)
      || list.find((item) => item.key === product.defaultVariant)
      || list[0]
      || null;
  }

  // Só aceita letras minúsculas curtas vindas da URL; qualquer outra coisa é ignorada.
  function readKey() {
    const value = new URLSearchParams(location.search).get(PARAM);
    return /^[a-z]{1,16}$/.test(value || "") ? value : null;
  }

  function writeKey(product, variant) {
    try {
      const url = new URL(location.href);
      if (variant.key === product.defaultVariant) url.searchParams.delete(PARAM);
      else url.searchParams.set(PARAM, variant.key);
      history.replaceState(history.state, "", url);
    } catch (error) { /* sem histórico (ex.: arquivo local): a página funciona igual */ }
  }

  // Textos de preço da versão. O cartão só aparece quando o valor está definido e divide em parcelas exatas.
  function priceView(product, variant) {
    const parcelas = product.price && product.price.installments;
    const view = { cash: brl(variant.pixCents), card: null, cardPerInstallment: null, cardTotal: null };
    if (Number.isInteger(variant.cardCents) && Number.isInteger(parcelas) && parcelas > 0 && variant.cardCents % parcelas === 0) {
      view.cardPerInstallment = `${parcelas}x de ${brl(variant.cardCents / parcelas)}`;
      view.card = `${view.cardPerInstallment} sem juros`;
      view.cardTotal = `Total de ${brl(variant.cardCents)}`;
    }
    return view;
  }

  // Reinicia a animação suave de troca (respeita "reduzir movimento" pelo CSS).
  function swap(node) {
    if (!node) return;
    node.classList.remove("is-swapping");
    void node.offsetWidth;
    node.classList.add("is-swapping");
  }

  function text(tag, className, content) {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = content;
    return node;
  }

  /* Seletor visual: duas opções sempre visíveis, com teclado (setas, Home e End) e leitor de tela. */
  function buildPicker(product, selectedKey, onChange) {
    const list = variantsOf(product);
    const root = document.createElement("div");
    root.className = "variant-picker";
    root.dataset.variantPicker = product.slug;

    const current = text("span", "variant-picker-current", "");
    current.setAttribute("aria-live", "polite");
    const head = document.createElement("div");
    head.className = "variant-picker-head";
    head.append(text("span", "variant-picker-label", "Acabamento"), current);

    const group = document.createElement("div");
    group.className = "variant-options";
    group.setAttribute("role", "radiogroup");
    group.setAttribute("aria-label", "Acabamento da base");

    const buttons = list.map((variant) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "variant-option";
      button.setAttribute("role", "radio");
      button.dataset.variant = variant.key;
      button.setAttribute("aria-label", `${variant.label}, ${brl(variant.pixCents)} no Pix`);
      button.append(text("span", "variant-option-name", variant.label), text("span", "variant-option-price", brl(variant.pixCents)));
      return button;
    });
    group.append(...buttons);
    root.append(head, group);

    function paint(key) {
      buttons.forEach((button, index) => {
        const active = button.dataset.variant === key;
        button.setAttribute("aria-checked", active ? "true" : "false");
        button.tabIndex = active ? 0 : -1;
        if (active) current.textContent = list[index].label;
      });
    }
    function select(key, focus) {
      const variant = list.find((item) => item.key === key);
      if (!variant) return;
      const changed = group.querySelector('[aria-checked="true"]')?.dataset.variant !== key;
      paint(key);
      if (focus) buttons[list.indexOf(variant)].focus();
      if (changed) onChange(variant);
    }

    buttons.forEach((button, index) => {
      button.addEventListener("click", () => select(button.dataset.variant, false));
      button.addEventListener("keydown", (event) => {
        let target = null;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") target = (index + 1) % buttons.length;
        else if (event.key === "ArrowLeft" || event.key === "ArrowUp") target = (index - 1 + buttons.length) % buttons.length;
        else if (event.key === "Home") target = 0;
        else if (event.key === "End") target = buttons.length - 1;
        if (target === null) return;
        event.preventDefault();
        select(buttons[target].dataset.variant, true);
      });
    });

    paint(selectedKey);
    return { element: root, select: (key) => select(key, false) };
  }

  window.FortDomusVariants = { brl, pick, readKey, writeKey, priceView, swap, buildPicker };

  /* Página estática do Organizador Tático (/produtos/organizador): o preço é HTML fixo e o seletor o atualiza. */
  function initStatic() {
    const panel = document.querySelector("[data-variant-product]");
    if (!panel) return;
    const product = (window.FORT_DOMUS_PRODUCTS || []).find((item) => item.slug === panel.dataset.variantProduct);
    const slot = panel.querySelector("[data-variant-slot]");
    const cash = panel.querySelector(".price-cash strong");
    const cardBox = panel.querySelector(".price-card");
    if (!product || !variantsOf(product).length || !slot || !cash || !cardBox) return;
    const cardStrong = cardBox.querySelector("strong");
    const cardTotal = cardBox.querySelector("small");

    let variant = pick(product, readKey());
    function render() {
      const view = priceView(product, variant);
      cash.textContent = view.cash;
      cardBox.hidden = !view.card;
      if (view.card) {
        cardStrong.textContent = view.cardPerInstallment;
        cardTotal.textContent = view.cardTotal;
      }
      panel.dataset.variantId = variant.id;
      panel.dataset.variantPixCents = String(variant.pixCents);
    }
    const picker = buildPicker(product, variant.key, (next) => {
      variant = next;
      render();
      writeKey(product, variant);
      swap(panel.querySelector(".price"));
    });
    slot.replaceChildren(picker.element);
    render();
  }

  initStatic();
})();
