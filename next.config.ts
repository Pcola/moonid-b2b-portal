import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Presný Supabase host z env (nie wildcard *.supabase.co — SECURITY_AUDIT L-6/M-4),
// aby sa CSP aj image optimizer viazali len na náš projekt, nie na cudzie Supabase projekty.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "*.supabase.co";

// Bezpečnostné hlavičky pre všetky cesty (clickjacking, sniffing, HSTS, referrer, permissions, CSP).
// Prísna CSP: default-deny; object/base/frame-ancestors/frame-src/form-action zamknuté;
// img/connect viazané na náš Supabase host (+ HIBP). script-src ponecháva 'unsafe-inline'
// VEDOME (SECURITY_AUDIT M-4): nonce-based CSP by v App Routeri vynútil dynamické
// renderovanie statických stránok a po oprave H-1 (escapovaný JSON-LD cez safeJsonLd) +
// React auto-escape neostáva vektor na injekciu inline scriptu → akceptované reziduálne riziko.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "form-action 'self'",
  `img-src 'self' data: https://${supabaseHost}`,
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://api.pwnedpasswords.com`,
  "upgrade-insecure-requests",
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
  org: "moonid",
  project: "javascript-nextjs",
  silent: true,
  tunnelRoute: "/monitoring",
  // tree-shake debug logy Sentry SDK z produkčného bundla (menší bundle).
  // Nahradilo zastarané `disableLogger: true` (deprecation vo v9+).
  webpack: { treeshake: { removeDebugLogging: true } },
  // source mapy (čitateľné stack traces + prepojenie na GitHub) sa nahrajú len ak je
  // pri builde nastavený SENTRY_AUTH_TOKEN. Bez tokenu/DSN žiadna réžia.
});
