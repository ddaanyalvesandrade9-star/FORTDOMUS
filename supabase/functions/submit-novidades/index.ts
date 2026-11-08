// Versão fixa de propósito: o @supabase/supabase-js 2.118.0 fixa exatamente as suas
// dependências internas, então esta linha congela toda a árvore usada pela função.
// Atualize de forma deliberada, testando antes de publicar.
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { type Deps, handleSubmit } from "../_shared/submit-novidades-core.ts";

// Casca fina: toda a lógica (origem, rate limit em 3 camadas, Turnstile, validação, gravação e,
// quando LEAD_CONFIRMATION=on, a confirmação do WhatsApp) está em _shared/submit-novidades-core.ts,
// que é testado com dependências simuladas (tests/submit-novidades.test.mts).
//
// Secrets obrigatórios (a função falha fechada sem eles):
//   ALLOWED_ORIGINS         origens do site, separadas por vírgula (https://...)
//   RATE_LIMIT_HMAC_SECRET  segredo aleatório com 32+ caracteres
// Secrets opcionais:
//   TURNSTILE_SECRET_KEY    ativa o CAPTCHA; exige turnstileSiteKey no site
//   LEAD_CONFIRMATION       "on" ativa a confirmação do WhatsApp (exige register_lead_pending no banco)
// Fornecidos pelo ambiente Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// O cliente do banco só é criado quando a primeira chamada ao banco acontece (depois das
// verificações de origem, método, secrets e IP).
type Client = ReturnType<typeof createClient>;
let client: Client | null = null;

const deps: Deps = {
  env: (name) => Deno.env.get(name),
  fetch: (...args) => fetch(...args),
  now: () => Date.now(),
  log: (message, detail) => (detail === undefined ? console.error(message) : console.error(message, detail)),
  rpc: async (name, args, timeoutMs) => {
    client ??= createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await client.rpc(name, args).abortSignal(AbortSignal.timeout(timeoutMs));
    return { data, error: error ? { code: error.code } : null };
  },
};

Deno.serve((request) => handleSubmit(request, deps));
