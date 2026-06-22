# Medusa.js — setup a mapovanie pre Moonid B2B Portál

Praktický návod, ako postaviť portál na **Medusa.js v2** s **B2B Commerce Starterom**, čo je hotové a čo dokódovať.

---

## 1. Štart projektu

```bash
# Backend — Medusa B2B Commerce Starter (firmy, zamestnanci, schvaľovanie, price lists)
npx create-medusa-app@latest moonid-backend
# alebo klon oficiálneho B2B startera:
# github.com/medusajs/b2b-starter-medusa

# Storefront — Next.js (sem ide dizajn z prototypu)
# B2B starter obsahuje aj storefront; nahradíš jeho UI prémiovým dizajnom prototypu
```

Požiadavky: Node 20+, PostgreSQL, Redis (produkcia). Lokálne ideálne cez Docker Compose.

---

## 2. B2B Commerce Starter — čo prináša hotové

Oficiálny **medusajs/b2b-starter-medusa** obsahuje:

- **Companies** — firmy ako zákazníci (s adresou, údajmi).
- **Company employees** — viac používateľov pod jednou firmou + role v rámci firmy.
- **Spending limits** — limity nákupu na zamestnanca.
- **Approvals** — schvaľovanie objednávky nadriadeným pred odoslaním.
- **Price lists per company / customer group** — firemné/skupinové ceny.
- **Quote management** — cenové ponuky (request for quote) — hodí sa pre B2B.
- Bulk-add do košíka, storefront s firemným kontextom.

➡️ Veľká časť toho, čo prototyp ukazuje (firma, viac userov, cenové úrovne), je tu **hotová**.

---

## 3. Mapovanie cenových úrovní (A / B1 / B2 / B3)

Tvoje úrovne = **Customer Groups + Price Lists**:

| Úroveň | Zľava | Medusa |
|---|---|---|
| A — Štandard | −8 % | Customer Group „A" + Price List −8 % |
| B1 — Partner | −12 % | Customer Group „B1" + Price List −12 % |
| B2 — Hotel | −18 % | Customer Group „B2" + Price List −18 % |
| B3 — Gastro VIP | −22 % | Customer Group „B3" + Price List −22 % |

Postup:
1. V Admin → **Customer Groups** vytvor A/B1/B2/B3.
2. Pre každú skupinu **Price List** (typ „sale" / override) s príslušnou cenou alebo % zľavou z MOC.
3. Firmu priraď do skupiny → jej používatelia vidia automaticky svoje ceny.

> Ceny na objednávke Medusa ukladá ako snapshot — neskoršia zmena cenníka spätne nemení staré objednávky (presne ako v prototype).

---

## 4. Slovenské / EÚ špecifiká — čo dokódovať

Medusa to **nemá** out-of-the-box, treba vlastné moduly:

### a) Polia firmy IČO / DIČ / IČ DPH
- Rozšír **Company** o `ico`, `dic`, `ic_dph` (Medusa custom fields / linked module).
- Zobraziť na faktúre a v admin detaile zákazníka.

### b) DPH 23 %
- **Tax module**: vytvor **Region „Slovensko"**, mena EUR, sadzba DPH 23 %.
- Tax-inclusive/exclusive podľa potreby (B2B zvyčajne ceny bez DPH + DPH zvlášť).

### c) Platba „na faktúru" so splatnosťou
- **Manual payment provider** (Medusa) ako „faktúra 14 dní" — bez platby vopred.
- Sledovanie úhrady: payment status `awaiting` → `captured`, due date.

### d) E-faktúra (EN 16931 / Peppol) — vlastný modul
- `src/modules/e-invoice/` — služba, ktorá z objednávky/faktúry vygeneruje **UBL/CII XML** podľa **EN 16931**.
- Odoslanie cez **Peppol access point** (Storecove / Ecosio API).
- Trigger: **subscriber** na `order.placed` alebo `order.completed`.
- PDF verzia do **File module** (S3/Supabase Storage).

### e) Číslovanie faktúr
- Neprerušený rad (napr. `2026XXX`) — vlastná logika/sekvencia v module.

---

## 5. Storefront = prototyp

Zákaznícky portál (`prototypes/Moonid Portál.dc.html`) postaviť ako **Next.js storefront** napojený na **Medusa Store API** cez JS SDK:

| Obrazovka prototypu | Medusa API |
|---|---|
| Katalóg | `store.product.list()` (+ ceny pre skupinu zákazníka) |
| Košík + stepper | `store.cart.*` (create, lineItems add/update) |
| Objednávka „na faktúru" | `store.cart.complete()` + manual payment |
| Objednávky / detail / timeline | `store.order.list()` / `retrieve()` (status, fulfillment) |
| Faktúry | vlastný endpoint (e-invoice modul) + PDF link |
| Dashboard | kombinácia order list + custom súhrny |

Dizajn (Tailwind + shadcn/ui) a tokeny → viď `README.md` sekcia 7.

---

## 6. Admin = Medusa Admin

„Pohľad majiteľa" (`prototypes/Moonid Admin.dc.html`) má dve cesty:

- **A) Medusa Admin (odporúčané na štart):** vstavaný panel už vie produkty, objednávky, sklad, zákazníkov, price lists. Doplň **admin widgety** (napr. prehľad tržieb, „objednávky na spracovanie") podľa prototypu. Najrýchlejšie.
- **B) Vlastný admin:** Next.js admin proti **Admin API**, plný dizajn podľa prototypu. Viac práce, plná kontrola vzhľadu.

Workflow stavov objednávky (prototyp: „Posun stavu") = Medusa **fulfillment + payment status** prechody.

---

## 7. Odporúčané poradie

1. Rozbehnúť **B2B starter** (backend + Postgres + Redis), Medusa Admin.
2. **Region SK + DPH 23 %**, import katalógu z `products.json`.
3. **Customer groups + price lists** (A/B1/B2/B3), priradiť firmy.
4. **Storefront**: dizajn z prototypu na Store API (katalóg → košík → objednávka → história).
5. **Platba na faktúru** + **e-invoice modul** (Peppol) + e-maily (Resend).
6. **Admin widgety** podľa prototypu (alebo vlastný admin).
7. **Compliance & security** — prejsť `COMPLIANCE_2026.md` pred spustením.

---

## 8. Pozn. k pôvodnej schéme

`prisma/schema.prisma` a `database/schema.sql` boli pôvodne pre custom (Next.js + Prisma) variant. **V Medusa prístupe si dátový model spravuje Medusa sama** (vlastné tabuľky + migrácie). Tie súbory ponechaj len ako:
- **referenciu domény** (aké entity a vzťahy portál potrebuje), a
- predlohu pre **vlastné polia/moduly** (IČO/DIČ, e-faktúra, audit log), ktoré Medusa nepokrýva.

Needuplikuj nimi Medusa jadro — rozširuj Medusa moduly.
