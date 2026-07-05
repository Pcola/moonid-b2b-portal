import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { evaluateSession, sessionIdFromJwt, SESSION_COOKIE } from "@/lib/session-timeout";

/** App-layer timeout relácie aj MIMO middleware (API routes, server actions, RSC) —
 *  middleware matcher vynecháva /api, takže samotný middleware nestačí (staff CSV export
 *  by inak timeout obišiel). Ak metadáta relácie hlásia TIMEOUT, správame sa ako
 *  neprihlásený; upratanie cookies dokončí middleware pri ďalšej navigácii.
 *  Chýbajúci/cudzí cookie NEblokuje (INIT — nastaví ho middleware) — fail-closed až
 *  na prítomných metadátach; limity viď lib/session-timeout.ts. */
async function sessionTimedOut(supabase: Awaited<ReturnType<typeof createClient>>): Promise<boolean> {
  try {
    const store = await cookies();
    const meta = store.get(SESSION_COOKIE)?.value;
    if (!meta) return false;
    const { data: { session } } = await supabase.auth.getSession();
    const sid = sessionIdFromJwt(session?.access_token);
    if (!sid) return false;
    return evaluateSession(meta, sid, Date.now()).kind === "TIMEOUT";
  } catch {
    return false; // kontrola timeoutu nesmie zhodiť auth (fail-open na chybe čítania)
  }
}

// Aktuálny prihlásený používateľ (Supabase auth → náš User záznam).
// cache() = jeden lookup per request. Vráti null ak neprihlásený alebo
// auth konto ešte nie je napojené na User (čaká na onboarding).
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;
  if (await sessionTimedOut(supabase)) return null; // relácia po idle/absolútnom limite
  return prisma.user.findUnique({
    where: { authId: authUser.id },
    // priceTier zámerne BEZ discountPct (necitlivé code/name) — aby sa cez serializovaný
    // user objekt nedostala zľava klientovi. discountPct si dotiahne server podľa potreby.
    include: { company: { include: { priceTier: { select: { id: true, code: true, name: true } } } } },
  });
});

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

function isStaff(role: string) {
  return role === "STAFF" || role === "ADMIN";
}

/** MFA gate: true ak má user overený TOTP faktor, ale aktuálna relácia ešte nie je AAL2
 *  (musí prejsť /mfa výzvou). Fail-open — chyba kontroly nezablokuje prístup. */
async function needsMfaChallenge(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    return data?.nextLevel === "aal2" && data.currentLevel === "aal1";
  } catch {
    return false;
  }
}

/** Vyžaduje prihláseného zákazníka (alebo staff). Inak redirect. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.active) redirect("/login?disabled=1");
  if (!user.companyId && !isStaff(user.role)) redirect("/cakajuce");
  return user;
}

/** Vyžaduje STAFF/ADMIN. */
export async function requireStaff(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.active) redirect("/login?disabled=1"); // deaktivovaný staff nesmie prejsť
  if (!isStaff(user.role)) redirect("/dashboard");
  if (await needsMfaChallenge()) redirect("/mfa"); // enrolovaný faktor + AAL1 → dokončiť MFA výzvu
  return user;
}

/** Vyžaduje ADMIN. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.active) redirect("/login?disabled=1");
  if (user.role !== "ADMIN") redirect("/dashboard");
  if (await needsMfaChallenge()) redirect("/mfa");
  return user;
}
