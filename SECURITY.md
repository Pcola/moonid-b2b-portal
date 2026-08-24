# Security Policy — Moonid B2B Portál

Tento dokument popisuje, ako hlásiť bezpečnostné zraniteľnosti a bezpečnostné postupy projektu.

## 🛡️ Bezpečnosť — reportovanie

**NIKDY nepubblisuj bezpečnostný problém na verejnom issue!** Použi namiesto toho:

### 1. GitHub Security Advisory (Preferred)
Prejdi na [Security Advisories](https://github.com/Pcola/moonid-b2b-portal/security/advisories) a klikni **„Report a vulnerability"** → private, confidential report.

### 2. Email
Pošli detaily na: **security@moonid.sk** (alebo kontaktný e-mail vlastníka)

**Prosím, zahrň:**
- Popis zraniteľnosti
- Affected component / endpoint
- Severity level (Critical / High / Medium / Low)
- PoC (ak je dostupný, bez detailov)
- Tvoj kontakt

## ✅ Čo sa stane po nahlásení

1. **Potvrdzenie:** do 24 h odpovedáme
2. **Triage:** posúdime severity a scope
3. **Náprava:** patch sa vyvíja v private branch
4. **Koordinácia:** dohodnutý embargo (typicky 90 dní pred zverejnením)
5. **Release:** Verzia s fixom sa vydá, publikujem poďakovanie (pokiaľ súhlasíš)

## 🔒 Vynútené bezpečnostné kontroly

- **MFA:** Vynútené pre staff/admin (TOTP, AAL2)
- **CSP:** Strict Content-Security-Policy s nonce
- **Rate limiting:** Protibrutalforce, protiDoS ochrany
- **Audit logging:** Append-only audit trail na DB úrovni
- **Session timeout:** Idle + absolute limits
- **TLS 1.3:** Všetky komunikácie šifrované
- **Secret scanning:** Gitleaks v CI, Dependabot monitoring

## 📋 Audit & Certifikácia

- Internými pentest audit: Áno (2026-08-20)
- ISO 27001 certifikácia: Nie (plánované ako scale-up)
- PCI DSS scope: Nie (portál nespracúva karty; pri budúcej payment gateway revaluation)
- SOC 2: Nie (subprocessori Vercel/Supabase/Sentry majú SOC 2)

## 🔄 Dependency Updates & Patch SLA

- **Critical:** 24 h na merge (po dostupnosti opravy)
- **High:** 7 dní
- **Medium:** 30 dní
- **Low:** 90 dní (balková aktualizácia)

`npm audit` je blokujúci gate v CI — žiadne high/critical zraniteľnosti do produkcie.

## 🚀 Deployment Security

- **Branch protection:** Vyžaduje review + CI pass pred mergom (GitHub Pro / public repo)
- **Secrets management:** ENV premenné v Vercel — **nikdy v gite**
- **Staging:** Paralelný env s reálnymi datami na testovacie bezpečnostné zmeny
- **Rollback:** Kapacita sa vraciť na predchádzajúcu verziu v rámci 15 min

## 📚 Ďalšie zdroje

- **SECURITY_AUDIT.md** — najnovší audit výsledok
- **COMPLIANCE_2026.md** — právne + technické povinnosti
- **BRANCH_PROTECTION_SETUP.md** — enterprise governance
- **docs/INCIDENT_RESPONSE.md** — ako reagovať na bezpečnostné incidenty

---

**Ďakujem za zodpovedný approach k bezpečnosti! 🛡️**

Posledný update: 21. august 2026
