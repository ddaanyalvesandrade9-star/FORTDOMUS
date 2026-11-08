// Testes do núcleo da função submit-novidades com dependências simuladas (sem rede, sem banco, sem Deno).
// Rodar: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { type Deps, handleSubmit, type RpcResult } from "../supabase/functions/_shared/submit-novidades-core.ts";
import { canonicalCode, CODE_PATTERN, confirmationCodeHash, generateConfirmationCode } from "../supabase/functions/_shared/confirmacao.ts";

const SITE = "https://fortdomus.vercel.app";
const BASE_ENV: Record<string, string> = {
  ALLOWED_ORIGINS: SITE,
  SUPABASE_URL: "https://exemplo.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "valor-ficticio-de-teste",
  RATE_LIMIT_HMAC_SECRET: "x".repeat(40),
};

interface Harness { deps: Deps; calls: { name: string; args: Record<string, unknown> }[]; logs: string[]; }
function harness(env: Record<string, string> = {}, rpcImpl?: (name: string, args: Record<string, unknown>) => RpcResult | Promise<RpcResult>, fetchImpl?: typeof fetch): Harness {
  const calls: Harness["calls"] = [];
  const logs: string[] = [];
  const deps: Deps = {
    env: (name) => ({ ...BASE_ENV, ...env })[name],
    fetch: fetchImpl ?? (async () => { throw new Error("fetch não deveria ser chamado"); }),
    now: () => Date.now(),
    log: (message, detail) => logs.push(detail === undefined ? message : `${message} ${detail}`),
    rpc: async (name, args) => {
      calls.push({ name, args });
      if (rpcImpl) return rpcImpl(name, args);
      if (name === "consume_lead_rate_limit") return { data: true, error: null };
      return { data: true, error: null };
    },
  };
  return { deps, calls, logs };
}
function post(payload: unknown, { origin = SITE, ip = "203.0.113.7", type = "application/json", method = "POST" } = {}): Request {
  const headers: Record<string, string> = { "content-type": type };
  if (origin) headers.origin = origin;
  if (ip) headers["cf-connecting-ip"] = ip;
  return new Request("https://exemplo.supabase.co/functions/v1/submit-novidades", {
    method, headers, body: method === "POST" ? (typeof payload === "string" ? payload : JSON.stringify(payload)) : undefined,
  });
}
const VALID = { nome: "Maria Silva Teste", whatsapp: "83999990000", autorizacaoContato: true, website: "" };
const rpcNames = (h: Harness) => h.calls.map((c) => c.name);

test("legado (LEAD_CONFIRMATION desligado): 201 {ok:true}, usa register_lead e NÃO devolve código", async () => {
  const h = harness();
  const res = await handleSubmit(post(VALID), h.deps);
  assert.equal(res.status, 201);
  assert.deepEqual(await res.json(), { ok: true });
  assert.ok(rpcNames(h).includes("register_lead"));
  assert.ok(!rpcNames(h).includes("register_lead_pending"));
});

test("com confirmação: 201 com código no formato certo, validade de 24h e só o HASH vai ao banco", async () => {
  const h = harness({ LEAD_CONFIRMATION: "on" });
  const res = await handleSubmit(post(VALID), h.deps);
  assert.equal(res.status, 201);
  assert.equal(res.headers.get("cache-control"), "no-store");
  const body = await res.json() as { ok: boolean; confirmation: { code: string; expiresInMinutes: number } };
  assert.equal(body.ok, true);
  assert.match(body.confirmation.code, CODE_PATTERN);
  assert.equal(body.confirmation.expiresInMinutes, 1440);
  const pending = h.calls.find((c) => c.name === "register_lead_pending")!;
  assert.ok(pending, "register_lead_pending deve ser chamado");
  const expectedHash = createHash("sha256").update(canonicalCode(body.confirmation.code)).digest("hex");
  assert.equal(pending.args.p_code_hash, expectedHash);
  assert.equal(pending.args.p_ttl_minutes, 1440);
  assert.ok(!JSON.stringify(pending.args).includes(body.confirmation.code), "o código em texto puro não pode ir ao banco");
  assert.ok(!JSON.stringify(pending.args).includes(canonicalCode(body.confirmation.code)), "nem a forma canônica");
  assert.ok(!rpcNames(h).includes("register_lead"));
});

test("número já cadastrado (rpc devolve false) recebe a MESMA resposta com código: sem enumeração de números", async () => {
  const h = harness({ LEAD_CONFIRMATION: "on" }, (name) => ({ data: name === "register_lead_pending" ? false : true, error: null }));
  const res = await handleSubmit(post(VALID), h.deps);
  assert.equal(res.status, 201);
  const body = await res.json() as { confirmation?: { code: string } };
  assert.match(body.confirmation?.code ?? "", CODE_PATTERN);
});

test("códigos: formato, alfabeto sem I/L/O/U, 5.000 códigos sem repetição e distribuição uniforme", () => {
  const seen = new Set<string>();
  const counts = new Map<string, number>();
  for (let i = 0; i < 5000; i++) {
    const code = generateConfirmationCode();
    assert.match(code, CODE_PATTERN);
    assert.ok(!seen.has(code), "código repetido");
    seen.add(code);
    for (const ch of code.slice(3).replaceAll("-", "")) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }
  assert.equal(counts.size, 32, "todos os 32 símbolos devem aparecer");
  for (const forbidden of "ILOU") assert.ok(!counts.has(forbidden));
  const expected = (5000 * 12) / 32;
  for (const [ch, n] of counts) assert.ok(Math.abs(n - expected) / expected < 0.08, `símbolo ${ch} fora do esperado (${n} vs ${expected})`);
});

test("gerador descarta bytes >= 224 (sem viés): bytes só altos não produzem código", () => {
  let calls = 0;
  const code = generateConfirmationCode((n) => { calls++; return calls < 4 ? new Uint8Array(n).fill(255) : new Uint8Array(n).map((_, i) => i); });
  assert.match(code, CODE_PATTERN);
  assert.ok(calls >= 4);
});

test("hash é estável para variações de digitação (minúsculas, sem hífen)", async () => {
  const code = generateConfirmationCode();
  const a = await confirmationCodeHash(code);
  assert.equal(await confirmationCodeHash(code.toLowerCase()), a);
  assert.equal(await confirmationCodeHash(code.replaceAll("-", " ")), a);
  assert.match(a, /^[0-9a-f]{64}$/);
});

test("origem não autorizada => 403; preflight autorizado => 204; método GET => 403 JSON", async () => {
  const h = harness({ LEAD_CONFIRMATION: "on" });
  assert.equal((await handleSubmit(post(VALID, { origin: "https://evil.example" }), h.deps)).status, 403);
  assert.equal((await handleSubmit(post(VALID, { origin: "" }), h.deps)).status, 403);
  const pre = await handleSubmit(post(undefined, { method: "OPTIONS" }), h.deps);
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get("access-control-allow-origin"), SITE);
  const get = await handleSubmit(post(undefined, { method: "GET" }), h.deps);
  assert.equal(get.status, 403);
  assert.equal(h.calls.length, 0, "nenhuma dessas requisições pode tocar o banco");
});

test("validações: JSON inválido, tipo errado, honeypot, sem consentimento, telefone e nome inválidos => 400 e nada é gravado", async () => {
  const cases: [string, Request][] = [
    ["JSON inválido", post("{nao-e-json")],
    ["content-type errado", post(VALID, { type: "text/plain" })],
    ["honeypot", post({ ...VALID, website: "robo" })],
    ["sem consentimento", post({ ...VALID, autorizacaoContato: false })],
    ["consentimento como texto", post({ ...VALID, autorizacaoContato: "true" })],
    ["telefone inválido", post({ ...VALID, whatsapp: "123" })],
    ["nome incompleto", post({ ...VALID, nome: "Maria" })],
    ["nome com HTML", post({ ...VALID, nome: "<script>alert(1)</script> Silva" })],
    ["corpo gigante", post({ ...VALID, nome: "A".repeat(5000) })],
    ["array", post([VALID])],
  ];
  for (const [label, req] of cases) {
    const h = harness({ LEAD_CONFIRMATION: "on" });
    const res = await handleSubmit(req, h.deps);
    assert.equal(res.status, 400, label);
    assert.ok(!rpcNames(h).includes("register_lead_pending") && !rpcNames(h).includes("register_lead"), `${label}: não pode gravar`);
  }
});

test("rate limit: estourou => 429; limitador indisponível => 503 (falha fechada); sem IP confiável => 503", async () => {
  let h = harness({}, (name) => ({ data: name === "consume_lead_rate_limit" ? false : true, error: null }));
  assert.equal((await handleSubmit(post(VALID), h.deps)).status, 429);
  h = harness({}, (name) => ({ data: null, error: name === "consume_lead_rate_limit" ? { code: "XX000" } : null }));
  assert.equal((await handleSubmit(post(VALID), h.deps)).status, 503);
  h = harness({}, () => { throw new Error("queda de rede"); });
  assert.equal((await handleSubmit(post(VALID), h.deps)).status, 503);
  h = harness();
  assert.equal((await handleSubmit(post(VALID, { ip: "" }), h.deps)).status, 503);
  h = harness({ RATE_LIMIT_HMAC_SECRET: "curto" });
  assert.equal((await handleSubmit(post(VALID), h.deps)).status, 503);
});

test("erros do banco: 23514 => 400; outros => 503; resposta não booleana => 503", async () => {
  for (const [rpc, status] of [
    [{ data: null, error: { code: "23514" } }, 400],
    [{ data: null, error: { code: "42501" } }, 503],
    [{ data: "talvez", error: null }, 503],
  ] as [RpcResult, number][]) {
    const h = harness({ LEAD_CONFIRMATION: "on" }, (name) => (name === "register_lead_pending" ? rpc : { data: true, error: null }));
    assert.equal((await handleSubmit(post(VALID), h.deps)).status, status);
  }
});

test("Turnstile ativo: exige token; aceita só success+action+hostname certos; falha de rede => 503", async () => {
  const siteverify = (answer: unknown, ok = true) => (async () => new Response(JSON.stringify(answer), { status: ok ? 200 : 500 })) as unknown as typeof fetch;
  const withToken = { ...VALID, captchaToken: "token-de-teste" };
  const good = { success: true, action: "lead_signup", hostname: "fortdomus.vercel.app" };
  let h = harness({ TURNSTILE_SECRET_KEY: "segredo-de-teste", LEAD_CONFIRMATION: "on" }, undefined, siteverify(good));
  assert.equal((await handleSubmit(post(withToken), h.deps)).status, 201);
  h = harness({ TURNSTILE_SECRET_KEY: "segredo-de-teste" }, undefined, siteverify(good));
  assert.equal((await handleSubmit(post(VALID), h.deps)).status, 400, "sem token");
  for (const bad of [{ ...good, success: false }, { ...good, action: "outra" }, { ...good, hostname: "evil.example" }]) {
    h = harness({ TURNSTILE_SECRET_KEY: "segredo-de-teste" }, undefined, siteverify(bad));
    assert.equal((await handleSubmit(post(withToken), h.deps)).status, 400);
    assert.ok(!rpcNames(h).includes("register_lead"), "token recusado não grava");
  }
  h = harness({ TURNSTILE_SECRET_KEY: "segredo-de-teste" }, undefined, (async () => { throw new Error("rede"); }) as unknown as typeof fetch);
  assert.equal((await handleSubmit(post(withToken), h.deps)).status, 503);
});

test("logs: nunca contêm telefone, nome, código nem segredos (nem em caso de erro)", async () => {
  const h = harness({ LEAD_CONFIRMATION: "on", TURNSTILE_SECRET_KEY: "segredo-de-teste" }, (name) => (name === "register_lead_pending" ? { data: null, error: { code: "XX000" } } : { data: true, error: null }),
    (async () => new Response(JSON.stringify({ success: true, action: "lead_signup", hostname: "fortdomus.vercel.app" }))) as unknown as typeof fetch);
  const res = await handleSubmit(post({ ...VALID, captchaToken: "tok" }), h.deps);
  assert.equal(res.status, 503);
  const all = h.logs.join("\n");
  for (const secret of ["83999990000", "Maria", "Silva", "segredo-de-teste", "valor-ficticio-de-teste", "x".repeat(40), "FD-"]) {
    assert.ok(!all.includes(secret), `o log não pode conter: ${secret}`);
  }
  assert.ok(all.length > 0, "o erro deve ser registrado (sem dados pessoais)");
});

test("resposta de erro nunca revela detalhes internos", async () => {
  const h = harness({ LEAD_CONFIRMATION: "on" }, (name) => (name === "register_lead_pending" ? { data: null, error: { code: "42501" } } : { data: true, error: null }));
  const res = await handleSubmit(post(VALID), h.deps);
  assert.ok(rpcNames(h).includes("register_lead_pending"), "o teste precisa chegar à gravação");
  assert.equal(res.status, 503);
  const text = await res.text();
  assert.ok(!/42501|postgres|supabase|stack|rpc|permission/i.test(text), text);
});
