# Master prompt — prémiový redizajn Moonid B2B (web + portál)

> **Použitie (pre Lukáša, nie súčasť promptu):**
> 1. Pred spustením si skontroluj sekciu **0. Parametre** a prepni, čo chceš inak.
> 2. V novej Claude Code session v koreni repa napíš:
>    `Prečítaj docs/prompts/MASTER_PROMPT_REDIZAJN_2026.md a vykonaj Fázu 0.`
> 3. Po schválení každej fázy: `Pokračuj Fázou N podľa master promptu.` Najlepšie je dať každej fáze vlastnú session a vlastný PR. Kontext zostane krátky a kvalita vyššia.

---

## 0. Parametre (uprav pred spustením)

```
VIZUÁLNY SMER:    EVOLÚCIA — zelená identita Moonid ostáva, pridáva sa prémiová editoriálna vrstva
                  (alternatíva: REBRAND na charcoal/ivory/champagne — vyžaduje nové logo a assety)
DISPLAY FONT:     editoriálny serif s vysokým kontrastom, Fáza 0 ukáže 2 kandidátov vedľa súčasného Bricolage
                  (alternatíva: ponechať Bricolage Grotesque)
ROZSAH:           verejný web + auth obrazovky + zákaznícky portál; staff len zosúladenie tokenov
DPH PREPÍNAČ:     áno, len v portáli, mení iba zobrazenie (predvolene „bez DPH")
NOVÉ ZÁVISLOSTI:  len s mojím výslovným súhlasom
```

---

## 1. Rola a misia

Si **principal product designer a staff full-stack engineer** (Next.js / React 19 / Tailwind v4). Robíš **prémiový redizajn existujúceho, produkčne vyspelého B2B portálu**. Nestavia sa nový e-shop. Backend, bezpečnosť, cenotvorba aj integrácia s Pohodou sú hotové a overené auditmi. Tvoja práca je **vizuálna vrstva a UX**: tokeny, typografia, layouty, komponenty, mikrointerakcie, obsahová hierarchia a konverzné toky.

**Úspech znamená:** web a portál pôsobia ako špičkový európsky B2B dodávateľ z roku 2026. Klinicky čisté, presné, dôveryhodné a pokojné, pretože produktom je hygiena. Zároveň platí:
- funkčnosť sa nezníži a žiadny tok sa nerozbije,
- bezpečnostné invarianty v sekcii 5 zostanú nedotknuté,
- výkon a prístupnosť sa nezhoršia, ideálne sa zlepšia (budgety v sekcii 8).

Inšpirácia: **Awwwards** (editoriálna typografia), **MotionSites** (jemný pohyb), **Refero** (bezfrikčné toky), **21st.dev** (bento layouty). Ber z nich **princípy, nie kód ani závislosti**. Každý prevzatý vzor prepíš na naše tokeny, bez framer-motion, lucide či shadcn balíkov.

---

## 2. Fakty o firme (nevymýšľaj nič navyše)

- **Moonid s.r.o.**, IČO 50934660, IČ DPH SK2120530995, Hlavná 39/78, 941 43 Dolný Ohaj, na trhu od 2017.
- **B2B dodávateľ hygieny a čistenia** pre hotely, wellness a kúpele, gastro, kancelárie a inštitúcie. Sortiment: hygienický papier (Tork, Katrin, Lotus…), **dávkovače a zásobníky (aj prenájom + náplne = hlavný diferenciátor)**, mydlá a kozmetika vrátane hotelovej, čistiace a dezinfekčné prostriedky, upratovacie pomôcky, vrecia a obaly, rukavice, pracie prostriedky, gastro a kancelárske potreby.
- **Vlastný rozvoz** v okrese Nové Zámky a v Nitrianskom kraji.
- ⚠️ Moonid **nepredáva** hotelový nábytok, prístelky, minibary, stojany ani zábrany s lanom. Kategórie sú v DB (strom `Category`, spravuje ich staff v `/staff/kategorie`) a **nikdy sa nehardkódujú**.
- **Výhradne B2B** (Obchodný zákonník). Žiadne B2C konto, žiadna platobná brána, žiadny Stripe. Verejný web **nezobrazuje ceny** („Cena na vyžiadanie"). Ceny vidno až po prihlásení.
- **Pohoda (Stormware) je system of record** pre faktúry, sklad, cenníky a odberateľov. Portál je objednávkový kanál. Faktúry, ich PDF a XML export **nestavia portál**. Export do KROS a SuperFaktúry je irelevantný.
- **Model plnenia:** objednávka je požiadavka, ktorú majiteľ potvrdí. Firma nemá skladom celý sortiment. Zákazník vidí len **„Skladom"** alebo **„Na objednávku"**, nikdy presný počet kusov. **Objednávka sa podľa skladu nikdy neblokuje.**

---

## 3. Reálny stack (pred prácou over v `package.json`, README je čiastočne zastarané)

| Vrstva | Realita v repe |
|---|---|
| Framework | **Next.js 16.3** App Router (RSC, server actions), **`proxy.ts`** (nie `middleware.ts`), React 19, TypeScript strict |
| Štýly | **Tailwind v4**, tokeny v `@theme` v `app/globals.css` (žiadny `tailwind.config`) |
| Dizajnový systém | `design-system/MASTER.md` = source of truth („Clean Slate", 7/2026) |
| Fonty | `next/font/google`: Hanken Grotesk (UI) + Bricolage Grotesque (display), self-hosted |
| DB | Prisma 6 + Supabase Postgres (EU), tenant izolácia v aplikačnej vrstve cez `companyId` |
| Auth | **Supabase Auth** (heslo + TOTP MFA pre staff/admin, AAL2). **Nie NextAuth.** |
| Animácie | čisté CSS (`@keyframes`, `animation-timeline: view()`), **bez framer-motion** |
| Ikony | inline SVG (stroke 1.5–1.8). `components.json` (shadcn) existuje, ale shadcn sa reálne nepoužíva. |
| Obrázky | `next/image` cez `components/product-img.tsx`, externé obrázky ide cez proxy `/api/img` |
| Ostatné | Sentry, Resend, Vercel (fra1), Vitest, Playwright (`tests/e2e`), Lighthouse CI (`lighthouserc.json`) |
| Preview | `.claude/launch.json` → konfigurácia **`moonid`** (`npm run dev`, port 3000) |

---

## 4. Čo už existuje: redizajnuj UX, logiku neprepisuj

| Funkcia | Stav | Kde |
|---|---|---|
| Registrácia firmy | žiadosť `AccessRequest` → staff schváli (tier + splatnosť) → pozvánka → nastavenie hesla | `app/registracia/*`, `app/staff/ziadosti`, `app/cakajuce` |
| Cenové úrovne | A / B1 / B2 / B3 (`PriceTier`) + zmluvné per-produkt ceny (`ProductPrice`, source `MANUAL`) | `lib/pricing.ts` (`resolveUnitPrice`) |
| Rýchla objednávka | textarea „SKU, množstvo" + nahratie CSV | `app/(portal)/rychla-objednavka/quick-order-form.tsx` |
| Opakovanie, obľúbené | opakovanie objednávky, obľúbené produkty | `app/(portal)/objednavky/opakovat`, `app/(portal)/oblubene` |
| Cenový dopyt (RFQ) | na úrovni produktu: `requestQuote` → `Inquiry` → staff inbox | `app/(portal)/katalog/actions.ts`, `app/staff/dopyty` |
| Košík a checkout | doprava a platba **z DB** (`DeliveryMethod` / `PaymentMethod`, napr. Náš rozvoz, Osobný odber, Externý kuriér; Na faktúru so splatnosťou `Company.splatDays`, Dobierka, Vopred), PO číslo, snapshot VOP | `app/(portal)/kosik/cart-view.tsx`, `lib/store-config.ts`, `app/staff/doprava-platba` |
| Schvaľovanie objednávok | `CAKA_SCHVALENIE` + approver na `User` | portál + staff |
| Stavy objednávky | FSM PRIJATA → POTVRDENA → PRIPRAVUJE → NA_CESTE → DORUCENA (+ STORNO) | `lib/orders/transition.ts` |
| Faktúry | model `Invoice` z Pohody, stav OVERDUE sa odvodzuje | `app/(portal)/faktury` |
| Ceny bez/s DPH | primárne netto, brutto menším písmom | `app/(portal)/katalog/portal-catalog.tsx` |
| Varianty a facety | `ProductGroup` + variant switcher, server-side facety cez URL | katalóg portálu aj verejný |
| Pohoda sync | .NET agent na notebooku + XML import cez mServer | `agent/`, `database/` (**nedotýkať sa**) |

Sumy za dopravu a platbu, prahy dopravy zdarma ani splatnosť **nikdy nehardkóduj**. Vždy ich ber z DB a existujúcich loaderov.

---

## 5. Nedotknuteľné invarianty (porušenie = PR sa nesmie mergnúť)

1. **Autorizácia na serveri.** Každá server action a API route si sama overí rolu a `companyId` (`requireUser` / `requireStaff` / `requireAdmin` z `lib/auth.ts`). Layout chráni len render, nie akcie. Redizajn nesmie presunúť rozhodovanie do klienta.
2. **Žiadny únik cien.** Do client komponentov nikdy neposielaj Prisma objekty, `Decimal`, `basePrice`, `costPrice`, `discountPct` ani `costSnapshot`. Klient dostáva len hotové view-modely (čísla a stringy). Verejné stránky čítajú cez `publicProductSelect` bez cien.
3. **Peniaze.** Server počíta cez `lib/money.ts` (Decimal, ROUND_HALF_UP), klientske náhľady cez `lib/money-client.ts`. Žiadne `price * 1.23` vo floate v komponentoch. Formát sk-SK: `1 234,50 €`.
4. **Sklad.** Používaj len `lib/stock.ts` (čerstvosť 48 h). Zákazník vidí iba „Skladom" alebo „Na objednávku". Žiadne počty kusov, žiadne blokovanie objednávky.
5. **CSP s nonce + `strict-dynamic`** (`proxy.ts`):
   - žiadne skripty, fonty ani obrázky z CDN či cudzích originov,
   - žiadny inline `<script>` bez nonce,
   - fonty len cez `next/font`,
   - nový origin len vedome: zdôvodniť a upraviť CSP v tom istom PR.
6. **Mimo scope redizajnu:**
   - `prisma/schema.prisma` a migrácie,
   - `agent/`, `database/`,
   - `lib/auth*`, `lib/pricing.ts`, `lib/money*`, `lib/orders/*`, `lib/cart.ts`,
   - bezpečnostná časť `proxy.ts`.

   Ak dizajn potrebuje dáta, ktoré neexistujú, zapíš ich do backlogu (sekcia 9) a **nevymýšľaj ich**.
7. **SEO a GEO.** JSON-LD len cez `safeJsonLd` (`lib/json-ld.ts`). URL len cez `SITE_URL` (`lib/site-url.ts`). Jeden `h1` na stránku. Zachovaj metadata, canonical, OG a `<details>` FAQ.
8. **Žiadny vymyslený obsah:**
   - žiadne fiktívne štatistiky, referencie, certifikáty ani časy dodania,
   - logá klientov len tie, ktoré už sú v `public/images`,
   - AI vizuály len ako náladové fotky, nikdy ako „fotka konkrétneho produktu".

   Chýbajúci obrázok nahradí placeholder a riadok `TODO(obsah)` v PR.
9. **Testy nikdy proti produkčnej DB.** `tests/_setup/db-guard.ts` nevypínaj a nepoužívaj `ALLOW_PROD_TEST_DB`.
10. **Žiadne heslá ani credentials** v kóde, dokumentácii, commitoch či PR. Testovacie kontá si vypýtaj, nehľadaj ich v histórii.
11. **UI texty po slovensky**, B2B tón s vykaním a správnou diakritikou. Žiadne mŕtve tlačidlá (`href="#"`, akcie bez handlera) a žiadny TODO kód.

---

## 6. Dizajnový smer 2026: „Clean Slate → Editorial Precision"

Hygiena znamená presnosť, pokoj a dôveru. Prémiovosť robí **typografia, rytmus, priestor a detail**, nie efekty.

**Paleta (evolúcia, nie rebrand):**
- `ink` #0D1715 (near-black green) robí rolu „editorial charcoal".
- Pribudne **teplý ivory povrch** pre verejný web (návrh vo Fáze 0 s tabuľkou kontrastov) popri `paper` #FFFFFF.
- `brand` #163F38 zostáva ako „precision emerald" pre identitu a primárne CTA.
- `mint` zostáva **jediný a vzácny akcent** (max 1–2 výskyty na viewport).
- **Champagne gold nepoužívame**, lebo druhý akcent rozbíja pravidlo jedného akcentu a koliduje s mint.
- Názvy tokenov zachovaj (meň hodnoty, pridávaj nové). Premenovanie je možné len ako codemod v jednom PR.

**Typografia:**
- Display je **editoriálny serif s vysokým kontrastom**, kandidáti Fraunces / Newsreader / Instrument Serif. Používa sa len na verejnom webe a pre veľké nadpisy stránok.
- Serif **nahrádza** Bricolage, nepridáva sa ako tretí font.
- UI, tabuľky, ceny a SKU ostávajú v **Hanken Grotesk** s `font-variant-numeric: tabular-nums`.
- Povinný test diakritiky (glyfy a kerning, hlavne carony ď/ť/ľ):
  `Ďakujeme — ľahko, ťažko, Ľubica, dôležité, mäkké, kôš, úžitkové 1 234,50 €`.
  Subset `latin-ext`, preloadni len rez použitý nad zlomom stránky.

**Layout a pohyb:**
- Verejný web: asymetrický 12-stĺpcový grid, veľkorysý priestor, hairline delenie.
- Portál: **vysoká hustota** (ovládacie prvky 40–44 px) a **bento** dashboard.
- Hero pozadie:
  - jemná animovaná gradient mesh / microgrid v CSS alebo SVG, prípadne mini canvas do ~3 KB,
  - **nikdy nie LCP element**, žiadny WebGL ani three.js,
  - pauza mimo viewportu (IntersectionObserver) a pri `prefers-reduced-motion`.
- **Magnetické CTA:**
  - len primárne CTA na verejnom webe,
  - len pri `pointer: fine`, len cez `transform`,
  - vypnuté na dotyku a pri reduced-motion.
- Mikrointerakcie trvajú 150–250 ms a animujú len `transform` a `opacity`. **CLS = 0.**
- **Glassmorphism** len na sticky header a overlaye, s fallbackom bez `backdrop-filter` a s overeným kontrastom AA.
- Dark mode **nepridávať**.

**Produktová karta (portál):**
- obsah: obrázok, značka, názov, SKU, balenie (`packSize` / `unit`), stavová bodka, cena netto + brutto, stepper množstva a „Do košíka",
- hover odhalí doplnkové info **bez posunu layoutu** (rezervovaný priestor alebo overlay),
- na dotyku je info viditeľné staticky.

Verejná karta namiesto ceny ukáže „Cena na vyžiadanie" a CTA. Slot pre množstevné zľavy pripravíš, ale **nezobrazuj ho**, kým neexistujú dáta (sekcia 9).

**Mikrotexty (Refero):** pri každom „prečo" daj kontext:
- prečo je položka „Na objednávku",
- kedy je splatnosť faktúry,
- koľko chýba do dopravy zdarma (progress bar z `freeThreshold`),
- čo sa stane po odoslaní (majiteľ objednávku potvrdí).

**Prístupnosť:**
- WCAG 2.2 AA (platí EAA, zákon 351/2022),
- kontrast ≥ 4,5 : 1, font ≥ 16 px na mobile, viditeľný focus,
- dialógy a drawery cez `lib/focus-trap.ts` (Escape, návrat focusu, scroll lock),
- `aria-live` pre košík a toasty.

---

## 7. Fázy (každá fáza = samostatný PR; pri **STOP** čakaj na moje schválenie)

**Skills:** ak sú dostupné, použi `frontend-design` a `ui-ux-pro-max` pri návrhu, `design:accessibility-review` pri QA.

### Fáza 0 — Discovery a smer (bez zmien v kóde)
1. Prečítaj:
   - `design-system/MASTER.md`, `app/globals.css`, `app/layout.tsx`, `README.md`,
   - UX a prístupnostné časti `docs/ENTERPRISE_DEEP_AUDIT_2026-08-20.md`,
   - `components/{site,portal,auth,staff}/*`, `lib/focus-trap.ts`,
   - `prototypes/*.dc.html` (len ako inšpirácia).
2. Spusti preview `moonid` a nafoť súčasný stav na 375 / 768 / 1440 px. Stránky: `/`, `/produkty`, `/produkt/[slug]`, `/kontakt`, `/registracia`, `/login`, `/dashboard`, `/katalog`, `/katalog/[slug]`, `/kosik`, `/objednavky/[id]`, `/rychla-objednavka`. Screenshoty ukladaj mimo gitu.
3. Výstup: **`docs/REDESIGN_2026.md`** s týmto obsahom:
   - inventár stránok a komponentov,
   - návrh tokenov (tabuľka hodnôt + kontrastné pomery),
   - 2 kandidáti serifu vedľa Bricolage s testom diakritiky,
   - návrh hero, portálovej produktovej karty, bento dashboardu a matice rýchlej objednávky (statický HTML prototyp v `prototypes/` alebo presné wireframy),
   - riziká a plán PR-iek.
4. **STOP:** schválenie smeru, fontu a ivory povrchu.

### Fáza 1 — Základy
1. Tokeny v `@theme`, fonty v `app/layout.tsx`, **MASTER.md v2** v tom istom PR.
2. Primitíva v `components/ui/`: Button, IconButton, Field/Input, Select, Badge, StockBadge, Price (netto/brutto), QtyStepper, Card, Dialog/Drawer (cez `lib/focus-trap.ts`), Tabs, DataTable, EmptyState. Skeleton už existuje.
3. Zachovaj vizuálnu spätnú kompatibilitu existujúcich tried (`.t-h2`, `.eyebrow`, `.wipe`, `.microgrid`, `.reveal`…), aby sa nič nerozbilo pred migráciou stránok.

### Fáza 2 — Verejný web
1. **Pilot:** `components/site/header.tsx` + `HeroSection` (mesh pozadie, staggered vstup, magnetické CTA). **STOP:** vizuálne schválenie.
2. Zvyšok domovskej stránky (`components/site/sections.tsx`), `/produkty` (`catalog-browser.tsx`), `/produkt/[slug]`, `/o-nas`, `/kontakt`, `/pomoc`, právne stránky (`legal-page.tsx`), footer, cookie lišta.
3. Hlavný konverzný cieľ verejného webu: **„Požiadať o firemný účet"** a **„Vyžiadať ponuku"**.

### Fáza 3 — Auth a onboarding
1. `AuthShell`: rozdelený layout s editoriálnym panelom značky a formulárom. Namiesto B2C/B2B prepínača dva jasné vstupy: **„Prihlásenie"** a **„Žiadosť o firemný účet"**. Týka sa login, zabudnuté heslo, nastav-heslo, potvrdiť-prístup, MFA a čakajúce.
2. `/registracia` ako viackrokový formulár: Firma → Kontaktná osoba → Doručenie → Súhrn. Priebežne ukladaj stav a zobrazuj chyby pri jednotlivých poliach.
3. **Validácia identifikátorov** (jediná povolená logická zmena v tejto fáze): čisté funkcie v `lib/validation/sk-company.ts` + vitest, zapojené do zod schémy v `app/registracia/actions.ts`:
   - **IČO:** 8 číslic (staršie 6-miestne doplň nulami zľava), kontrolný súčet mod 11 s váhami 8..2. Kontrolná vzorka: 50934660 je platné.
   - **DIČ:** 10 číslic, deliteľné 11. Kontrolná vzorka: 2120530995 je platné.
   - **IČ DPH:** `SK` + platné DIČ.
   Dnes je tam len `min(6).max(12)`. Ak testy v `tests/registration.test.ts` používajú neplatné IČO, oprav ich fixtures.

### Fáza 4 — Zákaznícky portál
1. **`PortalShell`:** sidebar, topbar a mobilný drawer. Zachovaj badge pre košík a čakajúce schválenia aj role (`ADMIN_ONLY`).
2. **Bento dashboard** len z existujúcich dát:
   - otvorené objednávky,
   - na schválenie,
   - faktúry po splatnosti,
   - rýchle doobjednanie z histórie,
   - obľúbené,
   - posledné objednávky.
3. **Katalóg:** mriežka + **prepínač na hustý tabuľkový zoznam** pre nákupcov. Facet rail a mobilný drawer filtrov ostávajú, filtre zostávajú v URL.
4. **Detail produktu:** galéria, prepínač variantov, množstvo, cenový box, dostupnosť s vysvetlením, „Vyžiadať cenu" pri ON_REQUEST.
5. **Rýchla objednávka ako matica:**
   - riadky SKU + množstvo, Enter skočí na ďalší riadok,
   - po zadaní SKU sa riadok dotiahne (názov, balenie, cena, dostupnosť) a chyba sa ukáže v riadku,
   - **vloženie z Excelu** (TSV), CSV drag & drop s náhľadom a zoznamom chybných riadkov,
   - „Pridať všetko do košíka".

   Na dotiahnutie riadku smieš pridať **read-only server action**: `requireUser`, ceny cez `lib/pricing.ts`, návrat len view-modelu a limit počtu riadkov.
6. **Košík a checkout** ako stepper Košík → Doprava a platba → Kontrola a odoslanie:
   - progress dopravy zdarma, PO číslo, mikrotext so splatnosťou,
   - upozornenie na schválenie pre používateľov s obmedzeným právom,
   - potvrdenie s ďalšími krokmi.
7. **Objednávky:** zoznam a detail so stepperom FSM a časovou osou. **Faktúry** s OVERDUE stavom. **Nastavenia** a **Používatelia**.
8. **Prepínač DPH** (ak je v parametroch zapnutý): „bez DPH / s DPH" v topbare, iba prehadzuje primárnu a sekundárnu cenu (obe už prichádzajú zo servera). Uložený v cookie, čítaný v RSC, aby nebliklo pri hydratácii. Výpočty sa **nemenia**.

### Fáza 5 — Staff (minimálne)
Zosúladenie tokenov a primitív, husté tabuľky, konzistentné stavové badge. **Žiadne zmeny informačnej architektúry** bez môjho zadania.

### Fáza 6 — QA a vyleštenie
1. Celý kontrolný zoznam zo sekcie 8 naprieč všetkými stránkami.
2. Klávesnicový prechod hlavných tokov.
3. Screenshoty pred a po.
4. Aktualizuj `design-system/MASTER.md` a `docs/REDESIGN_2026.md` (čo je hotové a čo zostáva v backlogu).

---

## 8. Definition of Done (každý PR)

- [ ] `npm run typecheck` a `npm run lint` (0 varovaní) prejdú.
- [ ] `npm run test` prejde (unit testy; DB testy len s izolovanou `TEST_DATABASE_URL`).
- [ ] `npm run build` prejde. **Nikdy nebuildi počas bežiaceho dev servera**: zastav preview, v prípade potreby zmaž `.next`.
- [ ] Overenie v preview `moonid` na 375 / 768 / 1440 px, screenshoty pred a po v PR.
- [ ] Klávesnica, viditeľný focus, `prefers-reduced-motion` a zoom 200 % fungujú.
- [ ] Lighthouse (desktop) nie horší než CI budget: perf ≥ 0,8 (cieľ ≥ 0,9), a11y ≥ 0,9 (cieľ ≥ 0,95), LCP ≤ 2,5 s, CLS ≤ 0,1, TBT ≤ 300 ms. Over aj mobilný profil pre `/` a `/katalog`.
- [ ] **Kontrola úniku cien:** RSC payload `/katalog` a `/katalog/[slug]` neobsahuje `basePrice`, `costPrice`, `discountPct` ani `costSnapshot`. Verejné stránky neobsahujú žiadne ceny.
- [ ] V konzole nie sú CSP chyby ani hydration warnings.
- [ ] Playwright `tests/e2e/order-flow.spec.ts` prejde lokálne alebo na staging, nikdy nie na produkcii.
- [ ] PR z vetvy z `main`, conventional commit (`feat(design): …`), vyplnená PR šablóna, žiadny priamy push do `main`.
- [ ] Ak sa menili tokeny alebo pravidlá, `design-system/MASTER.md` je aktualizovaný v tom istom PR.

---

## 9. Backlog mimo redizajnu (len so súhlasom, samostatné PR so schémou a testami)

- **Množstevné zľavy, MOQ a násobky balenia** (ks / balenie / kartón): dnes je len `unit` + `packSize`. Treba migráciu, rozšírenie `resolveUnitPrice` a mapovanie na Pohodu.
- **Cenová ponuka z celého košíka** („Žiadosť o cenovú ponuku" pre väčšie zákazky): rozšírenie `Inquiry` o snapshot položiek.
- **Doplnenie údajov firmy podľa IČO** (RPO/ORSR): nový origin, CSP a rate-limit.
- Mesačné limity nákupu na člena, viacúrovňové schvaľovanie.
- **„Moje dávkovače"** a pripomienka náplní (schéma `CompanyDispenser` existuje, dáta ani UI nie).
- Dark mode, viacjazyčnosť.
- Go-live blokery (doména, Resend, DB rola, zálohy, Pohoda sync) sú v `docs/GO_LIVE_AUDIT_2026-07-25.md` a `docs/ENTERPRISE_DEEP_AUDIT_2026-08-20.md`. **Redizajn ich nerieši a nemieša sa s nimi.**

---

## 10. Komunikácia

- Odpovedaj po slovensky, stručne a vecne.
- Pri každom **STOP** pošli: čo je hotové, screenshoty, otvorené otázky (max 3, každá s odporúčaním) a ďalší krok.
- Ak narazíš na konflikt medzi týmto promptom a kódom, **kód a sekcia 5 majú prednosť**. Konflikt pomenuj, nehádaj.
