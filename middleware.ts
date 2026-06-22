import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Dočasná ochrana /staff cez HTTP Basic auth (env STAFF_USER/STAFF_PASS).
// Neskôr nahradí Supabase Auth + rola STAFF/ADMIN.
export function middleware(req: NextRequest) {
  const user = process.env.STAFF_USER;
  const pass = process.env.STAFF_PASS;
  if (!user || !pass) {
    return new NextResponse("Staff prístup nie je nakonfigurovaný (STAFF_USER/STAFF_PASS).", { status: 503 });
  }
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try {
      const [u, p] = atob(auth.slice(6)).split(":");
      if (u === user && p === pass) return NextResponse.next();
    } catch {
      // padne nižšie na 401
    }
  }
  return new NextResponse("Vyžaduje sa prihlásenie.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Moonid Staff", charset="UTF-8"' },
  });
}

export const config = { matcher: ["/staff/:path*"] };
