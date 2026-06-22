# Moonid B2B portál — FINÁLNY build blueprint

> Stack: **Next.js 15 (App Router, TS) + Prisma + Supabase (Postgres/Auth-MFA/Storage/RLS) + Vercel + Resend**. Pohoda = system of record; portál = always-on tenký predajný kanál nad ňou. Existujúce Medusa artefakty (`docs/ARCHITECTURE.md`, `TECH_STACK.md`, `MEDUSA_SETUP.md`) sú zastarané a tento blueprint ich nahrádza.

---

## 1. Zhrnutie architektúry

Jedna Next.js appka s tromi route-groupami `(auth)/(portal)/(staff)` na Verceli, vlastná always-on Postgres (Supabase) ktorá **zrkadlí** Pohodu (katalóg, ceny, sklad, faktúry) a **rozširuje** ju o veci, ktoré Pohoda nemá (web auth, košík, dispenser installed-base, objednávková fronta, audit). Pohoda beží len na otcovom notebooku a **nikdy nie je vystavená na internet** — komunikuje výhradne cez **outbound agenta**, ktorý z notebooku volá HTTPS API portálu: inbound (číta `.mdb` cez ACE OLEDB → posiela dáta hore) a outbound (vyzdvihne objednávky z fronty → zapíše do Pohody cez CLI XML import → vráti čísla dokladov). Sync je opportunistická dobiehajúca fronta: keď notebook spí, portál beží z cache a objednávky čakajú — žiadna strata, len posun času faktúry (pri net-14 OK).

```
  Otcov notebook (nie always-on)            Vercel (always-on)            Klient
  ┌───────────────────────────┐            ┌──────────────────────┐
  │ Pohoda .mdb (SoR)         │            │ Next.js 15           │      ┌─────────┐
  │ + Agent (PowerShell/.NET) │            │  (auth)(portal)(staff)│◄────►│ Zákazník│
  │                           │  HTTPS     │  Prisma              │      └─────────┘
  │ INBOUND  ─ číta .mdb ─────┼──token────►│  ┌────────────────┐  │
  │ OUTBOUND ─ píše OBJ/FA ◄──┼──token─────┤  │ Supabase PG    │  │      ┌─────────┐
  │   (CLI /XML import)       │            │  │ cache+vlastné  │  │◄────►│ Majiteľ │
  └───────────────────────────┘            │  │ + sync fronta  │  │      │ (staff) │
        (volá VON, port zavretý)           │  └────────────────┘  │      └─────────┘
                                           │  Auth(MFA) Storage   │
                                           └──────────────────────┘
```

---

## 2. Dátový model (kánonický — jeden `schema.prisma`)

Konvencie: **`Product.sku`** (= `SKz.IDS`, text), **`Company.ico`** ako stabilný join kľúč, jeden dispenser model, **jedna stavová os** objednávky pre MVP. Legenda vlastníctva: **[C]** = cache z Pohody (píše len inbound sync, UI nikdy), **[P]** = vlastnené portálom, **[H]** = hybrid (vzniká v portáli, sync dopĺňa Pohoda referencie).

| Tabuľka | Vl. | Kľúčové polia | Vzťahy / pozn. |
|---|---|---|---|
| **PriceTier** | [P] | `code` (A/B1/B2/B3) UNIQUE, `name`, `discountPct` (fallback −8/−12/−18/−22 %), `pohodaCenyIds?` | `Company[]`. `discountPct` je **len fallback** kým hladiny nie sú v Pohode (viď §4). |
| **Company** | [C] | `ico` UNIQUE NOT NULL, `dic`, `icDph`, `name`, `city`, `address`, `priceTierId`, `splatDays`(=14), `pohodaCenyIds?`, `pohodaRefAd?`, `active`, `syncedAt` | join cez **ICO**, nie RefAD. `priceTier` editovateľné v admine. |
| **DeliveryLocation** | [P] | `companyId`, `label` ("Wellness"), `street/city/zip`, `isDefault` | viac prevádzok/IČO (Podhájska). Semená z Pohody. |
| **User** | [P] | `authId` UNIQUE (Supabase), `email`, `role` (CUSTOMER_USER/CUSTOMER_ADMIN/STAFF/ADMIN), `companyId?`, `mfaEnabled` | `companyId` NULL pre staff. Izolácia dát. |
| **Category** | [P] | `name`, `slug`, `sortOrder`, `icon`, `pohodaGroupCode?` | kuratované, jednoúrovňové (~8). |
| **Product** | [C+P] | `sku` UNIQUE (=IDS), `name`[C], `nameDisplay?`[P], `categoryId`[P], `brand?`[P], `systemCode?`[P], `unit`[C], `mj2Koef`[C], `vatRate`(23), `basePrice`[C] (=ProdejKc), `costPrice`[C] (=VNakup, **nikdy zákazníkovi**), `stockCache`[C] (=StavZ), `reserved`[C], `stockSyncedAt`[C], `isStocked`[P/C], `leadDays`[P], `productKind`[P] (CONSUMABLE/DISPENSER/EQUIPMENT), `isSubsidized`[P], `shelfStatus`[P] (FEATURED/CATALOG/ARCHIVED), `featuredReason?`, `curationOverride` (NONE/FORCE_FEATURED/FORCE_HIDE), `contentStatus` (STUB/DRAFT/READY) | `code`→`sku`; `active`→`shelfStatus`. |
| **ProductPrice** | [C] | `productId`, `priceTierCode`, `unitPriceNet`, `source` (POHODA/COMPUTED), `syncedAt`; UNIQUE(`productId`,`priceTierCode`) | cena za hladinu z Pohody; fallback COMPUTED z `basePrice*discountPct`. |
| **ProductMedia** | [P] | `productId`, `storagePath`, `alt`, `isPrimary` | Supabase Storage, NIE humed feed. |
| **Cart / CartItem** | [P] | `companyId`, `createdById`, `deliveryLocationId?` / `cartId`, `productId`, `qty`; UNIQUE(`cartId`,`productId`) | drží len sku→qty, ceny živo z `ProductPrice`. |
| **Order** | [H] | `number` UNIQUE (`WEB-2026-00042`), `companyId`, `createdById`, `deliveryLocationId`, `status` (jedna os, §5), `hasBackorder`, `priceTierCode`(snap), `subtotal/vat/total`(snap), `requestedDeliveryDate?`, `promisedDeliveryDate?`, `confirmedAt?`, `pohodaSync` (LOKALNA/CAKA_NA_OBJ/OBJ_VYTVORENA/CAKA_NA_FA/FA_VYTVORENA/CHYBA), `pohodaObjNumber?`, `pohodaFaNumber?`, `pohodaPushedAt?` | `pohodaSync` = oddelená technická os (zákazník nevidí). |
| **OrderItem** | [H] | `orderId`, `productId`, `skuSnapshot`, `nameSnapshot`, `unitPriceSnapshot`, `costSnapshot`, `qty`, `lineTotal`, `fulfillment` (SKLADOM/NA_OBJEDNAVKU), `expectedAt?` | per-položka back-order flag (nie split delivery v MVP). |
| **OrderStatusEvent** | [P] | `orderId`, `status`, `changedById?`, `source` (PORTAL/POHODA_SYNC), `note`, `occurredAt` | timeline. |
| **Invoice** | [C] | `pohodaNumber` UNIQUE, `companyId`, `orderId?`, `status` (PENDING/PAID/OVERDUE/CANCELLED), `issuedAt`, `dueAt`, `paidAt?`, `subtotal/vat/total`, `pdfStoragePath?`, `sourceDbYear`, `syncedAt` | čistá cache + PDF; **žiadny Peppol** (rieši Pohoda). |
| **DispenserModel** | [P] | `dispenserSku` UNIQUE, `name`, `imageUrl?`, `systemCode?` | typ dávkovača. |
| **DispenserRefill** | [P] | `dispenserModelId`, `refillSku`, `rank`, `source` (DERIVED/MANUAL/CONFIRMED), `confidence`; UNIQUE(`dispenserModelId`,`refillSku`) | join tabuľka (rank/confidence). |
| **CompanyDispenser** | [P] | `companyId`, `dispenserModelId`, `deliveryLocationId?`, `location`, `qty`, `arrangement` (RENTAL/PLACED_FREE/SOLD), `placedAt?`, `avgRefillDays?`, `lastRefillAt?`, `nextRefillDue?`, `active` | installed base + refill nudge. |
| **SyncCursor** | [P] | singleton: `skz`, `ad`, `prices`, `fa` (DatSave watermarky) | inkrementálny inbound. |
| **SyncState** | [P] | singleton: `lastInboundAt`, `lastStockSyncAt`, `lastHeartbeatAt`, `agentVersion` | staleness banner + alert. |
| **PohodaSyncJob** | [P] | `orderId`, `kind` (CREATE_OBJ/PULL_FA/CANCEL_OBJ), `payload` (jsonb), `status` (QUEUED/CLAIMED/PUSHED/FAILED), `attempts`, `claimedBy?`, `lastError?` | outbound fronta, idempotentná cez `tmpEshopObjID=order.id`. |
| **DocDedup** | [P] | UNIQUE(`docType`,`docNumber`,`docDate`) | dedup prekrývajúcich sa ročných .mdb. |
| **AuditLog** | [P] | `userId?`, `action`, `entity`, `entityId`, `meta` (jsonb), `ip` | service-role only. |

Peniaze `Decimal(12,4)` (Pohoda drží 4 desatinné), množstvá `Decimal(12,3)` (MJKoef nie sú celé).

---

## 3. Pohoda sync kontrakt

**Princíp:** Pohoda nikdy nevystavená; agent (PowerShell/.NET cez Task Scheduler, každých ~10 min + „at logon", `StartWhenAvailable`) volá VON cez HTTPS s bearer tokenom (Windows Credential Manager). Číta `.mdb` read-only cez ACE OLEDB. Všetky endpointy **idempotentné by-key**, bezpečné na ľubovoľný retry.

**INBOUND (Pohoda → portál), inkrementálne cez `DatSave`:**

| Doména | Zdroj | Kľúč | Cieľ |
|---|---|---|---|
| Produkty/sklad | `SKz` | `IDS` | Product (upsert `sku`); `StavZ`,`Rezer`,`VNakup`,`ProdejKc` |
| Zákazníci | `AD` | `ICO` | Company (upsert `ico`); `ADSplat`,`CenyIDS` |
| Ceny | `SkCS`/`SkCeny`/`ADcn` | hladina | ProductPrice (ak `CenyIDS` vyplnené) |
| Faktúry | `FA` (RelTpFak=1) | `Cislo`+`Datum` | Invoice; link `FA.CisloObj ⇄ OBJ.Cislo` |

Tok: agent `GET /api/sync/pull/cursor` → SELECT WHERE `DatSave>cursor` → `POST /api/sync/inbound/{products|customers|prices|invoices}` (batch po 500, `batchId` dedup).

**OUTBOUND (portál → Pohoda):** objednávka sa zapisuje do fronty **až pri potvrdení** (`POTVRDENA` — nezaplniť Pohodu odmietnutými). Agent: `GET /api/sync/outbound/queue` (QUEUED + stale CLAIMED >15 min) → vygeneruje Pohoda dataPack XML (prijatá objednávka) → **`Pohoda.exe /XML import.xml response.xml`** (nikdy priamy INSERT do .mdb — rozbil by COUNTER/RefAg) → parsuje pridelené `Cislo` → `POST /api/sync/outbound/ack`. Späť ťahá `OBJ.Cislo`, neskôr `FA` (číslo/splatnosť/total/PDF).

**Kľúče a dedup:**
- Produkt: `SKz.IDS ⇄ Product.sku ⇄ FApol.Kod ⇄ OBJpol.Kod` (~98,6 % match; unmatched → `contentStatus` flag pre admin).
- Zákazník: `AD.ICO` (RefAD nestabilné). Duplicitné IČO → vyber najnovší `DatSave`. Adresy bez IČO sa neimportujú ako B2B firma.
- Idempotencia objednávky: `OBJ.tmpEshopObjID = Order.id` → pred importom check existencie = žiadny duplikát.
- Doklady: dedup `(Cislo, Datum)`, overlap okno „aktuálny + 1 predch. rok".

**Offline-resilient:** lifecycle os beží nezávisle od sync osi. Notebook off → objednávka `PRIJATA`/`pohodaSync=LOKALNA`, e-mail odíde hneď (Resend). Notebook on → fronta flushne. **Heartbeat alert:** ak `lastHeartbeatAt` chýba > N h → e-mail majiteľovi.

---

## 4. Katalóg + kurácia + ceny + dostupnosť + dispenser mapping

**Kurácia — 3-vrstvový `shelfStatus`:**
- `FEATURED` (~292) = posledný predaj ≥2025 AND (top-95 % obratu OR ≥10 zákazníkov lifetime OR držaný sklad) → grid, filtre, rýchle doobjednanie.
- `CATALOG` (~132) = aktívny, ale pod prahom → len cez vyhľadávanie.
- `ARCHIVED` (~965) = posledný predaj ≤2024 → len cez kód, bez ceny v gride.
Prepočítava nočný cron; `curationOverride` má prednosť (manuálny zámok majiteľa).

**Kategórie** [P], jednoúrovňové (~8): hygienický-papier, mydlá-peny, dezinfekcia, čistiace-prostriedky, dávkovače-zásobníky, upratovanie, vrecia-obaly, príslušenstvo. **Značka („Tork") = filter `brand`, NIE kategória.** Pozor: „mydlo DO dávkovačov" je REFILL, nie DISPENSER.

**Cenové úrovne A/B1/B2/B3 — hybrid s prednosťou Pohody:**
1. Ak existuje `ProductPrice(source=POHODA)` pre hladinu zákazníka → použiť.
2. Inak → `basePrice * (1 − discountPct/100)`, `source=COMPUTED` (fallback).
3. Ak `unitPrice=0` alebo `isSubsidized=true` (dotovaný/prenajatý dávkovač) → **„Cena na vyžiadanie"**, NIKDY nezobraziť 0 €.
> **POZOR (blokujúce):** cenové hladiny dnes v Pohode pravdepodobne fyzicky neexistujú (`AD.CenyIDS` NULL, `ADcn` prázdne). Rozhodnutie pre majiteľa pred kódením cien. Kým hladiny nie sú v Pohode, pre TOP zákazníkov (Podhájska = 30,6 % obratu) radšej „cena na vyžiadanie" než COMPUTED odhad — chráni pred sporom s kľúčovým klientom.

Zákazník vidí len svoju hladinu (RLS + app-scope), ceny bez DPH, DPH 23 % v košíku. `OrderItem.unitPriceSnapshot` = cena v čase objednávky.

**Dostupnosť** (nikdy presný počet kusov): `isStocked && stockCache>0` → „Skladom"; `isStocked && ≤0` → „Dočasne vypredané — dodanie do `leadDays` dní"; `!isStocked` → „Na objednávku — dodanie do `leadDays` dní". Ak `stockSyncedAt` starší než 48 h → degraduj na neutrálne „na objednávku". Sklad nikdy neblokuje objednávku.

**Dispenser↔náplň mapping** (`DispenserRefill`, 3 zdroje): (1) systémový kód z názvu (Tork N4/H2/S4/T3), (2) co-purchase z 10r histórie `FApol` (support ≥0,4 + kategóriový filter), (3) manuálne potvrdenie. Installed base (`CompanyDispenser`) seed z histórie predaja dávkovačov cez ICO → funguje od dňa 1.

---

## 5. Order lifecycle (confirm-based / back-order) + mapovanie na Pohodu

**Jedna stavová os pre MVP** (back-order = per-položkový flag + banner, nie samostatné zásielky):

```
PRIJATA ──confirm(majiteľ)──► POTVRDENA ──► PRIPRAVUJE ──► NA_CESTE ──► DORUCENA
   │                              │                                        (terminál)
   └──storno(zákazník)──► STORNO ◄┴──storno(majiteľ kedykoľvek)
```
- `PRIJATA` = nezáväzná požiadavka (default po odoslaní košíka). Jediný stav, z ktorého **zákazník** môže stornovať.
- `POTVRDENA` = confirm gate (`confirmedAt`); majiteľ vidí návrh skladom/na-objednávku per položka a môže prepísať; **tu vzniká `PohodaSyncJob(CREATE_OBJ)`** + potvrdzovací e-mail s termínom.
- `hasBackorder` → žltý banner „časť doobjednávame, doručíme ~DD.MM." Default: čakať na kompletné a poslať naraz (vlastný rozvoz = 1 výjazd).
- Spätné prechody len ADMIN, do `OrderStatusEvent`.

**Mapovanie na Pohodu:** `POTVRDENA` → OBJ (prijatá objednávka) cez frontu; `NA_CESTE/DORUCENA` → majiteľ vystaví FA v Pohode → **FA = source of truth pre sumy**, portál ju stiahne späť. Notifikácie (Resend): PRIJATA / POTVRDENA(+termín) / NA_CESTE / DORUCENA / FA_VYTVORENA / STORNO + refill nudge.

---

## 6. Feature „Moje dávkovače → náplne na 1 klik"

Hlavná páka proti 44 % churnu. Obrazovka `/moje-davkovace` + dashboard widget.
- **Dáta:** `CompanyDispenser` → `DispenserModel` → `DispenserRefill` (`rank=0` = primárna).
- **Naplnenie bez ručnej práce:** installed base seedovaná z 10r histórie; kompatibilita z system-code + co-purchase + manuál (§4).
- **UX:** každý dávkovač = karta (obrázok, lokácia, počet) + „Doobjednať náplň" (pridá primárnu náplň v obvyklom množstve). Hore „Doobjednať všetko" → naplní košík náplňami celej installed base.
- **Refill nudge (fáza 4):** `avgRefillDays` z reálnej kadencie → `nextRefillDue`; ak ≤ dnes+5 dní → Resend e-mail s deep-linkom. Pri `DORUCENA` s refill SKU sa kadencia prepočíta → recurring slučka bez ručnej práce.

---

## 7. Fázovaný roadmap

**Začína sa DÁTOVÝM ZÁKLADOM A SYNCOM, nie portál UI.** Portál je tenký kanál nad Pohodou — bez dôveryhodných dát je UI prázdny obal a killer feature nemá z čoho žiť. Prototyp UI už existuje (dizajn nie je na kritickej ceste). Killer feature je 100 % závislá na historickom backfille → dáta prvé.

- **Fáza 0 — Rozhodnutia + kánon (blokuje všetko).** Stretnutie s otcom (§9). Napísať kánonický `schema.prisma`. Rozhodnúť RLS stratégiu. Archivovať Medusa artefakty. Pridať Resend, potvrdiť edíciu Pohody.
- **Fáza 1 — Dáta + INBOUND sync (jadro hodnoty).** Supabase schéma + RLS. INBOUND agent (read-only): SKz/AD/ceny/sklad/faktúry inkrementálne. **Historický backfill 10r FApol** (dedup) — nutný pre installed base + co-purchase. Heartbeat monitoring.
- **Fáza 2 — Katalóg + kurácia + čítací portál.** Kuračný job (shelfStatus), kategorizácia, `isStocked`, dispenser kompatibilita. Portál UI read-only: login, dashboard, katalóg, dostupnosť, faktúry+PDF. Onboarding zákazníkov (pozvánky, párovanie cez IČO).
- **Fáza 3 — Objednávky + OUTBOUND (write cesta).** Košík → objednávka. `PohodaSyncJob` fronta. OUTBOUND agent: queue → OBJ cez CLI XML import (najrizikovejšie — preto až po overenom INBOUND). Notifikácie.
- **Fáza 4 — Killer feature + dolaďovanie.** „Moje dávkovače → náplne" + refill nudge. WCAG kontrasty, audit log, security headers.

**MVP = Fázy 0–3.** „Moje dávkovače" = Fáza 4 (dáta preň sa zbierajú už od Fázy 1).

---

## 8. Konkrétny prvý krok kódenia

**Napísať jeden kánonický `prisma/schema.prisma` podľa §2 — pred akýmkoľvek UI alebo agentom.** V poradí:
1. **Scaffold + upratať.** `npx create-next-app@latest` (TS, App Router, Tailwind); `npm i prisma @prisma/client @supabase/supabase-js`; presunúť Medusa docs do `docs/_archive/`.
2. **Prepísať `prisma/schema.prisma`** presne podľa §2 (jeden `sku`, jeden dispenser model, jedna stavová os; bez Peppol, bez `DRAFT` invoice, `discountPct` len fallback).
3. **`npx prisma migrate dev --name init`** proti čistej Supabase DB.
4. **Seed `PriceTier`** (A/B1/B2/B3) + `Category` (~8) — jediné čisto kuratované tabuľky bez syncu.

---

## 9. Otvorené otázky na majiteľa (podľa blokovania)

1. **(blokuje ceny + riziko sporu) Cenové hladiny:** Pohoda dnes nedrží per-zákazníkovú cenu. Nakonfigurovať A/B1/B2/B3 v Pohode (portál ich číta), alebo portál drží tiery sám nad `ProdejKc`? Ktoré IDS hladiny zodpovedajú A/B1/B2/B3? Sú −8/−12/−18/−22 % reálne?
2. **(blokuje OUTBOUND) Edícia Pohody** (Standard/Profi/E1)? Určuje CLI `/XML` import a PDF export. Standard → fallback watched-folder import.
3. **(blokuje dostupnosť) `isStocked` zdroj:** príznak v `SKz`, alebo kuratorsky/heuristicky (StavZ>0 opakovane = držaný)?
4. **(blokuje faktúry UI) PDF faktúr:** vie agent exportovať PDF z Pohody a uploadnúť, alebo len dáta + „PDF na vyžiadanie"?
5. **Dotované/0 € dávkovače:** zoznam alebo pravidlo na `isSubsidized`.
6. **Dispenser kompatibilita:** koľko typov dávkovačov (~10)? Kto pripraví/potvrdí mapovanie?
7. **Splatnosť:** net-14 univerzálne, alebo TOP zákazníci iné?
8. **Onboarding:** kto pošle pozvánky ~50–65 firmám; párovanie firma↔prvý user cez IČO; B2C okraj.
9. **Doprava + objednávka:** doprava zdarma nad 50 €? minimum objednávky? dátum rozvozu/poznámka? storno po `POTVRDENA` len cez majiteľa?
10. **OBJ vs FA pri pushi:** OBJ (prijatá objednávka) na potvrdenie, faktúru vystavuje majiteľ ručne (návrh áno).
