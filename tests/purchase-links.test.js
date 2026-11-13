"use strict";
// Guarda de segurança dos destinos de pagamento/contato.
// Falha se qualquer link de compra ou número de WhatsApp do site for diferente do aprovado.
// Para trocar um destino de propósito: altere AQUI e no products-data.js, e revise o diff antes de publicar.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const APPROVED_STORE_LINKS = new Set([
  "https://loja.infinitepay.io/fortdomus/ppv1252-organizador-tatico",
  "https://loja.infinitepay.io/fortdomus/rqy1187-organizador-tatico",
  "https://loja.infinitepay.io/fortdomus/njg8682-organizador-tatico-cofre-senha",
  "https://loja.infinitepay.io/fortdomus/vvv4494-organizador-tatico-cofre-senha-copia",
  "https://loja.infinitepay.io/fortdomus/ymx0493-organizador-tatico-cofre-biometrico",
  "https://loja.infinitepay.io/fortdomus/cqy6913-organizador-tatico-com-cofre",
]);
const APPROVED_WHATSAPP = "5583999018926";

// Arquivos que o site publica (a Vercel ignora api/, tests/, docs/, etc. — ver .vercelignore).
const PUBLISHED = [];
for (const file of fs.readdirSync(ROOT)) if (file.endsWith(".html")) PUBLISHED.push(path.join(ROOT, file));
for (const file of fs.readdirSync(path.join(ROOT, "assets"))) if (file.endsWith(".js")) PUBLISHED.push(path.join(ROOT, "assets", file));
const IGNORED = /(^|[\\/])(comprar|pedido|admin|design[-_]system4?|index\(1\)|confirmar-whatsapp|checkout|pedido|admin|confirm-lead)\.(html|js)$/i;
const FILES = PUBLISHED.filter((file) => !IGNORED.test(file));

test("lojaUrl de cada versão é um dos 3 links aprovados", () => {
  const source = fs.readFileSync(path.join(ROOT, "assets", "products-data.js"), "utf8");
  const urls = [...source.matchAll(/lojaUrl:\s*"([^"]*)"/g)].map((m) => m[1]).filter(Boolean);
  // 5 ou 6: a versão Biométrico/aço pode ficar sem link (botão cai no WhatsApp) até a loja ter estoque.
  assert.ok(urls.length >= 5 && urls.length <= 6, "esperado 5 ou 6 versões com link");
  for (const url of urls) assert.ok(APPROVED_STORE_LINKS.has(url), `link não aprovado: ${url}`);
});

test("nenhum outro endereço de pagamento aparece nos arquivos publicados", () => {
  for (const file of FILES) {
    const text = fs.readFileSync(file, "utf8");
    for (const match of text.matchAll(/https?:\/\/[^\s"'<>)]*infinitepay[^\s"'<>)]*/gi)) {
      const url = match[0].replace(/[.,;]+$/, "");
      assert.ok(APPROVED_STORE_LINKS.has(url), `${path.basename(file)} cita endereço de pagamento não aprovado: ${url}`);
    }
  }
});

test("todo número de WhatsApp publicado é o aprovado", () => {
  for (const file of FILES) {
    const text = fs.readFileSync(file, "utf8");
    for (const match of text.matchAll(/wa\.me\/(\d+)/g)) {
      assert.equal(match[1], APPROVED_WHATSAPP, `${path.basename(file)} usa outro número: ${match[1]}`);
    }
    for (const match of text.matchAll(/api\.whatsapp\.com\/send\?phone=(\d+)/g)) {
      assert.equal(match[1], APPROVED_WHATSAPP, `${path.basename(file)} usa outro número: ${match[1]}`);
    }
  }
});

test("página publicada não carrega script de domínio externo além do Cloudflare Turnstile", () => {
  for (const file of FILES.filter((f) => f.endsWith(".html"))) {
    const text = fs.readFileSync(file, "utf8");
    for (const match of text.matchAll(/<script[^>]+src=["'](https?:)?\/\/([^/"']+)/gi)) {
      assert.equal(match[2], "challenges.cloudflare.com", `${path.basename(file)} carrega script externo de ${match[2]}`);
    }
  }
});

test("vercel.json mantém os cabeçalhos de proteção", () => {
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
  const headers = Object.fromEntries(config.headers[0].headers.map((h) => [h.key, h.value]));
  assert.match(headers["Content-Security-Policy"], /script-src 'self'/);
  assert.doesNotMatch(headers["Content-Security-Policy"], /unsafe-eval|script-src[^;]*'unsafe-inline'/);
  assert.match(headers["Content-Security-Policy"], /frame-ancestors 'none'/);
  assert.match(headers["Content-Security-Policy"], /form-action 'self'/);
  assert.match(headers["Strict-Transport-Security"], /max-age=\d{7,}/);
  assert.equal(headers["X-Frame-Options"], "DENY");
});

test(".vercelignore continua impedindo a publicação de api/, admin e checkout", () => {
  const ignore = fs.readFileSync(path.join(ROOT, ".vercelignore"), "utf8");
  for (const entry of ["/api/", "/admin*", "/comprar*", "/pedido*", "/.env*"]) {
    assert.ok(ignore.includes(entry), `.vercelignore perdeu ${entry}`);
  }
});
