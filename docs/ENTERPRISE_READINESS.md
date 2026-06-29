# Enterprise-readiness — mapa a stav (živý tracker)

> Z multi-dimenzného auditu (bezpečnosť/ops/testy/frontend/dáta/compliance). Right-sized pre SK mikro-distribútora (~2 operátori, Pohoda = SoR).
> **Verdikt auditu:** tvrdé jadro je nadpriemerne silné; NIE je launch-blokované návrhom. Išlo o posledných ~10 % prevádzkovej/formálnej zrelosti.

## ✅ Hotové v tomto pushe (kód, nasadené)
| Oblasť | Čo |
|---|---|
| Bezpečnosť | SSRF guard v `rehostImage` (host allowlist, blok SVG) · validácia uploadu (max 5 MB, len JPG/PNG/WEBP/GIF) |
| Spoľahlivosť | `/api/health` (DB ping pre uptime monitor) · optimistic lock na `advanceOrder`/`cancelOrder` (anti-súbeh) · client-side `Sentry.captureException` v error boundaries |
| Testy | unit `resolveUnitPrice` (7) + stavový automat (6) + integračný `createOrder` (2) → **19/19**; vitest `@/` alias + `server-only` stub |
| Kvalita | **ESLint** (flat config) nainštalovaný + do **CI gate** (predtým úplne chýbal); nálezy opravené |
| UX/a11y | `loading.tsx` skeletony (katalóg/produkty/dashboard/objednávky/faktúry) · skip-link na verejnom webe (WCAG 2.4.1) |
| Compliance | **persistencia súhlasu** do append-only auditu (registrácia + dopyt: email + verzia + základ) — GDPR čl. 7 |

## 🟢 Už silné (audit potvrdil — netreba)
Tenant izolácia (app + CI testy) · auth (`getUser`, server-only service-role, HIBP, session-invalidácia) · append-only audit (DB trigger) · Decimal peniaze + snapshoty + `createOrder` anti-duplicita · skrytý dodávateľ (costPrice/marža nikdy ku klientovi + obrázky re-hostované) · Pohoda RPC fasáda (REVOKE ALL) · bezpečnostné hlavičky + CSP · Sentry wiring · SEO metadata + sitemap + JSON-LD.

## ⏳ Zostáva — KÓD (menšie, voliteľné)
- SEO micro: BreadcrumbList JSON-LD, Offer price rozhodnutie, `width/height` na brand logá, `apple-touch-icon`
- „Zapamätať si ma" napojiť/odstrániť · CSP nonce (P2)
- axe/Lighthouse v CI · 1× E2E smoke (Playwright: login→košík→objednávka)
- MFA enroll/AAL2 **kód** (čaká na Supabase MFA toggle)

## 🔧 Zostáva — TVOJA config
- **Login rate-limit + Cloudflare Turnstile** (jediná tvrdá bezpečnostná medzera pre verejné)
- **3 alerty:** Sentry DSN (email pri výnimke) + uptime monitor (UptimeRobot na `/api/health`) + stale-stock
- Supabase MFA pre staff · PITR + 1 restore drill · GitHub branch protection + secret scanning

## ⚖️ Zostáva — LEGAL / rozhodnutia
- **RoPA** (záznam spracovateľských činností, čl. 30) · **DPA** (Vercel/Supabase/Resend/Sentry) · menovať sprostredkovateľov v privacy policy
- Rozhodnutia: RLS (2. vrstva pred verejným) · RBAC (1 vs 2 zákaznícke role) · multi-year invoice unique (až s Pohoda sync)

## 🚫 Over-scope (vedome NErobiť pre tento rozsah)
RLS ako blokér · outbound objednávky do Pohody pred pilotom · SSO/FIDO2 · ISO/SOC2/pen-test/bug-bounty · NIS2/eIDAS · DPO/DPIA · APM/multi-region/load-testing · tvrdý coverage gate · e-faktúra v portáli (rieši Pohoda — viď nižšie).

## 📌 E-faktúra (zákon 385/2025, povinná 1.1.2027)
Rieši **účtovná vrstva (Pohoda/Stormware + Peppol Access Point)**, NIE portál. Portál bude len **zrkadliť + ponúkať na stiahnutie** XML/PDF, ktoré vygeneruje Pohoda (Fáza 2, čaká na Pohoda sync). Potvrdiť s účtovníkom + sledovať Stormware roadmapu.
