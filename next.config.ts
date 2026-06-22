import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // dočasný zdroj obrázkov katalógu (humed) — neskôr vlastné/Supabase Storage
    remotePatterns: [{ protocol: "https", hostname: "www.partner.humed.sk" }],
  },
};

export default nextConfig;
