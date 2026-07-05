// Časovanie relácie (app-layer — Supabase idle/absolute timeout je platený Pro feature).
// Čistá logika bez server závislostí — vyhodnocuje ju middleware (stránky) aj
// getCurrentUser v lib/auth.ts (API/actions/RSC), testuje vitest.
// Cookie formát: "<session_id>:<start_ms>:<last_seen_ms>" (HttpOnly, viď middleware).
//
// VEDOMÉ OBMEDZENIE: stav žije len v klientskom cookie (žiadny server-side session store).
// Chráni scenár „opustený prihlásený prehliadač" (cookie prítomný → TIMEOUT sa vynúti aj
// na /api cez getCurrentUser). NEchráni krádež sb-* tokenov s vynechaním tohto cookie —
// replay bez metadát dostane nové okno (INIT). Plné riešenie = server-side timebox
// (Supabase Pro) — viď SECURITY audit; do jeho zavedenia je toto best-effort vrstva.

export const SESSION_COOKIE = "moonid-sess";
export const IDLE_MS = 24 * 3600_000; // 24 h neaktivity → odhlásenie
export const ABSOLUTE_MS = 14 * 24 * 3600_000; // 14 dní od prihlásenia → odhlásenie
const REFRESH_MS = 5 * 60_000; // last-seen prepisuj najviac raz za 5 min (menej Set-Cookie)

export type SessionDecision =
  | { kind: "INIT"; value: string } // nová/neznáma relácia → založ metadáta
  | { kind: "OK" } // beží, cookie netreba prepísať
  | { kind: "REFRESH"; value: string } // beží, obnov last-seen
  | { kind: "TIMEOUT"; reason: "idle" | "absolute" };

/** Rozhodne o stave relácie. sessionId viaže cookie na konkrétnu Supabase reláciu —
 *  nové prihlásenie (iné session_id) automaticky resetuje počítadlá, takže starý
 *  cookie po re-logine nespôsobí falošný timeout. Poškodený/cudzí cookie → INIT. */
export function evaluateSession(cookieValue: string | undefined, sessionId: string, now: number): SessionDecision {
  const [sid, startS, lastS] = cookieValue?.split(":") ?? [];
  const start = Number(startS);
  const last = Number(lastS);
  if (!cookieValue || sid !== sessionId || !Number.isFinite(start) || !Number.isFinite(last) || start > now || last > now) {
    return { kind: "INIT", value: `${sessionId}:${now}:${now}` };
  }
  if (now - start > ABSOLUTE_MS) return { kind: "TIMEOUT", reason: "absolute" };
  if (now - last > IDLE_MS) return { kind: "TIMEOUT", reason: "idle" };
  if (now - last > REFRESH_MS) return { kind: "REFRESH", value: `${sid}:${start}:${now}` };
  return { kind: "OK" };
}

/** session_id claim zo Supabase access tokenu (JWT payload, bez overenia podpisu —
 *  slúži LEN ako korelačný identifikátor relácie pre cookie; autentizáciu autoritatívne
 *  overuje supabase.auth.getUser()). null = token chýba/nečitateľný. */
export function sessionIdFromJwt(accessToken: string | null | undefined): string | null {
  try {
    const b64 = accessToken!.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(b64));
    return typeof payload.session_id === "string" && payload.session_id ? payload.session_id : null;
  } catch {
    return null;
  }
}
