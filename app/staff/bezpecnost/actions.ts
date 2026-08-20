"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";

/** Synchronizuje User.mfaEnabled (zobrazenie/reporting) + audit po enroll/odstránení faktora.
 *  Zdroj pravdy pre autentifikáciu je Supabase (listFactors/AAL); toto je len zrkadlo.
 *  Gate cez getCurrentUser (nie requireStaff — vyhne sa AAL redirect race hneď po verify). */
export async function markMfa(expectedEnabled: boolean): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "STAFF" && user.role !== "ADMIN")) return { ok: false };
  const supabase = await createClient();
  const [{ data: factors, error: factorsError }, { data: aal, error: aalError }] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  if (factorsError || aalError) return { ok: false };
  const enabled = (factors?.totp?.length ?? 0) > 0;
  if (enabled !== expectedEnabled || (enabled && aal?.currentLevel !== "aal2")) return { ok: false };
  await prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: enabled } });
  await writeAudit({ userId: user.id, action: enabled ? "MFA_ENROLLED" : "MFA_REMOVED", entity: "Auth", entityId: user.id, meta: { verifiedAgainstProvider: true, aal: aal?.currentLevel } });
  return { ok: true };
}
