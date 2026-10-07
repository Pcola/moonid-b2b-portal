"use server";

import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { z } from "zod";
import { reportError } from "@/lib/observability";
import { activateNativePasswordSetupGrant } from "@/lib/password-setup-grants";
import { createClient } from "@/lib/supabase/server";

const confirmationSchema = z.object({
  tokenHash: z.string().min(20).max(4096),
  type: z.enum(["invite", "recovery"]),
});

/** Výmena tokenu je zámerne POST Server Action až po vedomom kliknutí používateľa. */
export async function confirmAccessLink(input: unknown): Promise<{ ok: false; error: string }> {
  const parsed = confirmationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Prístupový odkaz je neplatný alebo neúplný." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: parsed.data.tokenHash,
    type: parsed.data.type as EmailOtpType,
  });
  if (error) return { ok: false, error: "Prístupový odkaz je neplatný alebo vypršal. Požiadajte správcu o nový." };

  let activated = false;
  try {
    const accessToken = data.session?.access_token;
    const verifiedClaims = accessToken ? await supabase.auth.getClaims(accessToken) : null;
    const authId = verifiedClaims?.data?.claims?.sub;
    const sessionId = verifiedClaims?.data?.claims?.session_id;
    activated = !verifiedClaims?.error
      && typeof authId === "string"
      && typeof sessionId === "string"
      && await activateNativePasswordSetupGrant({
        authId,
        sessionId,
        purpose: parsed.data.type === "invite" ? "INVITE" : "RECOVERY",
      });
  } catch (activationError) {
    reportError("passwordSetup.nativeActivation", activationError, { action: parsed.data.type });
  }
  if (!activated) {
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    return { ok: false, error: "Prístup sa nepodarilo bezpečne potvrdiť. Požiadajte správcu o nový odkaz." };
  }
  redirect("/nastav-heslo");
}
