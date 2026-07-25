/**
 * Jediný zdroj pravdy pre absolútnu URL webu (canonical, OG, sitemap, robots, odkazy v e-mailoch).
 *
 * Poradie: NEXT_PUBLIC_SITE_URL (explicitné, produkcia) → produkčná URL Vercel projektu →
 * URL aktuálneho (preview) deploymentu → localhost pre vývoj.
 *
 * ZÁMERNE bez fallbacku na www.moonid.sk: kým doména neservuje tento portál, canonicaly a
 * sitemap by mierili na cudzí web (dnes tam beží iná inštalácia) — viď
 * docs/GO_LIVE_AUDIT_2026-07-25.md, blocker B1/B2.
 */
function resolve(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  // Vercel systémové premenné (bez protokolu). PRODUCTION_URL je stabilná produkčná URL projektu,
  // VERCEL_URL je URL konkrétneho deploymentu (preview) — na preview je to správnejšie ako produkcia.
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (host) return `https://${host.replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}

export const SITE_URL = resolve();
