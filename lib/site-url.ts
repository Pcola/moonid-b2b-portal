/**
 * Jediný zdroj pravdy pre absolútnu URL webu (canonical, OG, sitemap, robots, odkazy v e-mailoch).
 *
 * Poradie: NEXT_PUBLIC_SITE_URL (explicitné, produkcia) → stabilná URL Vercel vetvy →
 * URL aktuálneho preview deploymentu → localhost pre vývoj.
 *
 * ZÁMERNE bez fallbacku na www.moonid.sk: kým doména neservuje tento portál, canonicaly a
 * sitemap by mierili na cudzí web (dnes tam beží iná inštalácia) — viď
 * docs/GO_LIVE_AUDIT_2026-07-25.md, blocker B1/B2.
 */
function resolve(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    const url = new URL(explicit);
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
      throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS in production");
    }
    return url.origin;
  }

  if (process.env.VERCEL_ENV === "production") {
    throw new Error("NEXT_PUBLIC_SITE_URL is required for a production deployment");
  }

  // Vercel systémové premenné (bez protokolu). VERCEL_PROJECT_PRODUCTION_URL je nastavená
  // aj v Preview, preto ju tu nesmieme použiť: odkazy z pozvánok/resetu hesla by mierili na
  // produkciu. Branch URL je stabilná naprieč staging deploymi; URL deploymentu je bezpečný fallback.
  const host = process.env.VERCEL_BRANCH_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (host) return new URL(`https://${host.replace(/\/+$/, "")}`).origin;

  return "http://localhost:3000";
}

export const SITE_URL = resolve();
