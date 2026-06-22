# Architektúra — Moonid B2B Portál (Medusa.js)

## Princíp: hotový backend + vlastný frontend

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  Zákaznícky portál           │        │  Administrácia               │
│  Next.js storefront          │        │  Medusa Admin (vstavaný)     │
│  = PROTOTYP (prémiový dizajn)│        │  + widgety / custom admin    │
└──────────────┬──────────────┘        └───────────────┬──────────────┘
               │  Store API (JS SDK)                    │  Admin API
               ▼                                        ▼
        ┌────────────────────────────────────────────────────┐
        │              MEDUSA.js v2 (backend)                 │
        │  Product · Pricing · Cart · Order · Inventory ·     │
        │  Customer · Company (B2B) · Approval · Tax · Payment│
        │  + VLASTNÝ modul: e-faktúra (EN 16931 / Peppol)     │
        └───────────────┬──────────────────┬─────────────────┘
                        │                  │
                  PostgreSQL            Redis (eventy, fronty)
                        │
          Stripe · Peppol provider · S3 storage · Resend
```

## Dve rozhrania

- **Zákaznícky portál** — `portal.moonid.sk`, **Next.js storefront** s prémiovým dizajnom (prototyp). Komunikuje s Medusou cez **Store API** (JS SDK).
- **Administrácia** — `admin.moonid.sk`, **Medusa Admin** (vstavaný React panel) rozšírený o widgety; voliteľne vlastný Next.js admin proti **Admin API**. Admin prototyp = dizajnová predloha.

Obe nad **jedným Medusa backendom a jednou databázou**.

## Prihlásenie a roly

Medusa rozlišuje dva typy identít:
- **Customer** (zákazník) → prihlásenie do storefrontu (Medusa Auth module). V B2B starteri je zákazník naviazaný na **Company** a môže mať rolu v rámci firmy (admin firmy / člen).
- **User** (admin/staff) → prihlásenie do Medusa Admin.

```
Zákazník  → portal.moonid.sk → Medusa Store API  (customer + company)
Staff/Admin → admin.moonid.sk → Medusa Admin API (user)
```

Izolácia dát (zákazník vidí len svoju firmu) je **zabudovaná v Medusa Store API** — nevracia dáta cudzích zákazníkov. Custom routy musia rovnaký princíp dodržať (overiť `customer_id` / `company_id`).

## Mapovanie domény na Medusa moduly

| Pojem v prototype | Medusa |
|---|---|
| Produkt, kategória, balenie | **Product module** (+ varianty, options) |
| Sklad / stav skladu | **Inventory & Stock Location** |
| Cena MOC | Product/Variant price |
| Cenová úroveň B2/−18 % | **Customer Group + Price List** (Pricing module) |
| Firma (zákazník) | **Company** (B2B starter) + custom polia IČO/DIČ/IČ DPH |
| Viac používateľov firmy | **Company employees** (B2B starter) |
| Košík | **Cart module** |
| Objednávka + stavy | **Order + Fulfillment** (statusy) |
| Schvaľovanie objednávky | **Approval** (B2B starter) |
| Faktúra / splatnosť | **Payment** (manual/invoice) + **vlastný e-invoice modul** |
| DPH 23 % | **Tax module** (SK region) |

## Tok objednávky

```
Zákazník (storefront) → košík → objednávka
   │
   ▼  (voliteľne) schvaľovanie nadriadeným vo firme — Approval modul
   ▼
Medusa Order (status: pending → ...)
   │  Fulfillment: not_fulfilled → fulfilled → shipped → delivered
   ▼
subscriber `order.placed`:
   ├─ vygeneruj fakturu (vlastný e-invoice modul → EN 16931 / Peppol)
   ├─ pošli e-mail (Resend) potvrdenie + faktúru
   └─ zapíš do audit logu
```

Staff posúva stavy v **Medusa Admin** (fulfillment + payment status). Admin prototyp ukazuje zamýšľaný UX tohto workflowu (stepper „Posun stavu").

## Čo treba dokódovať (vlastné)

1. **Storefront** — celý zákaznícky portál podľa prototypu (Next.js + Tailwind + shadcn/ui), napojený na Store API.
2. **E-invoice modul** — generovanie štruktúrovanej e-faktúry EN 16931 a odoslanie cez Peppol; PDF do storage.
3. **SK polia firmy** — rozšírenie Company o IČO, DIČ, IČ DPH (Medusa custom fields / linked module).
4. **Platba „na faktúru"** — manual payment provider + splatnosť (14 dní) + sledovanie úhrad.
5. **Admin widgety** — doplnkové pohľady do Medusa Admin (napr. prehľad tržieb ako v prototype), príp. vlastný admin.
6. **Import katalógu** — naplniť produkty z `products.json` / `products-detail.json`.

## Prostredia

- **Dev**: Docker Compose (Medusa + Postgres + Redis) + Next.js lokálne.
- **Staging / Production**: backend na Railway/Render/AWS (Postgres + Redis), storefront na Vercel. Zálohy DB, monitoring, secrets v env.

## Bezpečnosť (viď COMPLIANCE_2026.md)

- Medusa rieši auth, izoláciu zákazníkov a prístup k Admin API cez API kľúče/role.
- Doplniť: **MFA pre adminov**, TLS 1.3, security headers, rate limiting, **audit log**, zálohy.
- Custom routy vždy overujú vlastníctvo (`customer_id`/`company_id`) — nespoliehať sa len na UI.
