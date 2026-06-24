# Bezpečnostný audit portálu — výsledok

> Audit 24. 6. 2026 (5 oblastí + verdikt, adversariálny) proti `SECURITY_ENTERPRISE_STANDARDS.md` + OWASP Top 10.
> Metóda: read-only analýza kódu, `npm audit`, `git log -S` na secrets, `tsc`.

## Verdikt

| | |
|---|---|
| **Uzavretý PILOT** (pár známych firiem) | ✅ **Pripravený** — po malom súbore fixov (viď P0) |
| **Verejné spustenie** (neznámi používatelia) | ❌ **Nepripravený** — chýba vrstva identity/auditu/monitoringu |

**Zhrnutie:** Aplikačná vrstva je nadpriemerne kvalitná — tenant izolácia dôsledne scoped na `companyId`, IDOR reálne ošetrený, citlivé polia (costPrice/discountPct/marža) sa neserializujú klientovi, žiadny raw SQL, nulová SSRF plocha, XSS držané React escapingom, čistý secrets management. Slabinou **nie je** injection ani únik cez API — sú to **prevádzkové a identitné poistky**: login bez rate-limitu/MFA, audit log bez auth eventov a nie append-only, chýbajúci monitoring (Sentry) a DB-level RLS.

## Silné stránky (potvrdené)
- Tenant izolácia + IDOR (objednávky/košík/faktúry/adresy/reorder) — reálne, konzistentné.
- costPrice/discountPct/marža/purchasePrice **nikdy neidú klientovi**.
- Žiadny `$queryRaw`/`$executeRaw`, žiadny user-controlled `fetch`, žiadny `eval`.
- Secrets: `.env` gitignored, žiadne reálne hodnoty v git histórii, `service_role` len server-side.
- Bezpečnostné hlavičky (HSTS, X-Frame DENY, nosniff, Referrer, Permissions, CSP base), zod+origin+honeypot na verejných formulároch.
- Závislosti: `npm audit` 0 critical / 0 high (2 moderate build-time), Next nad CVE-2025-29927.

## Launch-blokery podľa vlastníka

### P0 — pred PILOTOM (nutné, väčšina rýchle)
| # | Bloker | Vlastník |
|---|---|---|
| 1 | **Faktúra PDF priamy odkaz** na `pdfStoragePath` → možný IDOR únik dokladov, ak je bucket verejný | kód + infra |
| 2 | **Login bez rate-limitu/lockoutu** → neobmedzený brute-force (Supabase rate-limit + CAPTCHA hneď) | config + kód |
| 3 | **Seed `Moonid2026!` + `.test` účty** → guard proti spusteniu v produkcii | proces/kód |
| 4 | **Sessions sa neinvalidujú** pri zmene hesla/deaktivácii (global signOut) | kód |

### P1 — pred VEREJNÝM spustením
| # | Bloker | Vlastník |
|---|---|---|
| 5 | **MFA pre STAFF/ADMIN** (TOTP + AAL2 vynútenie; `mfaEnabled` je mŕtve pole) | kód + config |
| 6 | **Audit log**: nepokrýva auth eventy, nie append-only, chýba ip/userAgent/companyId | kód + DB |
| 7 | **Monitoring chýba** — Sentry (PII scrubbing) + uptime/alerting | kód + config |
| 8 | **Zod + dĺžkové limity** na VŠETKÝCH server actions (createOrder.note, cancelOrder.reason, addToCart, search params) | kód |
| 9 | **GDPR práva** (prístup/výmaz/prenosnosť) nevykonateľné v portáli + záznam súhlasu | kód + proces |
| 10 | **SPF/DKIM/DMARC** (p=quarantine→reject) + IR plán + RoPA | config/proces |
| 11 | **RLS** v DB chýba — izolácia stojí na jedinej app-vrstve cez privilegovaný pooler | kód (architektúra) |
| 12 | **CI/CD gate** (`npm ci` + `npm audit` blokuje build) + branch protection + Dependabot | proces |

### P2 — hardening
- Plochý RBAC (`requireAdmin` nikde nepoužité; CUSTOMER_USER vs CUSTOMER_ADMIN sa nevynucuje; žiadna read-only rola).
- Automatizované testy tenant izolácie (firma A → zdroj firmy B = 403).
- COOP/CORP hlavičky + CSP nonce (A+ na securityheaders.com).
- PII (e-maily) maskovať v console/Vercel logoch; escapeHtml v e-mailových šablónach.
- Session timeouts + cookie atribúty (Supabase config).

## Čo viem opraviť kódom (bezpečne, hneď)
Zod všade · global signOut pri zmene hesla/deaktivácii · seed guard · COOP/CORP hlavičky · PII maskovanie + escapeHtml · `requireAdmin` na citlivé operácie · obohatenie AuditLog (ip/userAgent/companyId) + append-only migrácia · auth-gated proxy pre faktúry PDF.

## Čo vyžaduje tvoje účty/rozhodnutia (config/infra)
Supabase: rate-limit + CAPTCHA + password policy + MFA enablement + JWT/session expiry · Resend: SPF/DKIM/DMARC DNS · Sentry účet (DSN) · Cloudflare WAF · GitHub Actions CI + branch protection · IR plán + RoPA · RLS architektúra (rozhodnutie).
