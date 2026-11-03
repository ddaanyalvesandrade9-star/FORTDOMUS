const BRAZIL_PHONE =
  /^(11|12|13|14|15|16|17|18|19|21|22|24|27|28|31|32|33|34|35|37|38|41|42|43|44|45|46|47|48|49|51|53|54|55|61|62|63|64|65|66|67|68|69|71|73|74|75|77|79|81|82|83|84|85|86|87|88|89|91|92|93|94|95|96|97|98|99)([2-5][0-9]{7}|9[0-9]{8})$/;
const FULL_NAME = /^\p{L}[\p{L}'’.-]*(?:\s+\p{L}[\p{L}'’.-]*)+$/u;

export function normalizeName(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export function isValidName(name: string): boolean {
  return name.length >= 3 && name.length <= 120 && FULL_NAME.test(name);
}

/**
 * Retorna DDD + número, sem o prefixo 55, que é o formato exigido por
 * leads_whatsapp_check em public.leads; ou null quando o telefone é inválido.
 */
export function normalizeWhatsapp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let digits = value.replace(/\D/g, "");
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  return BRAZIL_PHONE.test(digits) ? digits : null;
}

function normalizeIpv4(value: string): string | null {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) return null;
  const parts = value.split(".").map(Number);
  return parts.every((part) => part <= 255) ? parts.join(".") : null;
}

function expandIpv6(address: string): number[] | null {
  let text = address;
  const lastColon = text.lastIndexOf(":");
  const tail = text.slice(lastColon + 1);
  if (tail.includes(".")) {
    const ipv4 = normalizeIpv4(tail);
    if (!ipv4) return null;
    const [a, b, c, d] = ipv4.split(".").map(Number);
    text = `${text.slice(0, lastColon + 1)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const split = (part: string) => (part === "" ? [] : part.split(":"));
  const head = split(halves[0]);
  const rest = halves.length === 2 ? split(halves[1]) : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 2 ? missing < 1 : missing !== 0) return null;
  const groups = [...head, ...(halves.length === 2 ? Array(missing).fill("0") : []), ...rest];
  if (groups.length !== 8 || !groups.every((group) => /^[0-9a-f]{1,4}$/.test(group))) return null;
  return groups.map((group) => parseInt(group, 16));
}

/**
 * Normaliza o valor do cabeçalho cf-connecting-ip para uso como chave de rate
 * limit. IPv4 mantém o endereço; IPv6 é agrupado pelo prefixo /64, de modo que
 * trocar de endereço dentro do mesmo bloco não gere um novo limite. IPv4
 * mapeado em IPv6 (::ffff:a.b.c.d) vira o IPv4. Retorna null se for inválido.
 */
export function normalizeClientIp(value: string | null | undefined): string | null {
  const raw = value?.trim().replace(/%.*$/, "").toLowerCase();
  if (!raw) return null;
  if (!raw.includes(":")) return normalizeIpv4(raw);

  const groups = expandIpv6(raw);
  if (!groups) return null;
  if (groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff) {
    return `${groups[6] >> 8}.${groups[6] & 255}.${groups[7] >> 8}.${groups[7] & 255}`;
  }
  return `v6:${groups.slice(0, 4).map((group) => group.toString(16)).join(":")}`;
}

export const MAX_BODY_BYTES = 4096;
export const BODY_READ_TIMEOUT_MS = 5000;

/**
 * Aceita somente o tipo de mídia exato application/json (sem diferenciar
 * maiúsculas). Parâmetros são permitidos; se houver charset, deve ser UTF-8.
 * Recusa application/jsonp, application/json-patch+json, text/json, listas etc.
 */
export function isJsonContentType(value: string | null | undefined): boolean {
  if (!value) return false;
  const [type, ...params] = value.split(";");
  if (type.trim().toLowerCase() !== "application/json") return false;
  for (const param of params) {
    const separator = param.indexOf("=");
    const name = (separator === -1 ? param : param.slice(0, separator)).trim().toLowerCase();
    if (name !== "charset") continue;
    const charset = (separator === -1 ? "" : param.slice(separator + 1)).trim().replace(/^"(.*)"$/, "$1").toLowerCase();
    if (charset !== "utf-8" && charset !== "utf8") return false;
  }
  return true;
}

export type BodyReadResult =
  | { ok: true; text: string }
  | { ok: false; reason: "too_large" | "timeout" | "invalid" };

/**
 * Lê o corpo como fluxo e para assim que passar de maxBytes (em bytes, não em
 * caracteres), sem carregar o corpo inteiro antes. Um Content-Length acima do
 * limite recusa a requisição sem ler nada. A leitura inteira tem tempo máximo.
 */
export async function readBodyLimited(
  request: Request,
  maxBytes = MAX_BODY_BYTES,
  timeoutMs = BODY_READ_TIMEOUT_MS,
): Promise<BodyReadResult> {
  const declared = request.headers.get("content-length");
  if (declared !== null) {
    const length = Number(declared);
    if (!Number.isFinite(length) || length < 0) return { ok: false, reason: "invalid" };
    if (length > maxBytes) return { ok: false, reason: "too_large" };
  }
  if (!request.body) return { ok: false, reason: "invalid" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), timeoutMs);
  });
  try {
    while (true) {
      const next = await Promise.race([reader.read(), expired]);
      if (next === "timeout") {
        void reader.cancel().catch(() => {});
        return { ok: false, reason: "timeout" };
      }
      if (next.done) break;
      received += next.value.byteLength;
      if (received > maxBytes) {
        void reader.cancel().catch(() => {});
        return { ok: false, reason: "too_large" };
      }
      chunks.push(next.value);
    }
  } catch {
    return { ok: false, reason: "invalid" };
  } finally {
    clearTimeout(timer);
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}
