# Čo ešte chýba na enterprise úroveň — kód, funkcionalita, dizajn, bezpečnosť

*Gap-scan Moonid B2B portálu v 5 dimenziách (bezpečnosť, kód/CI, zákaznícka funkcionalita, staff funkcionalita, dizajn/UX/SEO), overený proti kódu 16. 7. 2026.*

---

## 1. Executive zhrnutie

Portál má nadpriemerne pevné jadro: autorizácia s dôslednou tenant-izoláciou, append-only audit, prísna CSP, kompletná CI so SAST/secrets-scanom a jednotný dizajn systém s dobrým a11y základom — nič z toho netreba prerábať. Gap-scan našiel **1 × P0, 11 × P1, 26 × P2 a 14 × P3** (po deduplikácii prienikov). Najväčšie tri riziká: **(1)** deaktivácia firmy (`Company.active=false`) sa nikde nevynucuje — offboarding zákazníka reálne nefunguje a deaktivovaná firma môže ďalej objednávať; **(2)** hlavný checkout `createOrder` nemá try/catch a produkčné migrácie sa nenasadzujú automaticky — kombinácia, pri ktorej DB chyba alebo schema drift skončí tichým zlyhaním objednávky bez správy zákazníkovi; **(3)** schvaľovací flow je funkčný dátovo, ale neviditeľný — bez in-app notifikácií (a s vyradeným e-mail kanálom) visia objednávky `CAKA_SCHVALENIE` bez povšimnutia, a staff ich nevidí vôbec. Väčšina P1 opráv je effort S (jednodňové zásahy), takže cesta k pilotu je krátka; P2/P3 sú roadmapa do plnej prevádzky.

---

## 2. Čo už JE na enterprise úrovni

**Bezpečnosť**
- Auth/authz disciplína: middleware + každá server action a API route si rolu overuje sama (`requireUser/requireStaff/requireAdmin`), vrátane `/api/staff/export` a `/api/img`; staff s vynúteným MFA (enrolment + AAL2) a kontrolou `user.active`
- IDOR/tenant izolácia: dôsledný `companyId` scoping všade (košík, objednávky, nastavenia, obľúbené, faktúry, GDPR export); deaktivovaný user neprejde
- Input validácia: Zod `safeParse` na všetkých server actions aj API (max dĺžky, honeypoty, ID regexy)
- Security headers + prísna produkčná CSP (default-src 'self', presné hosty, HSTS preload, COOP/CORP); XSS-safe (JSON-LD cez `safeJsonLd`), žiadny SQL injection vektor (len tagged templates), open-redirect krytý `safeNextPath`
- Session manažment: idle 24 h / absolút 14 d, fail-closed mazanie cookies; SSRF hardening (https + allowlist + `redirect:'manual'`, zákaz SVG, size cap na img-proxy); anti-CSRF Origin kontrola
- Audit log append-only na DB úrovni (triggery platné aj pre ownera), retencia 24 m, funkčný staff viewer s filtrami a stránkovaním
- Rate limiting v Postgrese (dopyt, login + per-účet lockout, reset hesla, registrácia) s anti audit-spam guardom; RLS default-deny ako defense-in-depth; secrets hygiena (service-role len server-only, `discountPct` neuniká klientovi)

**Kód, CI a testy**
- CI pipeline enterprise-grade: SHA-pinned actions, least-privilege, efemérny Postgres, `migrate deploy` + tsc + ESLint + produkčný build + vitest + `npm audit` — všetko blokujúce; gitleaks (celá história) + semgrep + Dependabot
- Sentry reálne zapojený s PII scrubom; `reportError` nikdy nehádže; e-maily best-effort s escapovaním a maskovaním PII
- Server actions s konzistentným kontraktom `{ok, error}`, optimistic-lock proti súbehu, idempotency key na repeat order, delete-first guard na `createOrder`
- Reálne integračné testy proti DB (tenant-izolácia, RLS, peniaze v `createOrder`, staff transitions, session-timeout) — 11 súborov; pre-push hook; 26 čistých lineárnych migrácií; GDPR retention purge bez cron infra

**Zákaznícka funkcionalita**
- Katalóg: strom kategórií s faceted counts, hľadanie name/SKU/EAN, filtre, triedenie, stránkovanie, varianty, firemné obľúbené
- Rýchla objednávka (paste + CSV upload s per-riadkovou spätnou väzbou), nadštandardné opakovanie objednávky (staging, prepočet k dnešku, UUID idempotencia)
- Server-autoritatívny checkout (dopravné metódy s free-threshold, PO číslo BT-13, adresy, centová aritmetika zhodná klient/server)
- Approver flow dátovo funguje (CAS anti-race, fallback, audit), multi-user firmy s pozvánkami a guardmi, CRUD dodacích adries, zákaznícke storno s CAS oknom, faktúry s odvodeným OVERDUE, GDPR čl. 15/17/20 sekcia

**Staff funkcionalita**
- Kompletná správa zákazníkov (tier/splatnosť/aktivita, users-manager s guardmi na posledného správcu), onboarding queue žiadostí, workflow objednávok s optimistic-lockom a prepočtom súm, cenníky s per-produkt zmluvnými cenami (ProductPrice MANUAL), EAN/feed párovanie s copy-on-confirm rehostom, plne spravovateľný strom kategórií, doprava/platba editor, validovaný upload obrázkov, KPI dashboard, serverové filtre/stránkovanie tam, kde hrozí objem

**Dizajn, a11y, SEO, výkon**
- Jednotný dizajn systém web/portál/staff/auth (tokeny, next/font, fluidná škála); a11y základ nadpriemerný (focus-visible, skip-linky, drawery s Escape+inert, aria-live toasty, prefers-reduced-motion); kontrast tokenov opravený
- SEO/GEO-AIO na verejnom webe kompletné (canonicaly, OG, robots, sitemap s produktami, JSON-LD, llms.txt, dôsledný noindex)
- Výkon: next/image so sizes v produktovom UI, skeletony pre hlavné routy, Lighthouse CI config, Analytics + SpeedInsights, Sentry error boundaries, branded 404

---

## 3. P0 — pred pilotom

| # | Oblasť | Gap | Dôkaz | Effort |
|---|--------|-----|-------|--------|
| 1 | Staff / bezpečnosť | **Deaktivácia firmy sa nikde nevynucuje** — `Company.active=false` je len kozmetika (badge, CSV stĺpec, KPI). `requireUser` kontroluje len `user.active`, `getCurrentUser` si `company.active` ani neselektuje, `createOrder` nemá check. Deaktivovaná firma sa prihlási a objedná. Fix: `company.active` do selectu + guard v `requireUser` a/alebo check v `createOrder`. | `lib/auth.ts:37-42, 83-89`; `app/(portal)/kosik/actions.ts:188-233` | S |

---

## 4. P1 — krátko po pilote

| # | Oblasť | Gap | Dôkaz | Effort |
|---|--------|-----|-------|--------|
| 1 | Kód | **`createOrder` bez try/catch** — pri transientnej DB chybe unhandled rejection, zákazník nedostane žiadnu správu a nevie, či objednávka odišla. Zjednotiť na pattern z `placeRepeatOrder` (catch → `reportError` → `{ok:false}`). | `app/(portal)/kosik/actions.ts:278-299` vs. `:511-542`; `cart-view.tsx:88-99` | S |
| 2 | CI/deploy | **Produkčné migrácie sa nenasadzujú automaticky** — Vercel build je len `prisma generate && next build`; nový kód sa môže nasadiť skôr než DB dostane migráciu → runtime chyby. Fix: `prisma migrate deploy` do buildCommand. | `package.json:7`; `vercel.json`; `docs/DEPLOYMENT_READINESS.md:40` | S |
| 3 | Zákazník | **Žiadne in-app notifikácie schvaľovania a stavov** — schvaľovateľ sa o čakajúcej objednávke dozvie len ak sám otvorí /objednavky (žiadny badge/zvonček); dashboard `CAKA_SCHVALENIE` nepočíta a renderuje ho ako surový enum text (STATUS mapa kľúč nemá, „Aktívne objednávky" ho vynechávajú). Minimálne: badge s počtom v navigácii + karta a label na dashboarde. | `components/portal/portal-shell.tsx`; `app/(portal)/dashboard/page.tsx:12-19, 50-59, 149`; `kosik/actions.ts:41-50` | M |
| 4 | Zákazník | **RFQ „Vyžiadať cenu" je slepá ulička** — CTA je obyčajný Link na /dashboard; žiadny formulár, žiadna stopa pre staff. Model `Inquiry` je pripravený na recykláciu (predvyplnený dopyt s SKU → /staff/dopyty). | `app/(portal)/katalog/[slug]/product-detail.tsx:98`; `prisma/schema.prisma` (Inquiry) | S |
| 5 | Staff / audit | **Katalógové akcie obchádzajú audit trail** — `confirmMatch/rejectMatch/togglePublish/manualPair/createProduct` + `updateProductImage` bez `writeAudit`; `togglePublish` je navyše duplicita auditovaného `setProductPublished`. | `app/staff/katalog/actions.ts:1-106`; `app/staff/produkty/actions.ts:139-166` | S |
| 6 | Testy | **Netestované money-kritické flow** — staff `updateOrder` (prepočet subtotal/VAT/total), celý approval flow (`approveOrder/rejectOrder` vrát. oprávnení), `cancelOwnOrder` (CAS), `quickAddToCart/parseSkuQty` (kandidát na property test). | `app/staff/objednavky/actions.ts:84-148`; `app/(portal)/objednavky/actions.ts:35,57,81`; tests/* bez importov | M |
| 7 | Dizajn | **Košík na mobile pretečie** — jednoriadkový flex s pevnými šírkami (~362 px) na 375 px viewporte zmrští názov položky na ~0 px; zákazník nevidí, ČO má v košíku. Fix: na <sm zalomiť do 2 riadkov. | `app/(portal)/kosik/cart-view.tsx:112-129` | S |
| 8 | Dizajn | **Množstvo len cez ± stepper** — 50 ks = 50 klikov; qty je read-only `<span>`. Fix: editovateľný číselný input (`inputMode=numeric`), akcia `setQty` už existuje; doplniť aria-label na −/+ na detaile. | `product-detail.tsx:88-92`; `cart-view.tsx:120-124` | S |
| 9 | A11y | **Placeholder-only inputy bez labelu** (WCAG 1.3.1/3.3.2) — nová dodacia adresa, PO referencia, poznámka, select adresy, hľadanie v katalógoch, staff search. Fix: aria-label na každé pole. | `cart-view.tsx:185-195,253-254`; `portal-catalog.tsx:111-112,169`; `catalog-browser.tsx:62-63,89`; `staff-shell.tsx:164` | S |
| 10 | A11y | **Verejný mobilný filter-drawer bez dialog semantiky** — žiadny role=dialog, aria-modal, Escape ani presun fokusu; portálová verzia to všetko má → skopírovať vzor. | `components/site/catalog-browser.tsx:179-196` vs. `portal-catalog.tsx:50-58,271-277` | S |
| 11 | A11y | **Kontrastné rezíduá** — badge Stornovaná `#86827a`/`#f3f0ee` ≈ 3,4:1 (8+ miest), staff sidebar labely `#5f7f78` ≈ 3,8:1, jantárový badge ≈ 3,0:1. Fix: `#86827a` → `--color-muted-3`, zosvetliť/stmaviť zvyšok. | `objednavky/page.tsx:17`, `dashboard/page.tsx:18`, `faktury/page.tsx:14`, `staff-shell.tsx:112,121` a i. | S |

---

## 5. P2 — do plnej prevádzky

| # | Oblasť | Gap | Dôkaz | Effort |
|---|--------|-----|-------|--------|
| 1 | Bezpečnosť | **MFA gate fail-open** — `mfaStatus()` v catch vracia `{enrolled:true, needsChallenge:false}`; pri výpadku Supabase MFA API sa preskočí enrolment aj AAL2 dotlačenie. Aspoň `needsChallenge` má byť fail-closed. | `lib/auth.ts:69-71, 76-80` | S |
| 2 | Bezpečnosť | **Politika hesla len klientsky** — min 12 + HIBP bežia len v prehliadači; priame volanie Supabase Auth prijme slabé heslo (default min 6). Fix konfiguračný: v Supabase zapnúť Leaked password protection + min dĺžku 12. | `set-password-form.tsx:30,35`; `account-card.tsx:13` | S |
| 3 | Bezpečnosť | **Login lockout obíditeľný** — `loginGate` beží pred klientskym `signInWithPassword`; útočník bijúci Supabase endpoint priamo lockout nespustí. Overiť/zdokumentovať rate-limity Supabase Auth ako reálnu ochranu. | `login-form.tsx:34,43`; `app/(auth)/actions.ts:17-27,53` | S |
| 4 | Staff | **Objednávky CAKA_SCHVALENIE pre staff neviditeľné** — zoznam, CSV export aj dashboard ich vylučujú; zaseknutý schvaľovací flow (schvaľovateľ na dovolenke) nikto nevidí. Fix: filter/riadok „Čaká na schválenie" v staff zozname. | `app/staff/objednavky/page.tsx:16`; `export/route.ts:41`; `staff/page.tsx:35,41` | S |
| 5 | Zákazník | **Hľadanie nezvláda slovenčinu bez diakritiky** — len `contains` + `mode:insensitive`; „cistiace" nenájde „čistiace". Fix: PG unaccent/pg_trgm alebo normalizovaný `name_ascii` stĺpec. | `app/(portal)/katalog/page.tsx:21-26`; `app/produkty/page.tsx:26` | M |
| 6 | Zákazník | **Faktúry bez PDF** — `Invoice.pdfStoragePath` existuje v schéme, žiadna download routa; portál-side (signed URL + tlačidlo) sa dá postaviť už teraz nezávisle od inbound syncu. | `app/(portal)/faktury/page.tsx:79`; grep `pdfStoragePath` = len schema | M |
| 7 | Zákazník | **Schvaľovanie len binárne** — chýba prah „nad X € na schválenie" / budget; dnes `canOrderDirectly` true/false schvaľuje aj 15 € objednávku. Dátovo malý zásah (limit Decimal na User + porovnanie totalu). | `schema.prisma` User.canOrderDirectly; `kosik/actions.ts:192`; `nastavenia/actions.ts:198` | M |
| 8 | Zákazník | **Individuálne zmluvné ceny sa nedajú spravovať** — `ProductPrice` + `PriceSource.MANUAL` pripravené v schéme a `resolveUnitPrice` ich preferuje, ale žiadne UI/action ich nezapíše. Pozor: cenový filter/sort v katalógu počíta z basePrice a s override sa rozíde. | grep `productPrice` v `cenniky/actions.ts` = len count (:64); `katalog/page.tsx:71-72` | M |
| 9 | Zákazník | **Verejný web filtruje podľa LEGACY textovej podkategórie** — portál používa strom (categoryId/subcategoryId), verejný /produkty legacy `Product.subcategory`; taxonómie sa môžu rozísť a po migrácii sa verejné podkategórie rozpadnú. | `app/produkty/page.tsx:29,54`; `schema.prisma` komentár LEGACY | S |
| 10 | Zákazník | **Detail objednávky neukazuje dodaciu adresu** — select nenačítava `deliveryLocation`; schvaľovateľ schvaľuje bez znalosti miesta doručenia. | `app/(portal)/objednavky/[id]/page.tsx:20-29` (vzor v `opakovat/page.tsx:73-74`) | S |
| 11 | Staff | **Plochý RBAC — `requireAdmin` bez jediného použitia** — každý STAFF má plnú cenotvorbu, audit log aj CSV export celej bázy. Vyriešiť pred pridaním prvého ďalšieho staff konta (aspoň cenotvorba + audit za requireAdmin). | `lib/auth.ts:102`; grep requireAdmin = 0 call-sites; `cenniky/actions.ts:17,44,59` | M |
| 12 | Staff | **Staff faktúry: KPI z orezaných 100 riadkov** — súčty in-memory nad `take:100`; nad 100 faktúr budú ticho nesprávne. Chýbajú filtre, stránkovanie, export. Fix: `prisma.aggregate` + serverové filtre. | `app/staff/faktury/page.tsx:20-28`; export route len orders\|customers | M |
| 13 | Staff | **Životný cyklus STAFF/ADMIN kont bez UI** — vytvorenie len cez CLI, žiadna deaktivácia odchádzajúceho staffa ani reset MFA (stratený TOTP = Supabase konzola). Offboarding zamestnanca má byť jednoklikový a auditovaný. | `scripts/auth/create-admin.ts`; `zakaznici/actions.ts:85,109,130` | M |
| 14 | Staff | **Žiadne bulk operácie a produktový import/export** — hromadná údržba ~500-600 SKU (EAN doplnenie, precenenie) = stovky klikov alebo ad-hoc skripty mimo auditu. | `products-list.tsx`; `export/route.ts:39-81` | L |
| 15 | Staff | **Objednávka bez interných poznámok a tlačových výstupov** — staff editor prepisuje zákazníkovu poznámku (`order.note`), interná komunikácia nemá kam ísť; chýba picking list/dodací list pre závoz. Fix: `internalNote` + print-friendly stránka. | `staff/objednavky/actions.ts:77,141`; `[id]/page.tsx:185-190` | M |
| 16 | Kód/CI | **E2E nebeží v CI a mieri na produkciu** — Playwright suite existuje, ale žiadny workflow ju nespúšťa; order-flow je deštruktívny s default skipom. Minimálne: PR job proti preview URL + Secrets pre test kontá. | `playwright.config.ts:14`; `tests/e2e/order-flow.spec.ts:1-13`; `.github/workflows/` | M |
| 17 | Kód/CI | **Out-of-band SQL mimo migrácií** — audit append-only triggery a Pohoda RPC/GRANTy sa aplikujú ručne; nové prostredie/obnova zo zálohy ich NEMÁ, bez signálu. Presunúť do migrácie alebo CI/health check na existenciu triggerov. | `package.json:36-37`; `docs/POHODA_INTEGRATION.md:27`; `SECURITY_AUDIT…:224` (L-2) | M |
| 18 | Kód/repo | **Hygiena repa** — ~12 netrackovaných enrich/EAN skriptov + `__pycache__` + .NET publish binárky v `agent/publish-fd/`; .gitignore ich nekryje. Rozhodnúť kanonické → commit, zvyšok zmazať, doplniť .gitignore. | git status `?? scripts/enrich-*.py`, `?? agent/publish-fd/` | S |
| 19 | Kód/docs | **README popisuje zamietnutý Medusa stack** — vstupný bod repa aktívne zavádza (aj AI asistentov); prepísať na Next.js+Prisma+Supabase + mapu živých docs. | `README.md` sekcia 2 vs. `package.json` | S |
| 20 | Dizajn/a11y | **Staff shell bez skip-linku** + Icon bez aria-hidden, logout len s title — parita s portálom je lacná kópia. | `staff-shell.tsx:78-80,144-169` vs. `portal-shell.tsx:136,164` | S |
| 21 | SEO | **Paginácia a facety verejného katalógu len JS buttony** — crawler sa nedostane na stranu 2+ ani kategórie; canonical všetkých stavov ukazuje na holé /produkty, kategórie nemajú indexovateľné landing pre B2B long-tail. Fix: `<Link href>` + metadata per kategória. | `catalog-browser.tsx:50-56,168-173`; `produkty/page.tsx:16` | M |
| 22 | SEO | **Sitemap nekryje /pomoc a /registracia** — obe verejné s canonicalom; /pomoc má GEO/AIO hodnotu. | `app/sitemap.ts:14-22` | S |
| 23 | Dizajn | **Staff bez loading.tsx (0 súborov), portál bez skeletonu pre košík** a ďalšie routy — force-dynamic stránky pri navigácii zamrznú bez odozvy; skeleton komponenty už existujú. | Glob `app/**/loading.tsx` = 5, žiadny pod /staff | S |
| 24 | Dizajn | **Staff tabuľky bez overflow-x** — 6-stĺpcový grid v overflow-hidden sa na mobile rozmliaždi; staff pri závoze pozerá objednávky z telefónu. | `orders-list.tsx:61-63`; overflow-x-auto len v 4 súboroch | M |
| 25 | Výkon | **Neoptimalizované `<img>` logá na homepage** (~0,5 MB PNG, AVIF/WebP ~10× menšie) + 7 staff súborov mimo next/image. | `components/site/sections.tsx:179,440`; `public/images` | M |
| 26 | Dizajn | **„Zapamätať si ma" checkbox nič nerobí** — defaultChecked bez logiky; klamlivý bezpečnostný prvok — odstrániť alebo reálne prepnúť perzistenciu. | `login-form.tsx:79-82` | S |

---

## 6. P3 — nice-to-have

| # | Oblasť | Gap | Dôkaz | Effort |
|---|--------|-----|-------|--------|
| 1 | Bezpečnosť | Zákaznícke účty bez možnosti (ani voliteľnej) MFA — CUSTOMER_ADMIN vidí faktúry/IČO/ceny; pre náročnejších B2B klientov očakávaná voliteľná 2FA. | `lib/auth.ts:76-80`; `app/mfa/setup/page.tsx:19` | M |
| 2 | Bezpečnosť | `rehostImage` bez stropu veľkosti sťahovaného obrázka — nekonzistentné s `api/img` (MAX_BYTES 10 MB); pridať rovnaký cap. | `lib/rehost-image.ts:41` vs. `api/img/route.ts:27,42-46` | S |
| 3 | Zákazník | Back-order bez termínu — `leadDays`/`expectedAt` v schéme, v UI 0 použití; zobraziť „dodanie ~X dní". | grep = 0 mimo schémy; `product-detail.tsx:67` | S |
| 4 | Zákazník | /objednavky bez filtrov, hľadania, stránkovania a CSV exportu — query rastie neobmedzene. | `objednavky/page.tsx:28-32` | M |
| 5 | Zákazník | Množstevné ceny (qty breaks) neexistujú — `resolveUnitPrice` bez qty vstupu; roadmapová položka z Medusa checklistu. | `schema.prisma` ProductPrice; `lib/pricing.ts:11-18` | L |
| 6 | Zákazník | Minimálna hodnota objednávky sa nevynucuje — po dohodnutí biznis hodnoty vynútiť v checkoute (config vedľa `freeThreshold`). | `kosik/actions.ts:188-316`; `lib/store-config.ts` | S |
| 7 | Staff | Dopyty len binárne vybavené/nevybavené — bez SLA zvýraznenia (>48 h), priradenia a poznámky; pre sólo operátora zatiaľ postačuje. | `dopyty/actions.ts:12-21` | M |
| 8 | Staff | KPI „nízky sklad" bez drill-downu, threshold 10 ks hardcoded — pridať filter `?status=lowstock` + link z karty. | `staff/page.tsx:38`; `produkty/page.tsx:16,26-29` | S |
| 9 | Staff | `approveRequest` hľadá existujúce auth konto cez `listUsers(perPage:1000)` — nad 1000 účtov tichý strop; použiť `getUserByEmail` (skontrolovať aj `lib/invite.ts`). | `ziadosti/actions.ts:53-55` | S |
| 10 | Staff | Reporting končí pri dashboarde — chýba obrat per zákazník/kategória, voliteľné obdobie, agregovaná marža. | `staff/page.tsx:34-46` | M |
| 11 | Kód/CI | Chýba coverage meranie a engines pin — `@vitest/coverage-v8` s prahom na lib/** + actions; `"engines": {"node":"20.x"}`. | `vitest.config.ts`; `package.json` | S |
| 12 | Kód/CI | Lighthouse gate warn-only a meria produkciu — PR nezachytí vlastnú výkonovú regresiu; prepnúť na preview + tvrdé asserty, alebo priznať telemetriu. | `.github/workflows/lighthouse.yml:27` | S |
| 13 | Dizajn | ~3,5 MB mŕtvych assetov v public/images (rozvoz.jpg 1,5 MB, hero-cleaning.png 1,3 MB…) — deployujú sa na CDN; vymazať. | grep referencií; du = 5,1 MB | S |
| 14 | Dizajn | Metadata rezíduá: dashboard bez `export metadata` (dedí marketingový title), chýba `twitter:card`. | `dashboard/page.tsx:1-45`; `app/layout.tsx:26-41` | S |

---

## 7. Odporúčané poradie realizácie (prvých ~10 krokov)

Optimalizované pre solo-dev: najprv jednodňové zásahy s najväčším rizikovým dopadom, konfiguračné fixy pred kódovými, minimum novej prevádzkovej záťaže.

1. **Vynútiť `Company.active`** v `requireUser`/`getCurrentUser` + check v `createOrder` — jediný P0, offboarding musí fungovať. *(S)*
2. **Obaliť `createOrder` do try/catch** podľa vzoru `placeRepeatOrder` — zákazník musí vždy dostať odpoveď. *(S)*
3. **`prisma migrate deploy` do Vercel buildCommand** — eliminuje schema drift jedným riadkom. *(S)*
4. **Konfiguračný bezpečnostný balík v Supabase** (bez kódu): zapnúť Leaked password protection + min dĺžku 12, overiť rate-limity Auth endpointu; v kóde prepnúť `needsChallenge` na fail-closed v `mfaStatus()`. *(S)*
5. **Doplniť `writeAudit` do `app/staff/katalog/actions.ts`** + zrušiť duplicitný `togglePublish` — obnoví celistvosť audit trailu. *(S)*
6. **RFQ: prepojiť „Vyžiadať cenu" na predvyplnený Inquiry formulár** — model aj staff queue už existujú, len ich spojiť. *(S)*
7. **Mobile/a11y balík P1 v jednom PR**: zalomenie košíka na <sm, editovateľný qty input, aria-labels na placeholder-only polia, dialog semantika verejného drawera, kontrastné rezíduá (#86827a → token). Všetko S, spolu ~1 deň. *(S)*
8. **In-app viditeľnosť schvaľovania**: badge s počtom `CAKA_SCHVALENIE` v portal-shelli, karta + label na dashboarde, a filter „Čaká na schválenie" v staff zozname (rieši P1 zákazníka aj P2 staffu naraz, bez notifikačnej infry navyše). *(M)*
9. **Testy na `updateOrder` + approval flow + `cancelOwnOrder` + `parseSkuQty`** — kryje najrizikovejšiu peňažnú logiku pred ďalšími zásahmi do objednávok. *(M)*
10. **Hygiena repa + README**: rozhodnúť/zmazať enrich skripty, doplniť .gitignore (`__pycache__/`, publish výstupy), prepísať README na reálny stack — lacná prevencia zmätku o pol roka. *(S)*

Ďalej v poradí: diakritikou-necitlivé hľadanie (P2, denná interakcia), audit triggery do migrácií (P2, prežitie obnovy zo zálohy), staff faktúry KPI cez aggregate, RBAC split pred prvým ďalším staff kontom.