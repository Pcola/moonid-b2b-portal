# Redizajn 2026 — Fáza 0: discovery a smer

> **Stav:** Fáza 0 hotová. **Smer schválený 7. 10. 2026:** display font Newsreader, ivory len na verejnom webe, svetlý hero (kap. 12).
> **Dátum:** 7. 10. 2026 · **Zadanie:** [`docs/prompts/MASTER_PROMPT_REDIZAJN_2026.md`](prompts/MASTER_PROMPT_REDIZAJN_2026.md)
> **Prototyp:** [`prototypes/redesign-2026.html`](../prototypes/redesign-2026.html). Otvorte priamo v prehliadači; prepínače hore menia display font a povrch.
> **Bez zmien v kóde aplikácie.** Fáza 0 pridáva iba tento dokument, statický prototyp a kópiu master promptu.

---

## 0. Zhrnutie

- **Smer:** evolúcia „Clean Slate → Editorial Precision". Zelená identita ostáva, mint zostáva jediným vzácnym akcentom. Pribúda teplý **ivory povrch na verejnom webe** a **editoriálny serif** vo veľkých nadpisoch. Portál ostáva hustý, svetlý a chladný (cream/biela).
- **Font:** odporúčam **Newsreader 500** (37,8 KB). Je pokojný, presný, má čitateľné číslice a je o 21 KB ľahší než dnešný Bricolage. Alternatíva je Instrument Serif (31,9 KB, jeden rez). Obaja kandidáti prešli testom diakritiky bez chýbajúceho glyfu.
- **Ivory `#F7F4EE`:** všetky textové tokeny na ňom spĺňajú AA (`muted-2` 5,13 : 1).
- **Najzávažnejšie zistenia zo súčasného stavu** (detail v kap. 4):
  1. Focus ring je na tmavých plochách prakticky neviditeľný (1,31 : 1).
  2. Okraje formulárových polí majú 1,45 : 1 (WCAG 1.4.11 žiada 3 : 1).
  3. 18 lokálnych formátovačov `eur()` zobrazuje sumy bez oddeľovača tisícov (`1234,50 €`).
  4. Verejný detail produktu obchádza `lib/stock.ts`.
  5. Logo „moonid." je živý text v Bricolage, takže pri výmene fontu by sa zmenilo.
  6. Na webe sú neoverené tvrdenia: „1 600+", „48 h", anonymné referencie a neexistujúca funkcia „Moje dávkovače".
- **Screenshoty súčasného stavu sú zo staging nasadenia na Verceli** (overené: číta staging DB), nie z produkcie. Verejné stránky sú hotové, portál čaká na prihlásenie testovacím účtom. Uložené sú mimo gitu (kap. 1).

---

## 1. Rozsah Fázy 0 a čo zostáva

| Krok master promptu | Stav |
|---|---|
| 1. Prečítať MASTER.md, globals.css, layout, README, UX/a11y audit, komponenty, `lib/focus-trap.ts`, prototypy | ✅ hotové |
| 2. Preview a screenshoty 375 / 768 / 1440 px | ✅ verejné stránky zo staging nasadenia · ⏳ portál (čaká na prihlásenie, nižšie) |
| 3. `docs/REDESIGN_2026.md` + prototyp | ✅ tento dokument + `prototypes/redesign-2026.html` |
| 4. STOP | ✅ smer schválený (kap. 12) |

**Screenshoty súčasného stavu:**

- **Zdroj:** Vercel preview vetvy `staging`, alias `moonid-b2b-portal-git-staging-…vercel.app`, commit `4493b5a`.
  - Overené, že číta staging DB `moonid-b2b-staging`: 18 produktov, žiadny odkaz na produkčný projekt.
  - Lokálny preview by potreboval DB heslo, ktoré connector nevydá. Staging nasadenie ukazuje ten istý vizuál bez neho.
- **Rozdiel voči `main`:** staging obsahuje aj práce z vetvy `codex/staging-ops-hardening` (auth/heslá, testy) a a11y úpravy, napr. tlačidlo „Zastaviť pohyb" pri marquee. Zistenia v kap. 4 sa vzťahujú na `main` (`df0dfca`).
- **Verejné stránky** `/`, `/produkty`, `/produkt/[slug]`, `/kontakt`, `/registracia`, `/login` nafotil Playwright automaticky s `prefers-reduced-motion`, aby scroll animácie neskryli obsah.
- **Portál** `/dashboard`, `/katalog`, `/katalog/[slug]`, `/kosik`, `/objednavky/[id]`, `/rychla-objednavka`: ⏳ **zatiaľ nenafotený.**
  - Postup: skript otvorí okno Chromium a Lukáš sa v ňom prihlási sám zákazníckym testovacím účtom. Heslo skript nevidí a session sa neukladá.
  - Prvý pokus 7. 10. skončil bez prihlásenia (okno zatvorené na obrazovke „Zabudnuté heslo").
  - Pred-stav kódu ostáva v nemennom nasadení `moonid-b2b-portal-9hqsbpkqe-…vercel.app` (commit `4493b5a`), takže sa dá nafotiť kedykoľvek, najneskôr pred F4.
- **Výstup mimo gitu:** `C:\workspace\websites\moonid_redesign_screens\2026-10-07_pred\{375,768,1440}\`.
- **Staging projekt** bol 7. 10. obnovený z pozastavenia. Je na free pláne, takže bez nákladov, a po 7 dňoch nečinnosti sa znova uspí.
  - Seed: 35 tabuliek, 18 publikovaných produktov, 1 firma.
  - Používatelia: 3, pre roly CUSTOMER_ADMIN, STAFF a ADMIN.

**Overenie prototypu** (Playwright, 375 / 768 / 1440 px):

- bez chýb v konzole a bez vodorovného pretečenia;
- klávesnica v matici (`Enter`, `↑`/`↓`), vloženie TSV z Excelu (4 riadky, 3 s chybou správne označené);
- súčty v centoch (218,60 € bez DPH / 268,91 € s DPH), prepínač DPH;
- viditeľný focus (2 px `brand`);
- karta sa pri hover/focus neposúva (CLS 0);
- `prefers-reduced-motion` vypne pozadie hero.

Počas overenia som našiel a opravil niekoľko chýb:

- pretečenie pri 768 a 375 px;
- suma faktúr čitateľná ako „1 248,90 €";
- zlievanie textu v mini-zoznamoch;
- nepoužiteľná matica na mobile, dnes sú to skladané riadky.

Najpoučnejšia: `.sr-only` (`position: absolute`) v bunke vodorovne posuvnej tabuľky unikne z posuvného boxu a roztiahne celú stránku, ak box nemá `position: relative`. **Pravidlo pre primitívum `DataTable` (F1).**

---

## 2. Inventár stránok

| Oblasť | Route | Súbor(y) | Kostra a komponenty | Fáza |
|---|---|---|---|---|
| Verejný web | `/` | `app/page.tsx` | `SiteHeader`, `HeroSection`, `SortimentSection`, `DavkovaceSection`, `PortalSection`, `FaqSection`, `CtaBand`, `BrandsSection`, `SiteFooter`, `CookieBanner` | F2 (pilot: header + hero) |
| | `/produkty` | `app/produkty/page.tsx` | `PageHero`, `CatalogBrowser`, `CtaBand` | F2 |
| | `/produkt/[slug]` | `app/produkt/[slug]/page.tsx` | všetko inline (cenový box, trust strip, parametre, podobné) | F2 |
| | `/kontakt` | `app/kontakt/page.tsx` | `PageHero`, `KontaktSection` (`ContactForm`), `AkoZacatSection`, `PodmienkySection`, `FaqSection` | F2 |
| | `/o-nas` | `app/o-nas/page.tsx` | `PreKohoSection`, `HotelSection`, `PrecoSection`, `ReferencieSection` (`Testimonials`) | F2 |
| | `/pomoc` | `app/pomoc/page.tsx` | FAQ | F2 |
| | `/obchodne-podmienky`, `/ochrana-osobnych-udajov`, `/cookies` | `app/*/page.tsx` | `LegalPage` | F2 |
| | `not-found`, `error`, `global-error` | `app/*.tsx` | — | F2 (ľahko) |
| Auth a onboarding | `/login` | `app/(auth)/login/*` | `AuthShell`, `AuthPanel`, `LoginForm` | F3 |
| | `/registracia` | `app/registracia/*` | `AuthShell`, `RegistraciaForm`, `createAccessRequest` | F3 (+ validácia IČO/DIČ) |
| | `/zabudnute-heslo`, `/nastav-heslo`, `/potvrdit-pristup` | `app/(auth)/*` | `AuthShell` | F3 |
| | `/mfa`, `/mfa/setup`, `/cakajuce` | `app/mfa/*`, `app/cakajuce` | vlastné rozloženie | F3 |
| Zákaznícky portál | `/dashboard` | `app/(portal)/dashboard/page.tsx` | `PortalShell`, `StatCard`, `QuickAddButton` | F4 (bento) |
| | `/katalog` | `app/(portal)/katalog/*` | `PortalCatalog`, `FavoriteButton`, `AddBtn` | F4 (mriežka + hustý zoznam) |
| | `/katalog/[slug]` | `app/(portal)/katalog/[slug]/*` | `ProductDetail` (varianty, stepper, RFQ) | F4 |
| | `/kosik` | `app/(portal)/kosik/*` | `CartView` (doprava/platba z DB, PO, VOP) | F4 (stepper) |
| | `/rychla-objednavka` | `app/(portal)/rychla-objednavka/*` | `QuickOrderForm` (textarea + CSV) | F4 (matica) |
| | `/objednavky`, `/objednavky/[id]`, `/objednavky/opakovat` | `app/(portal)/objednavky/*` | zoznam, detail s časovou osou, `ApprovalQueue`, `RepeatConfirm` | F4 |
| | `/oblubene`, `/faktury`, `/nastavenia`, `/pouzivatelia` | `app/(portal)/*` | `AccountCard`, `AddressManager`, `MemberManager`, `GdprSection` | F4 |
| Staff | `/staff` + 15 sekcií | `app/staff/*` | `StaffShell` (objednávky, žiadosti, dopyty, zákazníci, produkty, kategórie, párovanie, cenníky, doprava a platba, faktúry, tím a prístupy, audit, bezpečnosť) | F5 (len tokeny a primitíva) |

---

## 3. Inventár komponentov

| Komponent | Riadky | Účel | Dlh a problémy | Cieľ |
|---|---:|---|---|---|
| `components/site/sections.tsx` | 617 | 13 sekcií webu | 61 hex hodnôt, inline `style`, lokálne reťazce tlačidiel (`btnPrimary`…), vymyslené čísla v mockupe | rozdeliť na primitíva + sekcie |
| `components/site/header.tsx` | 149 | plávajúci glass pill, fullscreen mobilné menu | dve farebné témy cez inline hex, ručný focus trap | svetlý glass + fallback, Drawer primitívum, SVG logo |
| `components/site/footer.tsx` | 98 | CTA pás, stĺpce, obrí wordmark | wordmark ako text v Bricolage | SVG logo |
| `components/site/catalog-browser.tsx` | 237 | verejný katalóg, facety, drawer | duplikuje `portal-catalog` (facety, chipy, drawer, stránkovanie) | zdieľané `FacetRail`, `FilterDrawer`, `Chips` |
| `components/site/contact-form.tsx` | 117 | dopytový formulár | podčiarknuté polia `#D2D8D4` (1,45 : 1) | `Field` primitívum |
| `components/site/testimonials.tsx` | 50 | rotujúce citácie (`/o-nas`) | auto-rotácia 8 s bez pauzy (WCAG 2.2.2), neoverený obsah | statické citácie alebo nič |
| `components/site/cookie-banner.tsx` | 50 | informačná lišta | OK | tokeny |
| `components/site/legal-page.tsx` | 33 | rám právnych stránok | OK | editoriálna typografia |
| `components/site/container.tsx` | 13 | kontajner `max-w-6xl` | **nepoužitý** (mŕtvy kód) | odstrániť v F1 |
| `components/auth/auth-shell.tsx` + `auth-panel.tsx` | 28 + 34 | split layout | `h1` len v desktopovom paneli; pätička 3,69 : 1 | nový `AuthShell` (F3) |
| `components/portal/portal-shell.tsx` | 186 | sidebar, topbar, drawer | `h1` v topbare + `h1` na 7 stránkach | `PortalShell` v2 + DPH prepínač |
| `components/portal/toast.tsx` | 42 | `aria-live` toasty | OK | tokeny |
| `components/portal/quick-add-button.tsx` | 25 | „+" do košíka | chýba `aria-label`, iba `title`; 36 px | `IconButton` |
| `components/portal/favorite-button.tsx` | 34 | obľúbené | 32 px, žltá `#E0A83B` (2,14 : 1, druhý akcent) | `IconButton`, brand hviezda |
| `components/staff/staff-shell.tsx` | 192 | staff kostra | focus na tmavom sidebari | tokeny |
| `components/product-img.tsx` | 35 | `next/image` + placeholder | generická ikona; 64,6 % produktov nemá obrázok | navrhnutý placeholder |
| `components/ui/skeleton.tsx` | 50 | skeletony | jediné existujúce primitívum | ponechať |
| `lib/focus-trap.ts` | 37 | `focusFirst`, `trapTabKey` | Escape, návrat focusu a scroll lock rieši ručne 5 komponentov | `Dialog`/`Drawer` nad týmto helperom |

**Kvantifikovaný dizajnový dlh (TSX):**

- **≈ 400 natvrdo zapísaných hex farieb:** staff 178, portál 112, web 61. Najčastejšia je `#9A3025` (64×).
- **92 inline `style={{…}}`.**
- **30+ rôznych `text-[…px]`** od 9 px po 64 px, z toho 13× 10,5 px, 8× 10 px, 5× 9,5–9 px.

---

## 4. Zistenia zo súčasného stavu

### A. Prístupnosť (WCAG 2.2 AA, EAA / zák. 351/2022)

1. **Focus na tmavých plochách je neviditeľný.** `app/globals.css:225` nastavuje outline `brand` všade.
   - Na `brand-deep` vychádza 1,31 : 1, na `brand-foot` 1,44 : 1; WCAG 1.4.11 žiada 3 : 1.
   - Týka sa hero, headera nad hero, tmavých sekcií, footera, mobilného menu a staff sidebaru.
   - Náprava: token `focus-dark` = mint (9,94 : 1) cez `.on-dark`. **F1.**
2. **Okraje polí pod 3 : 1.**
   - `#D2D8D4` v `login-form.tsx` a `contact-form.tsx` má 1,45 : 1.
   - `border-line` (1,22 : 1) majú vstupy v katalógu, košíku a registrácii.
   - Náprava: token `field` `#808985`. **F1** (primitívum `Field`).
3. **Referencie na `/o-nas` sa automaticky prepínajú** každých 8 s bez možnosti pauzy (2.2.2). Skryté citácie ostávajú v DOM, takže čítačka prečíta všetky štyri. **F2.**
4. **Mobilné auth obrazovky nemajú `h1`.** Panel s `h1` je `hidden lg:flex` (audit UX-04), platí pre všetky auth stránky. **F3.**
5. **Dva `h1` v portáli a staffe.** Topbar `PortalShell` má `h1` a ďalší má 7 portálových a 8 staff stránok. Náprava: `h1` patrí stránke, titulok v topbare nie. **F4/F5.**
6. **Ikonové ovládače majú 32–36 px.** Spĺňajú minimum 24 px, ale cieľ je 40–44 px. `QuickAddButton` nemá prístupný názov okrem `title`. **F4.**
7. **Obľúbené sú žlté** `#E0A83B`: 2,14 : 1 (1.4.11) a zároveň druhá akcentová farba. Náprava: plná hviezda v `brand`. **F4.**
8. **Vstupy pod 16 px** (14,5 / 14 / 13,5 px) spôsobujú na iOS zoom pri focuse. Všetky polia budú mať 16 px. **F1.**
9. **Pätička `AuthPanel`** `#6E938B` na `#143A33` má 3,69 : 1 pri 12,5 px. **F3.**
10. **Chýba UI typografická škála.** Návrh je v kap. 5, minimum 12 px, telo na mobile ≥ 16 px. **F1.**

### B. Peniaze a sklad (invarianty 3 a 4)

11. **18 lokálnych `eur()`** (10 portál, 8 staff) robí `toFixed(2).replace(".", ",")`, takže chýba oddeľovač tisícov: `1234,50 €` namiesto `1 234,50 €`.
    - Staff `doprava-platba/methods-editor.tsx` navyše ukazuje `4.90 €` s bodkou.
    - Náprava: `formatEur()` v `components/ui/price.tsx` cez `Intl.NumberFormat("sk-SK")`. Je to čisto prezentačné, `lib/money*` ostáva netknutý. **F1**, migrácia **F4/F5**.
12. **Verejný `/produkt/[slug]` číta `p.isStocked` priamo** (`page.tsx:71, 79, 112`): odznak aj JSON-LD `availability`.
    - Pri starom syncu tvrdí „Skladom", hoci portál cez `isInStock()` povie „Na objednávku".
    - → **konflikt s invariantom 4**, viac v kap. 8.
13. **Stavové farby mimo palety.** Indigo `#3730A3` na `#EEF2FF` (Potvrdená / Pripravuje sa / Na ceste) je MASTER anti-pattern (navy, druhý akcent). Náprava: stavové tokeny. **F1 + F4/F5.**

### C. Obsah a dôveryhodnosť (invariant 8, nič nevymýšľať)

Podrobný zoznam je v kap. 9. Najdôležitejšie body:

- „1 600+" vs. 418 publikovaných produktov;
- „48 h" a „do 2. pracovného dňa";
- anonymné referencie;
- „Moje dávkovače" (funkcia neexistuje);
- „prístup po prvej objednávke" vs. registrácia;
- splatnosť „14 dní" natvrdo;
- „9 rokov na trhu" natvrdo;
- vymyslené ceny a „−18 %" v mockupe portálu;
- 64,6 % produktov bez obrázka.

### D. Technické

14. **Logo je text.** „moonid." je na 8 miestach živý text v Bricolage (header, mobilné menu, footer 2×, portál, staff, auth panel, auth shell). Ak Bricolage zmizne, zmení sa logotyp. Náprava: `components/ui/logo.tsx` ako SVG z obrysov (~1–2 KB), font Bricolage sa už nenačítava. **F1.**
15. **Hero LCP** je celoplošná fotografia s `priority` (zdroj 285 KB) za dvoma gradientmi. Nový hero má LCP na `h1` (mobil) alebo na rámovanej fotke (desktop) a pozadie rieši CSS.
16. **Rovnaká logika drawerov je napísaná 5×** (Escape, scroll lock, návrat focusu): `header`, `catalog-browser`, `portal-catalog`, `portal-shell`, `staff-shell`. Náprava: primitívum `Dialog`/`Drawer` v F1.
17. **Verejný a portálový katalóg duplikujú facety, chipy, drawer aj stránkovanie** (237 + 305 riadkov).
18. **E2E env mieril na produkciu — prepnuté 7. 10. 2026.**
    - `.env.test` v hlavnom checkoute mal `E2E_BASE_URL` = produkčná Vercel doména a nastavené `ALLOW_PROD_TEST_DB`.
    - Teraz mieri na staging preview, `ALLOW_PROD_TEST_DB` je preč a pôvodný súbor je zálohovaný ako `.env.test.prod-backup-2026-10-07` (gitignored).
    - Doplniť treba heslá staging účtov, TOTP pre staff a `VERCEL_AUTOMATION_BYPASS_SECRET`.
    - **Pozor:** `playwright.config.ts` v `main` má predvolenú adresu `https://moonid-b2b-portal.vercel.app` (produkcia), ak `E2E_BASE_URL` chýba. Vetva `codex/staging-ops-hardening` ju mení na `127.0.0.1:3000`, do jej mergu musí `E2E_BASE_URL` ostať vyplnené.

---

## 5. Návrh tokenov (implementácia vo Fáze 1)

Názvy existujúcich tokenov ostávajú, menia sa len hodnoty tam, kde je to uvedené. Nové tokeny pribúdajú.

### 5.1 Farby

| Token | Hodnota | Stav | Použitie |
|---|---|---|---|
| `ink` | `#0D1715` | ponechať | text, „editorial charcoal" |
| `brand` | `#163F38` | ponechať | identita, primárne CTA, focus na svetlej |
| `brand-2` | `#1E5249` | ponechať | hover CTA, info text |
| `brand-deep` / `brand-foot` | `#0F2A26` / `#0C211D` | ponechať | tmavé pásy, footer, staff sidebar |
| `mint` | `#8FE0CD` | ponechať | **jediný vzácny akcent** (wipe, tmavé plochy), focus na tmavej |
| `mint-ink` / `mintbg` | `#0F6B57` / `#EAF3F0` | ponechať | eyebrow, stav „Skladom"/„Doručená" (funkčná farba, nepočíta sa do limitu akcentu) |
| `paper` / `cream` / `line` | `#FFFFFF` / `#F5F7F6` / `#E5EAE8` | ponechať | portál, karty, hairlines |
| `muted` / `muted-2` / `muted-3` | `#5C584F` / `#6B675F` / `#54514A` | ponechať | sekundárny text (teplé šedé ladia s ivory) |
| **`ivory`** | `#F7F4EE` | **NOVÝ** | povrch verejného webu |
| **`ivory-deep`** | `#EEE9DF` | **NOVÝ** | zapustené plochy, placeholder obrázka |
| **`line-warm`** | `#E3DDD1` | **NOVÝ** | hairline na ivory (len dekor) |
| **`field`** | `#808985` | **NOVÝ** | okraj polí, stepperov, checkboxov, rádií |
| **`focus`** / **`focus-dark`** | = `brand` / = `mint` | **NOVÝ** (alias) | focus ring na svetlej / tmavej |
| **`warn-ink`** / **`warn-bg`** / **`warn-solid`** | `#7A4E00` / `#FBF3E2` / `#9A6410` | **NOVÝ** | Na objednávku, Čaká na schválenie, odznak počtu |
| **`danger-ink`** / **`danger-bg`** | `#9A3025` / `#FBEDEA` | **NOVÝ** | chyby, Po splatnosti |
| **`info-ink`** / **`info-bg`** | `#1E5249` / `#EEF2F0` | **NOVÝ** | Potvrdená / Pripravuje sa / Na ceste (nahrádza indigo) |

### 5.2 Kontrast (WCAG 2.x, spočítané)

| Popredie | Pozadie | Pomer | Výsledok |
|---|---|---:|---|
| `ink` | `ivory` / `paper` / `cream` | 16,63 / 18,25 / 16,96 | AA |
| `brand` | `ivory` / `paper` | 10,61 / 11,65 | AA |
| `mint-ink` | `ivory` / `paper` / `cream` | 5,87 / 6,44 / 5,99 | AA |
| `muted` | `ivory` | 6,45 | AA |
| `muted-2` | `ivory` / `cream` | 5,13 / 5,23 | AA |
| `muted-3` | `ivory` | 7,21 | AA |
| biela | `brand` / `brand-deep` | 11,65 / 15,22 | AA |
| `mint` | `brand` / `brand-deep` | 7,61 / 9,94 | AA |
| `mint-ink` | `mintbg` | 5,70 | AA |
| `warn-ink` | `warn-bg` | 6,52 | AA |
| biela | `warn-solid` | 4,99 | AA |
| `danger-ink` | `danger-bg` | 6,52 | AA |
| `info-ink` | `info-bg` | 7,88 | AA |

| Netextový prvok (≥ 3 : 1) | Pozadie | Pomer | Výsledok |
|---|---|---:|---|
| dnešný okraj poľa `#D2D8D4` | `paper` | 1,45 | ❌ |
| **`field`** | `paper` / `ivory` / `cream` / `mintbg` | 3,60 / 3,28 / 3,35 / 3,18 | ✅ |
| dnešný focus `brand` | `brand-deep` / `brand-foot` | 1,31 / 1,44 | ❌ |
| **`focus-dark` (`mint`)** | `brand-deep` / `brand-foot` / `brand` | 9,94 / 10,96 / 7,61 | ✅ |
| `focus` (`brand`) | `ivory` / `paper` | 10,61 / 11,65 | ✅ |

### 5.3 Typografia, rozmery, pohyb

- **Fonty:**
  - `--font-display` = Newsreader 500 (alternatíva Instrument Serif 400);
  - `--font-sans` = Hanken Grotesk 400–700 (UI, ceny, SKU, tabuľky, vždy `tabular-nums` pri číslach);
  - logo = SVG.
- **Fluidná škála displeja** (verejný web a nadpis stránky v portáli):
  - `--fs-display: clamp(42px, 6.3vw, 98px)`, `--fs-h2: clamp(30px, 4vw, 56px)`, `--fs-h3: clamp(22px, 2.2vw, 30px)`, `--fs-page: clamp(24px, 2.4vw, 32px)`;
  - riadkovanie 1,0–1,15, `text-wrap: balance`, tracking −0,018 em (Newsreader).
- **UI škála:** Tailwind predvoľby (`xs` 12, `sm` 14, `base` 16, `lg` 18, `xl` 20, `2xl` 24) + `--text-13`, `--text-15`.
  - Nič pod 12 px, polia 16 px.
  - Arbitrárne `text-[…px]` sa migrujú postupne po stránkach.
- **Radius:** `--radius-control` 10 px (tlačidlá, polia), `--radius-card` 14 px (portál), `--radius-panel` 20 px (web).
- **Ovládače:** web 52 px, portál 40–44 px.
- **Pohyb:**
  - mikrointerakcie 150–250 ms, iba `transform`/`opacity`, `--ease: cubic-bezier(.2,.7,.2,1)`;
  - odhalenia 600–900 ms;
  - `prefers-reduced-motion` vypína všetko.
- **Z-index tokeny:** header 50, drawer 60, cookie 100, toast 120 (dnešné hodnoty).

### 5.4 Pravidlá do MASTER.md v2

- **Akcent:** do limitu 1–2 výskytov na viewport sa počíta jasný `mint` (`#8FE0CD`). Funkčné stavy v `mint-ink` na `mintbg` sa nepočítajú, vždy však majú text, nielen farbu.
- **Plochy:** ivory iba na verejnom webe. Auth obrazovky a portál majú `paper`/`cream`.
- **Tmavé plochy** majú triedu `.on-dark`, ktorá prepne focus na `focus-dark`.
- **Glass** len na sticky headeri a overlayoch, s fallbackom bez `backdrop-filter` (alfa ≥ 0,97).
- **Žiadna druhá akcentová farba**, teda ani zlatá/žltá obľúbených, ani indigo stavov.

---

## 6. Typografia: kandidáti a test diakritiky

Testovacia veta: `Ďakujeme — ľahko, ťažko, Ľubica, dôležité, mäkké, kôš, úžitkové 1 234,50 €`.

**Metóda:**

- Pre každý font sa porovnala šírka 38 znakov (`ĎďŤťĽľĹĺŇňŔŕČčŠšŽžÔôÄäÁáÉéÍíÓóÚúÝý€„"–—`) s dvoma rôznymi záložnými fontmi. Ak sa šírky líšia, glyf chýba.
- K tomu vizuálna kontrola pri 64 px (karony a kerning „ľa", „ťa", „Ľu", „Ďa").
- Veľkosti sú súčtom woff2 súborov `latin` + `latin-ext` z Google Fonts (to isté, čo self-hostuje `next/font`).

| Font | Rez | woff2 latin + latin-ext | Chýbajúce glyfy | Charakter | Riziká |
|---|---|---:|---|---|---|
| Bricolage Grotesque (dnes) | 500–700 | 58,6 KB (len 600: 32,3 KB) | 0 | výrazný grotesk, súčasný wordmark | bez editoriálneho kontrastu |
| **Newsreader** (odporúčaný) | 500 | **37,8 KB** | 0 | pokojný, presný, novinový; karony apostrofové so správnym odstupom; čitateľné číslice | statický rez má textovú optickú veľkosť. Variant s osou `opsz` má ~214 KB (wght 400–600), preto ho nepoužiť. Ak by veľké nadpisy pôsobili „textovo", F1 overí `next/font/local` s inštanciou opsz. |
| Instrument Serif | 400 | 31,9 KB | 0 | vysoký kontrast, úzky, módny editoriál | jediný rez bez hierarchie váh; „1" pripomína „l"; silný trend 2024–26, rýchlo zastará |
| ~~Fraunces~~ (vyradený) | 400–700 var. | 123,7 KB | 0 | mäkký, „wonky", remeselný | charakter nesedí ku klinickej presnosti, ťažký, veľmi rozšírený 2023–25 |
| Hanken Grotesk (UI, ponechať) | 400–700 var. | 53,0 KB | 0 | — | — |

**Výkonový rozpočet fontov:**

| Kombinácia | Spolu |
|---|---:|
| dnes: Bricolage + Hanken | ≈ 111,6 KB |
| **Newsreader + Hanken** | **≈ 90,8 KB (−20,8 KB)** |
| Instrument Serif + Hanken | ≈ 84,9 KB |

Preloadujú sa oba fonty (nad zlomom), subset `latin` aj `latin-ext`, pretože slovenské nadpisy obsahujú č/š/ž/ľ prakticky vždy.

**Implementácia (F1):**

- `Newsreader({ subsets: ["latin", "latin-ext"], weight: ["500"], variable: "--font-display-serif", display: "swap" })`.
- `adjustFontFallback` dá záložné metriky Times New Roman, takže CLS ≈ 0.
- Bricolage sa odstráni z `app/layout.tsx` až spolu so SVG logom.

**Nezávislé potvrdenie:**

- `ui-ux-pro-max` pre „trustworthy editorial" sám navrhuje Newsreader. Jeho navy paletu a štýl „Liquid Glass" odmietam, sú to MASTER anti-patterny.
- Newsreader už použili aj staršie prototypy `prototypes/Moonid Portál.dc.html` a `Moonid Admin.dc.html`.

---

## 7. Návrhy kľúčových vzorov

Všetky štyri vzory sú klikateľné v [`prototypes/redesign-2026.html`](../prototypes/redesign-2026.html) s ukážkovými dátami (`DEMO-…`). Wireframy nižšie popisujú rozloženie, pravidlá a zdroj dát.

### 7.1 Hero verejného webu (pilot F2)

```
DESKTOP 1440 ─────────────────────────────────────────────────────────────────
( moonid.  Sortiment Dávkovače Portál O nás Kontakt   Prihlásiť sa [Požiadať o firemný účet] )  ← svetlý glass pill
                                                                  ┌────────────┐
── B2B DODÁVATEĽ HYGIENY A ČISTENIA · OD 2017                     │            │
                                                                  │   fotka    │
Hygiena a ▓čistenie▓                    ← Newsreader ~96 px,      │   4 : 5    │
pre vašu prevádzku                         „wipe" za kľúčovým     │            │
                                           slovom (mint)    ┌─────┴──────────┐ │
Jeden dodávateľ pre hotely, wellness, gastro…               │● Dávkovače vám │ │
                                                            │ osadíme. Platí-│─┘
[Požiadať o firemný účet →]  [Vyžiadať ponuku]               │ te len náplne. │
Účet zriadime po overení IČO… Už ste zákazník? Prihláste sa └────────────────┘
──────────────────────────────────────────────
ROZVOZ               │ PLATBA                  │ NA TRHU
Vlastný, NZ a NR kraj│ Na faktúru so splatnosťou│ Od roku 2017
pozadie: ivory · microgrid 64 px („kachličky") · pomalý svetelný pás · jemný mesh

MOBIL 375 ──────────────
( moonid.        [≡] )
── B2B DODÁVATEĽ…
Hygiena a
▓čistenie▓ pre
vašu prevádzku
Jeden dodávateľ…
[Požiadať o firemný účet]
[Vyžiadať ponuku]
ROZVOZ / PLATBA / NA TRHU   (pod sebou, hairlines)
┌──────────────────────┐
│ fotka 16 : 11        │
└──┬────────────────┬──┘
   │● Dávkovače…    │
   └────────────────┘
```

- **Téza:** prevádzková hygiena ako presnosť. Podpisovým prvkom je **„čistá kachlička"**: existujúci motív `microgrid` (64 px) na ivory, ktorým raz za ~17 s prejde jemný svetelný pás ako po stierke, a k tomu existujúci mint `wipe`.
- **Pozadie:**
  - čisté CSS: gradientný mesh bez `filter: blur` a pás, oboje animované iba cez `transform`;
  - mimo viewportu ho pozastaví `IntersectionObserver`, pri `prefers-reduced-motion` je statické;
  - **nikdy nie je LCP**, žiadny canvas ani WebGL.
- **Konverzia:**
  - primárne CTA „Požiadať o firemný účet" → `/registracia`, je magnetické (len `pointer: fine`, max 7 px, `transform`);
  - sekundárne „Vyžiadať ponuku" → `/kontakt`;
  - mikrotext „Účet zriadime po overení IČO, ceny uvidíte po prihlásení" vysvetľuje, prečo ceny nevidno.
- **Fakty bez čísel, ktoré nevieme doložiť.** Rozdiel (dávkovače na prenájom + náplne) nesie poznámková karta pri fotke.
- **LCP:**
  - desktop: rámovaná fotka (`next/image priority`, AVIF, `sizes` ~40vw);
  - mobil: `h1` (fotka je pod zlomom).
- **SEO:** jeden `h1`, JSON-LD bez zmeny, canonical/OG zachované.
- **Header:**
  - svetlé sklo `rgba(255,255,255,.72)` + `backdrop-filter`, fallback `.97`;
  - na mobile `Drawer` (Escape, návrat focusu, scroll lock);
  - logo SVG.

### 7.2 Portálová produktová karta (F4)

```
MRIEŽKA ≥ 560 px                        MOBIL < 560 px (riadok zoznamu)
┌────────────────────────────┐          ┌──────┬──────────────────────────┐
│                       (☆)  │ ← 40 px  │ obr. │ KATRIN                   │
│        obrázok 1 : 1       │          │ 92px │ Toaletný papier Gigant M…│
│ ┌────────────────────────┐ │ ← hover/ │      │ DEMO-101 · 6 roliek/bal. │
│ │Kód · Balenie · EAN     │ │   focus: │      │ ● Skladom                │
│ └────────────────────────┘ │   vysunie│      │ 14,90 € / bal. bez DPH   │
├────────────────────────────┤   sa v   │      │ [− 1 +] [Do košíka]      │
│ KATRIN                     │   rezer- └──────┴──────────────────────────┘
│ Toaletný papier Gigant M,  │   vovanom
│ 2-vrstvový                 │   priestore (CLS = 0)
│ DEMO-101 · 6 roliek / bal. │
│ ● Na objednávku            │ ← stav = text + bodka
│ Objednáme u dodávateľa,    │ ← „prečo" mikrotext
│ termín vám potvrdíme.      │
│ 14,90 € / bal. bez DPH     │ ← netto hlavná (tabular-nums)
│ 18,33 € s DPH              │ ← brutto menšia; DPH prepínač ich prehodí
│ [− 1 +]  [  Do košíka   ]  │ ← 40 px
└────────────────────────────┘
```

- **Dáta len z existujúcich polí:**
  - `brand`, názov, `sku`, `packSize`/`unit`, `ean`;
  - stav z `lib/stock.ts`, cena z `resolveUnitPrice` ako hotový view-model (`net`, `gross`).
  - Klient nedostane `basePrice` ani `discountPct`.
- **Stavy:**
  - skladom;
  - na objednávku s vysvetlením;
  - na vyžiadanie (`ON_REQUEST`) → „Vyžiadať cenu" (existujúce `requestQuote`);
  - bez obrázka (64,6 % produktov) → **navrhnutý placeholder** na `ivory-deep` s jemnou mriežkou, ikonou kategórie a jej názvom, nie vyblednutá generická ikona;
  - obľúbené ako plná `brand` hviezda.
- **Hover/focus info:**
  - prekrytie vo vnútri obrázka, takže layout sa neposúva;
  - na `hover: none` je info staticky pod obrázkom;
  - na `:focus-within` sa ukáže aj pri klávesnici.
- **Slot pre množstevné zľavy** je pripravený v komponente, no nevykresľuje sa, kým neexistujú dáta (backlog).
- **Verejná karta:** rovnaká anatómia bez ceny a stepperu, so štítkom „Cena na vyžiadanie" a odkazom na detail.

### 7.3 Bento prehľad (F4)

```
┌ Prehľad ───────────────────────────────────────────── [bez DPH | s DPH] [Košík 3] ┐
│ ┌ Otvorené objednávky ──┐ ┌ Na schválenie ────────┐ ┌ Faktúry po splatnosti ─────┐ │
│ │ 3                     │ │ 2                     │ │ 1   248,90 €               │ │
│ │ ▬▬▬│▬▬▬│▬▬▬ podľa stavu│ │ Najstaršia čaká od …  │ │ Splatnosť 14 dní od vyst., │ │
│ │ Prijatá·Potvrdená·Na c.│ │ [Skontrolovať]        │ │ táto je 5 dní po splatnosti│ │
│ └───────────────────────┘ └───────────────────────┘ └────────────────────────────┘ │
│ ┌ Rýchle doobjednanie (8/12) ────────────────────────┐ ┌ Obľúbené (4/12) ──────────┐ │
│ │ ▢ Toaletný papier…  naposledy 6 bal.   [Pridať 6]  │ │ ▢ Dávkovač…  na vyžiadanie│ │
│ │ ▢ Utierky Z…        naposledy 2 kart.  [Pridať 2]  │ │ ▢ Dezinfekcia…  skladom   │ │
│ └────────────────────────────────────────────────────┘ └───────────────────────────┘ │
│ ┌ Posledné objednávky (12/12) ───────────────────────────────────────────────────┐ │
│ │ Číslo │ Dátum │ Položky │ Stav (odznak) │                              Spolu   │ │
│ └────────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

| Dlaždica | Zdroj (existujúce dáta) | Rola |
|---|---|---|
| Otvorené objednávky + rozdelenie podľa stavu | `order.count` podľa `status` (PRIJATA…NA_CESTE) | všetci (člen len svoje) |
| Na schválenie | `status = CAKA_SCHVALENIE` (+ najstaršia `createdAt`) | správca: celá firma, člen: svoje |
| Faktúry po splatnosti | `Invoice` PENDING, `!paidAt`, `dueAt < now` (rovnako ako `faktury/page.tsx`) + `Company.splatDays` | len správca (ako dnes) |
| Rýchle doobjednanie | posledné `orderItem` + **naposledy objednané množstvo** (rozšírenie read-only dotazu, bez schémy) | všetci |
| Obľúbené | `favorite` (prvé 3–5) | všetci |
| Posledné objednávky | `order.findMany take 5` | všetci |

- Dlaždice s nulovou hodnotou majú prázdny stav s akciou, napr. „Nič nečaká na schválenie".
- Poradie dlaždíc určuje naliehavosť.
- Štatistika „objednávok v roku" a „cenová úroveň" sa presúva do firemnej karty v sidebare.

### 7.4 Rýchla objednávka — matica (F4)

```
# │ Kód (SKU)   │ Produkt                          │ Cena / ks │ Množstvo │  Spolu  │ ✕
1 │ DEMO-101    │ Toaletný papier…  ● Skladom      │  14,90 €  │    6     │ 89,40 € │ ✕
2 │ DEMO-103    │ Tekuté mydlo…     ● Na objednávku│   9,80 €  │    2     │ 19,60 € │ ✕
  │             │ Objednáme u dodávateľa…          │           │          │         │
3 │ DEMO-999 ⚠  │ Kód DEMO-999 nepoznáme…          │     —     │    1     │    —    │ ✕
4 │ ▌           │ —                                │     —     │          │    —    │ ✕
[⇪ Pretiahnite CSV alebo vyberte súbor (Kód; Množstvo)]                [+ Pridať riadok]
2 položky pripravené · 109,00 € bez DPH · 134,08 € s DPH · 1 s chybou
                                                       [Pridať všetko do košíka (2)]
```

- **Klávesnica:**
  - `Enter` v kóde dotiahne riadok a skočí na množstvo;
  - `Enter` v množstve skočí na ďalší riadok (prípadne ho vytvorí);
  - `↑`/`↓` presúva medzi riadkami v rovnakom stĺpci.
- **Vloženie z Excelu:**
  - TSV (`Kód⇥Množstvo`), riadky alebo `;` sa rozdelia od aktuálneho riadku nadol;
  - hlavička `SKU`/`Kód` sa preskočí.
- **CSV drag & drop** (max 512 KB):
  - najprv **náhľad**: počet riadkov, koľko je v poriadku, zoznam chybných s číslom riadku a dôvodom;
  - až potom „Vložiť do tabuľky".
- **Chyby v riadku:**
  - `aria-invalid` + `aria-describedby`, text vysvetľuje, čo opraviť;
  - pri `ON_REQUEST` položka do košíka nejde a riadok to povie;
  - každá zmena sa oznámi cez `aria-live`.
- **Server (povolená read-only akcia):**
  - `lookupSkus(skus: string[])`: `requireUser`, limit 200 riadkov;
  - ceny cez `resolveUnitPrice`, sklad cez `isInStock`;
  - vracia iba view-model `{ sku, name, pack, stock, price: PricedLine }`.
  - Pridávanie ostáva cez existujúce `quickAddToCart`.

### 7.5 Ďalšie vzory pre F4 (stručne)

- **Košík ako stepper** Košík → Doprava a platba → Kontrola a odoslanie.
  - Progress „ešte X € do dopravy zdarma" počíta z `DeliveryMethod.freeThreshold`.
  - Splatnosť sa berie z `Company.splatDays`.
  - Upozornenie na schválenie pri členovi s approverom.
  - Potvrdenie s ďalšími krokmi („majiteľ objednávku potvrdí").
- **Katalóg:** prepínač mriežka / hustý zoznam (tabuľka s rovnakými akciami); facety a filtre ostávajú v URL.
- **DPH prepínač:**
  - cookie `moonid_vat=net|gross` čítaná v RSC, takže nebliká;
  - iba prehodí primárnu a sekundárnu cenu, obe už prichádzajú zo servera.

---

## 8. Konflikty zadanie ↔ kód (kód a sekcia 5 majú prednosť)

| # | Zadanie hovorí | Kód robí | Návrh |
|---|---|---|---|
| K1 | dialógy a drawery „cez `lib/focus-trap.ts` (Escape, návrat focusu, scroll lock)" | helper vie len `focusFirst` + `trapTabKey`; zvyšok je ručne v 5 komponentoch | primitívum `Dialog`/`Drawer` v F1 nad helperom; helper sa nemení |
| K2 | sklad len cez `lib/stock.ts` | verejný `/produkt/[slug]` číta `isStocked` priamo (odznak aj JSON-LD) | malý samostatný `fix(stock)` PR mimo redizajnu (logická zmena, ovplyvňuje SEO) |
| K3 | kategórie sú strom `Category` | portál filtruje `categoryId`/`subcategoryId` (strom), verejný `/produkty` stále textové pole `subcategory` | zjednotiť pred F2 alebo v nej (dotyk dátovej vrstvy, mimo vizuálu); pri redizajne katalógu nepridávať nový rozdiel |
| K4 | „Serif nahrádza Bricolage" | Bricolage nesie aj wordmark (8 výskytov) | SVG logo v F1, inak by šlo o rebrand loga |
| K5 | README: „Next.js 15" | `package.json`: Next 16.3.1 | README opraviť v F1 (dokumentácia) |

---

## 9. Obsah na overenie — `TODO(obsah)`

| # | Tvrdenie / obsah | Kde | Prečo | Návrh |
|---|---|---|---|---|
| O1 | „1 600+ produktov / položiek" | hero, sortiment, login panel | živý katalóg publikuje 418 (audit UX-04) | doložiť (portfólio vs. online katalóg) alebo preformulovať |
| O2 | „48 h skladové položky na ceste", „do 2. pracovného dňa" | hero, podmienky, FAQ | čas dodania bez dôkazu (invariant 8) | potvrdiť majiteľom, inak odstrániť |
| O3 | 4 anonymné referencie | `/o-nas` | bez zdroja | potvrdiť (aspoň typ prevádzky so súhlasom), inak odstrániť |
| O4 | „Moje dávkovače — náplne na jeden klik" | sekcia Portál | funkcia neexistuje (`CompanyDispenser` bez UI) | odstrániť do dodania |
| O5 | „Prístup vám zriadime po prvej objednávke" | FAQ, sekcia Portál | rozpor s `/registracia` a cieľom „Požiadať o firemný účet" | zjednotiť: žiadosť → overenie IČO → pozvánka |
| O6 | „Faktúra so splatnosťou 14 dní" | Ako začať, Podmienky | splatnosť je per firma (`Company.splatDays`) | „so splatnosťou podľa dohody" alebo potvrdiť štandard |
| O7 | „9 rokov na trhu" | `/produkt/[slug]` | zastará | odvodiť z roku 2017 |
| O8 | ceny a „−18 % vaša zľava" v mockupe portálu | domovská stránka | vymyslené čísla | neutrálna ilustrácia alebo screenshot zo stagingu |
| O9 | chýbajúce obrázky (64,6 %) | katalóg | dôvera | navrhnutý placeholder (7.2) + doplnenie obrázkov (backlog) |

---

## 10. Plán PR-iek

Každý PR je z vetvy od `main`, má conventional commit, vyplnenú PR šablónu a pred/po screenshoty zo stagingu.

| PR | Fáza | Obsah | Závisí od | Zastavenie |
|---|---|---|---|---|
| 0 | F0 | `docs(design)`: tento dokument, prototyp, master prompt | — | **STOP: smer, font, ivory** |
| 1 | F1a | `feat(design)`: tokeny v `@theme`, Newsreader cez `next/font`, SVG logo, `.on-dark` focus, odstránenie Bricolage a `container.tsx`, **MASTER.md v2** | PR 0 | — |
| 2 | F1b | `feat(design)`: primitíva v `components/ui/` (Button, IconButton, Field/Input, Select, Badge, StockBadge, Price + `formatEur`, QtyStepper, Card, Dialog/Drawer, Tabs, DataTable, EmptyState, Logo). Bez migrácie stránok, staré triedy (`.t-h2`, `.eyebrow`, `.wipe`, `.microgrid`, `.reveal`) ostávajú. | PR 1 | — |
| 3 | F2a | `feat(design)`: header + hero (mesh, stagger, magnetické CTA) | PR 2 | **STOP: vizuálne schválenie** |
| 4 | F2b | zvyšok domovskej stránky, footer, cookie lišta, obsahové úpravy O1–O8 po rozhodnutí | PR 3 | — |
| 5 | F2c | `/produkty`, `/produkt/[slug]`, `/o-nas`, `/kontakt`, `/pomoc`, právne stránky | PR 4 | — |
| 6 | F3a | `AuthShell` + login, zabudnuté heslo, nastav-heslo, potvrdiť-prístup, MFA, čakajúce | PR 2 + **merge `codex/staging-ops-hardening`** (mení auth stránky) | — |
| 7 | F3b | `/registracia` viackrokovo + `lib/validation/sk-company.ts` (IČO mod 11, DIČ ÷ 11, IČ DPH) + vitest | PR 6 | — |
| 8 | F4a | `PortalShell` v2, bento prehľad, DPH prepínač (cookie) | PR 2 | — |
| 9 | F4b | katalóg (mriežka / zoznam), detail produktu | PR 8 | — |
| 10 | F4c | rýchla objednávka: matica + read-only `lookupSkus` | PR 8 | — |
| 11 | F4d | košík a checkout stepper | PR 8 | — |
| 12 | F4e | objednávky (FSM stepper), faktúry, nastavenia, používatelia | PR 8 | — |
| 13 | F5 | staff: tokeny, primitíva, husté tabuľky, stavové odznaky | PR 2 | — |
| 14 | F6 | QA: celý DoD, klávesnica, Lighthouse (desktop + mobil `/`, `/katalog`), pred/po, aktualizácia MASTER a tohto dokumentu | všetko | — |

**Mimo redizajnu (samostatne, so súhlasom):**

- `fix(stock)` pre K2;
- zjednotenie kategórií K3;
- staging env pre e2e (bod 18);
- backlog zo sekcie 9 master promptu.

---

## 11. Riziká

| Riziko | Dopad | Mitigácia |
|---|---|---|
| Výmena fontu zmení logo | rebrand bez zámeru | SVG logo v PR 1 pred odstránením Bricolage |
| LCP/CLS regresia (nový font, nový hero) | Lighthouse CI budget | `adjustFontFallback`, preload 2 fontov, hero bez LCP pozadia, meranie aj mobilného profilu |
| Ivory + teplé šedé + chladné cream na prechodoch | nekonzistentný dojem | ivory len na verejnom webe; auth a portál biela/cream; prechod cez header |
| `backdrop-filter` (výkon, kontrast) | čitateľnosť na slabých zariadeniach | alfa ≥ 0,72, fallback 0,97, overený kontrast |
| Animácie pozadia na slabých mobiloch | jank, batéria | iba `transform`, žiadny `blur` filter, pauza mimo viewportu a pri reduced-motion |
| ≈ 400 hex hodnôt a 30+ veľkostí písma | regresie pri migrácii | migrácia po stránkach v F2–F5, vizuálne porovnanie zo stagingu |
| Nové komponenty a únik cien | porušenie invariantu 2 | len view-model typy (`PricedLine`), kontrola RSC payloadu `/katalog*` v každom PR |
| E2E proti produkcii (`.env.test`) | zásah do produkčných dát | staging env pred PR 1, `db-guard` nevypínať |
| Paralelná vetva `codex/staging-ops-hardening` mení auth a testy | merge konflikty v F3 | F3 až po jej merge |
| Staging na free pláne sa uspí po 7 dňoch nečinnosti | zlyhá fotenie alebo e2e | pred každou fázou skontrolovať stav, prípadne ho zobudiť |
| Obsahové TODO bez vlastníka | blokuje F2b | rozhodnutia O1–O9 od majiteľa pred PR 4 |

---

## 12. Rozhodnutia (schválené Lukášom 7. 10. 2026)

| # | Otázka | Rozhodnutie | Dôvod |
|---|---|---|---|
| R1 | Display font | **Newsreader 500** | pokojnejší, čitateľné číslice, rezerva váh a kurzívy, o 21 KB ľahší než Bricolage; Instrument Serif má jediný rez a je silne trendový |
| R2 | Ivory `#F7F4EE` | **len verejný web** | auth obrazovky biele s editoriálnym panelom, portál cream/biely kvôli hustote a neutralite cien |
| R3 | Hero | **svetlý ivory hero** s rámovanou fotkou a „čistou kachličkou" | jasnejší a editoriálnejší, LCP na mobile pripadne na text, istý kontrast pre glass header aj magnetické CTA |

**Ďalší krok:**

1. Merge PR Fázy 0.
2. Fáza 1 v novej session:
   - PR 1: tokeny + Newsreader + SVG logo + MASTER.md v2;
   - PR 2: primitíva.
3. Pred PR 4 (F2b) rozhodnúť obsahové body O1–O9 (kap. 9).

## Príloha A — staging env pre lokálny vývoj (od Fázy 1)

Lokálny preview (`.claude/launch.json` → `moonid`) potrebuje `.env.local` so staging hodnotami. Nikdy nepoužívať produkčný `.env` z hlavného checkoutu.

| Premenná | Kde ju vziať |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Supabase → projekt `moonid-b2b-staging` → tlačidlo **Connect** → záložka **ORMs** → **Prisma**. Skopírovať oba riadky a `[YOUR-PASSWORD]` nahradiť heslom DB. Ak ho nepoznáte: Project Settings → Database → *Reset database password*, ale skôr overte, či ho nepoužíva staging e2e. |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://booeaeyyyitlmuxixjfy.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → **API Keys** → *Legacy API keys* → `anon` (verejný) |
| `SUPABASE_SERVICE_ROLE_KEY` | tamže → `service_role` → *Reveal* (tajný, nikdy necommitovať) |

Odporúčanie: uložiť ako `C:\workspace\websites\moonid_b2b_portal\.env.staging` (gitignored) a každá session si ho skopíruje do svojho worktree ako `.env.local`.
