import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { evaluateSession, SESSION_COOKIE, ABSOLUTE_MS } from "@/lib/session-timeout";

// Chránené prefixy — neprihlásený sa odtiaľ presmeruje na /login.
// Jemné gating podľa rolí (staff/zákazník) rieši layout cez requireUser/requireStaff.
const PROTECTED = ["/dashboard", "/katalog", "/kosik", "/objednavky", "/faktury", "/nastavenia", "/staff"];

const SESSION_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: Math.ceil(ABSOLUTE_MS / 1000),
};

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;
  const isDev = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "form-action 'self'",
    `img-src 'self' data: blob: https://${supabaseHost}`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    "font-src 'self' data:",
    `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://api.pwnedpasswords.com`,
    "upgrade-insecure-requests",
  ].join("; ");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const secure = <T extends NextResponse>(response: T): T => {
    response.headers.set("Content-Security-Policy", csp);
    return response;
  };

  // request-id: korelácia odpovede ↔ Vercel logov/Sentry (echo inbound alebo nové UUID)
  const requestId = request.headers.get("x-request-id")?.slice(0, 64) || crypto.randomUUID();
  const { response, user, supabase, sessionId } = await updateSession(request, requestHeaders);
  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(p + "/"));

  // Časovanie relácie: idle 24 h / absolútne 14 dní (app-layer; Supabase timeouty sú Pro-only).
  if (user && sessionId) {
    const dec = evaluateSession(request.cookies.get(SESSION_COOKIE)?.value, sessionId, Date.now());
    if (dec.kind === "TIMEOUT") {
      // Best-effort server-side revokácia refresh tokenu. supabase-js chybu VRACIA (nehádže);
      // pri zlyhaní (výpadok Supabase) nesmieme byť fail-open — preto níže mažeme sb-* cookies
      // explicitne z requestu a NEkopírujeme response cookies (getUser mohol práve refreshnúť
      // token a jeho Set-Cookie by reláciu v prehliadači obnovil).
      const { error } = await supabase.auth.signOut();
      if (error) console.error(JSON.stringify({ level: "error", scope: "session.timeout.signout", msg: error.message, requestId }));
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      url.searchParams.set("timeout", "1");
      if (isProtected) url.searchParams.set("next", path);
      const redir = NextResponse.redirect(url);
      for (const c of request.cookies.getAll()) {
        if (c.name.startsWith("sb-")) redir.cookies.set(c.name, "", { maxAge: 0, path: "/" }); // aj chunked .0/.1
      }
      redir.cookies.set(SESSION_COOKIE, "", { ...SESSION_COOKIE_OPTS, maxAge: 0 });
      redir.headers.set("x-request-id", requestId);
      return secure(redir);
    }
    if (dec.kind !== "OK") response.cookies.set(SESSION_COOKIE, dec.value, SESSION_COOKIE_OPTS);
  } else if (request.cookies.get(SESSION_COOKIE)) {
    response.cookies.set(SESSION_COOKIE, "", { ...SESSION_COOKIE_OPTS, maxAge: 0 }); // po odhlásení uprac metadáta
  }

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", path);
    const redir = NextResponse.redirect(url);
    redir.headers.set("x-request-id", requestId);
    return secure(redir);
  }
  response.headers.set("x-request-id", requestId);
  return secure(response);
}

export const config = {
  // beží všade okrem statiky, obrázkov a API (sync/dopyt nesmú byť za auth)
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
