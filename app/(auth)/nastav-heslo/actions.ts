"use server";

import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { reportError } from "@/lib/observability";
import { passwordCompromiseStatus } from "@/lib/password-security";
import {
  activateImplicitPasswordSetupGrant,
  claimPasswordSetupGrant,
  findVerifiedPasswordSetupGrant,
  finishPasswordSetupGrant,
} from "@/lib/password-setup-grants";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

const passwordSchema = z.string().min(12).max(256);

export async function activateImplicitPasswordSetupSession(rawNonce: unknown): Promise<{ ok: boolean }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) return { ok: false };
    return { ok: await activateImplicitPasswordSetupGrant(rawNonce, data.claims) };
  } catch (error) {
    reportError("passwordSetup.activation", error, { action: "implicit_recovery_activation" });
    return { ok: false };
  }
}

export async function setPasswordFromGrant(password: string): Promise<{ ok: boolean; error?: string }> {
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) {
    return { ok: false, error: "Heslo musí mať 12 až 256 znakov." };
  }

  const supabase = await createClient();
  const { data, error: claimsError } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (claimsError || !claims) {
    return { ok: false, error: "Odkaz vypršal alebo je neplatný. Požiadajte o nový odkaz." };
  }

  const verifiedGrant = await findVerifiedPasswordSetupGrant(claims);
  if (!verifiedGrant) return { ok: false, error: "Odkaz vypršal alebo je neplatný. Požiadajte o nový odkaz." };

  const gate = await rateLimit(rateLimitKey("password-setup", verifiedGrant.authId), { limit: 10, windowSec: 900 });
  if (!gate.ok) {
    return { ok: false, error: "Priveľa pokusov. Požiadajte o nový odkaz alebo skúste neskôr." };
  }

  const compromise = await passwordCompromiseStatus(parsed.data);
  if (compromise === "pwned") {
    return { ok: false, error: "Toto heslo sa našlo v známych únikoch dát. Zvoľte iné, bezpečnejšie heslo." };
  }
  if (compromise === "unavailable") {
    return { ok: false, error: "Bezpečnosť hesla sa teraz nedá overiť. Skúste to o chvíľu znova." };
  }

  const claimedGrant = await claimPasswordSetupGrant(claims);
  if (!claimedGrant) {
    return { ok: false, error: "Odkaz už bol použitý alebo vypršal. Požiadajte o nový odkaz." };
  }

  let updateError: unknown = null;
  try {
    const updated = await supabase.auth.updateUser({ password: parsed.data });
    updateError = updated.error;
  } catch (error) {
    updateError = error;
  }
  if (updateError) {
    await finishPasswordSetupGrant(claimedGrant, false).catch((error) => {
      reportError("passwordSetup.failGrant", error, { action: "password_reset" });
    });
    reportError("passwordSetup.update", updateError, { action: "password_reset" });
    return { ok: false, error: "Heslo sa nepodarilo nastaviť. Požiadajte o nový odkaz." };
  }

  const consumed = await finishPasswordSetupGrant(claimedGrant, true).catch((error) => {
    reportError("passwordSetup.consumeGrant", error, { action: "password_reset" });
    return false;
  });
  if (!consumed) {
    reportError("passwordSetup.consumeGrant", new Error("Password setup grant finalization failed"), { action: "password_reset" });
  }

  await writeAudit({
    userId: claimedGrant.userId,
    companyId: claimedGrant.companyId,
    action: "PASSWORD_RESET_COMPLETED",
    entity: "Auth",
    entityId: claimedGrant.authId,
  });

  const { error: signOutError } = await supabase.auth.signOut({ scope: "global" });
  if (signOutError) {
    reportError("passwordSetup.globalSignOut", signOutError, { action: "password_reset" });
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  }

  return { ok: true };
}
