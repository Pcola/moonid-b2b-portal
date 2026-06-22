import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CookieToSet = { name: string; value: string; options?: any };

// Middleware variant Supabase klienta — obnoví session cookie a vráti usera.
// (client.ts = browser, server.ts = Server Components, toto = middleware.)
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // getUser() zároveň obnoví (refreshne) session — dôležité volať tu.
  const { data: { user } } = await supabase.auth.getUser();
  return { response, user };
}
