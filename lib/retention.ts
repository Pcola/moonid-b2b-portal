import "server-only";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { reportError } from "@/lib/observability";

// Retenčné lehoty (GDPR čl. 5(1)(e) — minimalizácia uchovávania). Zdôvodnenie:
// audit 24 mes. (bezpečnostná stopa + IR runbook), vybavené dopyty 12 mes. po vybavení,
// nevybavené dopyty 24 mes. od prijatia (mŕtvy lead), rate-limit okná 7 dní (technické).
const AUDIT_MONTHS = 24;
const INQUIRY_HANDLED_MONTHS = 12;
const INQUIRY_STALE_MONTHS = 24;
const RATELIMIT_DAYS = 7;

function monthsAgo(m: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - m);
  return d;
}

/** Retenčný purge — beží najviac 1× denne (throttle cez RateLimit okno), volá sa
 *  fire-and-forget zo staff layoutu (after()). Žiadna cron infra: dáta rastú vtedy,
 *  keď sa portál používa, a vtedy sa aj upratuje. Best-effort — NIKDY nehádže.
 *  AuditLog DELETE prejde len pre záznamy > 24 mes. (DB trigger, viď
 *  database/audit-append-only.sql) — appka aj DB vynucujú tú istú lehotu. */
export async function maybeRunRetention(): Promise<void> {
  try {
    const gate = await rateLimit("retention:daily", { limit: 1, windowSec: 86400 });
    if (!gate.ok) return; // dnes už bežalo (alebo limiter fail-open → beží, purge je idempotentný)

    // $executeRaw kvôli interval aritmetike v DB (rovnaký výraz ako trigger — žiadny drift hodín);
    // make_interval = bind-parameter bezpečné; ::int cast (Prisma binduje number ako bigint,
    // make_interval(months=>) berie int — bez castu 42883 function does not exist)
    const audit = await prisma.$executeRaw`DELETE FROM "AuditLog" WHERE "createdAt" < now() - make_interval(months => ${AUDIT_MONTHS}::int)`;
    const inqHandled = await prisma.inquiry.deleteMany({ where: { handledAt: { lt: monthsAgo(INQUIRY_HANDLED_MONTHS) } } });
    const inqStale = await prisma.inquiry.deleteMany({ where: { handledAt: null, createdAt: { lt: monthsAgo(INQUIRY_STALE_MONTHS) } } });
    const rl = await prisma.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(Date.now() - RATELIMIT_DAYS * 86400_000) }, key: { not: "retention:daily" } } });

    // preukázateľnosť purgeu (GDPR accountability) — zapíše sa len keď sa niečo zmazalo.
    // Priamy insert, NIE writeAudit: ten číta headers(), čo v after() z render fázy hádže
    // (Next E367) a audit by sa ticho nezapísal; systémový purge aj tak nemá ip/UA.
    if (audit + inqHandled.count + inqStale.count + rl.count > 0) {
      await prisma.auditLog.create({
        data: {
          action: "RETENTION_PURGE",
          entity: "System",
          meta: { audit, inquiriesHandled: inqHandled.count, inquiriesStale: inqStale.count, rateLimit: rl.count },
        },
      });
    }
  } catch (e) {
    reportError("retention.purge", e, {});
  }
}
