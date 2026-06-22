# Technologický stack — Moonid B2B Portál (2026, Medusa.js)

Prístup: **hotový open-source commerce engine (Medusa.js) + vlastný prémiový frontend.** Backend (objednávky, produkty, sklad, zákazníci, B2B cenové skupiny, košík, platby) je z veľkej časti hotový — staviaš najmä **vzhľad** (prototyp) a **slovenské špecifiká** (e-faktúra, DPH).

## Prehľad

| Vrstva | Voľba | Poznámka |
|---|---|---|
| **Commerce backend** | **Medusa.js v2** (Node/TypeScript) | objednávky, produkty, sklad, zákazníci, ceny, košík, platby — out-of-the-box |
| **B2B vrstva** | **Medusa B2B Commerce Starter** | firmy, viac používateľov na firmu, schvaľovanie, price lists |
| **Databáza** | **PostgreSQL** | Medusa si spravuje vlastnú schému + migrácie |
| **Cache / events** | **Redis** | fronty, eventy, cache (odporúčané pre produkciu) |
| **Admin** | **Medusa Admin** (vstavaný React panel) | produkty, objednávky, zákazníci, price lists — hotové; doplniteľné widgetmi |
| **Zákaznícky frontend** | **Next.js 15 + TypeScript** (Medusa Next.js Starter) | sem ide **prémiový dizajn z prototypu** |
| **UI** | **Tailwind CSS + shadcn/ui + Framer Motion** | prenos dizajnu 1:1 |
| **Ikony** | **lucide-react** | zhoda so štýlom prototypu |
| **Auth (zákazník)** | **Medusa Auth module** | prihlásenie, customer accounts; MFA cez provider |
| **Platby** | **Stripe** (Medusa plugin) + **manual/invoice** provider | karty + objednávka na faktúru so splatnosťou |
| **E-fakturácia** | **vlastný modul** → EN 16931 / Peppol (Storecove/Ecosio) | slovenské/EÚ špecifikum, nie je v Meduse |
| **DPH** | **Medusa Tax module** (SK region, 23 %) | konfigurácia daní |
| **Súbory** | **Medusa File module** → S3 / Supabase Storage | PDF faktúry, fotky |
| **E-maily** | **Medusa Notification module** → Resend | potvrdenia, faktúry |
| **Hosting (backend)** | **Railway / Render / AWS** | Medusa je dlhobežiaci Node server (nie serverless) |
| **Hosting (frontend)** | **Vercel** | Next.js storefront |
| **Monitoring** | **Sentry** | chyby, výkon |
| **Testy / CI** | **Vitest + Playwright + GitHub Actions** | |

## Prečo Medusa.js

- **B2B funkcie hotové**: oficiálny **B2B Commerce Starter** prináša *firmy (companies)*, *zamestnancov firmy* (viac používateľov pod jedným účtom), *spending limits*, *schvaľovanie objednávok* a *price lists* (cenníky) — presne to, čo B2B portál potrebuje.
- **Cenové úrovne = Customer Groups + Price Lists**: tvoje úrovne A/B1/B2/B3 (−8/−12/−18/−22 %) sa namapujú na zákaznícke skupiny s vlastnými cenníkmi. Žiadne vlastné kódenie cien.
- **Admin zadarmo**: Medusa Admin pokryje správu produktov, objednávok, skladu, zákazníkov a cenníkov. Admin prototyp slúži ako predloha pre rozšírenia / prípadný custom admin.
- **Open-source, bez vendor lock-in**: žiadne mesačné SaaS poplatky, plná kontrola, vlastný hosting.
- **Modulárne a rozšíriteľné**: slovenské špecifiká (e-faktúra, IČO/DIČ) doplníš ako vlastné moduly/polia bez zásahu do jadra.

## Čo je hotové vs. čo staviaš

| Oblasť | Medusa (hotové) | Staviaš ty |
|---|---|---|
| Produkty, kategórie, sklad | ✅ | import katalógu |
| Košík, objednávky, stavy | ✅ | — |
| Zákazníci, firmy, viac userov | ✅ (B2B starter) | — |
| Cenové úrovne (price lists) | ✅ | konfigurácia A/B1/B2/B3 |
| Platby (Stripe, faktúra) | ✅ plugin | „na faktúru" + splatnosť |
| Admin panel | ✅ | prípadné widgety / custom admin |
| DPH 23 % | ✅ Tax module | SK region setup |
| **Prémiový frontend (prototyp)** | — | ✅ celý zákaznícky storefront |
| **SK e-faktúra (Peppol/EN 16931)** | — | ✅ vlastný modul |
| Polia IČO / DIČ / IČ DPH | — | ✅ rozšírenie Company |

## Cenové úrovne (free → rast)

- **Vývoj**: lokálne (Medusa + Postgres + Redis cez Docker) — zdarma.
- **Produkcia**: Railway/Render (backend + Postgres + Redis ~15–40 €/mes.) + Vercel (frontend, free→Pro) + Stripe (% z transakcií) + Peppol provider.
- **Enterprise**: AWS (ECS/Fargate + RDS + ElastiCache + S3) — pri vyšších nárokoch.

> Pozn.: Medusa backend je **dlhobežiaci Node server**, preto **nie Vercel** pre backend — patrí na Railway/Render/AWS. Na Vercel ide len Next.js storefront.

## Architektúra projektu (monorepo)

```
moonid-portal/
├── backend/                  # Medusa.js v2 (B2B starter)
│   ├── src/
│   │   ├── modules/
│   │   │   ├── company/      # firmy + IČO/DIČ (B2B starter + SK polia)
│   │   │   ├── approval/     # schvaľovanie objednávok (B2B)
│   │   │   └── e-invoice/    # VLASTNÝ: EN 16931 / Peppol
│   │   ├── api/              # custom admin/store routy
│   │   ├── subscribers/      # napr. order.placed → e-faktúra, e-mail
│   │   ├── workflows/        # vlastné workflow (fakturácia)
│   │   └── admin/            # widgety do Medusa Admin
│   └── medusa-config.ts      # moduly, pluginy, region SK, DPH
│
└── storefront/               # Next.js 15 (zákaznícky portál = PROTOTYP)
    ├── app/
    │   ├── (auth)/login/
    │   ├── (portal)/dashboard/
    │   ├── (portal)/katalog/
    │   ├── (portal)/objednavky/[id]/
    │   └── (portal)/faktury/
    ├── components/           # Sidebar, KpiCard, ProductCard, CartDrawer, OrderTimeline...
    └── lib/medusa.ts         # Medusa JS SDK klient
```

> Admin (tvoj „pohľad majiteľa") = **Medusa Admin** (rozšírený widgetmi) alebo voliteľne vlastný Next.js admin proti Medusa API. Admin prototyp slúži ako dizajnová predloha pre oba prípady.
