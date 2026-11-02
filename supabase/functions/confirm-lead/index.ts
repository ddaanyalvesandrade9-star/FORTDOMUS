import { createClient } from "npm:@supabase/supabase-js@2";
import {
  allowedOrigins,
  clientIp,
  corsHeaders,
  hmacHex,
  jsonResponse,
  requestOrigin,
  sha256Hex,
} from "../_shared/security.ts";

function genericError(origin: string, status: number): Response {
  const messages: Record<number, string> = {
    400: "Link inválido, expirado ou já utilizado. Solicite uma nova confirmação pelo site.",
    403: "Não foi possível processar a confirmação.",
    429: "Não foi possível processar agora. Tente novamente mais tarde.",
    503: "A confirmação está temporariamente indisponível. Tente novamente mais tarde.",
  };
  return jsonResponse(origin, status, { error: messages[status] ?? "Não foi possível processar a confirmação." });
}

Deno.serve(async (request) => {
  let origins: Set<string>;
  try {
    origins = allowedOrigins();
  } catch {
    console.error("Invalid lead confirmation origin configuration.");
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
  const rateSecret = Deno.env.get("RATE_LIMIT_HMAC_SECRET");
  if (!supabaseUrl || !serviceRoleKey || !rateSecret || rateSecret.length < 32) {
    console.error("Lead confirmation secrets are incomplete.");
    return genericError(origin, 503);
  }

  const ip = clientIp(request);
  if (!ip) return genericError(origin, 503);

  let payload: Record<string, unknown>;
  try {
    const rawBody = await request.text();
    if (rawBody.length > 1024) return genericError(origin, 400);
    const parsed: unknown = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return genericError(origin, 400);
    }
    payload = parsed as Record<string, unknown>;
  } catch {
    return genericError(origin, 400);
  }

  const token = typeof payload.token === "string" ? payload.token : "";
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) return genericError(origin, 400);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const ipBucket = await hmacHex(rateSecret, `confirm:ip:${ip}`);
  const { data: rateAllowed, error: rateError } = await supabase.rpc("consume_lead_rate_limit", {
    p_bucket_key: ipBucket,
    p_limit: 20,
    p_window_seconds: 3600,
  });
  if (rateError || typeof rateAllowed !== "boolean") {
    console.error("Lead confirmation rate-limit check failed.", rateError?.code ?? "invalid response");
    return genericError(origin, 503);
  }
  if (!rateAllowed) return genericError(origin, 429);

  const tokenHash = await sha256Hex(token);
  const now = new Date().toISOString();
  const { data, error } = await supabase.from("leads")
    .select("id")
    .eq("token_confirmacao_hash", tokenHash)
    .eq("status_whatsapp", "pending_confirmation")
    .gt("token_confirmacao_expira_em", now)
    .maybeSingle();
  if (error) {
    console.error("Lead confirmation lookup failed.", error.code ?? "database error");
    return genericError(origin, 503);
  }
  if (!data) return genericError(origin, 400);

  const { data: confirmed, error: updateError } = await supabase.from("leads")
    .update({
      autorizacao_contato: true,
      data_autorizacao: now,
      status_whatsapp: "confirmed",
      whatsapp_confirmado_em: now,
      token_confirmacao_hash: null,
      token_confirmacao_expira_em: null,
    })
    .eq("id", data.id)
    .eq("token_confirmacao_hash", tokenHash)
    .eq("status_whatsapp", "pending_confirmation")
    .gt("token_confirmacao_expira_em", now)
    .select("id")
    .maybeSingle();
  if (updateError) {
    console.error("Lead confirmation update failed.", updateError.code ?? "database error");
    return genericError(origin, 503);
  }
  if (!confirmed) return genericError(origin, 400);

  return jsonResponse(origin, 200, {
    message: "Número confirmado. A Fort Domus registrou sua autorização e poderá enviar as informações solicitadas.",
  });
});
