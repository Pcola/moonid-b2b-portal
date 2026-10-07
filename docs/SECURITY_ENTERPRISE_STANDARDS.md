# Bezpečnostné štandardy B2B portálu — Enterprise úroveň

> **Účel:** Definovať komplexné bezpečnostné štandardy pre B2B objednávkový portál
> na úrovni **profesionálneho, dôveryhodného a enterprise-ready** systému.
> Toto nie je zákonné minimum — je to štandard ktorý obstojí pred bezpečnostným auditom,
> náročnými firemnými klientmi a reálnymi kybernetickými hrozbami roku 2026.
>
> **Zámer:** Všetky požiadavky v tomto dokumente sú **povinné**. Líšia sa len tým, _kedy_ musia byť splnené.
>
> **Platnosť:** EÚ / Slovenská republika, jún 2026.
>
> ⚠️ Tento dokument nie je náhradou za právne poradenstvo. Pred spustením konzultujte s DPO, právnikom a bezpečnostným auditérom.

---

## Legenda — časové zaradenie

| Symbol | Termín | Popis |
|---|---|---|
| 🔴 **[PRED SPUSTENÍM]** | Deň 0 | Bez toho portál nesmie ísť do produkcie |
| 🟡 **[DO 30 DNÍ]** | Mesiac 1 | Musí byť dokončené do 30 dní od spustenia |
| 🟢 **[DO 6 MESIACOV]** | Mesiac 1–6 | Vyžadované pre prvých enterprise klientov |
| 🔵 **[PRIEBEŽNE]** | Celý čas | Opakujúce sa aktivity, nikdy sa nekončia |

> Žiadna z týchto požiadaviek nie je voliteľná. Rozdiel je len v priorite a realistickom časovom pláne implementácie.

---

## Obsah

1. [Právne a regulačné požiadavky](#1-právne-a-regulačné-požiadavky)
2. [Autentifikácia a správa identít](#2-autentifikácia-a-správa-identít)
3. [Autorizácia a riadenie prístupu](#3-autorizácia-a-riadenie-prístupu)
4. [Ochrana dát a šifrovanie](#4-ochrana-dát-a-šifrovanie)
5. [Bezpečnosť aplikácie — OWASP Top 10 + rozšírenia](#5-bezpečnosť-aplikácie--owasp-top-10--rozšírenia)
6. [Sieťová a infraštruktúrna bezpečnosť](#6-sieťová-a-infraštruktúrna-bezpečnosť)
7. [Audit, monitoring a incident response](#7-audit-monitoring-a-incident-response)
8. [Bezpečný vývojový cyklus (SDL)](#8-bezpečný-vývojový-cyklus-sdl)
9. [Bezpečnosť dodávateľského reťazca](#9-bezpečnosť-dodávateľského-reťazca)
10. [Prístupnosť a UX bezpečnosti](#10-prístupnosť-a-ux-bezpečnosti)
11. [Enterprise certifikácie a atesty](#11-enterprise-certifikácie-a-atesty)
12. [Master checklist](#12-master-checklist)

---

## 1. Právne a regulačné požiadavky

### 1.1 GDPR — Nariadenie EÚ 2016/679

| Požiadavka | Popis | Termín |
|---|---|---|
| Právny základ spracúvania | Každý druh spracúvania musí mať zákonný dôvod (zmluva, oprávnený záujem, súhlas) | 🔴 |
| Záznamy o spracovateľských činnostiach (RoPA) | Písomný register všetkých operácií s osobnými údajmi | 🔴 |
| Práva dotknutých osôb | Prístup, oprava, výmaz, prenosnosť, obmedzenie, námietka — funkčné v portáli | 🔴 |
| Dátová minimalizácia | Zbierať len to, čo je nevyhnutne potrebné — žiadne "môže sa hodiť" | 🔴 |
| Retenčné lehoty | Definovať A technicky vynucovať lehoty uchovávania dát (nie len na papieri) | 🔴 |
| Oznamovanie incidentov | Písomný postup na notifikáciu ÚOOÚ do 72 hodín od zistenia úniku | 🔴 |
| DPA zmluvy s dodávateľmi | Podpísané so všetkými spracovateľmi pred spustením (Supabase, Vercel, Resend, …) | 🔴 |
| Cookie consent | Granulárny, odvolateľný, zaznamenávaný s timestampom, bez dark patterns | 🔴 |
| Privacy Policy | Zrozumiteľná, aktuálna, odkazovaná zo všetkých formulárov zbierajúcich dáta | 🔴 |
| Posúdenie vplyvu (DPIA) | Pre všetky vysokorizikové spracúvania (profilovanie, citlivé dáta) | 🟡 |
| Privacy Dashboard | Zákazník vidí, mení a vymaže svoje dáta priamo v portáli (nie len emailom) | 🟡 |
| Menovaný DPO | Pri spracúvaní vo veľkom rozsahu — externú osobu alebo interného zodpovedného | 🟢 |

### 1.2 NIS2 — Smernica (EÚ) 2022/2555

Platí pre stredné a veľké podniky. Aj keď nespadáte pod NIS2 priamo, **vaši enterprise klienti áno** a budú od vás požadovať dodržiavanie rovnakých štandardov.

| Požiadavka | Termín |
|---|---|
| Písomná politika riadenia kybernetických rizík | 🟡 |
| Bezpečnosť dodávateľského reťazca (hodnotenie každého dodávateľa) | 🟡 |
| Hlásenie incidentov: 24 h (prvotné) → 72 h (podrobné) → 1 mesiac (finálne) | 🔴 |
| Zodpovednosť manažmentu — vedenie podpisuje bezpečnostné politiky | 🟡 |
| Pravidelné penetračné testy a bezpečnostné audity | 🟢 |
| Business continuity plán | 🟢 |

### 1.3 ePrivacy a cookies

- 🔴 Len **nevyhnutné cookies** bez súhlasu (session, CSRF, auth)
- 🔴 Súhlas pred načítaním tracking skriptov (nie po) — technicky vynútené
- 🔴 Granulárny consent: analytika, marketing, preferenčné — každé zvlášť
- 🔴 Zaznamenávanie súhlasov s timestampom, IP, verziou consent bannera
- 🔴 Odvolanie súhlasu rovnako jednoduché ako jeho udelenie
- 🟡 Pravidelný audit cookies pri každom pridaní novej tretej strany

### 1.4 EAA — European Accessibility Act (povinný od 28. 6. 2025)

- 🔴 **WCAG 2.1 úroveň AA** — nie cieľ, zákonná povinnosť
- 🔴 Klávesnicová ovládateľnosť celého portálu (bez myši)
- 🔴 Farebný kontrast min. 4.5:1 pre bežný text, 3:1 pre veľký text
- 🔴 Alt texty k všetkým obrázkom a ikonám
- 🔴 ARIA labely a role pre všetky interaktívne prvky
- 🔴 Focus stavy viditeľné na všetkých ovládacích prvkoch
- 🔴 Automatizované testovanie (axe, Lighthouse) v CI/CD — blokuje build pri porušeniach
- 🟡 Manuálne testovanie s čítačkou obrazovky (NVDA/VoiceOver)

### 1.5 Obchodné a účtovné požiadavky (SK)

- 🔴 VOP s jasnými podmienkami (dodacie lehoty, reklamácie, storno)
- 🔴 Zákonné náležitosti faktúr (IČO, IČ DPH, dátum dodania, sadzba DPH)
- 🔴 Archivácia faktúr min. **10 rokov** — nezmeniteľné záznamy, audit trail
- 🔴 Žiadne mazanie vydaných faktúr — len dobropisy
- 🔴 Číslovanie faktúr v neprerušenom rade
- 🟡 E-faktúra vo formáte **EN 16931** (UBL/CII XML) cez sieť **Peppol**
- 🟡 Integrácia s VIES / ORSR na overenie IČ DPH klientov

### 1.6 eIDAS 2.0

- 🟢 Podpora elektronického podpisu pri zmluvách / DPA dokumentoch (ak sa vyžaduje)

---

## 2. Autentifikácia a správa identít

### 2.1 Prihlasovacie mechanizmy

| Požiadavka | Štandard | Termín |
|---|---|---|
| HTTPS pre všetky auth požiadavky | TLS 1.3 — nie TLS 1.2 | 🔴 |
| Bezpečné ukladanie hesiel | Argon2id (preferované) alebo bcrypt cost ≥ 12 — nikdy plaintext | 🔴 |
| Silná heslo politika | Min. 12 znakov, overenie proti HIBP (Have I Been Pwned) databáze | 🔴 |
| Rate limiting — login | Max. 5 pokusov / 15 min. / IP + per-account | 🔴 |
| Account lockout | Dočasné (exponenciálne) uzamknutie po 5 neúspešných pokusoch | 🔴 |
| Notifikácia o prihlásení | Email okamžite pri prihlásení z nového zariadenia alebo IP | 🔴 |
| Brute force protection | CAPTCHA alebo challenge po 3 neúspešných pokusoch | 🔴 |
| Secure password reset | Token jednorazový, platnosť max. 1 hodina, invalidácia po použití | 🔴 |
| Passwordless / Magic link | Ponúknuť ako alternatívu (Supabase OTP) — eliminuje únik hesla | 🟡 |

### 2.2 Multi-Factor Authentication (MFA) — povinné pre všetkých privilegovaných

> MFA nie je voliteľná funkcia — je to štandard pre každý portál spravujúci firemné dáta.

| Skupina | Požiadavka | Termín |
|---|---|---|
| **SUPERADMIN / ADMIN** | MFA **vynútené** — TOTP + záložné kódy, bez výnimky | 🔴 |
| **STAFF** | MFA **vynútené** — TOTP alebo hardware key (FIDO2/YubiKey) | 🔴 |
| **B2B_ADMIN** (firemný správca) | MFA **vynútené** pri prvom prihlásení | 🔴 |
| **B2B_USER** (bežný zákazník) | MFA **dostupné a aktívne ponúkané** — po prihlásení výzva na aktiváciu | 🟡 |
| Záložné kódy (recovery codes) | Generované pri MFA aktivácii, šifrované v DB | 🔴 |
| Hardware key (FIDO2/WebAuthn) | Podpora pre tých, čo chcú najvyššiu úroveň | 🟢 |

### 2.3 Session management

- 🔴 Session cookies: `HttpOnly`, `Secure`, `SameSite=Lax` — všetky tri atribúty
- 🔴 Absolútny timeout: **8 hodín** pre staff, **30 dní** pre zákazníkov
- 🔴 Idle timeout: **30 minút** neaktivity → automatické odhlásenie (staff)
- 🔴 Invalidácia všetkých sessions pri zmene hesla alebo odvolaní prístupu
- 🔴 Jeden refresh token per zariadenie — správa zariadení v nastaveniach
- 🔴 "Odhlásiť zo všetkých zariadení" funkcia dostupná zákazníkovi
- 🟡 Zobrazenie aktívnych sessions (zariadenie, IP, posledná aktivita) v nastaveniach

### 2.4 SSO pre enterprise klientov

- 🟢 Podpora **SAML 2.0** alebo **OIDC** (Azure AD, Google Workspace, Okta)
- 🟢 Mapovanie firemných skupín/rolí na portálové roly
- 🟢 Automatický deprovisioning: keď zamestnanec odíde z firmy, prístup sa zruší
- 🟢 Just-in-time provisioning (automatické vytvorenie účtu pri prvom SSO prihlásení)

---

## 3. Autorizácia a riadenie prístupu

### 3.1 Role-Based Access Control (RBAC)

```
SUPERADMIN   → plný prístup vrátane systémových nastavení a audit logov
ADMIN        → správa firiem, zákazníkov, katalógu, konfigurácia
STAFF        → správa objednávok, zákazníckej podpory (bez prístupu k iným firmám)
B2B_ADMIN    → správa vlastnej firmy: používatelia, nastavenia, všetky objednávky firmy
B2B_BUYER    → vytváranie a správa vlastných objednávok, katalóg, faktúry firmy
B2B_VIEWER   → čítanie (len objednávky a faktúry, bez možnosti zmien)
```

Každá rola je definovaná ako **zoznam explicitných povolení**, nie zoznam zákazov.
Default: **deny all** — prístup musí byť explicitne povolený.

### 3.2 Princíp minimálnych oprávnení (Least Privilege)

- 🔴 Každá rola má **len** oprávnenia nevyhnutné pre svoju funkciu
- 🔴 API kľúče a service accounts: rozsah obmedzený na konkrétne operácie
- 🔴 Supabase service role key: **len na serveri**, nikdy v klientskom kóde
- 🔴 Žiadne zdieľané admin účty — každá osoba má vlastný účet s auditovateľnou históriou
- 🔵 Štvrťročný review oprávnení — odobratie prístupov, ktoré sa nepoužívajú

### 3.3 Tenant izolácia — najkritickejší bod celého portálu

```
⛔ ABSOLUTNÝ ZÁKAZ: zákazník A nesmie NIKDY vidieť, upravovať ani odmazať dáta zákazníka B.
   Porušenie tejto požiadavky = okamžité ukončenie dôvery klientov a právne následky.
```

- 🔴 **Row Level Security (RLS)** na každej tabuľke — bez výnimky
- 🔴 Každý API endpoint/Server Action overuje `company_id` z JWT tokenu — nie z URL/body parametra
- 🔴 Automatizované testy tenant izolácie: skript ktorý sa pokúša ako firma A pristúpiť k dátam firmy B — súčasť CI/CD
- 🔴 Code review každej zmeny v RLS politikách — minimálne 2 vývojári
- 🔵 Štvrťročný ručný test tenant izolácie — zdokumentovaný výsledok

### 3.4 Server-side authorization — každý request

Každý Server Action a API route musí obsahovať **všetky tri vrstvy**:

```typescript
// 1. Autentifikácia — je token platný?
const user = await requireUser(request) // hodí 401 ak nie

// 2. Autorizácia — má rolu pre túto akciu?
if (!user.roles.includes('B2B_BUYER')) throw new ForbiddenError()

// 3. Vlastníctvo — patrí zdroj tejto firme?
const order = await db.order.findUnique({ where: { id } })
if (order.companyId !== user.companyId) throw new ForbiddenError()
```

Chýbajúca ktorákoľvek vrstva = bezpečnostná diera.

---

## 4. Ochrana dát a šifrovanie

### 4.1 Šifrovanie v pokoji (At-rest)

- 🔴 Databáza šifrovaná na úrovni disku — AES-256 (Supabase ✅)
- 🔴 File storage (prílohy, dokumenty) šifrovaný — AES-256
- 🔴 Zálohy šifrované — rovnaká alebo silnejšia metóda, iný šifrovací kľúč ako primárne dáta
- 🔴 Šifrovacie kľúče uložené oddelene od dát (KMS — Key Management Service)
- 🟡 Application-level šifrovanie pre zvlášť citlivé polia (napr. rabatové dohody)

### 4.2 Šifrovanie pri prenose (In-transit)

- 🔴 **TLS 1.3** pre všetky spojenia — TLS 1.0 a 1.1 **zakázané**, TLS 1.2 povolené len dočasne
- 🔴 HTTPS pre každý endpoint vrátane interných API volaní a webhookov
- 🔴 **HSTS** — `max-age=63072000; includeSubDomains; preload` (2 roky)
- 🔴 HTTP → HTTPS redirect na úrovni infraštruktúry (nie len aplikácie)
- 🔴 Automatická obnova TLS certifikátu — monitoring expirácie s alertom 30 dní vopred
- 🔴 Certificate Transparency (CT) monitoring — upozornenie ak niekto vydá neoprávnený certifikát pre vašu doménu

### 4.3 Klasifikácia a zaobchádzanie s citlivými dátami

| Trieda | Príklady | Požiadavky |
|---|---|---|
| **Kritické** | Heslá, API kľúče, platobné tokeny | Nikdy plaintext; hash (Argon2id); zobraziť len raz |
| **Dôverné** | Rabaty, zmluvné ceny, interné poznámky | Dostupné len oprávneným roliam; application-level šifrovanie |
| **Osobné (PII)** | Mená, emaily, telefóny, adresy | GDPR pravidlá; minimalizácia; retenčné lehoty |
| **Firemné** | IČO, IČ DPH, objednávky, faktúry | Tenant izolácia; audit log; archivácia 10 rokov |
| **Verejné** | Produktový katalóg, verejné ceny | Žiadne špeciálne požiadavky |

- 🔴 Platobné dáta (čísla kariet): **nikdy neukladať** — výhradne Stripe/platobná brána tokeny (PCI DSS)
- 🔴 Žiadne citlivé dáta v URL parametroch (indexované v logoch, browser history)
- 🔴 Žiadne citlivé dáta v chybových hláseniach vrátených klientovi
- 🔴 Logy čistené od PII pred uložením (maskovanie emailov, telefónov)

### 4.4 Data lifecycle

- 🔴 Retenčné lehoty definované pre každý typ dát v RoPA
- 🔴 Faktúry: archivácia min. 10 rokov, nezmeniteľné (len dobropisy)
- 🔴 Osobné dáta: automatizované mazanie / anonymizácia po uplynutí lehoty
- 🔴 Funkčný postup GDPR "právo na zabudnutie" — otestovaný, zdokumentovaný
- 🔴 Zálohy: denné (30 dní), týždenné (12 týždňov), mesačné (24 mesiacov)
- 🔴 Zálohy testované obnovením — nie len vytváraním

---

## 5. Bezpečnosť aplikácie — OWASP Top 10 + rozšírenia

### A01 — Broken Access Control (najčastejšia zraniteľnosť 2021–2025)

- 🔴 Trojvrstvová server-side autorizácia (viď sekcia 3.4)
- 🔴 RLS politiky v databáze (viď sekcia 3.3)
- 🔴 Automatizované testy privilege escalation a tenant úniku v CI/CD
- 🔴 Žiadne prístupové rozhodnutia na základe klientom posielaných dát (company_id v body = zraniteľnosť)

### A02 — Cryptographic Failures

- 🔴 Zakázané: MD5, SHA-1, DES pre akékoľvek bezpečnostné účely
- 🔴 Kryptograficky bezpečné náhodné čísla (`crypto.randomBytes`, nie `Math.random`)
- 🔴 Citlivé dáta nikdy v URL (query params, path segments)
- 🔴 Citlivé dáta nikdy v localStorage alebo sessionStorage (XSS prístupné)
- 🔴 Žiadne citlivé dáta v JWT payload ak nie sú nevyhnutné (JWT nie je šifrovaný)

### A03 — Injection

- 🔴 **Prisma ORM** — parametrizované queries bez výnimky
- 🔴 Zakázané `$queryRaw` / `$executeRaw` s akýmkoľvek user inputom
- 🔴 **Zod** validácia na každom Server Action a API route — na serveri, nie len na klientovi
- 🔴 Sanitácia pre NoSQL queries, LDAP, XML, OS príkazy ak sa používajú
- 🔴 Žiadny `eval()`, `Function()`, alebo dynamické code execution s user dátami

### A04 — Insecure Design

- 🔴 Threat modeling pred vývojom každej novej funkcie (Čo sa môže zneužiť? Ako?)
- 🔴 Fail-secure: pri akejkoľvek chybe → deny prístup (nie permit)
- 🔴 Defense in depth: kritické operácie (zmena hesla, zrušenie objednávky) majú viac vrstiev ochrany
- 🔴 Bezpečnostné požiadavky sú súčasťou definície hotovej funkcie (Definition of Done)

### A05 — Security Misconfiguration

- 🔴 Debug mód, stack traces, podrobné chybové hlásenia — vypnuté v produkcii
- 🔴 Žiadne default heslá, testovacie účty, ukázkové dáta v produkcii
- 🔴 Minimálny set povolených HTTP metód na každom endpointe
- 🔴 Vypnuté nepoužívané funkcie, endpoints, služby
- 🔴 `.env.example` bez reálnych hodnôt; `.env` nikdy v gite; `git log --all -S "SECRET"` audit
- 🔴 Produkčné prostredie oddelené od dev/staging — iné credentials, iná DB

### A06 — Vulnerable and Outdated Components

- 🔴 `npm audit` v CI/CD — **blokovanie buildu** pri `critical` vulnerabilities
- 🔴 `npm audit` — blokovanie buildu pri `high` vulnerabilities po 7 dňoch
- 🔴 Dependabot alebo Renovate — automatické PR pre security updates
- 🔴 Lock file (`package-lock.json`) verzovaný, `npm ci` v CI/CD
- 🔵 Mesačný ručný review závislostí (nie len automatizovaný)

### A07 — Identification and Authentication Failures

- 🔴 MFA pre všetky privilegované účty (viď sekcia 2.2)
- 🔴 Rate limiting, account lockout, brute force ochrana (viď sekcia 2.1)
- 🔴 Secure session management (viď sekcia 2.3)
- 🔴 Kontrola kompromitovaných hesiel cez HIBP API pri registrácii a zmene hesla

### A08 — Software and Data Integrity Failures

- 🔴 `npm ci` namiesto `npm install` v CI/CD (deterministické builds)
- 🔴 Subresource Integrity (SRI) pre všetky externé CDN zdroje (scripts, styles)
- 🔴 Verifikácia integrality zálohy pred obnovením
- 🟡 Podpísané git commity (GPG) pre produkčné deploymenty
- 🟡 Immutable deployments — žiadne live patching produkčného kódu

### A09 — Security Logging and Monitoring Failures

- 🔴 Audit log pre všetky kritické akcie (viď sekcia 7.1)
- 🔴 Monitoring neúspešných prihlásení + automatický alert
- 🔴 Alerty pri anomáliách (viď sekcia 7.2)
- 🔴 Error tracking (Sentry) — bez logovania PII v stack traces

### A10 — Server-Side Request Forgery (SSRF)

- 🔴 Whitelist povolených external URL — deny all ostatné
- 🔴 Zamedzenie prístupu k interným IP adresám (169.254.0.0/16, 10.0.0.0/8, cloud metadata)
- 🔴 Timeout a veľkostné limity na externé HTTP requesty

### Dodatočné: HTTP Security Headers

Cieľové hodnotenie: **A+ na [securityheaders.com](https://securityheaders.com)** — nie menej.

```http
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(self)
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}';
                         style-src 'self' 'nonce-{random}'; img-src 'self' data: https:;
                         connect-src 'self' https://*.supabase.co; frame-ancestors 'none'
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

- 🔴 Nastaviť pred spustením, overiť na securityheaders.com
- 🔵 Kontrolovať po každom pridaní novej tretej strany (CDN, analytics)

### Dodatočné: CSRF ochrana

- 🔴 Next.js Server Actions — CSRF ochrana built-in ✅
- 🔴 Custom API routes: overenie `Origin` + `Referer` hlavičky
- 🔴 `SameSite=Lax` na session cookie

---

## 6. Sieťová a infraštruktúrna bezpečnosť

### 6.1 Web Application Firewall (WAF) — povinný

> WAF nie je luxus. Pre B2B portál spravujúci firemné dáta a objednávky je WAF základnou vrstvou ochrany.

- 🔴 **Cloudflare WAF** (alebo ekvivalentný) nakonfigurovaný pred spustením
- 🔴 Pravidlá: blokovanie SQL injection, XSS, path traversal, RCE patterns
- 🔴 Rate limiting na úrovni CDN (doplatok k aplikačnému rate limitingu)
- 🔴 **DDoS ochrana** — L3/L4 volumetric + L7 aplikačná
- 🔴 **Bot protection** — challenge pre podozrivé user-agent / správanie
- 🔴 Geo-blocking pre krajiny z ktorých portal neočakáva klientov (voliteľné, ale efektívne)
- 🟡 Pravidelný review WAF pravidiel — nové attack patterns sa objavujú

### 6.2 API ochrana

- 🔴 Rate limiting per-user + per-IP + per-endpoint
- 🔴 Max. veľkosť request body (zabrániť DoS cez obrovské payloady) — odporúčané 1 MB
- 🔴 Pagination: povinný `limit`, max. 100 záznamov per request, server-side
- 🔴 Timeout na všetky dlhé operácie (DB queries, externé API volania)
- 🔴 Žiadne neobmedzené bulk export operácie — limity a autorizácia
- 🔴 API versioning — breaking changes nikdy bez deprecation oznámenia

### 6.3 Infraštruktúra a deployment

- 🔴 Produkčné prostredie: iné credentials, iná DB, iné API kľúče ako dev/staging
- 🔴 Secrets **výhradne** v environment variables (Vercel / hosting) — nikdy v kóde
- 🔴 Supabase `service_role` key: len na serveri, nikdy v klientskom bundle
- 🔴 Immutable infrastructure: deploymenty sú nové instancie, nie patch existujúcich
- 🔵 Štvrťročný review cloud IAM oprávnení — odobratie nepoužívaných

### 6.4 Backup a Disaster Recovery — konkrétne metriky

| Parameter | Požiadavka | Termín |
|---|---|---|
| RPO (Recovery Point Objective) | Max. 1 hodina — maximálna strata dát | 🔴 |
| RTO (Recovery Time Objective) | Max. 4 hodiny — čas na obnovu prevádzky | 🔴 |
| Zálohy — frekvencia | Každú hodinu (transakčné logy) + denná full backup | 🔴 |
| Zálohy — umiestnenie | Šifrované, iný región / cloud provider ako primárne dáta | 🔴 |
| Point-in-time recovery | Supabase Pro alebo ekvivalent — obnova k ľubovoľnému bodu | 🔴 |
| Testovanie obnovy | Skutočná obnova zo zálohy — nie len kontrola existencie | 🔵 (2x ročne) |
| Disaster Recovery drill | Simulácia výpadku a obnovenie prevádzky od nuly | 🟢 (ročne) |

---

## 7. Audit, monitoring a incident response

### 7.1 Audit log — štruktúra a rozsah

Každý záznam **musí** obsahovať:
```
timestamp (UTC, presnosť ms) | user_id | company_id | ip_address | user_agent |
session_id | action | resource_type | resource_id | changes {old, new} | status | request_id
```

| Kategória | Akcie | Termín |
|---|---|---|
| **Autentifikácia** | Prihlásenie/odhlásenie (úspech aj neúspech), MFA aktivácia/deaktivácia, zmena hesla, reset hesla, token refresh | 🔴 |
| **Správa prístupov** | Vytvorenie/zmena/deaktivácia účtu, zmena roly, pridanie/odobratie z firmy, API kľúč vytvorený/odvolaný | 🔴 |
| **Objednávky** | Vytvorenie, úprava, zrušenie, schválenie, každá zmena stavu | 🔴 |
| **Faktúry** | Vytvorenie, odoslanie, dobropis, export | 🔴 |
| **Katalóg a ceny** | Zmena cien, rabatov, zmluvných podmienok | 🔴 |
| **Dáta** | Export akýchkoľvek dát, bulk download, GDPR výmaz | 🔴 |
| **Konfigurácia** | Zmeny nastavení systému, integrácie, webhooky | 🔴 |

**Pravidlá pre audit log:**
- 🔴 **Append-only** — žiadna úprava ani mazanie záznamu po zapísaní
- 🔴 Uložený oddelene od operačnej DB (iná tabuľka, ideálne iný store)
- 🔴 Prístup k audit logu: len SUPERADMIN a ADMIN v čítacom režime
- 🔴 Uchovávanie: min. **5 rokov** (finančné záznamy: **10 rokov**)
- 🔵 Mesačný review audit logov — detekcia anomálií

### 7.2 Monitoring, alerting a anomaly detection

**Error tracking:**
- 🔴 Sentry alebo ekvivalent — každá neodchytená výnimka notifikuje vývojový tím
- 🔴 Logy čistené od PII (maskovanie emailov, telefónov, adries) pred poslaním do Sentry

**Uptime a výkon:**
- 🔴 Uptime monitoring (napr. Better Uptime, Checkly) — alert do 2 minút od výpadku
- 🔴 Response time monitoring — alert ak p95 latencia prekročí 2 sekundy

**Bezpečnostné alerty — okamžitá notifikácia pri:**
- 🔴 > 10 neúspešných prihláseniach z jednej IP za 5 minút
- 🔴 Prihlásenie z krajiny kde portál nemá klientov
- 🔴 Prvé prihlásenie účtu z nového zariadenia (nový user-agent + IP)
- 🔴 Spike 403 odpovedí — pokus o neoprávnený prístup
- 🔴 Zmena hesla alebo MFA nastavení
- 🔴 Vytvorenie nového ADMIN/STAFF účtu
- 🔴 Neobvyklý objem API requestov (potenciálny scraping alebo brute force)
- 🔴 Pokus o prístup k neexistujúcim endpointom (skenner / recon)

### 7.3 Incident Response plán — povinný písomný dokument

Dokument musí existovať pred spustením a musí byť pravidelne aktualizovaný a testovaný.

| Fáza | Obsah |
|---|---|
| **1. Detekcia** | Ako identifikujeme incident? (automatický alert vs. externé hlásenie) |
| **2. Klasifikácia** | Závažnosť P1 (kritická — únik dát) / P2 (závažná) / P3 (stredná) / P4 (nízka) |
| **3. Eskalácia** | Kto sa kontaktuje, v akom poradí, aký je kontakt? (telefón, email, Signal) |
| **4. Izolácia** | Konkrétne kroky: deaktivovať účet, blokovať IP v Cloudflare, vypnúť endpoint |
| **5. Vyšetrovanie** | Zbieranie dôkazov: logy, screenshoty, DB stav — bez modifikácie |
| **6. Notifikácia** | ÚOOÚ do 72 h (GDPR), postihnuté firmy, interná komunikácia |
| **7. Obnova** | Záloha, oprava zraniteľnosti, nasadenie, verifikácia |
| **8. Post-mortem** | Čo sa stalo? Prečo? Čo meniť aby sa to neopakovalo? Zdokumentované |

- 🔴 Plán existuje a je zdieľaný s celým tímom
- 🔵 Plán aktualizovaný po každom incidente a ročne revidovaný
- 🟢 Tabletop exercise (simulácia incidentu) — ročne

---

## 8. Bezpečný vývojový cyklus (SDL)

> Bezpečnosť sa nedodáva ako vrstva navyše po vývoji — musí byť súčasťou každého kroku.

### 8.1 Bezpečnostné požiadavky v procese

- 🔴 Každá nová funkcia má bezpečnostné požiadavky v špecifikácii (nie len business požiadavky)
- 🔴 Threat modeling pre každú novú features s prístupom k dátam alebo platbám
- 🔴 Definition of Done zahŕňa: security review, Zod validácia, RLS overenie, testy

### 8.2 Code review

- 🔴 **Povinný code review** pre všetky zmeny v: auth, platby, RLS politiky, permissions, API endpoints
- 🔴 Minimálne 2 revieweri pre zmeny ovplyvňujúce bezpečnosť
- 🔴 Automatický security scan v CI/CD (CodeQL alebo ekvivalent)

### 8.3 Testing

- 🔴 Unit testy pre všetky autorizačné funkcie
- 🔴 Integračné testy tenant izolácie (firma A → firma B dáta = vždy 403)
- 🔴 End-to-end testy kritických flows (prihlásenie, objednávka, platba)
- 🟡 Fuzz testing pre API endpoints spracúvajúce user input

### 8.4 Vulnerability Disclosure Program (VDP)

- 🟡 `security.txt` na `/.well-known/security.txt` — kontakt pre etických hackerov
- 🟡 Definovaný postup pre príjem a riešenie externých hlásení zraniteľností
- 🟢 Bug bounty program pre enterprise fázu

### 8.5 Security awareness

- 🔴 Každý člen tímu absolvuje základné školenie OWASP Top 10 pred prístupom k produkcii
- 🔵 Ročné bezpečnostné školenie tímu — nové hrozby, nové techniky
- 🔵 Phishing simulation pre testovanie ostražitosti (pri väčšom tíme)

---

## 9. Bezpečnosť dodávateľského reťazca

### 9.1 Požiadavky na cloudových dodávateľov

| Dodávateľ | Požadovaná certifikácia | Iné |
|---|---|---|
| Hosting / cloud (Vercel, AWS) | ISO 27001 + SOC 2 Type II | DPA podpísaná |
| Databáza (Supabase) | ISO 27001 + SOC 2 Type II | DPA + GDPR compliance |
| Platobná brána (Stripe) | PCI DSS Level 1 | Nikdy neukladáme kartové dáta |
| Email provider (Resend) | GDPR DPA | SPF/DKIM/DMARC |
| CDN / WAF (Cloudflare) | ISO 27001 + SOC 2 | |
| Monitoring (Sentry) | GDPR DPA | PII maskovanie aktívne |

### 9.2 Open-source závislosti

- 🔴 Audit každej novej závislosti pred pridaním: licencia, maintainability, CVE história
- 🔴 Žiadne abandonment balíčky (posledný commit > 2 roky, < 5 kontribútorov)
- 🔴 `npm ci` v CI/CD — deterministické builds zo záložného lock file
- 🔴 Lock file verzovaný v repozitári
- 🔵 Mesačný ručný review transitive závislostí

### 9.3 CI/CD bezpečnosť

- 🔴 Secrets nikdy v CI/CD logoch — maskovanie aktívne
- 🔴 `npm audit --audit-level=critical` blokuje build
- 🔴 GitHub Secret Scanning (alebo ekvivalent) — aktívny
- 🔴 Code review povinný pred merge do main
- 🔴 Produkčné deploymenty len z chránenej main branch
- 🟡 Signed commits (GPG) pre produkčné deploymenty
- 🟡 SBOM (Software Bill of Materials) generovaný pri každom release

---

## 10. Prístupnosť a UX bezpečnosti

### 10.1 Bezpečná komunikácia chýb

- 🔴 Generické hlásenia pre používateľov: **nikdy** technické detaily, stack traces, SQL chyby
  - ✅ `"Nesprávne prihlasovacie údaje"` (nie `"User not found"` — oracle attack)
  - ✅ `"Nastala chyba, skúste neskôr"` (nie `"NullPointerException at line 47"`)
- 🔴 Detailné chyby len do logov, nikdy do HTTP response body

### 10.2 Security UX

- 🔴 Viditeľná indikácia HTTPS spojenia
- 🔴 Email notifikácia pri prihlásení z nového zariadenia
- 🔴 Správa aktívnych sessions v nastaveniach ("Odhlásiť zo všetkých zariadení")
- 🟡 Privacy dashboard: zákazník vidí všetky svoje dáta a môže požiadať o výmaz
- 🟡 Transparentná komunikácia: čo zbierame, prečo, ako dlho

### 10.3 E-mail bezpečnosť

- 🔴 **SPF** DNS record pre odosielaciu doménu
- 🔴 **DKIM** podpisy pre všetky odoslané emaily
- 🔴 **DMARC** politika: `p=quarantine` pri spustení → `p=reject` do 90 dní
- 🔴 **BIMI** (Brand Indicators for Message Identification) — logo v emailovom klientovi, zvyšuje dôveryhodnosť
- 🔴 Citlivé dáta nikdy v tele emailu (heslá, kompletné objednávky, platobné info)
- 🟡 Email link expiry — linky v emailoch platné max. 24 hodín

### 10.4 security.txt

```
/.well-known/security.txt

Contact: security@vasafirma.sk
Expires: 2027-01-01T00:00:00.000Z
Encryption: https://vasafirma.sk/pgp-key.txt
Preferred-Languages: sk, en
Policy: https://vasafirma.sk/security-policy
```

- 🟡 Publikovať pred prvým verejným spustením

---

## 11. Enterprise certifikácie a atesty

### 11.1 Certifikácie podľa fázy rastu

| Certifikácia | Popis | Kedy |
|---|---|---|
| **OWASP ASVS Level 2** (self-assessment) | Overenie aplikácie voči 286 bezpečnostným kontrolám | 🔴 Pred spustením |
| **Externý penetračný test** | Certifikovaný etický hacker (OSCP/CEH) preverí systém | 🟢 Pred prvým enterprise klientom |
| **ISO/IEC 27001** | Systém riadenia informačnej bezpečnosti — certifikát | 🟢 Pri > 20 firemných klientoch |
| **SOC 2 Type II** | Bezpečnostný audit procesov a systémov — pre zahranič. klientov | 🟢 Pri expanzii do zahraničia |
| **PCI DSS** | Ak spracúvate kartové platby priamo (nie cez Stripe) | Podľa potreby |
| **Cyber Essentials (UK)** | Pre UK klientov po expanzii | Podľa potreby |

### 11.2 Pravidelný bezpečnostný kalendár

| Aktivita | Frekvencia | Zodpovedný |
|---|---|---|
| `npm audit` + dependency review | Automaticky (CI/CD) + manuálne mesačne | Dev tím |
| Review RLS politík a RBAC | Štvrťročne | Dev tím + Security officer |
| Review cloud IAM oprávnení | Štvrťročne | DevOps |
| Kontrola audit logov na anomálie | Mesačne | Security officer |
| Test obnovy zo zálohy | 2x ročne | DevOps |
| Aktualizácia bezpečnostných politík | Ročne | DPO + Management |
| Externý penetračný test | Ročne + po každom major release | Externá firma |
| Security awareness školenie tímu | Ročne | Security officer |
| Disaster Recovery drill | Ročne | Celý tím |
| GDPR compliance review | Ročne | DPO |

---

## 12. Master checklist

### 🔴 PRED SPUSTENÍM — portál nesmie ísť live bez týchto položiek

**Infraštruktúra**
- [ ] HTTPS + TLS 1.3 aktívne, TLS 1.0/1.1 zakázané
- [ ] HSTS header nastavený (`max-age=63072000; includeSubDomains; preload`)
- [ ] HTTP → HTTPS redirect aktívny
- [ ] Všetky security headers nastavené — hodnotenie **A+** na securityheaders.com
- [ ] WAF (Cloudflare) nakonfigurovaný s aktívnymi pravidlami
- [ ] DDoS ochrana aktívna
- [ ] Produkčné prostredie oddelené od dev/staging (iné credentials, iná DB)

**Autentifikácia**
- [ ] MFA vynútené pre všetky ADMIN, STAFF a B2B_ADMIN účty
- [ ] Rate limiting na `/login`, `/api/auth/*` aktívny (5 pokusov / 15 min. / IP)
- [ ] Account lockout po 5 neúspešných pokusoch
- [ ] Bezpečné session cookies (`HttpOnly`, `Secure`, `SameSite=Lax`)
- [ ] Session timeout nakonfigurovaný (8h staff, 30d zákazníci)
- [ ] Notifikačný email pri prihlásení z nového zariadenia

**Autorizácia a dáta**
- [ ] RLS politiky na každej Supabase tabuľke — overené testom
- [ ] Tenant izolácia otestovaná: firma A nemôže pristúpiť k dátam firmy B
- [ ] Server-side autorizácia na každom Server Action a API route (auth + role + company_id)
- [ ] Zod validácia na každom Server Action a API route
- [ ] Žiadne secrets v git repozitári (audit: `git log --all -S "SECRET"`)

**Audit a monitoring**
- [ ] Audit log tabuľka aktívna — zapisuje všetky kritické akcie
- [ ] Error tracking (Sentry) bez PII v logoch
- [ ] Uptime monitoring s alertingom

**Právne**
- [ ] Privacy Policy live a odkazovaná zo všetkých formulárov
- [ ] Cookie consent implementovaný (granulárny, odvolateľný, zaznamenávaný)
- [ ] VOP live
- [ ] DPA zmluvy podpísané so všetkými dodávateľmi (Vercel, Supabase, Resend, Sentry)
- [ ] GDPR: práva dotknutých osôb funkčné (prístup, oprava, výmaz)
- [ ] Incident response plán písomne zdokumentovaný a zdieľaný s tímom

**E-mail**
- [ ] SPF, DKIM, DMARC pre doménu nastavené a otestované
- [ ] DMARC politika `p=quarantine` alebo `p=reject`

**Bezpečnosť kódu**
- [ ] OWASP ASVS Level 2 self-assessment vykonaný
- [ ] `npm audit` v CI/CD blokuje build pri critical
- [ ] Dependabot / Renovate aktívny

### 🟡 DO 30 DNÍ od spustenia

- [ ] DMARC nastavený na `p=reject`
- [ ] Anomaly detection alerty nakonfigurované (všetky z kapitoly 7.2)
- [ ] Zálohy otestované — skutočná obnova zo zálohy úspešná
- [ ] MFA dostupné (voliteľné) pre B2B_USER zákazníkov — aktívne ponúkané
- [ ] Privacy Dashboard dostupný zákazníkom (GDPR práva v portáli)
- [ ] DPIA vykonané pre vysokorizikové spracúvania
- [ ] BIMI pre emailovú doménu nastavené
- [ ] security.txt publikovaný
- [ ] NIS2 politika riadenia rizík zdokumentovaná

### 🟢 DO 6 MESIACOV — pred prvým enterprise klientom

- [ ] Externý penetračný test od certifikovanej firmy — report + remediation
- [ ] Disaster Recovery drill vykonaný a zdokumentovaný
- [ ] SSO / SAML 2.0 integrácia funkčná (Azure AD, Google Workspace)
- [ ] ISO 27001 certifikácia iniciovaná (gap analysis)
- [ ] SOC 2 Type II audit naplánovaný
- [ ] E-faktúra cez Peppol (EN 16931) otestovaná v testovacom prostredí
- [ ] Bug bounty program / VDP spustený
- [ ] Celý tím absolvoval bezpečnostné školenie — zdokumentované

---

## Zodpovednosti

| Rola | Zodpovednosť |
|---|---|
| **Vývojový tím** | Implementácia technických kontrol, code review, dependency updates, testy |
| **DPO** | GDPR compliance, RoPA, DPIA, komunikácia s ÚOOÚ |
| **Security Officer** | Bezpečnostné politiky, audit log review, incident response, pen test koordinácia |
| **DevOps** | Infraštruktúra, zálohy, monitoring, cloud IAM |
| **Management** | Schválenie politík, NIS2 zodpovednosť, rozpočet na bezpečnosť, podpisy DPA |

---

*Revízia: jún 2026 — Ďalšia plánovaná revízia: december 2026*
*Všetky zmeny v tomto dokumente musia byť schválené Security Officerom a DPO.*
