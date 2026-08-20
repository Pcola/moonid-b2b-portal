import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Presný Supabase host z env (nie wildcard *.supabase.co — SECURITY_AUDIT L-6/M-4),
// aby sa CSP aj image optimizer viazali len na náš projekt, nie na cudzie Supabase projekty.
if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is required in production");
}
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "localhost";

const baseHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
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
    return [{ source: "/:path*", headers: baseHeaders }];
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
