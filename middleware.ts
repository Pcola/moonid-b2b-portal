import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Chránené prefixy — neprihlásený sa odtiaľ presmeruje na /login.
// Jemné gating podľa rolí (staff/zákazník) rieši layout cez requireUser/requireStaff.
const PROTECTED = ["/dashboard", "/katalog", "/kosik", "/objednavky", "/faktury", "/nastavenia", "/staff"];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(p + "/"));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  // beží všade okrem statiky, obrázkov a API (sync/dopyt nesmú byť za auth)
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
