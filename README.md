# Moonid B2B Portál

B2B veľkoobchodný portál pre **Moonid s.r.o.** — dodávateľa hygieny, čistenia a vybavenia pre prevádzky (hotely, gastro, wellness, kancelárie, inštitúcie). Dve rozhrania nad jednou databázou:

- **Zákaznícky portál** (`/dashboard`, `/katalog`, `/kosik`, `/objednavky`, `/faktury`…) — firmy vidia svoje dohodnuté ceny, objednávajú, opakujú objednávky, sledujú stavy a faktúry, schvaľujú objednávky členov.
- **Administrácia / back-office** (`/staff/*`) — správa objednávok, katalógu, cenníkov, zákazníkov, dopytov a auditu; KPI dashboard.

## Stack

- **Next.js 15** (App Router, RSC, server actions), React 19, TypeScript
- **Prisma** + **Supabase Postgres** (EÚ — Frankfurt); pripojenie ako owner rola, **tenant izolácia je app-layer** (dôsledný `companyId` scoping), RLS default-deny ako defense-in-depth
- **Supabase Auth** (heslo + **TOTP MFA** vynútené pre staff/admin, AAL2)
- **Tailwind v4** (dizajnový systém „Clean Slate" — tokeny v `app/globals.css`, source of truth `design-system/MASTER.md`)
- **Sentry** (observabilita), **Resend** (transakčné e-maily, best-effort), **Vercel** (hosting, `fra1`)
- **Pohoda** (Stormware) = system-of-record pre fakturáciu — **vlastná fakturácia sa nestavia**; portál je pred-vrstva (objednávky, katalóg, ceny)

> Pozn.: staršie `docs/TECH_STACK.md` / `docs/MEDUSA_SETUP.md` popisujú **zamietnutý** Medusa.js prístup — neplatia. Rozhodnutie: neprechádzať na Medusu (žiadny Pohoda konektor, Redis+breaking changes).

## Štruktúra

```
app/
  (portal)/        zákaznícky portál (za prihlásením)
  (auth)/          login, registrácia, nastavenie hesla
  staff/           back-office (requireStaff / requireAdmin)
  api/             dopyt, img proxy, staff export…
  <verejné>/       homepage, /produkty, /o-nas, /kontakt, právne stránky
components/        site (verejné) + portal + staff shell-y
lib/               auth, prisma, pricing, money, orders/transition, audit, email…
prisma/            schema.prisma + migrations (zdroj pravdy pre DB)
database/          out-of-band SQL (audit append-only trigger, Pohoda RPC/GRANTy)
tests/             vitest integračné testy proti efemérnej DB + Playwright e2e
docs/              audity, gap-scan (docs/ENTERPRISE_GAPS_2026-07.md = aktuálny backlog)
```

## Vývoj

```bash
npm install
cp .env.example .env.local          # doplniť DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_*, SUPABASE_SERVICE_ROLE_KEY…
npx prisma migrate deploy           # aplikuj schému
npm run dev                         # http://localhost:3000
```

Skripty: `npm run test` (vitest), `npm run e2e` (Playwright), `npm run lint`, `npm run typecheck`, `npm run db:studio`.
Pred pushom do `main` beží git hook: `tsc --noEmit` + ESLint + vitest.

## Bezpečnosť & compliance

- Auth/authz: každá server action a API route si overuje rolu (`requireUser`/`requireStaff`/`requireAdmin`); staff s vynúteným MFA.
- Prísna CSP, HSTS, rate limiting (Postgres), append-only audit log, SSRF hardening pri re-hoste obrázkov.
- CI: `.github/workflows/` — build + tsc + lint + vitest + `npm audit`; gitleaks + semgrep (SAST); Dependabot.
- Právne stránky (VOP/GDPR/cookies) sú v **B2B režime** (Obchodný zákonník, nie spotrebiteľské právo) — viď `docs/PRAVNE_STRANKY_GAP_2026-07.md`.

## Nasadenie

Konfiguračné kroky (Vercel env, Supabase Auth URL/MFA/heslová politika, Resend doména) sú v `docs/DEPLOYMENT_READINESS.md`. Aktuálny backlog (P0/P1/P2/P3) v `docs/ENTERPRISE_GAPS_2026-07.md`.
