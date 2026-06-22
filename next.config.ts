import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // v dev neoptimalizovať (rýchlejší preview); produkcia optimalizuje
    unoptimized: process.env.NODE_ENV !== "production",
    // dočasný zdroj obrázkov katalógu (humed) — neskôr vlastné/Supabase Storage
    remotePatterns: [{ protocol: "https", hostname: "www.partner.humed.sk" }],
  },
};

export default nextConfig;
