import { createHmac } from "node:crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function decodeBase32(value: string): Buffer {
  const normalized = value.toUpperCase().replace(/[\s=-]/g, "");
  if (!normalized || /[^A-Z2-7]/.test(normalized)) {
    throw new Error("TOTP secret musí byť neprázdny Base32 reťazec.");
  }

  let bits = 0;
  let accumulator = 0;
  const bytes: number[] = [];
  for (const char of normalized) {
    accumulator = (accumulator << 5) | BASE32.indexOf(char);
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      bytes.push((accumulator >>> bits) & 0xff);
    }
  }
  return Buffer.from(bytes);
}

export function totp(
  secret: string,
  timestampMs = Date.now(),
  digits = 6,
  periodSeconds = 30,
): string {
  if (!Number.isInteger(digits) || digits < 6 || digits > 10) throw new Error("Neplatný počet TOTP číslic.");
  const counter = Math.floor(timestampMs / 1000 / periodSeconds);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret)).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = (digest.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits;
  return binary.toString().padStart(digits, "0");
}

/** Nevráti kód tesne pred koncom 30 s okna, aby neexpiroval počas sieťového round-tripu. */
export async function stableTotp(secret: string): Promise<string> {
  const remainingMs = 30_000 - (Date.now() % 30_000);
  if (remainingMs < 3_000) await new Promise((resolve) => setTimeout(resolve, remainingMs + 250));
  return totp(secret);
}
