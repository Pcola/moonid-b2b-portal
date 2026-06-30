import "server-only";
import * as Sentry from "@sentry/nextjs";

/**
 * Nahlási chybu z „best-effort" / fail-open cesty (audit, email, rate-limit, …):
 *  1) štruktúrovaný JSON log do konzoly (korelovateľný v logoch Vercelu),
 *  2) Sentry.captureException — aby tiché zlyhania boli VIDITEĽNÉ v monitoringu.
 *
 * Bez NEXT_PUBLIC_SENTRY_DSN je Sentry inertný (enabled:false) → captureException je no-op,
 * takže helper je bezpečný aj lokálne. Sám NIKDY nehádže (nesmie zhodiť best-effort cestu).
 *
 * `context` musí byť bez PII (žiadne e-maily/mená/IP) — len operačné kľúče (action, entity, scope).
 */
export function reportError(scope: string, error: unknown, context?: Record<string, unknown>): void {
  const msg = error instanceof Error ? error.message : String(error);
  try {
    console.error(JSON.stringify({ level: "error", scope, msg, ...context }));
  } catch {
    console.error(`[${scope}]`, msg);
  }
  try {
    Sentry.captureException(error instanceof Error ? error : new Error(`${scope}: ${msg}`), {
      tags: { scope },
      ...(context ? { extra: context } : {}),
    });
  } catch {
    // Sentry zlyhanie nesmie nikdy zhodiť volajúcu (best-effort) cestu.
  }
}
