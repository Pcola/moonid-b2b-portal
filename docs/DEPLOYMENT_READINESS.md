# Moonid portál — pripravenosť na nasadenie a testovanie

> Plán z auditu (10 agentov, 2026-06-24). Cieľ: dostať portál do stavu **uzavretý pilot** (testovanie s pár známymi firmami) na Verceli, a odtiaľ k verejnému spusteniu.

## Stav jadra (dobré)
Auth, tenant izolácia/IDOR, server-side cenotvorba, objednávkový tok end-to-end, `tsc --noEmit` čistý, DB bez driftu (9 migrácií). Citlivé polia (costPrice/discountPct/marža) sa **neúnikajú** klientovi. Žiadne secrets v git histórii.

## Progres (24. 6. 2026) — kódová časť
**Hotové (commitnuté):**
- ✅ **WS1** build/env (postinstall prisma generate, .env.example)
- ✅ **WS3** e-maily (lib/email + notifikácie objednávok + /api/dopyt)
- ✅ **WS4** právne/GDPR stránky + opravené mŕtve odkazy
- ✅ **WS5** ocenenie katalógu z feedu (1888/1888 produktov má cenu)
- ✅ **WS6** checkout (dodacia adresa, anti-duplicita, ON_REQUEST jednoklik)
- ✅ **WS8** globálne UI stavy, dynamický sitemap, favicon, login hlášky
- ✅ **WS10** „Objednať znova" 1 klikom + timeline objednávky
- ✅ **WS7** perimeter (kód): zod + max dĺžky + Origin check + honeypot na /api/dopyt aj registrácii
- ✅ **WS9** hardening (kód): CSP hlavička, audit log (ACCESS_APPROVE/REJECT), zod rozsahy na staff akciách

**Zostáva TEBE (konfigurácia/infra, nedá sa kódom):**
- Vercel env premenné (DB, Supabase, RESEND_API_KEY, RESEND_FROM, NEXT_PUBLIC_SITE_URL)
- Supabase Auth: Site URL + Redirect URLs + prvé staff konto (+ zmena seed hesla)
- Resend: overenie domény moonid.sk (SPF/DKIM)
- Reálne firmy s IČO/tier/adresou
- **WS7 infra:** Cloudflare Turnstile + WAF rate-limit (pravý rate-limit; honeypot+origin už v kóde)
- **WS9 config/rozhodnutie:** MFA (Supabase TOTP) pre staff/admin; rozhodnutie o RLS (jednovrstvové riziko pre pilot vs. DB RLS)
- **CSP** je stredne prísna (script 'unsafe-inline'); sprísnenie na nonce = follow-up s browser overením

## Legenda
`[ ]` TODO · `[x]` hotové · **(JA)** = kód (Claude) · **(TY)** = konfigurácia/rozhodnutie (Vercel/Supabase/Resend/DNS/biznis)

---

## MUST — pred akýmkoľvek nasadením

### WS1 — Vercel build + env  · effort S
- [x] **(JA)** `postinstall: prisma generate` + `build: prisma generate && next build` (`package.json`)
- [x] **(JA)** `.env.example`: doplnené `RESEND_FROM`, `NEXT_PUBLIC_SITE_URL`; odstránené stale `STAFF_USER/STAFF_PASS/SYNC_AGENT_TOKEN`; opravený región hostu
- [ ] **(TY)** Nastaviť na Verceli (Production) všetky env: `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM`, `NEXT_PUBLIC_SITE_URL`
- [ ] **(TY)** Overiť, že build/CI beží `prisma migrate deploy`

### WS2 — Supabase Auth produkčná konfigurácia + prvé staff konto · effort S
- [ ] **(TY)** Auth → URL Configuration: Site URL + Redirect URLs (`<origin>/auth/callback`, produkčná URL)
- [ ] **(TY)** Vytvoriť STAFF/ADMIN konto a **zmeniť** hardcoded heslo `Moonid2026!` (`scripts/auth/seed-auth.ts`)
- [ ] **(TY)** Custom SMTP (alebo Resend SMTP) pre Supabase Auth e-maily + SK šablóny
- [ ] **(TY)** Heslová politika (min dĺžka, leaked-password protection)

### WS3 — E-mail infraštruktúra · effort M
- [ ] **(TY)** Overiť doménu `moonid.sk` v Resend (SPF/DKIM/DMARC)
- [ ] **(JA)** `lib/email.ts` (singleton klient + from + helper)
- [ ] **(JA)** Notifikácia **staffu** o novej objednávke (`kosik/actions.ts:158`)
- [ ] **(JA)** Potvrdenie objednávky **zákazníkovi**
- [ ] **(JA)** E-mail pri zmene stavu objednávky (`staff/objednavky/actions.ts:32`)
- [ ] **(JA)** `/api/dopyt`: vrátiť chybu ak chýba `RESEND_FROM` (nie tiché `ok:true`)

### WS4 — Právne/GDPR stránky + mŕtve odkazy · effort M
- [ ] **(JA)** Stránky `/ochrana-osobnych-udajov`, `/cookies`, `/obchodne-podmienky`
- [ ] **(JA)** Prelinkovať z footera (`components/site/footer.tsx`)
- [ ] **(JA)** Opraviť `href="#"` v `contact-form.tsx:106`, `cookie-banner.tsx:27`, `registracia-form.tsx`
- [ ] **(TY)** Doplniť reálne firemné údaje (IČO, sídlo) do textov

### WS5 — Kurácia katalógu (ceny/publikovanie) · effort M · needs Pohoda kontext
- [ ] **(TY rozhodnutie)** 1470 FEED produktov bez ceny: **odpublikovať** vs **doceniť**
- [ ] **(JA)** Spustiť zvolený script (hromadná zmena `isPublished` alebo doplnenie cien)
- [ ] **(TY)** Overiť tier každej produkčnej firmy (A/B1/B2/B3)
- [ ] **(JA)** Placeholder/odpublikovanie pre 270 produktov bez obrázka

### WS6 — Checkout: dodacia adresa + 2 bugy · effort M
- [ ] **(JA)** Výber dodacej adresy (`DeliveryLocation`) + termín v košíku → do `Order`
- [ ] **(JA)** Fix: ON_REQUEST položka zasekáva checkout (`cart-view.tsx:85,88`)
- [ ] **(JA)** Fix: čítanie+mazanie cart items dovnútra `$transaction` (anti-duplicita)
- [ ] **(TY)** Pripraviť reálnu firmu s adresou na test checkoutu

---

## SHOULD — pred verejným spustením (pilot to znesie aj bez)

### WS7 — Perimetrová ochrana verejných formulárov · effort M
- [ ] **(JA/TY)** Honeypot + rate-limit na `/api/dopyt` a access-request
- [ ] **(TY)** Cloudflare Turnstile / WAF
- [ ] **(JA)** Origin check + zod + max dĺžky na `/api/dopyt`

### WS8 — Globálne UI stavy + verejný web polish · effort M
- [ ] **(JA)** `app/not-found.tsx`, `app/error.tsx`, `app/global-error.tsx` (SK, brand)
- [ ] **(JA)** Dynamický `sitemap.ts` z `prisma.product` + statické stránky
- [ ] **(JA)** Favicon/app icon + manifest
- [ ] **(JA)** Login: zobraziť `?disabled=1` / `?error=auth` hlášky
- [ ] **(JA)** Zvážiť `revalidate` namiesto `force-dynamic` pre verejný katalóg

### WS9 — Bezpečnostná vrstva pre verejné spustenie · effort M
- [ ] **(TY rozhodnutie)** RLS: akceptovať jednovrstvové riziko pre pilot, alebo pridať DB role + RLS
- [ ] **(TY)** MFA (Supabase TOTP) pre STAFF/ADMIN
- [ ] **(JA)** CSP hlavička s nonce (`next.config.ts`)
- [ ] **(JA)** Audit log: auth eventy + access-grant
- [ ] **(JA)** Zod validácia rozsahov na staff actions

---

## NICE — B2B UX dotiahnutie

### WS10 — Reorder + timeline + samoobsluha · effort L
- [ ] **(JA)** `reorderFromOrder(orderId)` + tlačidlo „Objednať znova" (web to sľubuje, neexistuje)
- [ ] **(JA)** Vykresliť `order.events` ako timeline na detaile objednávky
- [ ] **(JA)** Zjednotiť STATUS labely na `STATUS_META` (`lib/orders/transition.ts`)
- [ ] **(JA)** Samoobslužné pozvanie kolegu + staff CRM detail firmy

---

## Odporúčané poradie
WS1 → WS2 → WS3 → WS4 → WS5 → WS6 → WS8 → WS7 → WS9 → WS10
