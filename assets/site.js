const isLocalFile = location.protocol === "file:";
const currentPage = isLocalFile ? location.pathname.split("/").pop() : location.pathname.replace(/^[/]{2,}/, "/");
const heroVideo = document.querySelector(".hero-background-video");
const heroVideoPlayButton = document.querySelector(".hero-video-play");
if (heroVideo && heroVideoPlayButton) {
  let playbackTimeout;
  const revealVideoPlayButton = () => {
    window.clearTimeout(playbackTimeout);
    heroVideoPlayButton.hidden = false;
    heroVideoPlayButton.setAttribute("aria-hidden", "false");
  };
  const hideVideoPlayButton = () => {
    window.clearTimeout(playbackTimeout);
    heroVideoPlayButton.hidden = true;
    heroVideoPlayButton.setAttribute("aria-hidden", "true");
  };
  const attemptVideoPlayback = () => {
    if (heroVideo.paused) heroVideo.play().catch(revealVideoPlayButton);
  };
  const startVideoPlayback = () => {
    heroVideo.play().catch(revealVideoPlayButton);
  };
  const heroSection = heroVideo.closest(".hero");
  heroVideo.autoplay = true;
  heroVideo.loop = true;
  heroVideo.muted = true;
  heroVideo.defaultMuted = true;
  heroVideo.playsInline = true;
  if (window.matchMedia("(max-width: 820px)").matches) revealVideoPlayButton();
  attemptVideoPlayback();
  playbackTimeout = window.setTimeout(() => {
    if (heroVideo.paused || heroVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      revealVideoPlayButton();
    }
  }, 6000);
  heroVideo.addEventListener("loadeddata", attemptVideoPlayback);
  heroVideo.addEventListener("canplay", attemptVideoPlayback);
  heroVideo.addEventListener("error", revealVideoPlayButton);
  heroVideo.addEventListener("pause", () => {
    if (!document.hidden && heroVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      revealVideoPlayButton();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) attemptVideoPlayback();
  });
  heroVideoPlayButton.addEventListener("click", startVideoPlayback);
  heroVideo.addEventListener("playing", () => {
    heroSection?.classList.add("is-video-playing");
    hideVideoPlayButton();
  });
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.setAttribute("href", `${currentPage}${link.getAttribute("href")}`);
});

if (isLocalFile) {
  const localPages = new Map([
    ["/", "index.html"],
    ["/produtos", "produtos.html"],
    ["/equipamentos", "equipamentos.html"],
    ["/produtos/organizador", "produto-organizador.html"],
    ["/duvidas", "duvidas.html"],
    ["/sobre-nos", "sobre-nos.html"],
    ["/politica-de-privacidade", "politica-de-privacidade.html"],
    ["/politica-de-devolucao-e-reembolso", "politica-de-devolucao-e-reembolso.html"],
    ["/politica-de-frete", "politica-de-frete.html"],
    ["/politica-de-pos-venda", "politica-de-pos-venda.html"],
    ["/politica-de-cookies", "politica-de-cookies.html"],
    ["/termos-de-uso", "termos-de-uso.html"],
    ["/confirmar-whatsapp", "confirmar-whatsapp.html"],
  ]);
  document.querySelectorAll('a[href^="/"]').forEach((link) => {
    const href = link.getAttribute("href");
    if (href.startsWith("#")) {
      link.setAttribute("href", `${currentPage}${href}`);
      return;
    }
    const match = href.match(/^\/([^?#]*)([?#].*)?$/);
    if (!match) return;
    const pathname = `/${match[1]}`.replace(/\/$/, "") || "/";
    const productSlug = pathname.match(/^\/produtos\/([^/]+)$/)?.[1];
    const localPage = localPages.get(pathname) || (productSlug && `produto.html?produto=${productSlug}`);
    if (localPage) link.setAttribute("href", `${localPage}${match[2] || ""}`);
  });
}

const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#main-nav");
const searchButton = document.querySelector(".search-toggle");
const searchPanel = document.querySelector("#search-panel");
const searchInput = document.querySelector("#site-search-input");

function setMenuOpen(isOpen) {
  if (!menuButton || !navigation) return;
  if (isOpen) setSearchOpen(false);
  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuButton.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
  navigation.classList.toggle("is-open", isOpen);
}

function setSearchOpen(isOpen) {
  if (!searchButton || !searchPanel) return;
  searchButton.setAttribute("aria-expanded", String(isOpen));
  searchButton.setAttribute("aria-label", isOpen ? "Fechar busca no site" : "Abrir busca no site");
  searchPanel.classList.toggle("is-open", isOpen);
  if (isOpen) {
    setMenuOpen(false);
    searchInput?.focus();
  }
}

menuButton?.addEventListener("click", () => {
  setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true");
});

navigation?.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenuOpen(false);
});

searchButton?.addEventListener("click", () => {
  setSearchOpen(searchButton.getAttribute("aria-expanded") !== "true");
});

document.querySelector(".mobile-menu-trigger")?.addEventListener("click", () => {
  setMenuOpen(menuButton?.getAttribute("aria-expanded") !== "true");
});

document.querySelector(".mobile-search-trigger")?.addEventListener("click", () => {
  setSearchOpen(true);
});

document.querySelector("#site-search-form")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = searchInput.value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const sections = [...document.querySelectorAll("main section")];
  const match = sections.find((section) => section.textContent.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").includes(query));
  const feedback = document.querySelector("#search-feedback");
  if (match) {
    feedback.textContent = `Encontramos conteúdo relacionado a “${searchInput.value.trim()}”.`;
    match.scrollIntoView({ behavior: "smooth", block: "start" });
    setSearchOpen(false);
  } else {
    feedback.textContent = "Não encontramos esse termo nesta página. Tente buscar por produto, dimensões, história ou contato.";
  }
});

const leadForm = document.querySelector("#lead-form");
if (leadForm) {
  const nameInput = leadForm.querySelector("#lead-name");
  const whatsappInput = leadForm.querySelector("#lead-whatsapp");
  const consentInput = leadForm.querySelector("#lead-consent");
  const honeypotInput = leadForm.querySelector("#lead-website");
  const submitButton = leadForm.querySelector(".lead-submit");
  const feedback = leadForm.querySelector("#lead-feedback");
  const captchaContainer = leadForm.querySelector("#lead-captcha");
  const captchaError = leadForm.querySelector("#lead-captcha-error");
  const defaultButtonText = submitButton.textContent;
  const validDdds = new Set([
    "11", "12", "13", "14", "15", "16", "17", "18", "19", "21", "22", "24", "27", "28",
    "31", "32", "33", "34", "35", "37", "38", "41", "42", "43", "44", "45", "46", "47",
    "48", "49", "51", "53", "54", "55", "61", "62", "63", "64", "65", "66", "67", "68",
    "69", "71", "73", "74", "75", "77", "79", "81", "82", "83", "84", "85", "86", "87",
    "88", "89", "91", "92", "93", "94", "95", "96", "97", "98", "99",
  ]);
  const SUCCESS_MESSAGE = "Cadastro realizado com sucesso! Em breve, a Fort Domus poderá entrar em contato com você pelo WhatsApp.";
  const ERROR_MESSAGE = "Não foi possível realizar seu cadastro. Verifique seus dados e tente novamente.";
  // Falha de conexão ou tempo esgotado (sem resposta do servidor).
  const NETWORK_ERROR_MESSAGE = "Não foi possível enviar seus dados agora. Verifique sua conexão e tente novamente.";
  // Mensagens por código HTTP da Edge Function; qualquer outro caso usa a mensagem genérica acima.
  const HTTP_ERROR_MESSAGES = {
    400: "Verifique seus dados e tente novamente.",
    429: "Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.",
    503: "Nosso serviço está temporariamente indisponível. Tente novamente mais tarde.",
  };
  let isSubmitting = false;
  let captchaToken = "";
  let captchaWidgetId = null;
  const config = window.FORT_DOMUS_SUPABASE_CONFIG;
  const supabaseUrl = config?.url?.trim().replace(/\/+$/, "");
  const publishableKey = config?.publishableKey?.trim();
  const turnstileSiteKey = config?.turnstileSiteKey?.trim();

  function setFieldError(input, message) {
    const error = leadForm.querySelector(`#${input.id}-error`);
    error.textContent = message;
    input.setAttribute("aria-invalid", String(Boolean(message)));
  }

  function formatBrazilianPhone(value) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length < 3) return digits ? `(${digits}` : "";
    if (digits.length < 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    const subscriber = digits.slice(2);
    const splitAt = digits.length > 10 ? 5 : 4;
    return `(${digits.slice(0, 2)}) ${subscriber.slice(0, splitAt)}-${subscriber.slice(splitAt)}`;
  }

  // Aceita DDD + número (com ou sem 55) e devolve DDD + número sem o 55 (formato de public.leads), ou null.
  function normalizeBrazilianWhatsapp(value) {
    let digits = value.replace(/\D/g, "");
    if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) digits = digits.slice(2);
    const subscriber = digits.slice(2);
    const valid = validDdds.has(digits.slice(0, 2))
      && ((subscriber.length === 8 && /^[2-5]\d{7}$/.test(subscriber))
        || (subscriber.length === 9 && /^9\d{8}$/.test(subscriber)));
    return valid ? digits : null;
  }

  function setLeadFeedback(message, state) {
    feedback.textContent = message;
    feedback.dataset.state = state;
  }

  function setSubmitting(active) {
    isSubmitting = active;
    submitButton.disabled = active;
    submitButton.setAttribute("aria-busy", String(active));
    if (active) {
      const spinner = document.createElement("span");
      spinner.className = "lead-spinner";
      spinner.setAttribute("aria-hidden", "true");
      submitButton.replaceChildren(spinner, document.createTextNode("Enviando..."));
    } else {
      submitButton.textContent = defaultButtonText;
    }
  }

  function setCaptchaToken(token) {
    captchaToken = token;
    if (token) captchaError.textContent = "";
  }

  function resetCaptcha() {
    captchaToken = "";
    if (captchaWidgetId !== null) window.turnstile?.reset(captchaWidgetId);
  }

  // O CAPTCHA só é exigido quando há uma chave de site configurada; sem ela
  // o formulário continua funcionando (a Edge Function aplica rate limit).
  function initializeCaptcha() {
    if (!turnstileSiteKey) return;
    const render = () => {
      if (!window.turnstile || captchaWidgetId !== null) return;
      captchaWidgetId = window.turnstile.render(captchaContainer, {
        sitekey: turnstileSiteKey,
        action: "lead_signup",
        callback: setCaptchaToken,
        "expired-callback": () => setCaptchaToken(""),
        "error-callback": () => {
          setCaptchaToken("");
          captchaError.textContent = "Não foi possível validar a proteção antirobô. Tente novamente.";
        },
      });
    };
    if (window.turnstile) {
      render();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = render;
    script.onerror = () => {
      captchaError.textContent = "A proteção antirobô não carregou. Recarregue a página e tente novamente.";
    };
    document.head.append(script);
  }

  whatsappInput.addEventListener("input", () => {
    whatsappInput.value = formatBrazilianPhone(whatsappInput.value);
    setFieldError(whatsappInput, "");
  });
  nameInput.addEventListener("input", () => setFieldError(nameInput, ""));
  consentInput.addEventListener("change", () => setFieldError(consentInput, ""));
  initializeCaptcha();

  leadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const nome = nameInput.value.trim().replace(/\s+/g, " ");
    const whatsapp = normalizeBrazilianWhatsapp(whatsappInput.value);
    const validName = nome.length >= 3 && nome.length <= 120 && /^\p{L}[\p{L}'’.-]*(?:\s+\p{L}[\p{L}'’.-]*)+$/u.test(nome);

    setFieldError(nameInput, validName ? "" : "Informe seu nome completo.");
    setFieldError(whatsappInput, whatsapp ? "" : "Informe um número válido com DDD.");
    setFieldError(consentInput, consentInput.checked ? "" : "Marque a autorização para continuar.");
    const needsCaptcha = Boolean(turnstileSiteKey) && !captchaToken;
    if (needsCaptcha) captchaError.textContent = "Conclua a verificação antirobô.";
    if (!validName || !whatsapp || !consentInput.checked || needsCaptcha) {
      setLeadFeedback("Revise os campos indicados antes de enviar.", "error");
      leadForm.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    if (!supabaseUrl || !publishableKey) {
      console.error("Configuração do Supabase ausente em assets/supabase-config.js.");
      setLeadFeedback(ERROR_MESSAGE, "error");
      return;
    }

    setSubmitting(true);
    setLeadFeedback("Enviando seu cadastro...", "pending");

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/submit-novidades`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          apikey: publishableKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome,
          whatsapp,
          autorizacaoContato: consentInput.checked,
          website: honeypotInput?.value ?? "",
          captchaToken,
        }),
      });
      const result = await response.json().catch(() => null);

      // Sucesso somente com confirmação explícita de que o registro foi gravado.
      if (!response.ok || result?.ok !== true) {
        console.error("O cadastro de novidades foi recusado pelo servidor.", response.status);
        setLeadFeedback(response.ok ? ERROR_MESSAGE : (HTTP_ERROR_MESSAGES[response.status] ?? ERROR_MESSAGE), "error");
        return;
      }

      leadForm.reset();
      setLeadFeedback(SUCCESS_MESSAGE, "success");
    } catch (error) {
      console.error("Erro de comunicação com o servidor de cadastro.", error);
      setLeadFeedback(NETWORK_ERROR_MESSAGE, "error");
    } finally {
      window.clearTimeout(timeout);
      setSubmitting(false);
      resetCaptcha();
    }
  });
}

const currentYear = document.querySelector("#current-year");
if (currentYear) currentYear.textContent = new Date().getFullYear();

const footerAccordionQuery = window.matchMedia("(max-width: 560px)");
const footerGroups = [...document.querySelectorAll(".footer-group")];
function updateFooterGroups(isMobile) {
  footerGroups.forEach((group) => {
    group.open = !isMobile;
  });
}
updateFooterGroups(footerAccordionQuery.matches);
footerAccordionQuery.addEventListener?.("change", (event) => updateFooterGroups(event.matches));

const pageSections = [...document.querySelectorAll("main > section")];
if (pageSections.length > 1) {
  const progressDots = document.createElement("nav");
  progressDots.className = "scroll-progress-dots";
  progressDots.setAttribute("aria-label", "Progresso da página");
  const dotButtons = pageSections.map((section, index) => {
    const heading = section.querySelector("h1, h2");
    const headingText = heading?.cloneNode(true);
    headingText?.querySelectorAll("br").forEach((lineBreak) => lineBreak.replaceWith(" "));
    const label = headingText?.textContent.trim().replace(/\s+/g, " ") || section.getAttribute("aria-label") || `Seção ${index + 1}`;
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", `Ir para: ${label}`);
    dot.title = label;
    dot.addEventListener("click", () => {
      section.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    });
    progressDots.append(dot);
    return dot;
  });
  document.body.append(progressDots);

  let activeSectionIndex = -1;
  let scrollFrame = 0;
  const updateProgressDots = () => {
    scrollFrame = 0;
    const activationLine = window.innerHeight * 0.42;
    const currentSectionIndex = pageSections.reduce((activeIndex, section, index) => (
      section.getBoundingClientRect().top <= activationLine ? index : activeIndex
    ), 0);
    if (currentSectionIndex === activeSectionIndex) return;
    activeSectionIndex = currentSectionIndex;
    dotButtons.forEach((dot, index) => {
      dot.classList.toggle("is-passed", index < activeSectionIndex);
      if (index === activeSectionIndex) dot.setAttribute("aria-current", "step");
      else dot.removeAttribute("aria-current");
    });
  };
  const scheduleProgressUpdate = () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(updateProgressDots);
  };
  window.addEventListener("scroll", scheduleProgressUpdate, { passive: true });
  window.addEventListener("resize", scheduleProgressUpdate, { passive: true });
  updateProgressDots();
}

const reviewCarousel = document.querySelector("[data-review-carousel]");
if (reviewCarousel) {
  const reviewTrack = reviewCarousel.querySelector("[data-review-track]");
  const reviewPages = [...reviewCarousel.querySelectorAll("[data-review-page]")];
  const previousButton = reviewCarousel.querySelector("[data-review-action='previous']");
  const nextButton = reviewCarousel.querySelector("[data-review-action='next']");
  const reviewCount = reviewCarousel.querySelector("[data-review-count]");
  let activeReviewPage = 0;

  function showReviewPage(index) {
    activeReviewPage = Math.max(0, Math.min(index, reviewPages.length - 1));
    reviewTrack.style.transform = `translateX(-${activeReviewPage * 100}%)`;
    reviewPages.forEach((reviewPage, pageIndex) => {
      reviewPage.setAttribute("aria-hidden", String(pageIndex !== activeReviewPage));
    });
    previousButton.disabled = activeReviewPage === 0;
    nextButton.disabled = activeReviewPage === reviewPages.length - 1;
    reviewCount.textContent = `${activeReviewPage + 1} / ${reviewPages.length}`;
  }

  previousButton.addEventListener("click", () => showReviewPage(activeReviewPage - 1));
  nextButton.addEventListener("click", () => showReviewPage(activeReviewPage + 1));
  showReviewPage(0);
}

const lightbox = document.querySelector("#gallery-lightbox");
if (lightbox) {
  const lightboxImage = lightbox.querySelector(".lightbox-image");
  const lightboxCount = lightbox.querySelector(".lightbox-count");
  const lightboxButtons = [...lightbox.querySelectorAll("[data-lightbox-action='previous'], [data-lightbox-action='next']")];
  let galleryImages = [];
  let activeImageIndex = 0;
  let lastGalleryTrigger = null;

  function showGalleryImage(index) {
    activeImageIndex = (index + galleryImages.length) % galleryImages.length;
    const image = galleryImages[activeImageIndex];
    lightboxImage.src = image.currentSrc || image.src;
    lightboxImage.alt = image.alt;
    lightboxCount.textContent = `${activeImageIndex + 1} / ${galleryImages.length}`;
    lightboxButtons.forEach((button) => {
      button.disabled = galleryImages.length < 2;
    });
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-gallery]");
    if (!trigger || !lightbox) return;
    event.preventDefault();
    const gallerySelector = trigger.dataset.gallerySource || "[data-gallery] img";
    galleryImages = [...new Map([...document.querySelectorAll(gallerySelector)].map((image) => [image.currentSrc || image.src, image])).values()];
    const selectedImage = trigger.querySelector("img");
    const selectedImageSrc = selectedImage.currentSrc || selectedImage.src;
    activeImageIndex = galleryImages.findIndex((image) => (image.currentSrc || image.src) === selectedImageSrc);
    if (activeImageIndex < 0) return;
    lastGalleryTrigger = trigger;
    showGalleryImage(activeImageIndex);
    lightbox.showModal();
  });

  lightbox.querySelector("[data-lightbox-action='close']")?.addEventListener("click", () => lightbox.close());
  lightbox.querySelector("[data-lightbox-action='previous']")?.addEventListener("click", () => showGalleryImage(activeImageIndex - 1));
  lightbox.querySelector("[data-lightbox-action='next']")?.addEventListener("click", () => showGalleryImage(activeImageIndex + 1));
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) lightbox.close();
  });
  lightbox.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" && galleryImages.length > 1) showGalleryImage(activeImageIndex - 1);
    if (event.key === "ArrowRight" && galleryImages.length > 1) showGalleryImage(activeImageIndex + 1);
  });
  lightbox.addEventListener("close", () => lastGalleryTrigger?.focus());
}

const revealElements = document.querySelectorAll("[data-reveal]");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.querySelectorAll(".material-grid, .product-gallery-grid, .story-gallery-grid").forEach((group) => {
  [...group.children].forEach((element, index) => {
    element.setAttribute("data-reveal", "");
    element.classList.add(`delay-${Math.min(index + 1, 5) * 100}`);
  });
});

document.querySelectorAll(".hero-grid > [data-reveal], .hero-grid > .hero-copy > [data-reveal]").forEach((element, index) => {
  element.classList.add(`delay-${Math.min(index + 1, 5) * 100}`);
});

if (window.matchMedia("(hover: hover) and (pointer: fine)").matches && !prefersReducedMotion) {
  document.querySelectorAll(".material-card, .catalog-card, .review-card, .home-highlight, .gallery-item, .catalog-card-photo, .home-product-photo").forEach((surface) => {
    surface.classList.add("flashlight-surface");
    surface.addEventListener("pointermove", (event) => {
      const bounds = surface.getBoundingClientRect();
      surface.style.setProperty("--mouse-x", `${event.clientX - bounds.left}px`);
      surface.style.setProperty("--mouse-y", `${event.clientY - bounds.top}px`);
    }, { passive: true });
  });
}

if ("IntersectionObserver" in window && !prefersReducedMotion) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  document.querySelectorAll("[data-reveal]").forEach((element) => revealObserver.observe(element));
  document.documentElement.classList.add("motion-ready");
} else {
  revealElements.forEach((element) => element.classList.add("is-visible"));
  document.querySelectorAll("[data-reveal]").forEach((element) => element.classList.add("is-visible"));
}
