import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  allowedOrigins,
  clientIp,
  corsHeaders,
  hmacHex,
  jsonResponse,
  randomToken,
  requestOrigin,
  sha256Hex,
} from "../_shared/security.ts";

const CONSENT_VERSION = "consent-v1";
const CONSENT_PURPOSE =
  "Comunicações promocionais pelo WhatsApp: informações sobre produtos, disponibilidade e novidades da Fort Domus.";
const CONSENT_TEXT =
  "Autorizo a Fort Domus a entrar em contato comigo pelo WhatsApp para enviar informações sobre produtos, disponibilidade e novidades. Sei que posso cancelar essa autorização a qualquer momento.";
const BRAZIL_PHONE =
  /^(11|12|13|14|15|16|17|18|19|21|22|24|27|28|31|32|33|34|35|37|38|41|42|43|44|45|46|47|48|49|51|53|54|55|61|62|63|64|65|66|67|68|69|71|73|74|75|77|79|81|82|83|84|85|86|87|88|89|91|92|93|94|95|96|97|98|99)([2-5][0-9]{7}|9[0-9]{8})$/;
const FULL_NAME = /^\p{L}[\p{L}'’.-]*(?:\s+\p{L}[\p{L}'’.-]*)+$/u;

function genericError(origin: string, status: number): Response {
  const messages: Record<number, string> = {
    400: "Não foi possível validar o cadastro. Confira os dados e tente novamente.",
    403: "Não foi possível processar o pedido.",
    429: "Não foi possível processar agora. Tente novamente mais tarde.",
    502: "Não foi possível enviar a confirmação agora. Tente novamente mais tarde.",
    503: "O cadastro está temporariamente indisponível. Tente novamente mais tarde.",
  };
  return jsonResponse(origin, status, { error: messages[status] ?? "Não foi possível processar o pedido." });
}

async function consumeRateLimit(
  supabase: SupabaseClient,
  bucketKey: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean | null> {
  const { data, error } = await supabase.rpc("consume_lead_rate_limit", {
    p_bucket_key: bucketKey,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error || typeof data !== "boolean") {
    console.error("Lead submission rate-limit check failed.", error?.code ?? "invalid response");
    return null;
  }
  return data;
}

Deno.serve(async (request) => {
  let origins: Set<string>;
  try {
    origins = allowedOrigins();
  } catch {
    console.error("Invalid lead function origin configuration.");
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const origin = requestOrigin(request);
  if (!origin || !origins.has(origin)) return new Response(null, { status: 403 });
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (request.method !== "POST") return genericError(origin, 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return genericError(origin, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const sitePublicUrl = Deno.env.get("SITE_PUBLIC_URL");
  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
  const rateSecret = Deno.env.get("RATE_LIMIT_HMAC_SECRET");
  const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioFrom = Deno.env.get("TWILIO_WHATSAPP_FROM");
  const twilioTemplate = Deno.env.get("TWILIO_CONFIRMATION_TEMPLATE_SID");

  if (
    !supabaseUrl || !serviceRoleKey || !sitePublicUrl || !turnstileSecret || !rateSecret ||
    rateSecret.length < 32 || !twilioSid || !twilioToken ||
    !twilioFrom || !/^whatsapp:\+\d{10,15}$/.test(twilioFrom) ||
    !twilioTemplate || !/^HX[a-fA-F0-9]{32}$/.test(twilioTemplate)
  ) {
    console.error("Lead function secrets are incomplete.");
    return genericError(origin, 503);
  }

  let confirmationOrigin: string;
  try {
    const publicUrl = new URL(sitePublicUrl);
    if (publicUrl.origin !== sitePublicUrl || !origins.has(publicUrl.origin)) {
      throw new Error("SITE_PUBLIC_URL must be an allowlisted origin without a path.");
    }
    confirmationOrigin = publicUrl.origin;
  } catch {
    console.error("Invalid public site URL configuration.");
    return genericError(origin, 503);
  }

  const ip = clientIp(request);
  if (!ip) return genericError(origin, 503);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const ipBucket = await hmacHex(rateSecret, `submit:ip:${ip}`);
  const ipAllowed = await consumeRateLimit(supabase, ipBucket, 5, 3600);
  if (ipAllowed === null) return genericError(origin, 503);
  if (!ipAllowed) return genericError(origin, 429);

  let payload: Record<string, unknown>;
  try {
    const rawBody = await request.text();
    if (rawBody.length > 4096) return genericError(origin, 400);
    const parsed: unknown = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return genericError(origin, 400);
    }
    payload = parsed as Record<string, unknown>;
  } catch {
    return genericError(origin, 400);
  }

  const nome = typeof payload.nome === "string" ? payload.nome.trim().replace(/\s+/g, " ") : "";
  const whatsapp = typeof payload.whatsapp === "string" ? payload.whatsapp.replace(/\D/g, "") : "";
  const captchaToken = typeof payload.captchaToken === "string" ? payload.captchaToken : "";
  const consentAccepted = payload.autorizacaoContato === true;
  const consentVersion = payload.consentVersion;

  if (
    nome.length < 3 || nome.length > 120 || !FULL_NAME.test(nome) ||
    !BRAZIL_PHONE.test(whatsapp) || !consentAccepted ||
    consentVersion !== CONSENT_VERSION || captchaToken.length < 1 || captchaToken.length > 2048
  ) {
    return genericError(origin, 400);
  }

  const allowedHostnames = new Set([...origins].map((value) => new URL(value).hostname));
  const captchaForm = new URLSearchParams({
    secret: turnstileSecret,
    response: captchaToken,
    remoteip: ip,
    idempotency_key: crypto.randomUUID(),
  });

  let captchaVerified = false;
  try {
    const captchaResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: captchaForm,
    });
    const verification = await captchaResponse.json();
    captchaVerified = captchaResponse.ok
      && verification.success === true
      && verification.action === "lead_signup"
      && typeof verification.hostname === "string"
      && allowedHostnames.has(verification.hostname);
  } catch (error) {
    console.error("Turnstile verification unavailable.", error);
    return genericError(origin, 503);
  }
  if (!captchaVerified) return genericError(origin, 400);

  const phoneBucket = await hmacHex(rateSecret, `submit:phone:${whatsapp}`);
  const phoneAllowed = await consumeRateLimit(supabase, phoneBucket, 5, 3600);
  if (phoneAllowed === null) return genericError(origin, 503);
  if (!phoneAllowed) return genericError(origin, 429);

  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + 30 * 60 * 1000);
  const { error: insertError } = await supabase.from("leads").insert({
    nome,
    whatsapp,
    autorizacao_contato: false,
    data_autorizacao: null,
    consentimento_solicitado_em: createdAt.toISOString(),
    finalidade_contato: CONSENT_PURPOSE,
    versao_consentimento: CONSENT_VERSION,
    texto_consentimento: CONSENT_TEXT,
    status_whatsapp: "pending_confirmation",
    token_confirmacao_hash: tokenHash,
    token_confirmacao_expira_em: expiresAt.toISOString(),
    origem: "site_fortdomus",
  });
  if (insertError) {
    console.error("Lead could not be stored.", insertError.code ?? "database error");
    return genericError(origin, 503);
  }

  const confirmationUrl =
    `${confirmationOrigin}/confirmar-whatsapp?token=${encodeURIComponent(token)}`;
  const twilioBody = new URLSearchParams({
    To: `whatsapp:+55${whatsapp}`,
    From: twilioFrom,
    ContentSid: twilioTemplate,
    ContentVariables: JSON.stringify({ "1": confirmationUrl }),
  });

  let messageAccepted = false;
  try {
    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(twilioSid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: twilioBody,
      },
    );
    messageAccepted = twilioResponse.status === 201;
    if (!messageAccepted) console.error("WhatsApp confirmation delivery was rejected.", twilioResponse.status);
  } catch (error) {
    console.error("WhatsApp confirmation provider unavailable.", error);
  }

  if (!messageAccepted) {
    const { error: updateError } = await supabase.from("leads").update({
      status_whatsapp: "delivery_failed",
      token_confirmacao_hash: null,
      token_confirmacao_expira_em: null,
    }).eq("token_confirmacao_hash", tokenHash);
    if (updateError) console.error("Failed to invalidate undelivered confirmation token.", updateError.code);
    return genericError(origin, 502);
  }

  return jsonResponse(origin, 202, { message: "Solicitação recebida. Confirme o número pelo link enviado no WhatsApp." });
});
