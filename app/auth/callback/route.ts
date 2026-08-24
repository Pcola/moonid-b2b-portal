import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-redirect";
import { isImplicitPasswordSetupCallback } from "@/lib/auth-flow";

// Výmena auth tokenu/kódu za session (potvrdenie e-mailu, pozvánka, reset hesla).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next")); // len lokálna cesta (anti open-redirect)

  // odpoveď nastavuje session cookie → nikdy necachovať (CDN/proxy)
  const ok = () => {
    const res = NextResponse.redirect(`${origin}${next}`);
    res.headers.set("Cache-Control", "private, no-store");
    return res;
  };

  // Predvolená Supabase šablóna overí jednorazový token ešte na /auth/v1/verify
  // a session pošle v URL fragmente. Fragment server nevidí, ale prehliadač ho
  // zachová cez redirect; /nastav-heslo ho bezpečne spotrebuje a ihneď odstráni.
  if (isImplicitPasswordSetupCallback(code, tokenHash, next)) return ok();

  const supabase = await createClient();

  // Server-side generované e-mail linky (pozvánka/reset/potvrdenie) → OTP verify.
  // Nepotrebuje PKCE code_verifier (ktorý pri odkaze otvorenom v inom prehliadači neexistuje).
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return ok();
  }
  // PKCE code flow (browser-initiated, napr. OAuth).
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return ok();
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
