# Compliance & bezpečnosť 2026 — checklist (EÚ / SK B2B)

> Checklist noriem a štandardov, ktoré treba zapracovať **od začiatku**, nie dodatočne. Toto nie je právne poradenstvo — pred spustením konzultovať s právnikom / DPO a daňovým poradcom.

---

## A. Právne & regulačné

### ☐ GDPR (ochrana osobných údajov)
- Spracúvanie len na právnom základe (zmluva, oprávnený záujem, súhlas).
- **Súhlasy** (cookies, marketing) — granularne, odvolateľné.
- Práva dotknutých osôb: prístup, oprava, **výmaz**, prenosnosť, námietka.
- **Záznam o spracovateľských činnostiach**; **DPA zmluvy** s dodávateľmi (Vercel, Supabase, Stripe…).
- Minimalizácia dát, retenčné lehoty, šifrovanie.
- Oznamovanie porušení do 72 h.

### ☐ EAA — European Accessibility Act (prístupnosť)
- Účinný od **28. 6. 2025** → v 2026 **povinný** pre digitálne služby (vrátane B2B e-commerce).
- Cieľ: **WCAG 2.1 úroveň AA**.
- Kontrast, klávesnicová ovládateľnosť, ARIA, čitateľné fonty, focus stavy, alt texty.
- shadcn/ui (Radix) pomáha — má prístupnosť zabudovanú, ale treba testovať (axe, Lighthouse).

### ☐ Povinná e-fakturácia (ViDA + SK)
- EÚ **VAT in the Digital Age (ViDA)** zavádza povinné štruktúrované e-faktúry.
- Formát **EN 16931** (UBL/CII XML), prenos cez **Peppol** sieť — nie PDF e-mailom.
- SK postupne zavádza povinnú B2B e-fakturáciu — sledovať harmonogram Finančnej správy.
- Riešenie: provider ako **Storecove / Ecosio** (Peppol access point) napojený na fakturačný modul.

### ☐ Účtovníctvo & DPH (SK)
- Náležitosti faktúry podľa zákona o DPH (IČO, IČ DPH, dátum dodania, sadzba…).
- Správna sadzba DPH (aktuálne **23 %** základná).
- Archivácia faktúr (zákonná lehota), nezmeniteľnosť (audit trail).
- Číslovanie faktúr v neprerušenom rade.

### ☐ eIDAS 2.0 (elektronická identita/podpis)
- Ak sa budú podpisovať zmluvy/dokumenty elektronicky.

### ☐ NIS2 (kybernetická bezpečnosť)
- Smernica NIS2 — môže sa týkať podľa sektora a veľkosti. Overiť povinnosti (riadenie rizík, hlásenie incidentov).

### ☐ ePrivacy / cookies
- Cookie lišta so súhlasom; bez súhlasu len **nevyhnutné** cookies (prototyp to už reflektuje).

### ☐ Spotrebiteľské/obchodné podmienky
- VOP, reklamačný poriadok, doprava a platby, ochrana súkromia — ako samostatné stránky (v prototype sú odkazy v pätičke).

---

## B. Technická bezpečnosť

### ☐ Prenos & šifrovanie
- **TLS 1.3**, HTTPS všade, **HSTS**, presmerovanie HTTP→HTTPS.
- Šifrovanie **at rest** (DB, storage) aj **in transit**.

### ☐ Autentifikácia
- **MFA / 2FA** (povinné pre STAFF/ADMIN).
- Bezpečné heslá (alebo passwordless / magic link), rate-limit na login.
- Bezpečné session cookies (`HttpOnly`, `Secure`, `SameSite`).

### ☐ Autorizácia
- **RBAC** (roly) + **Row-Level Security** v Postgrese (viď `database/schema.sql`).
- Princíp najmenších oprávnení; server overuje vlastníctvo (`company_id`) pri každej požiadavke.

### ☐ Aplikačná bezpečnosť (OWASP Top 10)
- Ochrana proti SQL injection (Prisma parametrizuje), XSS (React escapuje), CSRF.
- Validácia vstupov (**Zod**) na serveri, nie len na klientovi.
- **Security headers** (CSP, X-Frame-Options, X-Content-Type-Options).
- **Rate limiting** + **WAF** (Vercel / Cloudflare).

### ☐ Audit & monitoring
- **Audit log** (kto, čo, kedy — objednávky, ceny, faktúry, prihlásenia) — tabuľka `audit_log`.
- Monitoring chýb (**Sentry**), alerty, logy prístupov.

### ☐ Tajomstvá & závislosti
- Secrets v env premenných (Vercel/Supabase), nikdy v gite.
- **Dependency scanning** (Dependabot), **secret scanning**, pravidelné aktualizácie.

### ☐ Zálohy & kontinuita
- Automatické **zálohy DB**, testované obnovenie (disaster recovery).
- Point-in-time recovery (Supabase Pro / RDS).

### ☐ Dodávatelia (dedená compliance)
- Vyberať certifikovaných: **ISO 27001 + SOC 2** (Vercel, Supabase, Stripe, AWS).
- Mať s nimi podpísané **DPA** (GDPR).

---

## C. Pred spustením — finálny checklist

- ☐ Penetračné testovanie / security audit
- ☐ Lighthouse + axe (prístupnosť WCAG AA, výkon, SEO)
- ☐ Test obnovy zo zálohy
- ☐ Cookie consent + GDPR stránky live
- ☐ E-faktúra (Peppol) otestovaná v testovacom prostredí
- ☐ Platobná brána v test → live režime
- ☐ MFA vynútené pre adminov
- ☐ RLS politiky otestované (zákazník nevidí cudzie dáta)
- ☐ Monitoring a alerty zapnuté

---

### Zhrnutie priorít
1. **GDPR + RLS + MFA** — základ, bez toho nespúšťať.
2. **WCAG 2.1 AA (EAA)** — v 2026 zákonná povinnosť.
3. **E-faktúra EN 16931 / Peppol** — pripraviť na povinný režim.
4. **TLS, security headers, audit log, zálohy** — hygiena, ktorá sa nevynecháva.
