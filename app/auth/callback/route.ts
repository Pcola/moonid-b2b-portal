import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-redirect";

// Výmena auth kódu za session (potvrdenie e-mailu, pozvánka, reset hesla — PKCE).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next")); // len lokálna cesta (anti open-redirect)

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // odpoveď nastavuje session cookie → nikdy necachovať (CDN/proxy)
      const res = NextResponse.redirect(`${origin}${next}`);
      res.headers.set("Cache-Control", "private, no-store");
      return res;
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
