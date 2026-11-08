// Confirmação inversa do WhatsApp (V-05, opção A).
// A pessoa recebe um código na tela e o envia pelo próprio WhatsApp para o número da Fort Domus.
// O código: único, aleatório (60 bits), temporário, de uso único; no banco fica só o hash.
import { sha256Hex } from "./security.ts";

// Alfabeto Crockford base32: sem I, L, O e U (evita confusão de leitura e palavras ofensivas).
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const CODE_PATTERN = /^FD-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

const RANDOM_CHARS = 12;

/**
 * Gera "FD-XXXX-XXXX-XXXX". Usa sorteio criptográfico e descarta bytes acima de 223
 * (7 x 32): assim cada símbolo tem probabilidade exatamente igual, sem viés de módulo.
 */
export function generateConfirmationCode(
  randomBytes: (length: number) => Uint8Array = (length) => crypto.getRandomValues(new Uint8Array(length)),
): string {
  let chars = "";
  while (chars.length < RANDOM_CHARS) {
    for (const byte of randomBytes(16)) {
      if (byte >= 224) continue;
      chars += ALPHABET[byte % 32];
      if (chars.length === RANDOM_CHARS) break;
    }
  }
  return `FD-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

/** Forma canônica usada para o hash: só letras e dígitos, em maiúsculas (igual à função SQL). */
export function canonicalCode(code: string): string {
  return code.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

/** Hash SHA-256 (hex) do código canônico. É a única coisa gravada no banco. */
export function confirmationCodeHash(code: string): Promise<string> {
  return sha256Hex(canonicalCode(code));
}
