# Bezpečnostná triáž — pilot → verejné spustenie (živý tracker)

> Odvodené z `MOONID_BEZPECNOST_TRIAZ.md` (v1.0). Toto je živý stav: čo je **hotové kódom**, čo **zostáva kódom**, čo je **tvoja config/rozhodnutie** (sekcia 9 originálu).
> Realita: 1–2 operátori, mikro distribútor, Pohoda = SoR. „Enterprise-ready" = tvrdé jadro, nie certifikačné divadlo.

## P0 — brána k PILOTU
| # | Položka | Typ | Stav |
|---|---------|-----|------|
| P0-1 | Login rate-limit + lockout + CAPTCHA | config | **TY** (Supabase rate-limit + Cloudflare Turnstile) |
| P0-2 | Seed guard | kód | ✅ hotové |
| P0-3 | Session invalidácia + min heslo 12 | kód | ✅ hotové |
| P0-4 | Faktúra PDF auth-gated proxy | kód | ⏳ gate pri Fáze 2 PDF (faktúry sú zatiaľ data-only, bez PDF) |
| P0-5 | Prod env oddelené | config | **TY** (Vercel prod env) |
| P0-6 | TLS/HSTS/headers (≥A) | kód | ✅ hotové (CSP unsafe-inline OK pre pilot) |
| P0-7 | Prvé staff konto + zmena seed hesla | config | **TY** (Supabase) |
| **Tvrdá podmienka** | **Tenant-izolačné CI testy** (A→B = 403/404) | kód | ⏳ **ďalší krok** |

## P1 — brána k VEREJNÉMU spusteniu
| # | Položka | Typ | Stav |
|---|---------|-----|------|
| P1-1 | MFA TOTP vynútené pre STAFF/ADMIN (AAL2) | config+kód | ⏳ kód (enforcement+enroll) + TY (Supabase MFA) |
| P1-2 | Monitoring: Sentry + uptime + 3 alerty | config | ⏳ kód (wiring) + TY (DSN, uptime) |
| P1-3 | GDPR vykonateľné práva + záznam súhlasu | kód+proces | ⏳ **kód** (export/výmaz/consent) |
| P1-4 | SPF/DKIM/DMARC | config(DNS) | **TY** (Resend doména moonid.sk) |
| P1-5 | CI gate (npm ci + audit + branch protection + Dependabot) | proces | ✅ kód (workflow+dependabot) / **TY** (zapnúť branch protection + secret scanning) |
| P1-6 | Edge WAF + rate-limit | config | **TY** (Cloudflare) |
| P1-7 | Supabase PITR + 1 restore | config | **TY** |
| P1-8 | IR runbook (1 strana) | proces | ⏳ draft (kód/doc) |
| P1-9 | WCAG 2.1 AA základ + axe | kód | 🟡 focus-visible + skip-link hotové; zvyšok (axe v CI, alt/aria audit) ⏳ |

## ✅ Hotové (netreba riešiť)
append-only audit log + auth eventy + ip/userAgent/companyId · zod + limity na server actions · PII maskovanie + escapeHtml · COOP/CORP · HIBP leaked-password (kód, nahrádza Supabase Pro) · honeypot+origin na verejných formoch.

## Práve pridané (tento batch)
CI gate (`.github/workflows/ci.yml`) + Dependabot · `security.txt` · `:focus-visible` + skip-link (WCAG) · e-mail Reply-To na `moonid@moonid.sk`.

## Poradie kódových krokov (čo robím ďalej)
1. **Tenant-izolačné CI testy** (tvrdá podmienka pilotu) — vitest + A→B=403/404.
2. **GDPR práva v portáli** (export/výmaz/záznam súhlasu) — P1-3.
3. **Sentry wiring** (čaká na tvoj DSN) — P1-2.
4. **MFA enforcement + enroll** (čaká na Supabase MFA) — P1-1.
5. **RLS druhá vrstva** (pred verejným) — sekcia 4.
6. WCAG dotiahnutie (axe v CI, alt/aria), security.txt ✅, search caps.

## RLS rozhodnutie (sekcia 4)
PILOT: bez RLS, ale **tenant-izolačné testy** sú tvrdá podmienka. VEREJNÉ: RLS ako druhá vrstva. Blokér pilotu = testy, nie RLS.

## De-scope (NErobiť teraz)
SSO/SAML, ISO/SOC2, externý pen-test, bug bounty, FIDO2, BIMI, NIS2/eIDAS/Peppol, app-level field šifrovanie, separátny KMS, cross-cloud hodinové zálohy. Trigger-y v origináli (sekcia 12).
