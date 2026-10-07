# Moonid — dizajnový systém v2 (MASTER, source of truth)

> **Verzia 2 · 10/2026 · „Editorial Precision"** — evolúcia „Clean Slate" (7/2026), nie rebrand.
> Hygiena = presnosť, pokoj a dôvera. Prémiovosť robí **typografia, rytmus, priestor a detail**, nie efekty.
> Zadanie a rozhodnutia: [`docs/REDESIGN_2026.md`](../docs/REDESIGN_2026.md) (kap. 5 tokeny, kap. 12 rozhodnutia R1–R3).
> Tokeny žijú v `app/globals.css` (`@theme`), komponenty v `components/ui/`. Pri zmene tokenu alebo pravidla
> sa tento súbor mení **v tom istom PR**.

## 1. Farby

Názvy tokenov sa nemenia (mení sa len hodnota, nové pribúdajú). V kóde **žiadne hexy** — vždy token
(`bg-brand`, `text-muted-2`, `border-field` …). Výnimkou sú len zatiaľ nemigrované miesta (F2–F5).

### 1.1 Identita a text

| Token | Hex | Použitie |
|---|---|---|
| `ink` | `#0D1715` | text, „editorial charcoal" |
| `brand` | `#163F38` | identita, primárne CTA, focus na svetlej ploche |
| `brand-2` | `#1E5249` | hover CTA, sekundárny brand |
| `brand-deep` / `brand-foot` | `#0F2A26` / `#0C211D` | tmavé pásy, footer, staff sidebar |
| `mint` | `#8FE0CD` | **jediný akcent** (wipe, tmavé plochy), focus na tmavej ploche |
| `mint-ink` / `mintbg` | `#0F6B57` / `#EAF3F0` | eyebrow, stav „Skladom" (funkčná farba) |
| `muted` / `muted-2` / `muted-3` | `#5C584F` / `#6B675F` / `#54514A` | sekundárny text (teplé šedé, ladia s ivory) |
| `on-dark` / `on-dark-2` / `on-dark-3` | `#D7E4E0` / `#B7CCC6` / `#8FB3AB` | text na tmavých plochách (`on-dark-3` len veľký/dekoratívny) |

### 1.2 Plochy a čiary

| Token | Hex | Použitie |
|---|---|---|
| `paper` | `#FFFFFF` | karty, portál, auth formuláre |
| `cream` | `#F5F7F6` | pozadie portálu a staffu, striedavé sekcie |
| `surface-2` / `surface-3` / `cream-2` | `#FAFBFA` / `#F7F9F8` / `#F3F0EE` | podklad riadkov, hlavičiek tabuliek, neutrálnych pilúl |
| **`ivory`** (v2) | `#F7F4EE` | povrch **verejného webu** |
| **`ivory-deep`** (v2) | `#EEE9DF` | zapustené plochy na webe, placeholder obrázka |
| `line` | `#E5EAE8` | hairline na bielej/cream (dekor, 1,22 : 1) |
| **`line-warm`** (v2) | `#E3DDD1` | hairline na ivory (dekor, 1,23 : 1) |
| `field` | `#7F8D88` | **okraj ovládačov**: polia, steppery, checkboxy, rádiá (SC 1.4.11) |
| **`focus`** / **`focus-dark`** (v2) | = `brand` / = `mint` | obrys focus ringu na svetlej / tmavej ploche |

### 1.3 Stavové (sémantické) farby

Vždy dvojica podklad + text, vždy s **textom** (nie len farbou). Komponent: `Badge` / `badgeClass()`.

| Tón | Podklad | Text | Kontrast | Stavy |
|---|---|---|---:|---|
| success | `success` `#ECFDF3` | `success-ink` `#14633F` | 6,90 | Doručená, Uhradená |
| warning | `warning` `#FDF6E7` | `warning-ink` `#8A5A00` | 5,51 | Prijatá, Čaká na schválenie |
| danger | `danger` `#FDECEA` | `danger-ink` `#9A3025` | 6,50 | chyby, Po splatnosti |
| info (v2) | `info` `#EEF2F0` | `info-ink` `#1E5249` | 7,88 | Potvrdená, Pripravuje sa, Na ceste |
| brand | `mintbg` | `brand` | 10,31 | aktívne/označené |
| neutral | `cream` | `muted` | 6,59 | neaktívne |
| storno | `cream-2` | `muted-2` | 4,96 | Stornovaná |

`info` a `brand` sú zámerne v jednej zelenej rodine — rozlišuje ich **text**, nie farba; v jednom zozname
stavov ich nemiešať.

Doplnky: `warning-ink-2` (dlhší text v žltom paneli), `warning-line`, `danger-ink-2` (hover plného
červeného tlačidla), `danger-line` (dekoratívny rámik oznamu). **Info je v2 v brand rodine** — indigo
`#3730A3` bolo druhou akcentovou farbou (anti-pattern).

### 1.4 Kontrast (WCAG 2.x, spočítané)

| Popredie → pozadie | Pomer | | Netextové (≥ 3 : 1) → pozadie | Pomer |
|---|---:|---|---|---:|
| `ink` → `ivory` / `paper` / `cream` | 16,63 / 18,25 / 16,96 | | `field` → `paper` / `cream` | 3,46 / 3,22 |
| `brand` → `ivory` / `paper` | 10,61 / 11,65 | | `field` → `ivory` / `mintbg` | 3,15 / 3,06 |
| `mint-ink` → `ivory` / `paper` / `mintbg` | 5,87 / 6,44 / 5,70 | | `field` → `ivory-deep` | **2,86 ❌** |
| `muted` / `muted-2` / `muted-3` → `ivory` | 6,45 / 5,13 / 7,21 | | `focus` → `ivory` / `paper` | 10,61 / 11,65 |
| `muted-2` → `cream` / `ivory-deep` | 5,23 / 4,65 | | `focus-dark` → `brand-deep` / `brand-foot` | 9,94 / 10,96 |
| biela → `brand` / `brand-deep` | 11,65 / 15,22 | | `focus` (brand) → `brand-deep` | **1,31 ❌** |
| `mint` → `brand` / `brand-deep` | 7,61 / 9,94 | | | |

Z tabuľky plynú dve pravidlá: **na `ivory-deep` nepatria formulárové polia** a **na tmavej ploche musí
byť `.on-dark`** (inak obrys focusu nesie len biely prstenec).

## 2. Plochy a akcent

- **Ivory iba na verejnom webe** (R2). Auth obrazovky = biela karta na `cream` + editoriálny brand panel.
  Portál a staff = `cream` / `paper` (hustota, neutralita cien).
- **Tmavé plochy** majú triedu **`.on-dark`**: obrys focusu sa prepne na `focus-dark`. Dnes: tmavé sekcie a
  karty domovskej stránky (hero, sortiment, portál, prečo Moonid, kontakt), footer, tmavý header, mobilné
  menu, staff sidebar, auth panel, karta „Ako to funguje" na dashboarde. Svetlá karta vnútri tmavej sekcie
  (formulár v kontakte) → `.on-light`. Každá nová tmavá plocha s ovládačmi ju musí mať.
- **Akcent:** do limitu **1–2 výskytov na viewport** sa počíta jasný `mint` (`#8FE0CD`). Funkčné stavy
  `mint-ink` na `mintbg` sa nepočítajú. **Žiadna druhá akcentová farba** — ani zlatá/champagne, ani
  žltá hviezda obľúbených, ani indigo stavov.
- **Glass** len na sticky headeri a overlayoch: `rgba(255,255,255,.72)` + `backdrop-filter`, fallback
  bez `backdrop-filter` s alfou ≥ 0,97, overený kontrast AA.
- Tmavé sekcie: radial gradient `#21564C → #163F38` alebo `brand-deep`; max 1 tmavý pás medzi svetlými.
- **Dark mode sa nepridáva.**

## 3. Typografia

| Rola | Font | Kde | Pravidlá |
|---|---|---|---|
| Display | **Newsreader 500** (`--font-display`, `next/font`, latin + latin-ext, jediný rez) | verejný web, veľké nadpisy stránok (portál; auth = `.t-page` na všetkých 7 obrazovkách) | váha **len 500**, `font-synthesis-weight: none`; nikdy `font-semibold`/`bold` |
| UI | **Hanken Grotesk** 400–700 (`--font-sans`) | všetko ostatné | ceny, SKU, tabuľky, štatistiky v UI → `tabular-nums` |
| Logo | SVG (`components/ui/logo.tsx`) | všade | nikdy živý text (kap. 4) |

**Kde serif NIE:** ceny a sumy, SKU/EAN, tabuľky, čísla na dashboarde, titulky v topbare, titulky dialógov,
nadpisy sekcií v portáli pod 24 px, formuláre. Tam je Hanken `font-semibold`.

**Fluidná škála** (CSS premenné v `:root`, triedy v `globals.css`):

| Trieda | Veľkosť | Riadkovanie | Tracking |
|---|---|---:|---:|
| `.t-display` | `--fs-display: clamp(42px, 6.3vw, 98px)` | 1,02 | −0,022 em |
| `.t-h1` | `--fs-h1: clamp(36px, 5vw, 68px)` | 1,05 | −0,02 em |
| `.t-h2` | `--fs-h2: clamp(30px, 4vw, 56px)` | 1,06 | −0,018 em |
| `.t-h3` | `--fs-h3: clamp(22px, 2.2vw, 30px)` | 1,15 | −0,01 em |
| `.t-page` (v2) | `--fs-page: clamp(24px, 2.4vw, 32px)` | 1,12 | −0,012 em |
| `.stat-num` | `--fs-stat: clamp(40px, 5vw, 76px)` | 1,0 | −0,02 em, `tabular-nums` |

- **Riadkovanie a diakritika** (zmerané v Newsreader 500): verzálky s diakritikou (Č Ď Ť Ž Š Ň Á É Í Ó Ú
  Ý Ô Ĺ Ŕ) siahajú 0,871 em nad účiaru, malé ĺ 0,894 em, dotiahnutia g j y ý −0,26 em. Pod dotiahnutím
  predošlého riadku sa ich dotkne pri riadkovaní **< 1,13**. Malé písmená s diakritikou (≤ 0,716 em) sú
  bezpečné od 1,0; Ľ má karon bokom. Hodnoty 1,02–1,12 z tabuľky sú preto len pre **statický** text
  overený na 375 / 768 / 1440 px; **text z dát** (názov produktu, meno firmy) má riadkovanie ≥ 1,15.
- Pri inline `font-display` do 32 px tracking −0,01 až −0,012 em, nad 32 px −0,015 až −0,02 em.
- `text-wrap: balance` na nadpisoch.
- **UI škála:** Tailwind `text-xs` 12 · `sm` 14 · `base` 16 · `lg` 18 · `xl` 20 · `2xl` 24 + tokeny
  `text-13`, `text-15`. **Nič pod 12 px.** Polia 16 px na dotykových/úzkych displejoch (iOS zoom —
  pravidlo v `globals.css`). Arbitrárne `text-[…px]` sa migrujú po stránkach (F2–F5).
- Eyebrow: 12,5 px, verzálky, tracking 0,18 em, `mint-ink` (na tmavej `mint`).
- **Test diakritiky** pri každej zmene fontu:
  `Ďakujeme — ľahko, ťažko, Ľubica, dôležité, mäkké, kôš, úžitkové 1 234,50 €`.

## 4. Logo

- Komponent **`<Logo />`** (`components/ui/logo.tsx`): obrysy pôvodného wordmarku „moonid." (Bricolage
  Grotesque 600, tracking −0,03 em), 1,6 KB inline SVG, bez závislosti na fonte. Používa sa na 10 miestach
  (header 2×, footer 2×, auth panel, auth shell, portál, staff, `/cakajuce`, mockup portálu).
- **Tóny:** `tone="brand"` (svetlá plocha: písmená `brand`, bodka `mint-ink`), `tone="inverse"` (tmavá:
  biela + `mint`). Bodka nesie akcent, písmená sa inak neprefarbujú.
- **Veľkosť cez výšku** (`h-[…]`), šírku dopočíta pomer 4,82 : 1. Prevod zo starého textu: výška ≈ 0,747 ×
  font-size → header 19 px, portál 17 px, staff 18 px, footer 21 px, auth panel 22 px. Minimum 17 px
  funkčne, 10 px len dekoratívne.
- **A11y:** predvolene `role="img"` + `aria-label="Moonid"` → odkaz s logom má meno „Moonid".
  Dekoratívne použitie (obrí wordmark vo footeri, mockup) = `decorative`. Odkaz s logom má mať
  ≥ 24 px na výšku (`py-1`, SC 2.5.8).
- V stĺpcovom flexe pridaj `self-start`, inak sa SVG roztiahne na šírku stĺpca.
- Favicon `app/icon.svg` (polmesiac) ostáva.

## 5. Vlastné motívy (ownable, nie šablóna)

1. **`.wipe`** — mint „ťah stierkou" za kľúčovým slovom; na hero animovaný scaleX zľava.
2. **`.microgrid`** — „čistá kachlička": hairline mriežka 64 px, maskovaná. V F2 hero s jemným svetelným
   pásom (len `transform`, pauza mimo viewportu a pri reduced-motion).
3. **Číslované sekcie** — eyebrow `01 / Sortiment` (tabular nums, hairline pred textom).
4. **Obrie číslovky** — kroky a štatistiky v Newsreader (`.stat-num`), čísla v UI v Hanken.
5. **Hairline švajčiarske delenie** — `border-t border-line` (na ivory `line-warm`) namiesto kariet, asymetrický 12-col grid.
6. **Mint status bodka** (`.dot-mint`) — skladom/dostupnosť, vždy s textom.

## 6. Komponenty (`components/ui/`)

Dnes: `Button`/`buttonClass`, `Card`/`cardClass`, `Badge`/`badgeClass`, `Alert`, `Dialog`/`ConfirmDialog`
(focus trap, Escape, návrat fokusu, scroll lock), `Field` (label + hint + chyba + `aria-*`),
`Input`/`Textarea`/`Select`/`inputClass`, `LiveMessage`/`useFocusWhen`, `Skeleton`, **`Logo`** (v2).
PR 2 (F1b): IconButton, StockBadge, Price + `formatEur`, QtyStepper, Drawer, Tabs, DataTable, EmptyState.

- **Polomery:** `rounded-control` 10 px (tlačidlá, polia), `rounded-card` 14 px (karty portálu),
  `rounded-panel` 20 px (panely webu).
- **Výška ovládačov:** web 52 px (`--control-h-web`), portál 44 px (`--control-h-portal`), hustá tabuľka
  40 px (`--control-h-dense`). Ikonové ovládače cieľ 40–44 px, minimum 24 px.
- **Tlačidlá:** primárne `bg-brand → brand-2` (na tmavej biele s ink textom), sekundárne hairline; vždy
  `cursor-pointer`, prechod 150–250 ms, viditeľný focus.
- **Vstupy:** okraj `field`, focus `border-brand`, chyba `aria-invalid` → `danger-ink`; 16 px na dotyku.
- **Karty:** `border-line`, hover len `transform`/`box-shadow` (žiadny posun layoutu). Hustý obsah radšej
  hairline zoznam než karta.
- **Ikony:** inline SVG, stroke 1,5–1,8, viewBox 24 — nikdy emoji ani ikonové balíky.
- **`DataTable` pravidlo:** posuvný obal tabuľky má `position: relative` — inak `.sr-only` v bunke unikne
  a roztiahne stránku (zistenie F0).

## 7. Layout a priestor

- Kontajner `max-w-[1240px] px-5 sm:px-8`; sekcie webu `clamp(72px,10vw,140px)` vertikálne.
- Verejný web: asymetrický 12-stĺpcový grid, veľkorysý priestor. Portál: vysoká hustota, bento prehľad.
- 8pt rytmus; overované šírky 375 / 768 / 1024 / 1440 px, bez vodorovného pretečenia.

## 8. Pohyb

- Krivka `ease-precise` = `cubic-bezier(.2,.7,.2,1)`. Mikrointerakcie 150–250 ms, odhalenia 600–900 ms,
  stagger 60–90 ms. Animuje sa **len `transform` a `opacity`**, CLS = 0.
- `prefers-reduced-motion` globálne vypína animácie; `MotionToggle` (SC 2.2.2) pozastaví pásy.
- Hero pozadie: CSS/SVG, nikdy LCP element, žiadny WebGL/canvas, pauza mimo viewportu.
- Magnetické CTA: len primárne CTA verejného webu, len `pointer: fine`, len `transform`, max 7 px.

## 9. Vrstvy (z-index)

`--z-header` 50 · `--z-drawer` 60 · `--z-cookie` 100 · `--z-toast` 120 (Tailwind: `z-(--z-drawer)`).

## 10. Prístupnosť (WCAG 2.2 AA, EAA / zák. 351/2022)

- Text ≥ 4,5 : 1, ovládače a stavové obrysy ≥ 3 : 1 (tabuľka 1.4).
- **Focus ring** = tri pásy (1 px `ink`, 2 px biela, 2 px obrys `focus`/`focus-dark`), unlayered pravidlo
  v `globals.css`; nepridávať vlastný `box-shadow` na fokusovateľné prvky.
- Jeden `h1` na stránku; titulok v topbare portálu nie je `h1` (oprava v F4).
- Dialógy a drawery cez `Dialog` / `lib/focus-trap.ts`; výsledky akcií cez `LiveMessage` (`aria-live`).
- Cieľ dotyku ≥ 24 px (SC 2.5.8), v portáli 40–44 px.

## 11. SEO / GEO / AEO

- JSON-LD len cez `safeJsonLd` (`lib/json-ld.ts`), URL cez `SITE_URL`. LocalBusiness, FAQPage,
  BreadcrumbList, Product.
- Jeden `h1`, sémantické landmarky, metadata + canonical + OG na každej stránke; FAQ ako `<details>`,
  fakty v `<dl>`.
- Výkon: `next/font` (žiadny CLS, fonty len self-hosted), `next/image`, animácie bez layout shiftu.

## 12. Ceny a dáta v UI

Netto ako hlavná cena, brutto menším písmom; formát sk-SK `1 234,50 €` (`Intl.NumberFormat`), `tabular-nums`.
Klient dostáva len hotové view-modely — nikdy `Decimal`, `basePrice`, `costPrice`, `discountPct`.
Zákazník vidí iba „Skladom" / „Na objednávku". Detail: invarianty v
[`docs/prompts/MASTER_PROMPT_REDIZAJN_2026.md`](../docs/prompts/MASTER_PROMPT_REDIZAJN_2026.md), sekcia 5.

## 13. Anti-patterns (zakázané)

Navy + Inter generika · AI fialovo-ružové gradienty · druhá akcentová farba (champagne/zlatá, žltá,
indigo) · emoji ikony · hover, ktorý hýbe layoutom · karty na všetko · text pod 4,5 : 1 · font pod 12 px ·
input pod 16 px na mobile · **faux bold** (Newsreader iným rezom než 500) · **serif v cenách a tabuľkách** ·
**logo ako živý text** · ivory v portáli · hexy namiesto tokenov · dark mode · fonty/skripty z CDN (CSP).

## 14. História

- **v2 (10/2026, redizajn 2026 F1):** Newsreader 500 namiesto Bricolage Grotesque; SVG logo; nové tokeny
  `ivory`, `ivory-deep`, `line-warm`, `focus`/`focus-dark`, `radius-*`, `text-13`/`text-15`,
  `ease-precise`, `--fs-page`, `--control-h-*`, `--z-*`; `info` z indigo do brand rodiny; `.on-dark`;
  `.t-page`; pravidlá plôch, akcentu a serifu.
- **v1.1 (10/2026, vetva staging → main #47):** sémantické stavové tokeny, `field`, `on-dark*`,
  `surface-*`, UI kit, trojpásový focus ring.
- **v1 (7/2026):** „Clean Slate" — Bricolage Grotesque + Hanken Grotesk, mint akcent, wipe, microgrid.
