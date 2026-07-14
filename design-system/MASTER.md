# Moonid — dizajnový systém (MASTER, source of truth)

> Redizajn 7/2026. Štýl: **„Clean Slate"** — klinicky čistý švajčiarsky grid + prémiovo-editoriálna typografia.
> Dizajn stelesňuje produkt: hygiena = čistota, presnosť, poriadok. Žiadny generický SaaS template.
> Pattern (ui-ux-pro-max): Trust & Authority (značky, metriky, referencie, jasné podmienky) na švajčiarskom gride.

## 1. Farby (Tailwind v4 @theme tokeny v app/globals.css)

| Token | Hex | Použitie |
|---|---|---|
| `ink` | `#0D1715` | text, tmavé plochy — near-black green |
| `brand` | `#163F38` | identita (heritage), CTA, tmavé sekcie |
| `brand-2` | `#1E5249` | hover CTA, sekundárny brand |
| `brand-deep` | `#0F2A26` | tmavé pásy, gradient stred |
| `brand-foot` | `#0C211D` | footer, sidebar portálu |
| `mint` | `#8FE0CD` | **jediný akcent** — wipe, bodky, čísla na tmavej |
| `mint-ink` | `#0F6B57` | akcent na bielej (AA pre malý text) |
| `mintbg` | `#EAF3F0` | svetlé mint plochy, ikony pozadia |
| `paper` | `#FFFFFF` | základ |
| `cream` (surface) | `#F5F7F6` | striedavé sekcie, portál pozadie |
| `line` | `#E5EAE8` | hairlines, bordery |
| `muted` / `muted-2` / `muted-3` | `#5C584F / #6B675F / #54514A` | sekundárny text (WCAG AA overené) |

Pravidlo: **mint je vzácny** — max 1–2 výskyty na viewport. Tmavé sekcie = radial gradient `#21564C → #163F38` alebo `brand-deep`.

## 2. Typografia

- **Display: Bricolage Grotesque** (`--font-display`, next/font, latin-ext, weights 500–700) — H1/H2, obrie číslovky, wordmark. Tracking −0.03 až −0.045em.
- **Body/UI: Hanken Grotesk** (`--font-sans`, existujúci) — text, formuláre, portál UI.
- Fluid škála (CSS vars): `--fs-display: clamp(44px,6.4vw,92px)` · `--fs-h2: clamp(32px,4.4vw,56px)` · `--fs-h3: clamp(20px,2.2vw,26px)` · body 16–16.5px/1.6–1.65 · eyebrow 11.5–12.5px caps tracking 0.16–0.22em.
- Line-height display 0.98–1.04; `text-wrap: balance` na nadpisoch.

## 3. Vlastné motívy (ownable, nie šablóna)

1. **`.wipe`** — mint „ťah stierkou" za kľúčovým slovom (skewnutý gradient za textom; na hero animovaný scaleX zľava). Symbol čistenia.
2. **`.microgrid`** — jemná kachličková mriežka (hairline 64px grid, maskovaná) na svetlých plochách.
3. **Číslované sekcie** — eyebrow `01 / Sortiment` (tabular nums, hairline pred textom).
4. **Obrie číslovky** — štatistiky a kroky v Bricolage (`.stat-num`), clamp až 96px.
5. **Hairline Swiss delenie** — `border-t border-line` zoznamy namiesto kariet, asymetrické 12-col gridy.
6. **Mint status bodka** — skladom/dostupnosť (pulz na hover, reduced-motion safe).

## 4. Komponenty

- **Tlačidlá:** radius 10px; primárne `bg-brand → brand-2` (na tmavej: biele s ink textom); sekundárne hairline border; výška 48–52px verejný web, 40–44px portál; vždy `cursor-pointer`, transition 200ms, focus-visible ring.
- **Karty:** radius 16px (`rounded-2xl`), border `line`, hover: translateY(−4px) + zelenkastý shadow. V portáli hustejšie (radius 12–14px).
- **Vstupy:** radius 10px, border `#D2D8D4`, focus border-brand; label caps 11px.
- **Ikony:** len SVG (stroke 1.5–1.8, 24×24 viewBox), nikdy emoji.

## 5. Layout & spacing

- Kontajner `max-w-[1240px] px-5 sm:px-8`; sekcie `clamp(72px,10vw,140px)` vertikálne.
- 8pt rytmus; breakpointy 375/768/1024/1440 testované.
- Striedanie pásov: paper → surface → dark (max 1 tmavý pás medzi svetlými).

## 6. Motion

- Scroll-driven reveal (existujúce `animation-timeline: view()`): rise 14px, 600–800ms, cubic-bezier(.2,.7,.2,1), stagger 60–90ms.
- Hover 200ms; `prefers-reduced-motion` globálne vypína (už v globals).
- Hero: postupný stagger + wipe scaleX; marquee značiek pauza na hover.

## 7. SEO / GEO / AEO

- JSON-LD: LocalBusiness (✓), FAQPage (✓), BreadcrumbList (✓ produkt), + Organization/logo, Product+Offer.
- Jeden `h1`/stránka, sémantické landmarky, per-page metadata + canonical + OG.
- AEO: FAQ ako stručné odpovede (`<details>` prístupný akordeón), fakty (rozvoz, splatnosť, oblasť) v `<dl>` — strojovo čitateľné.
- Výkon: next/font (žiadny CLS), next/image, žiadne layout-shift animácie (transform/opacity only).

## 8. Anti-patterns (zakázané)

Navy+Inter generika · AI fialovo-ružové gradienty · emoji ikony · scale-hover čo hýbe layoutom · viac než 1 akcentová farba · karty-na-všetko (používaj hairline zoznamy) · text pod 4.5:1 · font pod 16px na mobile.
