"use server";

import { z } from "zod";
import { writeAudit } from "@/lib/audit";
import { reportError } from "@/lib/observability";
import { passwordCompromiseStatus } from "@/lib/password-security";
import { hasRecentPasswordSetupGrant } from "@/lib/password-setup-session";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

const passwordSchema = z.string().min(12).max(256);

export async function setPasswordFromGrant(password: string): Promise<{ ok: boolean; error?: string }> {
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) {
    return { ok: false, error: "Heslo musí mať 12 až 256 znakov." };
  }

  const supabase = await createClient();
  const { data, error: claimsError } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (claimsError || !claims || !hasRecentPasswordSetupGrant(claims)) {
    return { ok: false, error: "Odkaz vypršal alebo je neplatný. Požiadajte o nový odkaz." };
  }

  const gate = await rateLimit(rateLimitKey("password-setup", claims.sub), { limit: 10, windowSec: 900 });
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

  const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data });
  if (updateError) {
    return { ok: false, error: "Heslo sa nepodarilo nastaviť. Požiadajte o nový odkaz." };
  }

  await writeAudit({
    userId: claims.sub,
    action: "PASSWORD_RESET_COMPLETED",
    entity: "Auth",
    entityId: claims.sub,
  });

  const { error: signOutError } = await supabase.auth.signOut({ scope: "global" });
  if (signOutError) {
    reportError("passwordSetup.globalSignOut", signOutError, { action: "password_reset" });
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  }

  return { ok: true };
}
