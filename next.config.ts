import type { NextConfig } from "next";

// Bezpečnostné hlavičky pre všetky cesty (clickjacking, sniffing, HSTS, referrer, permissions, CSP).
// CSP: stredne prísna a NEnarúšajúca (script/style 'unsafe-inline' kvôli inline JSON-LD + Next bootstrapu).
// Obmedzuje object/base/form-action/frame-ancestors a allowlistuje img/connect (Supabase, humed).
// TODO: sprísniť na nonce-based script-src (vyžaduje úpravu inline JSON-LD + browser overenie).
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: https://www.partner.humed.sk https://*.supabase.co",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
].join("; ");

const baseHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
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
    // dočasný zdroj obrázkov katalógu (humed) — neskôr vlastné/Supabase Storage
    remotePatterns: [{ protocol: "https", hostname: "www.partner.humed.sk" }],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
