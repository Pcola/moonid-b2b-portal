import type { NextConfig } from "next";

// Bezpečnostné hlavičky pre všetky cesty (clickjacking, sniffing, HSTS, referrer, permissions).
// CSP zatiaľ neriešime (vyžaduje nonce kvôli inline JSON-LD) — doplníme neskôr.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

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
