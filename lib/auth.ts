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

// Escape-hatch: MFA sa pre staff/admin vynucuje (enrolment) štandardne. Ak by vynútenie
// niekedy zamklo prístup (napr. MFA toggle v Supabase omylom vypnutý → nikto sa nevie
// zaregistrovať), nastav vo Vercel env MFA_ENFORCE=off a redeploy → ostane len AAL2 výzva
// pre už-zaregistrovaných, povinný enrolment sa dočasne nevynúti.
const ENFORCE_MFA = process.env.MFA_ENFORCE !== "off";

/** MFA stav privilegovaného účtu:
 *  - enrolled: má aspoň jeden OVERENÝ TOTP faktor (listFactors().totp = verified)
 *  - needsChallenge: má faktor, ale relácia je ešte AAL1 (musí prejsť /mfa výzvou)
 *  Fail-open na chybe MFA API — výpadok nezablokuje prístup (a nezamkne admina). */
async function mfaStatus(): Promise<{ enrolled: boolean; needsChallenge: boolean }> {
  try {
    const supabase = await createClient();
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const needsChallenge = aal?.nextLevel === "aal2" && aal.currentLevel === "aal1";
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const enrolled = (factors?.totp?.length ?? 0) > 0;
    return { enrolled, needsChallenge };
  } catch {
    return { enrolled: true, needsChallenge: false };
  }
}

/** Vynúti MFA pre privilegovaný účet: existujúci faktor + AAL1 → challenge; žiadny faktor
 *  → povinný enrolment. Volať až po overení staff/admin role. */
async function enforceStaffMfa(): Promise<void> {
  const mfa = await mfaStatus();
  if (mfa.needsChallenge) redirect("/mfa");
  if (ENFORCE_MFA && !mfa.enrolled) redirect("/mfa/setup");
}

/** Vyžaduje prihláseného zákazníka (alebo staff). Inak redirect. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.active) redirect("/login?disabled=1");
  if (!user.companyId && !isStaff(user.role)) redirect("/cakajuce");
  return user;
}

/** Vyžaduje STAFF/ADMIN + vynútené 2FA (enrolment aj AAL2 výzva). */
export async function requireStaff(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.active) redirect("/login?disabled=1"); // deaktivovaný staff nesmie prejsť
  if (!isStaff(user.role)) redirect("/dashboard");
  await enforceStaffMfa();
  return user;
}

/** Vyžaduje ADMIN + vynútené 2FA. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.active) redirect("/login?disabled=1");
  if (user.role !== "ADMIN") redirect("/dashboard");
  await enforceStaffMfa();
  return user;
}
