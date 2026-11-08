/* PRÉVIA DO V-05 — NÃO É CÓDIGO DE PRODUÇÃO.
   Existe só na branch de demonstração. Simula as respostas do servidor de cadastro para você
   revisar cada tela. Nada é enviado a nenhum servidor e nenhum dado é gravado. */
(() => {
  const FN = "/functions/v1/submit-novidades";
  const CODE = "FD-7K3M-9QX2-H4TN";
  const scenarios = {
    sucesso: { label: "Cadastro novo, com confirmação (código vale 24 h)", status: 201, body: { ok: true, confirmation: { code: CODE, expiresInMinutes: 1440 } } },
    expira: { label: "Código que expira em 15 segundos (para ver a expiração)", status: 201, body: { ok: true, confirmation: { code: CODE, expiresInMinutes: 0.25 } } },
    lento: { label: "Resposta lenta (mostra o estado “Enviando…”)", delay: 5000, status: 201, body: { ok: true, confirmation: { code: CODE, expiresInMinutes: 1440 } } },
    antigo: { label: "Servidor de hoje (sem confirmação; mensagem atual)", status: 201, body: { ok: true } },
    invalido: { label: "Erro 400: dados recusados", status: 400, body: { ok: false } },
    limite: { label: "Erro 429: muitas tentativas", status: 429, body: { ok: false } },
    indisponivel: { label: "Erro 503: serviço indisponível", status: 503, body: { ok: false } },
    semconexao: { label: "Sem conexão com a internet", network: true },
  };
  const current = new URLSearchParams(location.search).get("cenario");
  const scenario = scenarios[current] ? current : "sucesso";

  const original = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    if (!String(url).includes(FN)) return original(input, init);
    const s = scenarios[scenario];
    await new Promise((resolve) => setTimeout(resolve, s.delay ?? 700));
    if (s.network) throw new TypeError("Failed to fetch");
    return new Response(JSON.stringify(s.body), { status: s.status, headers: { "Content-Type": "application/json" } });
  };

  const panel = document.createElement("details");
  panel.setAttribute("aria-label", "Cenários da prévia");
  Object.assign(panel.style, {
    position: "fixed", right: "10px", bottom: "10px", zIndex: "9999", maxWidth: "min(340px, calc(100vw - 20px))",
    background: "#000000ee", color: "#fff", border: "1px solid #888", borderRadius: "4px", padding: "8px 10px",
    font: "12px/1.5 system-ui, sans-serif",
  });
  const summary = document.createElement("summary");
  summary.textContent = "PRÉVIA V-05 · dados simulados · cenário: " + scenarios[scenario].label;
  summary.style.cursor = "pointer";
  panel.append(summary);
  const note = document.createElement("p");
  note.textContent = "Nada é enviado a nenhum servidor. Escolha um cenário, marque a autorização e toque em “Enviar cadastro”.";
  note.style.margin = "8px 0";
  panel.append(note);
  for (const [key, s] of Object.entries(scenarios)) {
    const link = document.createElement("a");
    link.href = `?cenario=${key}#lead-signup-title`;
    link.textContent = (key === scenario ? "▶ " : "") + s.label;
    Object.assign(link.style, { display: "block", padding: "3px 0", color: key === scenario ? "#9fd08a" : "#fff", textDecoration: "underline" });
    panel.append(link);
  }
  document.addEventListener("DOMContentLoaded", () => document.body.append(panel));
  if (document.readyState !== "loading") document.body.append(panel);

  window.addEventListener("load", () => {
    const name = document.querySelector("#lead-name");
    const phone = document.querySelector("#lead-whatsapp");
    if (name && !name.value) name.value = "Maria Silva Teste";
    if (phone && !phone.value) { phone.value = "(83) 99999-0000"; }
    if (current) document.querySelector("#lead-signup-title")?.scrollIntoView();
  });
})();
