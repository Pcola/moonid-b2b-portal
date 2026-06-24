import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordLogout } from "@/app/(auth)/actions";

export async function POST(request: Request) {
  await recordLogout().catch(() => {});
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
