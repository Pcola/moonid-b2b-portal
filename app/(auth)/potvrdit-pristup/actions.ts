"use server";

import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { z } from "zod";
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
  const { error } = await supabase.auth.verifyOtp({
    token_hash: parsed.data.tokenHash,
    type: parsed.data.type as EmailOtpType,
  });
  if (error) return { ok: false, error: "Prístupový odkaz je neplatný alebo vypršal. Požiadajte správcu o nový." };
  redirect("/nastav-heslo");
}
