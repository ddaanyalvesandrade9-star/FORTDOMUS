// Versão fixa de propósito: o @supabase/supabase-js 2.118.0 fixa exatamente as suas
// dependências internas, então esta linha congela toda a árvore usada pela função.
// Atualize de forma deliberada, testando antes de publicar.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";
import { allowedOrigins, corsHeaders, hmacHex, requestOrigin } from "../_shared/security.ts";
import {
  isJsonContentType,
  isValidName,
  normalizeClientIp,
  normalizeName,
  normalizeWhatsapp,
  readBodyLimited,
} from "../_shared/novidades.ts";

// Grava cadastros em public.leads chamando a função SQL public.register_lead
// com a service_role. O navegador não precisa de INSERT na tabela.
//
// Funções SQL exigidas no banco:
//   public.consume_lead_rate_limit  rate limit (SQL A)
//   public.register_lead            trava por número, evita duplicados e grava
//                                   autorizacao_contato = true, data_autorizacao
//                                   (now() do banco) e origem = 'site_fortdomus' (SQL A2)
//
// Secrets obrigatórios (a função falha fechada sem eles):
//   ALLOWED_ORIGINS         origens do site, separadas por vírgula (https://...)
//   RATE_LIMIT_HMAC_SECRET  segredo aleatório com 32+ caracteres
// Secret opcional:
//   TURNSTILE_SECRET_KEY    ativa o CAPTCHA; exige turnstileSiteKey no site
// Fornecidos pelo ambiente Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
//
// O consentimento é registrado como informado pelo usuário no checkbox; a
// titularidade do WhatsApp NÃO é verificada nesta versão.
//
// Rate limit em três camadas, com chaves HMAC independentes (janela de 1 hora):
//   ip-pre    60  por IP,       antes de ler o corpo
//   ip-valid  20  por IP,       depois de validar dados e Turnstile
//   phone      5  por WhatsApp, depois de validar dados e Turnstile, antes de register_lead
// Qualquer falha do serviço de rate limit (erro, resposta inválida, timeout ou
// orçamento de tempo esgotado) falha fechada com 503.

const LAYERS = {
  "ip-pre": 60,
  "ip-valid": 20,
  phone: 5,
} as const;
type Layer = keyof typeof LAYERS;
type LimitResult = "ok" | "limited" | "unavailable";

const RPC_TIMEOUT_MS = 5000; // teto por chamada ao banco ou ao Turnstile
const RATE_LIMIT_BUDGET_MS = 8000; // teto somado das três camadas de rate limit

const MESSAGES: Record<number, string> = {
  400: "Não foi possível realizar seu cadastro. Verifique seus dados e tente novamente.",
  403: "Não foi possível processar o pedido.",
  429: "Muitas tentativas. Aguarde um pouco e tente novamente.",
  503: "O cadastro está temporariamente indisponível. Tente novamente mais tarde.",
};

function reply(origin: string, status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}

const fail = (origin: string, status: number) =>
  reply(origin, status, { ok: false, error: MESSAGES[status] ?? MESSAGES[400] });

/**
 * Consome uma unidade da cota. Respeita o menor entre o teto por chamada e o
 * tempo que resta do orçamento total; sem tempo restante, falha fechada.
 * Os logs registram somente a camada e o código do erro, nunca dados pessoais.
 */
async function consume(
  supabase: SupabaseClient,
  layer: Layer,
  key: string,
  deadline: number,
): Promise<LimitResult> {
  const remaining = deadline - Date.now();
  if (remaining <= 0) {
    console.error(`Rate-limit time budget exhausted before layer ${layer}.`);
    return "unavailable";
  }
  try {
    const { data, error } = await supabase
      .rpc("consume_lead_rate_limit", {
        p_bucket_key: key,
        p_limit: LAYERS[layer],
        p_window_seconds: 3600,
      })
      .abortSignal(AbortSignal.timeout(Math.min(RPC_TIMEOUT_MS, remaining)));
    if (error || typeof data !== "boolean") {
      // No timeout o supabase-js devolve error.code vazio; registra algo útil sem dados pessoais.
      console.error(`Rate-limit check failed (layer ${layer}).`, error ? (error.code || "timeout-or-network") : "invalid response");
      return "unavailable";
    }
    return data ? "ok" : "limited";
  } catch (error) {
    console.error(`Rate-limit check unavailable (layer ${layer}).`, error instanceof Error ? error.name : "unknown");
    return "unavailable";
  }
}

Deno.serve(async (request) => {
  let origins: Set<string>;
  try {
    origins = allowedOrigins();
  } catch {
    console.error("Invalid ALLOWED_ORIGINS configuration.");
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (origins.size === 0) {
    console.error("ALLOWED_ORIGINS is not configured.");
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const origin = requestOrigin(request);
  if (!origin || !origins.has(origin)) return new Response(null, { status: 403 });
  // O preflight não consome cota nem acessa o banco.
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (request.method !== "POST") return fail(origin, 403);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const rateSecret = Deno.env.get("RATE_LIMIT_HMAC_SECRET");
  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!supabaseUrl || !serviceRoleKey || !rateSecret || rateSecret.length < 32) {
    console.error("Function secrets are incomplete.");
    return fail(origin, 503);
  }

  // Somente cf-connecting-ip (definido pelo Cloudflare); sem fallback para x-real-ip.
  // IPv6 é agrupado por /64. Sem um IP válido a função falha fechada.
  const rawIp = request.headers.get("cf-connecting-ip")?.trim() ?? "";
  const ip = normalizeClientIp(rawIp);
  if (!ip) {
    console.error("Trusted client IP header (cf-connecting-ip) is missing or invalid.");
    return fail(origin, 503);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  // Cada camada usa uma chave HMAC própria: HMAC(secret, "novidades:<camada>:<valor>").
  const bucketKey = (layer: Layer, value: string) => hmacHex(rateSecret, `novidades:${layer}:${value}`);
  const rateLimitDeadline = Date.now() + RATE_LIMIT_BUDGET_MS;

  // Camada 1: por IP, antes de processar o corpo. Requisições inválidas também contam.
  const preLimit = await consume(supabase, "ip-pre", await bucketKey("ip-pre", ip), rateLimitDeadline);
  if (preLimit === "unavailable") return fail(origin, 503);
  if (preLimit === "limited") return fail(origin, 429);

  // Tipo de mídia exato application/json (charset permitido; application/jsonp não).
  if (!isJsonContentType(request.headers.get("content-type"))) return fail(origin, 400);

  // Leitura por fluxo, limitada a 4 KB (bytes) e com tempo máximo; nunca carrega o corpo inteiro.
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

  // A chave do WhatsApp só passa a existir depois que nome, telefone, consentimento
  // e honeypot estiverem válidos: payload inválido nunca consome essa cota.
  const nome = normalizeName(payload.nome);
  const whatsapp = normalizeWhatsapp(payload.whatsapp);
  const honeypot = typeof payload.website === "string" ? payload.website.trim() : "";
  if (!isValidName(nome) || !whatsapp || payload.autorizacaoContato !== true || honeypot) {
    return fail(origin, 400);
  }

  // Turnstile antes das camadas 2 e 3: token recusado não consome essas cotas.
  if (turnstileSecret) {
    const token = typeof payload.captchaToken === "string" ? payload.captchaToken : "";
    if (!token || token.length > 2048) return fail(origin, 400);
    const hostnames = new Set([...origins].map((value) => new URL(value).hostname));
    try {
      const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
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
      console.error("Turnstile verification unavailable.", error instanceof Error ? error.name : "unknown");
      return fail(origin, 503);
    }
  }

  // Camada 2: por IP, após validar. Se o IP estourar, o WhatsApp nem é consumido.
  const validLimit = await consume(supabase, "ip-valid", await bucketKey("ip-valid", ip), rateLimitDeadline);
  if (validLimit === "unavailable") return fail(origin, 503);
  if (validLimit === "limited") return fail(origin, 429);

  // Camada 3: por WhatsApp, imediatamente antes de register_lead. Conta também
  // números já cadastrados, pois é consumida antes de saber se o número existe.
  const phoneLimit = await consume(supabase, "phone", await bucketKey("phone", whatsapp), rateLimitDeadline);
  if (phoneLimit === "unavailable") return fail(origin, 503);
  if (phoneLimit === "limited") return fail(origin, 429);

  // register_lead trava por número, consulta e insere na mesma transação:
  // true = cadastro criado; false = o número já estava cadastrado. Nos dois casos
  // o registro existe no banco, então a resposta é a mesma (sem revelar qual foi).
  let created: unknown;
  try {
    const { data, error } = await supabase
      .rpc("register_lead", { p_nome: nome, p_whatsapp: whatsapp })
      .abortSignal(AbortSignal.timeout(RPC_TIMEOUT_MS));
    if (error) {
      // 23514: violação de CHECK (dado recusado pelo banco). Demais erros, inclusive
      // função ausente (PGRST202) ou permissão (42501), são indisponibilidade.
      console.error("register_lead failed.", error.code || "timeout-or-network");
      return fail(origin, error.code === "23514" ? 400 : 503);
    }
    created = data;
  } catch (error) {
    console.error("register_lead unavailable.", error instanceof Error ? error.name : "unknown");
    return fail(origin, 503);
  }
  if (typeof created !== "boolean") {
    console.error("register_lead returned an unexpected response.");
    return fail(origin, 503);
  }
  return reply(origin, 201, { ok: true });
});
