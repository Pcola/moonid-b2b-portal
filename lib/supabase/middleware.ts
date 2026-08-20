import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { sessionIdFromJwt } from "@/lib/session-timeout";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CookieToSet = { name: string; value: string; options?: any };

// Middleware variant Supabase klienta — obnoví session cookie a vráti usera.
// (client.ts = browser, server.ts = Server Components, toto = middleware.)
export async function updateSession(request: NextRequest, forwardedHeaders = new Headers(request.headers)) {
  let response = NextResponse.next({ request: { headers: forwardedHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[], headers: Record<string, string>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: forwardedHeaders } });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          // @supabase/ssr 0.12: anti-cache hlavičky (Cache-Control: private,no-store…) na Set-Cookie
          // odpovediach — aby CDN/proxy necachoval session cookie jedného usera pre iného.
          Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    }
  );

  // getUser() zároveň obnoví (refreshne) session — dôležité volať tu.
  const { data: { user } } = await supabase.auth.getUser();
  // session_id pre app-layer timeout (lib/session-timeout) — číta sa až PO refreshi
  let sessionId: string | null = null;
  if (user) {
    const { data: { session } } = await supabase.auth.getSession();
    sessionId = sessionIdFromJwt(session?.access_token);
  }
  return { response, user, supabase, sessionId };
}
