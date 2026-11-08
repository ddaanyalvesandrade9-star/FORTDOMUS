// Núcleo da função submit-novidades, separado do Deno.serve para poder ser testado com dependências
// simuladas. O comportamento é o da função publicada; a única adição é o caminho de CONFIRMAÇÃO
// do WhatsApp (V-05), controlado pelo secret LEAD_CONFIRMATION=on. Sem ele, nada muda.
import { corsHeaders, hmacHex, requestOrigin, sha256Hex } from "./security.ts";
import {
  isJsonContentType,
  isValidName,
  normalizeClientIp,
  normalizeName,
  normalizeWhatsapp,
  readBodyLimited,
} from "./novidades.ts";
import { canonicalCode, generateConfirmationCode } from "./confirmacao.ts";

export interface RpcResult {
  data: unknown;
  error: { code?: string } | null;
}

export interface Deps {
  env(name: string): string | undefined;
  rpc(name: string, args: Record<string, unknown>, timeoutMs: number): Promise<RpcResult>;
  fetch: typeof fetch;
  now(): number;
  log(message: string, detail?: string): void;
}

// Rate limit em três camadas, com chaves HMAC independentes (janela de 1 hora):
//   ip-pre    60  por IP,       antes de ler o corpo
//   ip-valid  20  por IP,       depois de validar dados e Turnstile
//   phone      5  por WhatsApp, depois de validar dados e Turnstile, antes de gravar
const LAYERS = {
  "ip-pre": 60,
  "ip-valid": 20,
  phone: 5,
} as const;
type Layer = keyof typeof LAYERS;
type LimitResult = "ok" | "limited" | "unavailable";

const RPC_TIMEOUT_MS = 5000;
const RATE_LIMIT_BUDGET_MS = 8000;
export const CONFIRMATION_TTL_MINUTES = 1440; // o código vale por 24 horas

const MESSAGES: Record<number, string> = {
  400: "Não foi possível realizar seu cadastro. Verifique seus dados e tente novamente.",
  403: "Não foi possível processar o pedido.",
  429: "Muitas tentativas. Aguarde um pouco e tente novamente.",
  503: "O cadastro está temporariamente indisponível. Tente novamente mais tarde.",
};

function parseOrigins(configured: string): Set<string> {
  const origins = configured.split(",").map((value) => value.trim()).filter(Boolean);
  return new Set(origins.map((origin) => {
    const parsed = new URL(origin);
    if (parsed.origin !== origin || (parsed.protocol !== "https:" && parsed.hostname !== "localhost")) {
      throw new Error("Invalid ALLOWED_ORIGINS configuration.");
    }
    return parsed.origin;
  }));
}

function reply(origin: string, status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}

const fail = (origin: string, status: number) =>
  reply(origin, status, { ok: false, error: MESSAGES[status] ?? MESSAGES[400] });

async function consume(deps: Deps, layer: Layer, key: string, deadline: number): Promise<LimitResult> {
  const remaining = deadline - deps.now();
  if (remaining <= 0) {
    deps.log(`Rate-limit time budget exhausted before layer ${layer}.`);
    return "unavailable";
  }
  try {
    const { data, error } = await deps.rpc(
      "consume_lead_rate_limit",
      { p_bucket_key: key, p_limit: LAYERS[layer], p_window_seconds: 3600 },
      Math.min(RPC_TIMEOUT_MS, remaining),
    );
    if (error || typeof data !== "boolean") {
      deps.log(`Rate-limit check failed (layer ${layer}).`, error ? (error.code || "timeout-or-network") : "invalid response");
      return "unavailable";
    }
    return data ? "ok" : "limited";
  } catch (error) {
    deps.log(`Rate-limit check unavailable (layer ${layer}).`, error instanceof Error ? error.name : "unknown");
    return "unavailable";
  }
}

export async function handleSubmit(request: Request, deps: Deps): Promise<Response> {
  let origins: Set<string>;
  try {
    origins = parseOrigins(deps.env("ALLOWED_ORIGINS") ?? "");
  } catch {
    deps.log("Invalid ALLOWED_ORIGINS configuration.");
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (origins.size === 0) {
    deps.log("ALLOWED_ORIGINS is not configured.");
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const origin = requestOrigin(request);
  if (!origin || !origins.has(origin)) return new Response(null, { status: 403 });
  // O preflight não consome cota nem acessa o banco.
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (request.method !== "POST") return fail(origin, 403);

  const supabaseUrl = deps.env("SUPABASE_URL");
  const serviceRoleKey = deps.env("SUPABASE_SERVICE_ROLE_KEY");
  const rateSecret = deps.env("RATE_LIMIT_HMAC_SECRET");
  const turnstileSecret = deps.env("TURNSTILE_SECRET_KEY");
  const confirmationOn = deps.env("LEAD_CONFIRMATION") === "on";
  if (!supabaseUrl || !serviceRoleKey || !rateSecret || rateSecret.length < 32) {
    deps.log("Function secrets are incomplete.");
    return fail(origin, 503);
  }

  // Somente cf-connecting-ip (definido pelo Cloudflare); sem fallback para x-real-ip.
  const rawIp = request.headers.get("cf-connecting-ip")?.trim() ?? "";
  const ip = normalizeClientIp(rawIp);
  if (!ip) {
    deps.log("Trusted client IP header (cf-connecting-ip) is missing or invalid.");
    return fail(origin, 503);
  }

  const bucketKey = (layer: Layer, value: string) => hmacHex(rateSecret, `novidades:${layer}:${value}`);
  const rateLimitDeadline = deps.now() + RATE_LIMIT_BUDGET_MS;

  const preLimit = await consume(deps, "ip-pre", await bucketKey("ip-pre", ip), rateLimitDeadline);
  if (preLimit === "unavailable") return fail(origin, 503);
  if (preLimit === "limited") return fail(origin, 429);

  if (!isJsonContentType(request.headers.get("content-type"))) return fail(origin, 400);

  const body = await readBodyLimited(request);
  if (!body.ok) return fail(origin, 400);

  let payload: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(body.text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fail(origin, 400);
    payload = parsed as Record<string, unknown>;
  } catch {
    return fail(origin, 400);
  }

  const nome = normalizeName(payload.nome);
  const whatsapp = normalizeWhatsapp(payload.whatsapp);
  const honeypot = typeof payload.website === "string" ? payload.website.trim() : "";
  if (!isValidName(nome) || !whatsapp || payload.autorizacaoContato !== true || honeypot) {
    return fail(origin, 400);
  }

  if (turnstileSecret) {
    const token = typeof payload.captchaToken === "string" ? payload.captchaToken : "";
    if (!token || token.length > 2048) return fail(origin, 400);
    const hostnames = new Set([...origins].map((value) => new URL(value).hostname));
    try {
      const response = await deps.fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
        body: new URLSearchParams({
          secret: turnstileSecret,
          response: token,
          remoteip: rawIp,
          idempotency_key: crypto.randomUUID(),
        }),
      });
      const verification = await response.json();
      const verified = response.ok && verification.success === true
        && verification.action === "lead_signup"
        && typeof verification.hostname === "string" && hostnames.has(verification.hostname);
      if (!verified) return fail(origin, 400);
    } catch (error) {
      deps.log("Turnstile verification unavailable.", error instanceof Error ? error.name : "unknown");
      return fail(origin, 503);
    }
  }

  const validLimit = await consume(deps, "ip-valid", await bucketKey("ip-valid", ip), rateLimitDeadline);
  if (validLimit === "unavailable") return fail(origin, 503);
  if (validLimit === "limited") return fail(origin, 429);

  const phoneLimit = await consume(deps, "phone", await bucketKey("phone", whatsapp), rateLimitDeadline);
  if (phoneLimit === "unavailable") return fail(origin, 503);
  if (phoneLimit === "limited") return fail(origin, 429);

  // Caminho legado (LEAD_CONFIRMATION desligado): idêntico ao da função publicada.
  // Caminho com confirmação: gera o código AQUI, grava só o hash e devolve o código uma única vez.
  // Em ambos, o número já cadastrado recebe a mesma resposta de um novo (sem enumerar números).
  let code: string | null = null;
  let created: unknown;
  try {
    let result: RpcResult;
    if (confirmationOn) {
      code = generateConfirmationCode();
      const hash = await sha256Hex(canonicalCode(code));
      result = await deps.rpc(
        "register_lead_pending",
        { p_nome: nome, p_whatsapp: whatsapp, p_code_hash: hash, p_ttl_minutes: CONFIRMATION_TTL_MINUTES },
        RPC_TIMEOUT_MS,
      );
    } else {
      result = await deps.rpc("register_lead", { p_nome: nome, p_whatsapp: whatsapp }, RPC_TIMEOUT_MS);
    }
    if (result.error) {
      // 23514: violação de CHECK (dado recusado pelo banco). Demais erros são indisponibilidade.
      deps.log("lead registration failed.", result.error.code || "timeout-or-network");
      return fail(origin, result.error.code === "23514" ? 400 : 503);
    }
    created = result.data;
  } catch (error) {
    deps.log("lead registration unavailable.", error instanceof Error ? error.name : "unknown");
    return fail(origin, 503);
  }
  if (typeof created !== "boolean") {
    deps.log("lead registration returned an unexpected response.");
    return fail(origin, 503);
  }
  return reply(
    origin,
    201,
    code ? { ok: true, confirmation: { code, expiresInMinutes: CONFIRMATION_TTL_MINUTES } } : { ok: true },
  );
}
