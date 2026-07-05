import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordLogout } from "@/app/(auth)/actions";
import { SESSION_COOKIE } from "@/lib/session-timeout";

export async function POST(request: Request) {
  await recordLogout().catch(() => {});
  const supabase = await createClient();
  await supabase.auth.signOut();
  const res = NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  res.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" }); // uprac metadáta časovania relácie
  return res;
}
