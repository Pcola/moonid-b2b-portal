import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Bezpečnostné hlavičky pre všetky cesty (clickjacking, sniffing, HSTS, referrer, permissions, CSP).
// CSP: stredne prísna a NEnarúšajúca (script/style 'unsafe-inline' kvôli inline JSON-LD + Next bootstrapu).
// Obmedzuje object/base/form-action/frame-ancestors a allowlistuje img/connect (Supabase).
// TODO: sprísniť na nonce-based script-src (vyžaduje úpravu inline JSON-LD + browser overenie).
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: https://*.supabase.co",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.pwnedpasswords.com",
].join("; ");

const baseHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

// CSP len v produkcii — v dev by 'unsafe-eval' (React Refresh/HMR) a ws spojenia
// vyžadovali oveľa voľnejšiu politiku; lokálny dev nie je bezpečnostný cieľ.
const securityHeaders =
  process.env.NODE_ENV === "production"
    ? [{ key: "Content-Security-Policy", value: csp }, ...baseHeaders]
    : baseHeaders;

// Presný Supabase host z env (nie wildcard *.supabase.co — viď SECURITY_AUDIT L-6),
// aby image optimizer neproxoval obrázky z cudzích Supabase projektov.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "*.supabase.co";

const nextConfig: NextConfig = {
  images: {
    // v dev neoptimalizovať (rýchlejší preview); produkcia optimalizuje
    unoptimized: process.env.NODE_ENV !== "production",
    // obrázky produktov hostujeme vo vlastnom Supabase Storage (re-host z dodávateľa);
    // len verejný storage prefix konkrétneho projektu
    remotePatterns: [
      { protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

// Sentry obal: tunelovanie cez /monitoring (same-origin → netreba meniť CSP connect-src,
// obíde ad-blockery). Source mapy sa nahrávajú len ak je nastavený SENTRY_AUTH_TOKEN;
// bez DSN/tokenu je build aj runtime bez Sentry réžie.
export default withSentryConfig(nextConfig, {
  silent: true,
  disableLogger: true,
  tunnelRoute: "/monitoring",
});
