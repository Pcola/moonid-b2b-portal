import "server-only";

import { createHash } from "node:crypto";

export type PasswordCompromiseStatus = "clean" | "pwned" | "unavailable";

const HIBP_TIMEOUT_MS = 5_000;

/**
 * Checks a password via HIBP's k-anonymity range API. Only the first five SHA-1
 * characters leave the server; the password and complete hash never do.
 * Provider failures are returned explicitly so callers can fail closed.
 */
export async function passwordCompromiseStatus(password: string): Promise<PasswordCompromiseStatus> {
  const hash = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      cache: "no-store",
      headers: {
        "Add-Padding": "true",
        "User-Agent": "Moonid-B2B-Portal/1.0",
      },
      signal: AbortSignal.timeout(HIBP_TIMEOUT_MS),
    });
    if (!response.ok) return "unavailable";

    for (const line of (await response.text()).split(/\r?\n/)) {
      const [candidate, rawCount] = line.split(":", 2);
      if (candidate?.trim().toUpperCase() !== suffix) continue;
      const count = Number.parseInt(rawCount?.trim() ?? "0", 10);
      return Number.isFinite(count) && count > 0 ? "pwned" : "clean";
    }
    return "clean";
  } catch {
    return "unavailable";
  }
}
