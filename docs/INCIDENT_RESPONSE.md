# Incident Response — runbook (1 strana)

> Right-sized pre 1–2 operátorov (nie enterprise IR program). Cieľ: vedieť, čo robiť pri bezpečnostnom incidente, a stihnúť 72h GDPR notifikáciu.

## Kontakty
- **Prevádzkovateľ / rozhodovateľ:** Lukáš (lukasslobodnik7@gmail.com, 0919 216 908)
- **ÚOOÚ (dozorný orgán):** dataprotection.gov.sk — oznámenie porušenia ochrany OÚ
- **Dodávatelia (status/podpora):** Vercel (status.vercel.com), Supabase (status.supabase.com), Cloudflare, Resend

## 1. Detekcia
Zdroje: Sentry alert (neodchytená výnimka), uptime monitor (výpadok), Supabase/Vercel logy, audit log (`LOGIN_FAILURE` spike, nový STAFF/ADMIN), externé hlásenie (security.txt → moonid@moonid.sk).

## 2. Klasifikácia (rýchlo)
- **P1 — kritický:** únik dát (cross-tenant, PII), kompromitácia admin účtu, RCE.
- **P2 — závažný:** výpadok portálu, čiastočná nedostupnosť, podozrivý prístup.
- **P3 — stredný:** spam/abuse, jednotlivý podozrivý request.

## 3. Izolácia (okamžité kroky podľa typu)
- **Kompromitovaný účet:** v Supabase Auth deaktivovať usera + `auth.admin.signOut` (revoke sessions); v DB `User.active=false`. Rotovať heslo.
- **Útok z IP / bot:** blokovať IP v **Cloudflare** (WAF rule); zapnúť „Under Attack" mode pri DDoS.
- **Zraniteľný endpoint:** dočasne vypnúť (Vercel — odstrániť route / rollback deploymentu cez „Instant Rollback").
- **Únik service-role kľúča / secretu:** rotovať v Supabase + Vercel env okamžite; rotovať `pohoda_agent` heslo (`ALTER ROLE`).

## 4. Vyšetrovanie (bez modifikácie dôkazov)
- Audit log (append-only — nedá sa prepísať): kto/kedy/IP/user-agent.
- Vercel runtime logy, Supabase logy.
- Rozsah: ktoré firmy/údaje zasiahnuté? (kľúčové pre GDPR notifikáciu)

## 5. Notifikácia (GDPR — pri úniku OÚ)
- **ÚOOÚ do 72 h** od zistenia (ak je pravdepodobné riziko pre práva osôb).
- **Postihnuté firmy** bez zbytočného odkladu (ak vysoké riziko).
- Obsah: čo sa stalo, aké údaje, aké následky, aké opatrenia.

## 6. Obnova
- Oprava zraniteľnosti → nasadenie (cez CI, nie hotfix v prod).
- Pri strate dát: Supabase PITR restore (pozn.: SoR je Pohoda → autoritatívne dáta v Pohode).
- Overiť, že incident je uzavretý (monitoring, audit).

## 7. Post-mortem (krátky)
Čo sa stalo? Prečo? Čo zmeniť, aby sa to neopakovalo? Zapísať (1 odsek) + doplniť tento runbook.

---
*Revízia: ročne alebo po každom incidente. Nie je právne poradenstvo — GDPR notifikáciu konzultuj podľa konkrétneho prípadu.*
