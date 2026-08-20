import "server-only";
import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { reportError } from "@/lib/observability";

/**
 * Pseudonymizovaný kľúč limitera. IP ani e-mail sa nemajú ukladať ako plaintext primary key.
 * V produkcii je tajomstvo povinné; rotácia zresetuje iba aktuálne rate-limit okná.
 */
export function rateLimitKey(scope: string, identifier: string): string {
  const secret = process.env.RATE_LIMIT_HMAC_SECRET?.trim();
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("RATE_LIMIT_HMAC_SECRET is required in production");
  }
  const digest = createHmac("sha256", secret || "moonid-development-only")
    .update(identifier.trim().toLowerCase())
    .digest("base64url");
  return `${scope}:${digest}`;
}

// Jednoduchý fixed-window rate limiter nad existujúcou Postgres DB (žiadna nová infra).
// Atomický INSERT ... ON CONFLICT — bezpečný aj pri súbežných requestoch na serverless.
// Fail-OPEN: ak DB/tabuľka zlyhá, request prejde (výpadok limitera nezhodí web).
// Tabuľka "RateLimit" je v Prisma schéme (migrácia add_rate_limit). Viď SECURITY_AUDIT M-1.
export async function rateLimit(
  key: string,
  opts: { limit: number; windowSec: number },
): Promise<{ ok: boolean; count: number }> {
  try {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimit" ("key", "count", "windowStart")
      VALUES (${key}, 1, now())
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${opts.windowSec})
          THEN 1 ELSE "RateLimit"."count" + 1 END,
        "windowStart" = CASE
          WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${opts.windowSec})
          THEN now() ELSE "RateLimit"."windowStart" END
      RETURNING "count"`;
    const count = Number(rows[0]?.count ?? 1);
    return { ok: count <= opts.limit, count };
  } catch (e) {
    // Fail-open je zámer (limiter nesmie zhodiť web), ale MUSÍ byť viditeľný — inak
    // tichý výpadok = neobmedzený brute-force/DoS bez varovania. keyPrefix bez IP (PII).
    reportError("rateLimit.fail-open", e, { keyPrefix: key.split(":")[0] });
    return { ok: true, count: 0 };
  }
}

// Prečíta aktuálny počet v okne BEZ inkrementu (peek) — na kontrolu lockoutu pred akciou.
// Fail-open (0) pri chybe. Vracia 0 aj keď okno expirovalo.
export async function peekCount(key: string, windowSec: number): Promise<number> {
  try {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      SELECT CASE WHEN "windowStart" < now() - make_interval(secs => ${windowSec}) THEN 0 ELSE "count" END AS count
      FROM "RateLimit" WHERE "key" = ${key}`;
    return Number(rows[0]?.count ?? 0);
  } catch (e) {
    reportError("rateLimit.peek", e, { keyPrefix: key.split(":")[0] });
    return 0;
  }
}

// Klientská IP z requestu (na Verceli cez x-forwarded-for, prvá položka).
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  return (xff?.split(",")[0] ?? "").trim() || "unknown";
}
