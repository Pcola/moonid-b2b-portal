# Handoff: Moonid B2B Portál

> Kompletný podklad pre vývojára (Claude Code / dev tím) na implementáciu B2B portálu Moonid v reálnom kóde.

---

## 1. Prehľad

**Moonid s.r.o.** je B2B dodávateľ hygieny, čistenia a vybavenia pre prevádzky (hotely, gastro, wellness, kancelárie, inštitúcie). Portál má dve oddelené rozhrania nad jednou databázou:

1. **Zákaznícky portál** — firmy si pozerajú svoje (zľavnené) ceny, objednávajú, opakovane doobjednávajú, sledujú objednávky a faktúry.
2. **Administrácia (back-office)** — Moonid spravuje objednávky, sklad, ceny/cenové úrovne, zákazníkov a faktúry; sleduje tržby.

Cieľ: moderný, prémiový, minimalistický B2B portál spĺňajúci EÚ/SK normy a bezpečnostné štandardy pre rok 2026.

---

## 2. O priložených súboroch (DÔLEŽITÉ)

Súbory v `prototypes/` sú **dizajnové referencie vytvorené v HTML** — interaktívne prototypy, ktoré ukazujú zamýšľaný vzhľad a správanie. **Nie sú to produkčné súbory na priame nasadenie.**

**Prístup (odporúčaný): hotový commerce engine Medusa.js + vlastný frontend.** Backend (objednávky, produkty, sklad, zákazníci, B2B firmy a cenové úrovne, košík, platby) sa **nestavia od nuly** — používa sa **Medusa.js v2 + B2B Commerce Starter**. Vývojár stavia najmä **prémiový zákaznícky storefront** (podľa prototypu) a **slovenské špecifiká** (e-faktúra, DPH, IČO/DIČ). Admin („pohľad majiteľa") pokrýva vstavaný **Medusa Admin**, rozšírený widgetmi podľa prototypu.

Úloha vývojára: **znova vytvoriť dizajn prototypov v Next.js storefronte** napojenom na Medusa API (Tailwind + shadcn/ui). HTML neslúži na kopírovanie 1:1, ale ako presná predloha vzhľadu, rozloženia, textov a interakcií. Detaily: `docs/TECH_STACK.md`, `docs/MEDUSA_SETUP.md`.

Prototypy sú postavené v internom „Design Component" formáte (`.dc.html` + `support.js`). Otvárajú sa priamo v prehliadači. Ich logika (dáta, stavy, výpočty cien) je v `<script data-dc-script>` triede `Component` na konci každého súboru — slúži ako referencia pre biznis logiku.

---

## 3. Fidelita

**High-fidelity (hifi).** Prototypy majú finálne farby, typografiu, spacing a interakcie. Vývojár má UI zrekonštruovať **pixel-perfect** pomocou knižníc cieľového kódu (Tailwind + shadcn/ui). Hodnoty (hex, px, font) sú nižšie v sekcii *Design Tokens*.

---

## 4. Rozhrania a obrazovky

### A) Zákaznícky portál — `prototypes/Moonid Portál.dc.html`

| Obrazovka | Účel |
|---|---|
| **Prihlásenie** | Split layout: ľavý zelený panel s brandom + pravý formulár (e-mail, heslo, zapamätať, zabudnuté heslo). |
| **Nástenka (Dashboard)** | Pozdrav + dátum, 4 KPI karty (objednávka na ceste, čaká na úhradu, počet objednávok, najbližší rozvoz), sekcia „Rýchle doobjednanie" (najčastejšie položky s tlačidlom +), „Posledné objednávky" (zoznam so stavmi), karta „Najbližší rozvoz". |
| **Katalóg** | Ľavý filter kategórií (sticky), grid produktov: foto, kategória, názov, balenie, MOC (preškrtnutá) + zľavnená cena, badge zľavy, „Pridať" → qty stepper (− qty +). |
| **Objednávky** | Filter chips (Všetky/Na ceste/Doručené/Tento mesiac) + tabuľka objednávok s miniatúrami, stavom (badge) a sumou. |
| **Detail objednávky** | Stav + timeline (Prijatá → Pripravuje sa → Na ceste → Doručená s fajkou/bodkou), položky, súhrn (medzisúčet, doprava, DPH 23 %, spolu), doručovacia adresa, „Objednať znova", „Faktúra". |
| **Faktúry** | 3 súhrnné karty + tabuľka faktúr (číslo, objednávka, dátum, stav, suma, stiahnuť PDF). |
| **Košík (drawer)** | Bočný panel sprava: položky s qty stepperom, medzisúčet, doprava, spolu s DPH, „Objednať na faktúru". Prázdny stav. |

### B) Administrácia — `prototypes/Moonid Admin.dc.html`

| Obrazovka | Účel |
|---|---|
| **Prihlásenie správcu** | Tmavší variant loginu (len pre interných pracovníkov). |
| **Prehľad** | 4 KPI karty (tržby mesiac, nové objednávky, aktívni zákazníci, nízky sklad), graf tržieb za 7 dní (stĺpcový), „Najpredávanejšie", tabuľka „Objednávky čakajúce na akciu" s tlačidlom Spracovať. |
| **Objednávky** | Filter chips s počtami + tabuľka (číslo, zákazník, dátum, cenová úroveň, stav, suma). |
| **Detail objednávky** | Stav stepper (Nová → Prijatá → Pripravuje sa → Na ceste → Doručená), **tlačidlo „Posun stavu"** (mení stav objednávky, interaktívne), položky, súhrn, údaje zákazníka, „Vystaviť faktúru". |
| **Produkty a sklad** | Tabuľka: foto, názov, ID, kategória, sklad (červené pri nízkom), predajná cena, stav (Aktívny / Nízky sklad), „Pridať produkt". |
| **Zákazníci** | Tabuľka firiem: avatar+názov+kontakt, mesto, cenová úroveň, počet objednávok, tržby. „Pridať zákazníka". |
| **Cenníky** | Karty cenových úrovní (A/B1/B2/B3) so zľavou %, popisom, počtom zákazníkov, „Upraviť". |
| **Faktúry** | 3 súhrnné karty + tabuľka (číslo, zákazník, dátum, splatnosť, stav, suma). |

---

## 5. Interakcie a správanie

- **Navigácia** je client-side prepínanie obrazoviek cez sidebar (v reále = Next.js routy).
- **Login** (oba prototypy) je atrapa — po odoslaní pustí dnu. V reále = skutočná autentifikácia + presmerovanie podľa roly (viď `docs/ARCHITECTURE.md`).
- **Košík** (zákazník): `addToCart` nastaví qty 1, stepper inkrementuje/dekrementuje, pri 0 položku odstráni. Medzisúčet, doprava (zdarma nad 50 €, inak 4,90 €), DPH 23 %.
- **Posun stavu objednávky** (admin): tlačidlo posúva stav po `ORDER_FLOW = [nova, prijata, pripravuje, na-ceste, dorucena]`, timeline a label sa aktualizujú; pri poslednom stave sa zobrazí „Vybavená".
- **Toast** notifikácie pri akciách (pridanie do košíka, zmena stavu).
- **Stavové badge** majú farebné kódovanie (viď tokeny).
- **Animácie**: jemný `screenIn` (translateY 8px, 0.4s) pri prepnutí obrazovky; hover efekty na kartách (translateY −1 až −6px, jemný shadow); transitions 0.15–0.2s.
- **Responzivita**: prototypy sú desktop-first (sidebar 248px + obsah). Pre reálnu app doplniť mobilné správanie (sidebar → off-canvas).

---

## 6. State management (referencia z prototypu)

Zákaznícky portál: `screen`, `cart {productId: qty}`, `cartOpen`, `activeCat`, `query`, `activeOrder`, `toast`.
Admin: `screen`, `activeOrder`, `statusOverride {orderId: status}`, `orderFilter`, `toast`.

V reále nahradiť serverovými dátami (React Query / tRPC) + DB; klientsky stav len pre košík a UI.

---

## 7. Design Tokens

**Farby**
| Token | Hex | Použitie |
|---|---|---|
| Brand zelená | `#163F38` | primárna, CTA, akcenty |
| Tmavá zelená | `#102A26` / `#0F2622` | sidebar, tmavé panely |
| Zelená hover | `#1E5249` | hover na CTA |
| Mäta | `#9AD3C8` / `#8FC3B9` | akcenty na tmavom |
| Papier | `#FFFFFF` | karty |
| Krém | `#F4F6F5` | pozadie appky |
| Tile | `#F7F9F8` | pozadie foto dlaždíc |
| Text | `#16201D` / `#1A1A17` | hlavný text |
| Sekundárny text | `#6E6A62` / `#86827A` | popisky |
| Okraj | `#E7EBE9` / `#E2E7E4` / `#EDF0EF` | karty, linky |

**Stavové farby (badge fg / bg)**
| Stav | fg | bg |
|---|---|---|
| Prijatá / Doručená / OK | `#1E5249` | `#EAF1EE` |
| Nová / Pripravuje / Čaká | `#9A6B0E` | `#FBF1DC` |
| Na ceste | `#1A5B8A` | `#E2EEF7` |
| Po splatnosti / Nízky sklad / Chyba | `#A23B2A` | `#F7E4E0` |

**Typografia**
- Display/serif: **Newsreader** (400, 500) — nadpisy, ceny, čísla
- UI/sans: **Hanken Grotesk** (400/500/600/700) — všetko ostatné
- Nadpisy `letter-spacing: -0.01 až -0.02em`

**Spacing / tvary**
- Radius: karty 14–16px, malé prvky/tlačidlá 9–11px, badge/pill 20px, avatar 10px
- Sidebar šírka: 248px
- Obsah max-width: 1180–1240px
- Padding obsahu: `clamp(24px, 3vw, 40px)`
- Shadow (hover): `0 16px 34px -22px rgba(22,40,29,0.4)`

---

## 8. Assety

- **Produktové fotky**: aktuálne z `https://www.partner.humed.sk/image/cache/catalog/...`. V reále nahradiť vlastnými / CDN. Reálny katalóg dát je v koreňovom `products.json` a `products-detail.json` (~1 955 položiek).
- **Ikony**: inline SVG (štýl Lucide / Feather, stroke 1.7–2). V reále použiť `lucide-react`.
- **Logo / wordmark**: „moonid" v Newsreader. Klientské logá referencií sú v koreňovom `images/`.
- **Fonty**: Google Fonts (Newsreader, Hanken Grotesk).

---

## 9. Súbory v balíku

```
design_handoff_b2b_portal/
├── README.md                    ← tento dokument
├── prototypes/
│   ├── Moonid Portál.dc.html    ← zákaznícky portál (hifi prototyp → Next.js storefront)
│   ├── Moonid Admin.dc.html     ← administrácia (hifi prototyp → predloha pre Medusa Admin)
│   └── support.js               ← runtime pre .dc.html (len na náhľad)
├── prisma/
│   └── schema.prisma            ← referencia domény (Medusa si schému spravuje sama)
├── database/
│   └── schema.sql               ← referencia + RLS myšlienka (pre custom polia/moduly)
└── docs/
    ├── TECH_STACK.md            ← stack 2026 na Medusa.js + odôvodnenie
    ├── MEDUSA_SETUP.md          ← setup Medusa B2B + mapovanie + čo dokódovať
    ├── ARCHITECTURE.md          ← architektúra (Medusa backend + storefront + admin)
    └── COMPLIANCE_2026.md       ← checklist noriem (GDPR, EAA, e-faktúry…)
```

> Pozn.: `prisma/schema.prisma` a `database/schema.sql` boli pôvodne pre custom variant. V **Medusa prístupe si dátový model spravuje Medusa** — tieto súbory slúžia ako referencia domény a predloha pre vlastné polia/moduly (IČO/DIČ, e-faktúra, audit log). Viď `docs/MEDUSA_SETUP.md` sekcia 8.

> Ako otvoriť prototypy: otvor `.dc.html` v prehliadači (vyžaduje `support.js` vedľa). Login je atrapa — klikni „Prihlásiť" / „Vstúpiť" a prejdeš dnu.

---

## 10. Odporúčané poradie implementácie

1. **Rozbehnúť Medusa B2B Starter** (backend + Postgres + Redis), Medusa Admin — `docs/MEDUSA_SETUP.md`.
2. **Region SK + DPH 23 %**, import katalógu z `products.json`.
3. **Customer groups + price lists** (A/B1/B2/B3 = cenové úrovne), priradiť firmy.
4. **Storefront** (Next.js + Tailwind + shadcn/ui podľa prototypu) na Medusa Store API: katalóg → košík → objednávka → história → faktúry.
5. **Platba „na faktúru" + splatnosť**, **e-invoice modul** (EN 16931 / Peppol), e-maily (Resend).
6. **Admin widgety** v Medusa Admin podľa prototypu (alebo vlastný admin).
7. **Compliance & security**: prejsť `docs/COMPLIANCE_2026.md` ešte pred spustením.

Detaily v `docs/TECH_STACK.md`, `docs/MEDUSA_SETUP.md`, `docs/ARCHITECTURE.md`.
