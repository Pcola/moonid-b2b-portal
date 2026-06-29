# ✅ Bezpečnostný audit — akčný zoznam podľa priorít

> Zdroj: [`SECURITY_AUDIT_2026-06-29.md`](./SECURITY_AUDIT_2026-06-29.md) · Dátum: 2026-06-29
> Legenda závažnosti: 🟠 Vysoká · 🟡 Stredná · 🔵 Nízka
> Odhad úsilia: **S** = hodiny · **M** = ~deň · **L** = niekoľko dní

---

## 🔴 P0 — Teraz (kritické pre bezpečnosť, malé zmeny) — ✅ HOTOVO (commit `a6d6294`)

- [x] **H-1 · 🟠 · S** — Escapovať JSON-LD proti `</script>` breakoutu ✅
  - Vytvorený `lib/json-ld.ts` s helperom `safeJsonLd()` (escape `<`,`>`,`&`,U+2028/9).
  - Aplikované na `app/produkt/[slug]/page.tsx`, `app/layout.tsx`, `components/site/sections.tsx`.
  - **Overené:** `tsx` test — `</script><script>` sa escapuje na `<…`, round-trip cez `JSON.parse` zachová obsah; `tsc`+`eslint` čisté.
- [x] **M-3a · 🟡 · S** — `REVOKE EXECUTE … FROM PUBLIC, anon, authenticated` na 5 Pohoda/RLS funkciách ✅
  - `pohoda_ingest_invoices`, `pohoda_ingest_stock`, `pohoda_heartbeat`, `pohoda_get_cursors`, `rls_auto_enable`.
  - Aplikované na **živú DB** + zosúladený `database/pohoda-agent.sql`.
  - **Overené:** `has_function_privilege('anon', …)` = `false`, `('pohoda_agent', …)` = `true`.
- [x] **L-2 · 🔵 · S** — Doplniť audit append-only o `TRUNCATE` ✅
  - `CREATE TRIGGER audit_log_no_truncate BEFORE TRUNCATE ON "AuditLog"` (statement-level, raise).
  - Aplikované na **živú DB** + zosúladený `database/audit-append-only.sql`.
  - **Overené:** `pg_trigger` — `on_truncate=true`, `STMT` level. (Trigger pokrýva aj vlastníka tabuľky, preto bol zvolený namiesto/popri REVOKE.)

---

## 🟡 P1 — Tento týždeň

- [ ] **M-1 · 🟡 · M** — Rate-limiting na verejné endpointy
  - `/api/dopyt`, `createAccessRequest` (registrácia), login, reset hesla.
  - Implementácia: **Vercel Firewall** rate-limit rules alebo `@upstash/ratelimit` + Vercel KV (per-IP + per-email/IČO).
  - V `/api/dopyt` odmietnuť POST s chýbajúcim `Origin` (403, namiesto `return true`).
  - Deduplikácia `PENDING` `AccessRequest` (unique partial index).
  - **Akceptačné kritérium:** >N requestov/min z jednej IP dostane 429.
- [ ] **M-1b · 🟡 · S** — CAPTCHA/Turnstile na verejné formuláre
  - Zapnúť v Supabase Auth (login/reset) + na kontaktný/registračný formulár.
- [ ] **M-2 · 🟡 · S** — Server-side politika hesiel
  - Supabase Auth: zapnúť **Leaked password protection (HIBP)** + nastaviť min. dĺžku/silu hesla.
  - **Akceptačné kritérium:** pokus o nastavenie uniknutého/krátkeho hesla cez `PUT /auth/v1/user` zlyhá na serveri.

---

## 🟠 P2 — Tento mesiac

- [ ] **M-3b · 🟡 · M** — `ENABLE ROW LEVEL SECURITY` (default-deny) na všetkých 26 `public` tabuľkách
  - Ideálne ako Prisma migrácia; Prisma privilegovaná rola RLS obchádza → app funguje.
  - Pridať **CI gate**: kontrola, že `anon`/`authenticated` nemajú DML granty a `public` nie je vystavená cez Data API.
- [ ] **M-4 · 🟡 · M** — Nonce-based CSP
  - `script-src 'nonce-<rnd>' 'strict-dynamic'`, odstrániť `'unsafe-inline'` zo `script-src` (nonce na JSON-LD + Next bootstrap).
- [ ] **L-1 · 🔵 · S** — Rozdeliť STAFF/ADMIN pre citlivé operácie
  - Cenotvorba (`priceTierCode`, `splatDays`), zakladanie produktov, deaktivácia firmy → `requireAdmin()`.
  - Alebo: zdokumentovať súčasný stav ako zámer (malý tím).
- [ ] **L-4 · 🔵 · S** — `/api/img` hardening
  - `AbortController` timeout, `redirect:'manual'` + re-validácia, limit veľkosti, kontrola `content-type: image/*`.
- [ ] **L-6 · 🔵 · S** — Zúžiť `images.remotePatterns`
  - Z `*.supabase.co` na `<ref>.supabase.co` + `pathname:/storage/v1/object/public/**`.

---

## 🔵 P3 — Hygiena / GDPR / nice-to-have

- [ ] **GDPR · 🔵 · S** — Retenčná politika pre `AuditLog` (ukladá e-maily + IP)
  - Definovať dobu uchovávania + automatický purge (čl. 5(1)(e), čl. 30).
- [ ] **L-2b · 🔵 · S** — Presunúť audit/RPC locky (`audit:lock`, `pohoda:rpc`) do migračného toku + CI kontrola cez `pg_trigger`.
- [ ] **L-5 · 🔵 · S** — `recordLoginFailure`: generovať server-side z reálneho pokusu (Supabase Auth hook), nie verejnou Server Action.
- [ ] **L-3 · 🔵 · S** — Zvážiť nenásledný identifikátor objednávky pre zákazníka/URL (ak je objem citlivý).
- [ ] **L-7 · 🔵 · S** — `@unique` na `Cart.companyId` + `getOrCreateCart` cez `upsert` (data-integrity).
- [ ] **L-8 · 🔵 · S** — `create-admin.ts`: nevypisovať heslo do konzoly; jednorazový odkaz / reset pri prvom prihlásení.
- [ ] **L-9 · 🔵 · S** — „Zapamätať si ma": odstrániť alebo implementovať (`name`/`onChange`/state).
- [ ] **MFA · 🔵 · M** — Zvážiť MFA pre staff/admin (schéma `User.mfaEnabled` už existuje).

---

## Sledovanie stavu

| Tier | Položiek | Hotovo |
|---|---|---|
| P0 | 3 | **3 / 3** ✅ |
| P1 | 4 | 0 / 4 |
| P2 | 5 | 0 / 5 |
| P3 | 8 | 0 / 8 |

*Aktualizujte zaškrtnutia a tabuľku po každom dokončení.*
