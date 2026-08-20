# Moonid B2B portál — hĺbkový enterprise audit

**Dátum auditu:** 20. august 2026
**Revízia:** 1.1 — post-remediation dodatok
**Posudzovaný repozitár:** `C:\workspace\websites\moonid_b2b_portal`
**Posudzované živé nasadenie:** `https://moonid-b2b-portal.vercel.app`
**Rozsah:** aplikačný kód, dátový model, produkčná konfigurácia viditeľná z aplikácie, read-only agregované kontroly produkčnej databázy, build/test/CI, B2B funkcionalita, UX, prístupnosť a právne texty.

> **Verdikt po lokálnej náprave: NO-GO pre produkčný cutover.** Potvrdené aplikačné Critical/High chyby boli v pracovnej kópii odstránené alebo technicky ošetrené, ale zmeny ešte nie sú nasadené. Produkcia naďalej používa privilegovanú DB rolu, evidovala nulové overené MFA faktory, má zastaranú Pohoda synchronizáciu a nemá aplikované tri nové migrácie. Pred GO je potrebný aj izolovaný integračný/E2E retest, nezávislý pentest, restore drill a schválenie právnych textov slovenským právnikom.

Tento dokument je technické a prevádzkové posúdenie, nie právne stanovisko, certifikácia ISO 27001, PCI audit ani penetračný test. Žiadny audit bez kontrolovaného penetračného testu, kontroly cloudových dashboardov a organizačných procesov nemôže čestne garantovať, že systém „neobsahuje žiadnu bezpečnostnú dieru“.

## Post-remediation dodatok — stav pracovnej kópie

Nálezy a dôkazy v kapitolách nižšie opisujú baseline pred nápravou. Dňa 20. 8. 2026 boli v pracovnej kópii vykonané najmä tieto zmeny:

- Next.js bol aktualizovaný na `16.3.1`; `npm audit --audit-level=high` skončil s **0 známymi zraniteľnosťami**.
- Prihlásenie je serverom vlastnené, rate-limit kľúče sú HMAC pseudonymizované, canonical URL v produkcii zlyháva uzavreto a staff/admin MFA už nemožno vypnúť env prepínačom.
- Objednávkové zmeny, doménové udalosti a povinný audit sú atomické; checkout ukladá immutable seller/buyer/address/terms snapshot vrátane verzie, hash-u, textu a času potvrdenia.
- CSV export neutralizuje formula injection; obrázky sa po skutočnom decode, rozmerových a pixelových limitoch re-enkódujú do statického WebP bez metadát.
- Košíky sú per-user, finálny submit znovu kontroluje publikovanie produktu a nová adresa vzniká v rovnakej transakcii ako objednávka.
- CSP používa request nonce a `strict-dynamic`; runtime smoke test nepotvrdil `X-Powered-By`. Drawer/dialog mechanizmy dostali focus trap, Escape, návrat focusu a scroll lock.
- Readiness kontroluje vek Pohoda heartbeat/syncu a queue incidenty; pri aktuálnom stave správne vracia sanitizované `503 degraded`.
- DB audit triggery a Pohoda RPC sú vo verzovanej migrácii; bol pripravený least-privilege runtime-role runbook a automatická kontrola grantov. Produkčný credential však zatiaľ ostáva `postgres`, preto tento blocker nie je uzavretý.
- Nútený „GDPR súhlas“ bol odstránený tam, kde sa spracúvanie neopiera o súhlas; osobný DSR export bol oddelený od firemného administrátorského exportu. VOP a privacy texty boli technicky zosúladené, ale vyžadujú právne schválenie.

### Retest pracovnej kópie

| Kontrola | Výsledok po náprave |
|---|---|
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS — 0 upozornení** |
| cielené unit testy bez DB | **PASS — 7 súborov, 57/57 testov** |
| `npx prisma validate` | **PASS** |
| `npm run build` | **PASS — Next.js 16.3.1** |
| `npm audit --audit-level=high` | **PASS — 0 zraniteľností** |
| lokálny produkčný smoke test | **PASS** — `/login` 200, nonce CSP, sanitizovaný health |
| `npx prisma migrate status` | **NO-GO** — tri nové migrácie čakajú na kontrolovaný deploy |
| plný integračný/E2E suite | **NEVYKONANÝ** — vyžaduje izolovanú zmigrovanú testovaciu DB; produkčný DB guard testy zakazuje |

Tento dodatok nemení historické znenie jednotlivých nálezov. Ich uzavretie v produkcii sa smie potvrdiť až po nasadení, dôkazoch z cieľového prostredia a splnení acceptance gates v kapitole 9.

## 1. Manažérske zhrnutie

| Oblasť | Hodnotenie | Rozhodujúci dôvod |
|---|---|---|
| Bezpečnosť aplikácie | **D — nevyhovuje pre enterprise produkciu** | Potvrdená Next.js DoS, nadmerne privilegovaná DB rola, obídenie app login gate, CSV injection a neatomický audit |
| Tenantová izolácia | **D — nevyhovuje** | Všetky tabuľky majú RLS, ale bez politík; aplikačná rola má `BYPASSRLS`, izolácia stojí výlučne na správnosti každého query filtra |
| Identity a prístupy | **D — nevyhovuje** | Produkcia eviduje 0 overených TOTP faktorov; iba jeden aktívny ADMIN; rola STAFF je príliš široká |
| B2B funkcionalita | **C — solídny základ, nie enterprise komplet** | Cenníky, schvaľovanie, rýchla/opakovaná objednávka a Pohoda existujú; chýbajú viacúrovňové schvaľovanie, limity, segregácia rolí a nezmeniteľné zmluvné snapshoty |
| Prevádzka a integrácie | **D — nevyhovuje** | Skladový sync je neaktuálny vyše 50 dní, pričom `/api/health` stále hlási `ok` |
| Právna pripravenosť | **D — NO-GO** | Verejné VOP obsahujú doslovné `[DOPLNIŤ]`, súhlas GDPR je vynucovaný v rozpore s vlastným textom a dôkaz o verzii VOP sa neukladá |
| UX/UI | **B — dobré, s opraviteľnými medzerami** | Profesionálny responzívny základ; chýbajú niektoré modal/a11y mechanizmy, zákaznícka dôvera trpí technickou doménou a dátovou kvalitou |
| Testovanie a CI | **B-/C+** | Typecheck, lint, build a 82 testov prešli; dependency audit zlyháva a accessibility Lighthouse je len varovanie |

### Bezprostredné blokery

1. Aktualizovať Next.js minimálne na opravenú verziu `15.5.21` a po aktualizácii zopakovať celý regresný a dependency audit.
2. Vytvoriť samostatnú najmenej privilegovanú runtime DB rolu; odobrať jej `BYPASSRLS`, `CREATEROLE` a `CREATEDB`. Migračná rola musí byť oddelená.
3. Vynútiť a reálne dokončiť MFA enrolment všetkých STAFF/ADMIN účtov; pripraviť kontrolovaný break-glass účet a obnovu prístupu.
4. Opraviť Pohoda/stock synchronizáciu a monitorovať vek posledného úspešného syncu. Dovtedy nekomunikovať „aktuálnu skladovú dostupnosť“ ani garantované rýchle dodanie.
5. Doplniť a právne schváliť VOP, oddeliť potvrdenie prijatia objednávky od akceptácie zmluvy a ukladať verziu podmienok ku každej objednávke.

## 2. Metodika, vykonané kontroly a limity

Posúdenie bolo vedené ako risk-based code review podľa aktuálneho [OWASP ASVS 5.0.0](https://owasp.org/www-project-application-security-verification-standard/) a s prihliadnutím na riadenie rizík podľa [NIST Cybersecurity Framework 2.0](https://www.nist.gov/cyberframework). Prístupnosť bola porovnaná s [WCAG 2.2](https://www.w3.org/TR/WCAG22/) na úrovni AA. Právna časť pracuje s aktuálnymi zneniami slovenských a EÚ predpisov citovanými v kapitole 10.

Vykonané boli najmä:

- statická kontrola 246 zdrojových/migračných súborov, približne 16 419 riadkov;
- kontrola 18 súborov so server actions a 4 API route súborov;
- kontrola Prisma schémy, migrácií, RLS/grantov, auditných triggerov a CI workflowov;
- read-only agregované dotazy do produkčnej DB bez zobrazenia zákazníckych PII alebo jednotlivých obchodných záznamov;
- manuálna kontrola verejného desktopového a mobilného UI v prehliadači;
- kontrola HTTP security headers, CSP, `security.txt`, robots a sitemap;
- overenie aktuálnych autoritatívnych bezpečnostných a právnych zdrojov k 20. 8. 2026.

### Automatizované výsledky

| Kontrola | Výsledok |
|---|---|
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS s 3 upozorneniami** — použitie `<img>` v staff katalógu |
| `npm test` | **PASS — 13 testovacích súborov, 82/82 testov** |
| `npx prisma validate` | **PASS** — zároveň upozornenie na deprecated `package.json#prisma` pred Prisma 7 |
| `npm run build` | **PASS** — Next.js 15.5.19; upozornenie na Edge runtime a `process.version` zo Supabase závislosti |
| `npx prisma migrate status` | **PASS — 26 migrácií, produkčná DB aktuálna** |
| `npm audit --json` | **FAIL — 10 high, 3 moderate, 0 critical** |

Testy overujú dôležité cenové, objednávkové a bezpečnostné invarianty, ale 82 unit/integration testov nie je dostatočný dôkaz enterprise odolnosti. Chýba automatizovaný DAST, SAST s blokujúcim severity policy pre celý pipeline, autentifikované end-to-end a11y scenáre, tenant escape test suite a pravidelný nezávislý penetračný test.

### Čo nebolo možné overiť iba z repozitára

- Supabase Auth nastavenia: CAPTCHA, provider-side rate limits, detekcia uniknutých hesiel, session policy a presná konfigurácia e-mailov;
- Vercel/Supabase/Sentry/Resend dashboard RBAC, MFA, audit logy, zálohy, PITR, retencia a zmluvy/DPA;
- DNS, SPF, DKIM, DMARC a monitoring doručiteľnosti e-mailov;
- organizačný ISMS, incident response, BCM/DR, onboarding/offboarding, školenia, DPIA, RoPA a vendor risk management;
- autorizovaný invazívny penetračný test, záťažový test, phishing/credential-stuffing simulácia a fyzická bezpečnosť;
- veľkosť podniku a všetky okolnosti potrebné na definitívne posúdenie NIS2, zákona o kybernetickej bezpečnosti alebo zákonných výnimiek.

## 3. Potvrdené silné stránky

Tieto body sú reálne pozitíva a treba ich zachovať pri opravách:

- Autorizácia server actions a API rout používa `requireUser`, `requireStaff` alebo `requireAdmin`; kľúčové zákaznícke query obsahujú `companyId`/ownership filtre.
- Supabase session sa na serveri overuje cez `getUser`, nie iba dôverou v neoverený cookie payload.
- Staff zóna má AAL2/MFA bránu a pri chybe MFA API zlyháva uzavreto.
- Cena, DPH, poplatky, zľavy, stav skladu a order snapshoty sa vypočítavajú na serveri; klient nie je cenová autorita.
- Objednávkový tok používa transakcie, idempotency kľúče, CAS ochranu stavov a zaokrúhľovacie testy. Nákladová cena sa neposiela zákazníkovi.
- Dopyt má Zod validáciu, honeypot, rate limiting a Origin/Referer kontrolu.
- Image proxy/rehost používa allowlist, manuálne redirecty, timeout, limit veľkosti a odmieta SVG.
- JSON-LD vložený cez `dangerouslySetInnerHTML` prechádza bezpečnostným helperom.
- Prisma raw query použitia sú parametrizované; v repozitári nebolo nájdené `queryRawUnsafe`/`executeRawUnsafe`.
- Audit tabuľka má v živej DB triggery zakazujúce `UPDATE`, `DELETE` a `TRUNCATE`.
- Sentry konfigurácia vypína default PII a scrubuje cookies, authorization, query, e-mail a IP.
- `.env` súbory sú ignorované a neboli nájdené ako trackované súbory.
- Produkčné security headers obsahujú HSTS na 2 roky s preload, `X-Frame-Options: DENY`, `nosniff`, referrer/permissions policy, COOP a CORP.
- CI spúšťa migrácie, typecheck, lint, build, testy, npm audit, Gitleaks a Semgrep.
- Verejné UI je vizuálne konzistentné, responzívne, bez horizontálneho pretečenia v kontrolovanom mobile view; má skip link, viditeľný focus a podporu `prefers-reduced-motion`.

## 4. Bezpečnostné nálezy

Severity znamená: **Critical** = realistické riziko závažného incidentu alebo okamžitý release blocker; **High** = enterprise release blocker; **Medium** = treba odstrániť v krátkom cykle; **Low** = hardening/kvalita.

### SEC-01 — Critical: produkcia používa zraniteľný Next.js runtime

**Dôkaz:** lockfile obsahuje Next.js `15.5.19`; `npm audit` hlási high zraniteľnosti. [GHSA-m99w-x7hq-7vfj / CVE-2026-64641](https://github.com/advisories/GHSA-m99w-x7hq-7vfj) sa týka App Router Server Actions a umožňuje vzdialený DoS nadmerným CPU; oprava pre vetvu 15.5 je `15.5.21`. Portál Server Actions používa intenzívne.

Ďalšie advisories zahŕňajú SSRF pre custom server ([GHSA-89xv-2m56-2m9x](https://github.com/advisories/GHSA-89xv-2m56-2m9x)) a dynamic-host rewrites ([GHSA-p9j2-gv94-2wf4](https://github.com/advisories/GHSA-p9j2-gv94-2wf4)). Prvý nie je podľa advisory dosiahnuteľný na managed hostingu s pripnutým hostom a druhý portál nevyužíva, preto ich neklasifikujem ako potvrdený exploit v tomto nasadení. CPU DoS však dosiahnuteľný je.

**Dopad:** anonymný útočník môže vyčerpať aplikačné CPU a spôsobiť nedostupnosť objednávania.

**Náprava:** okamžite aktualizovať na `15.5.21` alebo novšiu podporovanú opravenú vetvu, znovu buildnúť/testovať a overiť `npm audit`. Doplniť edge/WAF rate limits a alert na anomálny počet Server Action požiadaviek; WAF nie je náhrada za patch.

### SEC-02 — Critical: aplikačná databázová rola porušuje least privilege a obchádza RLS

**Živý read-only dôkaz:** `current_user` bol `postgres`, `rolsuper=false`, ale `rolbypassrls=true`, `rolcreaterole=true`, `rolcreatedb=true`. Všetkých 34 verejných tabuliek má RLS enabled, ale 0 politík a žiadna nemá `FORCE ROW LEVEL SECURITY`.

**Dopad:** RLS momentálne nie je tenantová bezpečnostná hranica pre Prisma runtime. Jediná chyba v `companyId` filtri, SQL injection alebo kompromitovaný runtime credential môže odhaliť alebo meniť dáta všetkých zákazníkov. Credential má navyše schopnosť vytvárať roly a databázy, čo nie je potrebné pre web requesty.

**Náprava:** oddeliť tri identity: migrator/owner, runtime aplikácia a read-only observability. Runtime role udeliť iba potrebné `SELECT/INSERT/UPDATE/DELETE` na konkrétnych objektoch a `EXECUTE` na konkrétnych funkciách, bez `BYPASSRLS`, `CREATEROLE`, `CREATEDB`. Pre high-assurance tenant izoláciu zaviesť tenant RLS politiky viazané na transakčný session context a `FORCE RLS`, prípadne preukázateľne ekvivalentnú DB-enforced architektúru. Po rotácii credentialu spraviť negatívne tenant escape testy.

### SEC-03 — Critical: privilegované účty nemajú dokončené MFA

**Živý agregovaný dôkaz:** aktívne účty: 1× ADMIN, 1× STAFF; overené TOTP faktory v `auth.mfa_factors`: **0**.

Kód staff prístup správne smeruje na enrolment, ale kým legitímny používateľ faktor nezaregistruje, útočník so získaným heslom môže zaregistrovať vlastný faktor. Jeden ADMIN zároveň vytvára single point of failure.

**Náprava:** pozastaviť privilegovaný prístup, kontrolovane overiť identity a dokončiť enrolment. V Supabase/Vercel/Sentry/Resend vynútiť MFA aj pre infra účty. Mať minimálne dvoch menovaných adminov alebo bezpečný break-glass účet s hardware-backed MFA, offline recovery a auditovaným použitím. `MFA_ENFORCE=off` smie byť iba časovo obmedzený, schválený a monitorovaný incidentný mechanizmus.

### SEC-04 — High: aplikačný login lockout sa dá obísť a zneužiť na account DoS

**Dôkaz:** login UI najprv volá `loginGate`, ale heslo následne overuje priamo klient cez Supabase `signInWithPassword` (`app/(auth)/login/login-form.tsx`). Útočník môže volať Supabase Auth endpoint priamo a app gate obísť. Verejná Server Action `recordLoginFailure(email)` (`app/(auth)/actions.ts:53`) inkrementuje lockout bez dôkazu, že Supabase prihlásenie skutočne zlyhalo. Rotáciou IP je možné cielene uzamknúť cudziu adresu.

**Dopad:** app-layer credential-stuffing ochrana neposkytuje deklarovanú ochranu a zároveň vytvára cielený denial-of-service voči účtu.

**Náprava:** rozhodujúce rate limit/CAPTCHA/bot a breached-password kontroly musia byť na Supabase/Auth gateway vrstve, ktorú nemožno obísť. Failure event nesmie byť klientom samostatne falšovateľný; používajte dôveryhodný auth hook/log alebo serverom vlastnený login endpoint. Generické odpovede a per-IP/per-account ochranu zachovať bez tvrdého ľahko zneužiteľného lockoutu.

### SEC-05 — High: CSV formula injection v staff exporte

**Dôkaz:** `app/api/staff/export/route.ts:8-12` escapuje iba úvodzovky, oddeľovače a nové riadky. Bunky začínajúce `=`, `+`, `-`, `@`, tabulátorom alebo CR/LF sa pred otvorením v Exceli neneutralizujú. Export obsahuje hodnoty zadané zákazníkom, napríklad názov firmy alebo PO číslo.

**Dopad:** po otvorení exportu staffom môže tabuľkový procesor interpretovať útočníkov obsah ako vzorec; podľa možností klienta môže dôjsť k exfiltrácii alebo ďalšiemu zneužitiu. Pozri [OWASP CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection).

**Náprava:** všetky nedôveryhodné textové bunky neutralizovať bezpečným prefixom a quotingom podľa cieľového formátu; zvážiť XLSX s textovým typom buniek. Pridať regresné testy pre `=HYPERLINK(...)`, `+`, `-`, `@`, tab, CR/LF a full-width varianty.

### SEC-06 — High: audit a objednávkové udalosti nie sú atomické

**Dôkaz:** `lib/audit.ts` je best-effort a chyby vždy zachytí. Pri zákazníckom schválení, zamietnutí a storne sa CAS zmena stavu, order event a audit nevykonajú v jednej transakcii (`app/(portal)/objednavky/actions.ts`). Staff order event síce používa transakciu, audit však ostáva mimo nej.

**Dopad:** obchodný stav sa môže zmeniť bez histórie alebo bez bezpečnostného auditu. Append-only trigger chráni existujúce riadky, ale negarantuje, že riadok vznikol. To oslabuje dokazovanie, vyšetrovanie incidentov a zodpovednosť.

**Náprava:** povinné doménové udalosti a audit zapísať v rovnakej DB transakcii ako zmenu stavu; pri neúspechu rollback. Best-effort ponechať iba pre nepovinnú telemetriu/e-mail. Pridať testy simulujúce zlyhanie event/audit insertu.

### SEC-07 — High: manuálne DB bezpečnostné objekty nie sú plne reprodukovateľné migráciami

**Dôkaz:** živá DB má `no_update/no_delete/no_truncate` audit triggery a Pohoda RPC grant/revoke nastavenia. Časť je iba v `database/audit-append-only.sql` a `database/pohoda-agent.sql`; štandardný Vercel build spúšťa iba `prisma migrate deploy`. Prisma migrácie nereprodukujú celý živý stav.

**Dopad:** nový environment, disaster recovery alebo restore môže byť úspešný podľa Prisma, ale bez bezpečnostných triggerov/funkčných grantov.

**Náprava:** všetky produkčné DB objekty a granty presunúť do verzovaných, idempotentných a CI testovaných migrácií. Po restore automaticky overovať očakávané triggery, policies, grants a function ownership.

### SEC-08 — Medium: CSP povoľuje `unsafe-inline`

**Dôkaz:** produkčné `Content-Security-Policy` obsahuje `script-src 'unsafe-inline'` a `style-src 'unsafe-inline'`.

**Dopad:** CSP poskytuje slabšiu ochranu pri budúcej injekčnej chybe. Nie je to samostatný dôkaz XSS.

**Náprava:** zaviesť nonce/hash CSP kompatibilnú s Next.js, minimalizovať `connect-src`/`img-src` a pri chýbajúcom produkčnom Supabase hoste zlyhať build namiesto rozšírenia policy.

### SEC-09 — Medium: doplnkový session timeout zlyháva otvorene

**Dôkaz:** `lib/auth.ts:16-27` pri chybe práce so session cookie vracia stav, ktorý timeout nevynúti. Supabase token ostáva autoritatívny, takže nejde o úplné obídenie autentifikácie, ale extra idle/absolute kontrola nemusí platiť.

**Náprava:** pri staff/admin zlyhať uzavreto; pri zákazníkoch definovať vedomý availability/security trade-off, logovať metriku a mať test poškodeného cookie/store výpadku.

### SEC-10 — Medium: canonical invite URL môže spadnúť na nedôveryhodný Host/Origin

**Dôkaz:** `lib/invite.ts` pri chýbajúcom canonical env používa request `Origin`/`Host`. Na aktuálnom managed Vercel deployi je host typicky pripnutý, ale bezpečnosť závisí od infra konfigurácie.

**Náprava:** v produkcii povinne nastaviť a validovať jedinú canonical URL; pri chýbaní fail build/deploy. Nikdy nevytvárať bezpečnostné linky z ľubovoľného Host headera.

### SEC-11 — Medium: upload nekontroluje skutočný obsah súboru

MIME a veľkosť sa overujú a SVG je odmietnuté, ale chýba magic-byte/decode validácia, re-encoding a malware scanning. Po oprave zraniteľného `sharp/libvips` re-enkódovať obrázky do bezpečného formátu, odstrániť metadáta, nastaviť pixel/dimension bomb limity a podľa rizika skenovať uploady.

### SEC-12 — Medium: ďalšie dependency riziká

`npm audit` našiel spolu 10 high a 3 moderate. Okrem Next.js ide o `sharp/libvips`, `postcss`, Prisma config/deepmerge, `brace-expansion`, `fast-uri`, `js-yaml`, `nanoid` a moderate vetvy `exceljs/uuid` a Tailwind PostCSS. Nie všetky sú dosiahnuteľné v runtime; viaceré sú build/tooling. To však nie je dôvod ich ignorovať.

**Náprava:** aktualizovať priamo aj tranzitívne závislosti, ku každej nevyriešenej výnimke evidovať reachability, ownera, dátum expirácie a compensating control. CI už audit spúšťa; release musí zostať blokovaný pri neakceptovanom high náleze.

### Ďalší hardening

- `markMfa` je reportingový mirror volateľný staffom a neoveruje skutočný factor/AAL2; report nesmie byť používaný ako bezpečnostná autorita.
- Rate limiter pri DB chybe zlyháva otvorene. Pre login/reset musia rozhodujúce kontroly existovať aj u auth providera/edge vrstvy.
- Audit/rate-limit ukladajú raw IP, user agent a e-mailové kľúče. Minimalizovať, HMAC/pseudonymizovať kde je to možné a zosúladiť s retenciou a privacy notice.
- Zaviesť secret scanning aj na registry/deploy secrets, pravidelnú rotáciu a zákaz používania owner/migrator credentialu v runtime.

## 5. Prevádzka, dáta a integrácia Pohoda

### OPS-01 — Critical: skladová synchronizácia je dlhodobo neaktuálna, health check to nevidí

**Živý agregovaný stav k 20. 8. 2026:** posledný heartbeat agenta `2026-08-19T14:30:51Z`, posledný stock sync `2026-06-24T11:07:26Z`, posledný inbound `2026-06-25T08:16:37Z`. Zo 418 publikovaných produktov má 235 skladové dáta staršie než 24 hodín — **56,2 %**.

`lib/stock.ts` staré dáta bezpečne degraduje na „na objednávku“, čo bráni falošnému tvrdeniu „skladom“. Verejný `/api/health` však kontroluje iba dostupnosť DB (`SELECT 1`) a počas 50+ dní mŕtveho syncu vracia `status: ok`.

**Dopad:** B2B zákazník nevie spoľahlivo plánovať nákup a marketingové tvrdenia o skladovosti/rýchlom dodaní nie sú podložené. Prevádzka nemusí incident zaznamenať.

**Náprava:** samostatné readiness/dependency checks pre vek heartbeat, stock sync, inbound/outbound queue, poslednú chybu a queue lag; alert pri prekročení SLA. Health endpoint nesmie prezradiť citlivé detaily verejnosti, ale monitoring ich musí dostať autentifikovaným kanálom. Definovať RPO/RTO, replay/idempotency a runbook pre agent výpadok.

### OPS-02 — High: dátová pripravenosť katalógu a firiem

Živá produkcia obsahovala:

- 2 827 produktov, z toho 418 publikovaných;
- 270/418 publikovaných produktov bez primárneho obrázka — **64,6 %**;
- všetky 3 aktívne firmy mali nevyplnené aspoň jedno fakturačné pole;
- 3 aktívne dopravy a 3 aktívne platby;
- 9 objednávok, 2 faktúrne metadata, 0 dopytov.

Fallback obrázky obmedzujú vizuálny rozpad, ale pri enterprise katalógu je 64,6 % chýbajúcich produktových vizuálov zásadný obsahový nedostatok. Fakturačné polia treba validovať pred aktiváciou firmy alebo prvou objednávkou.

### OPS-03 — High: observability a recovery nie sú preukázané end-to-end

Sentry a health route sú dobrý základ, no repozitár nepreukazuje alert SLA, syntetický nákupný scenár, DB PITR restore drill, fronty s dead-letter/replay procesom ani disaster recovery test. Enterprise akceptácia vyžaduje dôkaz obnovenia, nie iba existenciu zálohy.

## 6. B2B funkcionalita

### Čo portál pokrýva dobre

- firemné tenanty a roly CUSTOMER_ADMIN, CUSTOMER_USER, STAFF, ADMIN;
- tier cenníky, manuálne produktové ceny, zľavy a DPH;
- rýchla objednávka vložením/CSV SKU až do 500 položiek;
- košík, obľúbené položky, opakovanie objednávky a idempotencia;
- priame objednávanie alebo jednoduché schválenie určeným approverom;
- viac dodacích adries, dopravy, platby, poplatky/thresholdy a PO referencia;
- história/stavy objednávok a faktúrne metadata;
- Pohoda SKU prepojenie, sync joby, sklad a inbound faktúry;
- serverová cenová autorita a snapshot ceny/názvu/SKU pri objednávke.

### FUN-01 — High: košík je zdieľaný celou firmou bez explicitného workflow

`Cart` má jedinečnosť na `companyId`, nie na používateľa (`prisma/schema.prisma:482+`). Každý člen firmy preto pracuje s rovnakým košíkom a môže meniť/mazať položky kolegu; odosielateľ sa stane tvorcom celej objednávky. UI tento kolaboratívny model nekomunikuje a chýba ownership/locking/audit riadkov.

**Náprava:** predvolene per-user cart. Ak Moonid chce zdieľaný procurement basket, navrhnúť ho explicitne ako requisition so spoluautormi, lockingom/verziovaním, auditom a jasným finálnym submitter/approver attribution.

### FUN-02 — High: objednávka neuchováva úplný nezmeniteľný obchodný snapshot

Order má cenové a item snapshoty, ale nie snapshot meny, predávajúceho, kupujúcej firmy, fakturačnej/dodacej adresy, kontaktných údajov ani verzie/hash VOP. Historické zobrazenie závisí od meniteľných relácií.

**Náprava:** pri odoslaní uložiť immutable legal/business snapshot a `termsVersion`, `termsHash`, `termsUrl`, `submittedAt`, `acceptedAt`/acceptance event. Zmenu adresára nesmie spätne meniť význam starej objednávky.

### FUN-03 — High: príliš hrubé interné RBAC a chýbajúca segregácia povinností

Rola STAFF môže spravovať produkty, base prices, DPH, publikovanie, zákazníkov, userov, order states, platby a dopravy. Len časť tier administrácie je ADMIN-only. To je nevhodné pre oddelenie obchodu, skladu, finančnej správy a katalógu.

**Náprava:** capability-based RBAC, napr. Catalog Manager, Pricing Manager, Order Ops, Finance, Customer Admin, Security Admin; citlivé cenové a právne zmeny cez four-eyes approval. Práva testovať maticou allow/deny.

### FUN-04 — Medium/High: schvaľovanie je iba jednokrokové

Chýbajú sumové limity, viacstupňové schválenie, cost centrá, budgety, delegation/out-of-office, expiry, SLA a eskalácia. Pre menších zákazníkov je súčasný model použiteľný, nie však enterprise procurement.

### FUN-05 — Medium: chýbajú kreditné a pohľadávkové kontroly

Portál nepreukazuje credit limit, account hold, overdue blocking/warning ani spend limit. Pri faktúrovej platbe je to významná B2B funkcia a kontrola rizika.

### FUN-06 — Medium: produkt skrytý po vložení ostáva odosielateľný

Pridanie do košíka vyžaduje `isPublished=true`, ale finálny product select v `createOrder` (`app/(portal)/kosik/actions.ts:219-230`) `isPublished` nevyberá ani nekontroluje. Produkt skrytý staffom po vložení môže byť stále objednaný.

**Náprava:** vo finálnej transakcii znovu validovať publikovanie, sellability, tenant entitlement, cenu a prípadný account hold.

### FUN-07 — Medium: nová dodacia adresa vzniká pred validáciou neprázdneho košíka

`createOrder` vytvorí adresu na riadkoch 201-210, no košík/riadky kontroluje až 217-234. Neúspešný checkout môže zanechať nepotrebnú adresu. Vytvorenie adresy presunúť do rovnakej transakcie ako objednávku po všetkých validáciách.

### Ďalšie maturity medzery

- faktúry obsahujú metadata, ale UI uvádza, že PDF príde neskôr;
- chýbajú returns/RMA/reklamačný workflow, partial shipment/backorder ETA a voľba žiadaného delivery slotu;
- chýba SSO/SAML, SCIM, EDI/API/PunchOut, jemné catalog entitlements, viac mien a jazykov;
- nie všetky tieto body sú povinné pre každý Moonid segment, ale treba ich zaradiť podľa ICP a veľkosti zákazníkov.

## 7. Právne a compliance posúdenie

### LEG-01 — Critical: verejné VOP sú nedokončené

`app/obchodne-podmienky/page.tsx` obsahuje živé placeholdery:

- riadok 55: minimálna hodnota objednávky `[DOPLNIŤ]`;
- riadok 62: hranica dopravy zdarma a poplatok `[DOPLNIŤ]`;
- riadok 64: splatnosť faktúry `[DOPLNIŤ]`.

Stránka „O nás“ navyše obsahuje `[DOPLNIŤ: IBAN]`. Takéto texty nesmú byť publikované ako platné podmienky. VOP musí schváliť slovenský právnik so znalosťou B2B e-commerce a reálneho obchodného procesu.

### LEG-02 — High: potvrdenie prijatia objednávky je zameniteľné s akceptáciou zmluvy

VOP hovoria, že zmluva vzniká potvrdením predávajúcim a že prijatie objednávky sa potvrdí bezodkladne (`app/obchodne-podmienky/page.tsx:44-47`). Ihneď po priamej objednávke však e-mail používa predmet **„Potvrdenie objednávky“** (`lib/email.ts:106-131`), hoci stav je iba `PRIJATA`; staff až neskôr mení stav na `POTVRDENA`.

Slovenský zákon č. 22/2004 Z. z. vyžaduje bezodkladné elektronické potvrdenie doručenia objednávky a predzmluvné informácie o technických krokoch, oprave chýb a dostupnosti podmienok; pri B2B sa § 3 až 6 uplatňujú, ak si strany nedohodnú inak. Aktuálne znenie: [zákon č. 22/2004 Z. z.](https://static.slov-lex.sk/static/SK/ZZ/2004/22/20250628.print.html).

**Náprava:** prvý e-mail jednoznačne nazvať „Potvrdenie prijatia objednávky — nejde o akceptáciu“. Samostatný autorizovaný event/e-mail nech predstavuje prijatie návrhu a vznik zmluvy. Uložiť čas, osobu/systém a verziu podmienok.

### LEG-03 — High: neexistuje dôkaz o verzii VOP priradenej k objednávke

Checkout nemá link/acknowledgment na konkrétnu verziu VOP a Order nemá `termsVersion/hash/acceptedAt`. Samostatný checkbox nie je automaticky jediný zákonný spôsob v B2B, no podmienky musia byť preukázateľne sprístupnené, reprodukovateľné a inkorporované do zmluvy. Ukladať verzovaný PDF/HTML snapshot a jeho hash.

### LEG-04 — High: vynútený „GDPR súhlas“ odporuje deklarovanému právnemu základu

Privacy notice tvrdí, že súhlas nikdy nie je podmienkou objednávky ani dopytu (`app/ochrana-osobnych-udajov/page.tsx:38`). Registrácia aj dopyt ho však vyžadujú (`app/registracia/actions.ts:31`, `app/api/dopyt/route.ts:68`) a UI používa „Súhlasím so spracovaním“.

Podľa čl. 7 ods. 4 [GDPR](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679) a [EDPB Guidelines 05/2020 on consent](https://www.edpb.europa.eu/documents/guideline/guidelines-052020-on-consent-under-regulation-2016679_en) nemusí byť súhlas slobodne daný, ak je poskytnutie služby podmienené súhlasom s nepotrebným spracúvaním.

**Náprava:** pre vybavenie žiadosti/dopytu použiť právnikom potvrdený správny základ, typicky predzmluvné opatrenia alebo oprávnený záujem podľa konkrétnej roly kontaktnej osoby. Checkbox zmeniť na potvrdenie oboznámenia s privacy notice, nie „súhlas“, ak sa na súhlase spracúvanie nezakladá. Marketingový súhlas musí byť samostatný, voliteľný, granulárny a preukázateľný.

### LEG-05 — High: privacy notice nie je dostatočne zosúladené s reálnym spracúvaním

- retencie sú v texte všeobecné, kým kód obsahuje konkrétne režimy: audit 24 mesiacov, vybavené dopyty 12 mesiacov, stale záznamy 24 mesiacov a rate-limit 7 dní;
- Sentry dáta sú označené ako „anonymizované“, čo konfigurácia nepreukazuje pri každej výnimke/breadcrumb; bezpečnejšie je „minimalizované/pseudonymizované“;
- Vercel Analytics a Speed Insights sú zapnuté globálne. Vercel ich opisuje ako cookie-free/anonymné ([Web Analytics](https://vercel.com/docs/analytics), [Speed Insights privacy](https://vercel.com/docs/speed-insights/privacy-policy)), ale notice má transparentne uvádzať účel, príjemcu, kategórie, prenosy a retenciu;
- treba overiť a zdokumentovať aktuálne DPA, subprocessor list, regióny, SCC/DPF a transfer assessment pre Supabase, Vercel, Sentry a Resend. Repozitár podpis/akceptáciu týchto dokumentov nepreukazuje.

Čl. 13 GDPR vyžaduje dobu uchovávania alebo kritériá jej určenia. Vytvoriť a reálne presadzovať retention schedule; zohľadniť právne nároky a zákonné archivačné povinnosti.

### LEG-06 — Medium/High: „export mojich údajov“ mieša GDPR právo a firemný export

CUSTOMER_ADMIN exportuje členov firmy vrátane e-mailov a last login a kompletné firemné údaje (`app/(portal)/nastavenia/actions.ts:115-140`). Prevádzkový firemný export môže byť oprávnenou B2B funkciou, ale nie je totožný s individuálnym právom na prístup/prenosnosť a nesmie nepriaznivo zasiahnuť práva iných osôb.

**Náprava:** oddeliť „Export firemných údajov“ s RBAC/auditom od individuálnej GDPR žiadosti. Pre DSR mať overenie identity, rozsah, lehoty, redakciu údajov tretích osôb a workflow právneho posúdenia.

### LEG-07 — Medium: cookies sú pravdepodobne iba nevyhnutné, ale tvrdenie musí zostať pravdivé

Aktuálna implementácia nepoužíva marketingové cookies; vlastný banner je informačné potvrdenie v `localStorage`. Výnimka pre technicky nevyhnutné cookies podľa § 109 ods. 8 zákona č. 452/2021 Z. z. je relevantná, kým neexistujú nepovinné cookies. Aktuálne znenie: [zákon č. 452/2021 Z. z.](https://www.slov-lex.sk/ezbierky/pravne-predpisy/SK/ZZ/2021/452/20260530). Regulátor potvrdzuje, že nepovinné cookies vyžadujú platný súhlas: [Úrad pre reguláciu elektronických komunikácií](https://www.teleoff.gov.sk/urad/aktuality/tlacove-spravy/urad-monitoruje-subory-cookies-weboch-vacsina-webovych-stranok-slovensku-nadalej-nezakonne-spracuva-data-pouzivatelov.html).

Pri budúcom pridaní reklamnej analytiky, replay, chat widgetov alebo sociálnych embedov treba pred načítaním zaviesť CMP a granular opt-in. Komentár v kóde nemá informačný banner nazývať „consent“, ak právnym základom nie je súhlas.

### Aplikačná matica právnych režimov

| Režim | Predbežné posúdenie | Podmienka/poznámka |
|---|---|---|
| GDPR | **Áno** | Portál spracúva údaje kontaktných osôb, userov, IP a obchodnú komunikáciu |
| Zákon č. 22/2004 Z. z. o elektronickom obchode | **Áno** | Elektronické objednávanie; v B2B sa niektoré ustanovenia dajú dohodou upraviť |
| Zákon č. 431/2002 Z. z. o účtovníctve | **Áno podľa typu záznamu** | Účtovné záznamy majú spravidla 10-ročnú lehotu; aktuálne znenie [Slov-Lex](https://www.slov-lex.sk/ezbierky/pravne-predpisy/SK/ZZ/2002/431/20260601) |
| Zákon č. 108/2024 Z. z. o ochrane spotrebiteľa | **Pravdepodobne nie pre čistý B2B nákup** | [Zákon](https://www.slov-lex.sk/ezbierky/pravne-predpisy/SK/ZZ/2024/108) sa viaže na spotrebiteľa; firma/IČO/approval musia skutočne vylúčiť spotrebiteľské nákupy, samotné vyhlásenie nestačí pri odlišnej realite |
| Zákon č. 351/2022 Z. z. o prístupnosti | **Pravdepodobne nie pre skutočne výlučný B2B servis** | Zákon sa vzťahuje na služby poskytované spotrebiteľom a má výnimku pre mikropodnik poskytujúci služby; pozri [zákon PDF](https://static.slov-lex.sk/pdf/SK/ZZ/2022/351/ZZ_2022_351.pdf) a [smernicu EÚ 2019/882](https://eur-lex.europa.eu/eli/dir/2019/882/oj). WCAG AA je napriek tomu správny enterprise cieľ |
| NIS2 / slovenský zákon o kybernetickej bezpečnosti | **Nemožno potvrdiť z kódu; podľa známych faktov skôr nie** | Závisí od veľkosti, sektora, služieb a skupinových väzieb; vyžaduje samostatný scope assessment |
| PCI DSS | **Nie v aktuálnom toku** | Portál nespracúva kartové údaje; pri budúcej platobnej bráne sa scope znovu posúdi |
| ISO/IEC 27001 | **Nie je možné „splniť kódom“** | Ide o certifikovateľný organizačný ISMS, nie zoznam framework nastavení |

## 8. UX/UI a prístupnosť

### Pozitíva

- jasná Moonid vizuálna identita, profesionálna typografia, hierarchia a konzistentné CTA;
- responzívny verejný web a katalóg bez horizontálneho overflow v kontrolovanom mobile view;
- skip link, landmarky, focus-visible stavy, reduced motion a korektný verejný hlavný nadpis;
- katalóg má zrozumiteľný filter/sort, počet produktov a dobré mobilné rozloženie;
- login má labely a autocomplete; modal dopytu má `role=dialog`, `aria-modal`, názov, autofocus, Escape a body scroll lock;
- verejná prvá katalógová stránka načítala obrázky/fallbacky bez rozbitého alt textu.

### UX-01 — High: produkcia používa technickú Vercel doménu a nesprávnu canonical identitu

Canonical/OG URL smerujú na `moonid-b2b-portal.vercel.app`. Marketing v UI používa `portal.moonid.sk`, ale `portal.moonid.sk` aj `b2b.moonid.sk` vracali pri audite 404. Verejný web je indexovateľný pod technickou doménou.

**Dopad:** nižšia B2B dôvera, nekonzistentné e-maily/linky a SEO autorita na nesprávnej doméne.

**Náprava:** nakonfigurovať jednu overenú firemnú doménu, redirect všetkých alternatív, canonical/OG/sitemap/security.txt a invite URL z jedného povinného env. Ak je Vercel URL iba staging, nastaviť auth a `noindex`, nie produkčné canonical.

### UX-02 — Medium: modal nie je úplne modal podľa APG

Chýba focus trap, obnova focusu na spúšťací prvok a inert/`aria-hidden` pozadia. W3C modal pattern očakáva, že Tab ostane v dialógu a po zavretí sa focus logicky vráti: [WAI-ARIA APG Modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

### UX-03 — Medium: prístupnosť nie je release gate

Lighthouse CI má a11y threshold iba na úrovni warning a job pokračuje. Chýbajú autentifikované axe testy pre login, katalóg, košík, checkout, schválenie, nastavenia a staff. Niektoré staff/auth polia sa spoliehajú na placeholder bez zjavného programatického labelu; treba ich potvrdiť v autentifikovanom DOM audite.

**Náprava:** WCAG 2.2 AA ako blokujúci gate pre kritické scenáre, manuálna klávesnica + NVDA/VoiceOver kontrola a regresné testy focus/error/status announcements.

### UX-04 — Medium: obsahová dôveryhodnosť

- homepage komunikuje „1 600+“ sortimentu; živý katalóg zverejňuje 418 produktov, hoci DB má 2 827 celkom. Tvrdenie treba formulovať tak, aby zákazník rozumel rozdielu medzi dostupným portfóliom a online katalógom;
- 64,6 % publikovaných produktov nemá primárny obrázok;
- mobilný login má viditeľný `h2`, kým `h1` je iba v desktopovom paneli skrytom na mobile; upraviť dokumentovú hierarchiu bez vizuálneho dopadu;
- viaceré icon controls majú približne 32–36 px. Spĺňajú WCAG 2.2 AA minimum 24 px, ale pre robustný touch UX odporúčam 44 px cieľ tam, kde to layout dovoľuje.

## 9. Remediačný plán a enterprise acceptance gates

### Do 24 hodín — containment

- [ ] patchnúť Next.js a znova nasadiť;
- [ ] dokončiť/overiť MFA privileged účtov a zabezpečiť recovery;
- [ ] obmedziť alebo dočasne pozastaviť staff CSV export;
- [ ] odstrániť verejné placeholdery alebo dočasne stiahnuť neplatné VOP z ostrého objednávkového toku;
- [ ] vyhlásiť a opraviť sync incident, zobraziť primeranú informáciu o neaktuálnej dostupnosti;
- [ ] potvrdiť monitoring podozrivých Server Action požiadaviek a privileged loginov.

### Do 7 dní — release blockers

- [ ] least-privilege runtime DB rola, oddelený migrator, rotácia credentialov a tenant negatívne testy;
- [ ] provider-side auth ochrana a odstránenie falšovateľného login failure lockoutu;
- [ ] CSV neutralizácia + regresné testy;
- [ ] atomické order event/audit transakcie;
- [ ] verzované DB security migrácie a restore verification;
- [ ] právnikom schválené VOP/privacy/cookie texty a jednoznačný order acceptance flow;
- [ ] immutable order/company/address/terms snapshot;
- [ ] canonical firemná doména a povinná canonical URL konfigurácia;
- [ ] monitoring freshness Pohoda/stock/inbound/outbound s pager alertom.

### Do 30 dní — enterprise hardening

- [ ] granular interné RBAC a segregácia povinností;
- [ ] per-user cart alebo explicitný shared requisition workflow;
- [ ] sumové/multi-level approval, spend/credit/account-hold pravidlá podľa ICP;
- [ ] dependency exceptions register a patch SLA;
- [ ] CSP nonce/hash, upload re-encoding/scanning a auth/edge WAF hardening;
- [ ] automatizované cross-tenant, IDOR, concurrency, authenticated axe a critical-path E2E testy;
- [ ] PITR restore drill, Pohoda replay test a incident runbook;
- [ ] RoPA, DPA/subprocessor/transfer register, retention jobs a DSR workflow;
- [ ] nezávislý autorizovaný penetračný test po opravách.

### Podmienky zmeny verdiktu na GO

GO odporúčam až po splnení všetkých týchto bodov:

1. Žiadny otvorený Critical ani neakceptovaný High nález; dependency scan bez neakceptovaného high runtime rizika.
2. Dôkaz, že runtime DB credential nemá owner/migrator oprávnenia a cross-tenant testy zlyhávajú bezpečne.
3. Všetky privilegované účty s overeným MFA, zdokumentovaný break-glass a auditovaná obnova.
4. Stock/Pohoda sync v definovanom SLA a alert otestovaný riadeným zlyhaním.
5. Finálne právne texty a preukázateľný, verzovaný order acceptance/terms proces.
6. Typecheck, lint, build, unit/integration, critical E2E, tenant/security a WCAG gate zelené.
7. Nezávislý pentest bez nevyriešeného Critical/High a vykonaný restore/recovery drill.

## 10. Autoritatívne zdroje

Bezpečnostné a technické:

- [OWASP Application Security Verification Standard 5.0.0](https://owasp.org/www-project-application-security-verification-standard/)
- [NIST Cybersecurity Framework 2.0](https://www.nist.gov/cyberframework)
- [Next.js App Router DoS — GHSA-m99w-x7hq-7vfj](https://github.com/advisories/GHSA-m99w-x7hq-7vfj)
- [Next.js custom server SSRF — GHSA-89xv-2m56-2m9x](https://github.com/advisories/GHSA-89xv-2m56-2m9x)
- [Next.js rewrites SSRF — GHSA-p9j2-gv94-2wf4](https://github.com/advisories/GHSA-p9j2-gv94-2wf4)
- [OWASP CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection)
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [WAI-ARIA APG — Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

Právne a privacy:

- [Nariadenie (EÚ) 2016/679 — GDPR](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679)
- [EDPB Guidelines 05/2020 on consent](https://www.edpb.europa.eu/documents/guideline/guidelines-052020-on-consent-under-regulation-2016679_en)
- [Zákon č. 22/2004 Z. z. o elektronickom obchode — aktuálne znenie použité pri audite](https://static.slov-lex.sk/static/SK/ZZ/2004/22/20250628.print.html)
- [Zákon č. 431/2002 Z. z. o účtovníctve — znenie od 1. 6. 2026](https://www.slov-lex.sk/ezbierky/pravne-predpisy/SK/ZZ/2002/431/20260601)
- [Zákon č. 108/2024 Z. z. o ochrane spotrebiteľa](https://www.slov-lex.sk/ezbierky/pravne-predpisy/SK/ZZ/2024/108)
- [Zákon č. 452/2021 Z. z. o elektronických komunikáciách — znenie od 30. 5. 2026](https://www.slov-lex.sk/ezbierky/pravne-predpisy/SK/ZZ/2021/452/20260530)
- [Zákon č. 351/2022 Z. z. o prístupnosti výrobkov a služieb](https://static.slov-lex.sk/pdf/SK/ZZ/2022/351/ZZ_2022_351.pdf)
- [Smernica (EÚ) 2019/882 — European Accessibility Act](https://eur-lex.europa.eu/eli/dir/2019/882/oj)
- [Slovenský regulátor — monitoring zákonnosti cookies](https://www.teleoff.gov.sk/urad/aktuality/tlacove-spravy/urad-monitoruje-subory-cookies-weboch-vacsina-webovych-stranok-slovensku-nadalej-nezakonne-spracuva-data-pouzivatelov.html)
- [Vercel Web Analytics documentation](https://vercel.com/docs/analytics)
- [Vercel Speed Insights privacy](https://vercel.com/docs/speed-insights/privacy-policy)

---

**Záver:** Moonid portál nie je zlý prototyp; je to funkčne bohatý B2B základ s viacerými správnymi bezpečnostnými rozhodnutiami. Aktuálna kombinácia runtime zraniteľnosti, DB oprávnení, nepripraveného MFA, mŕtvej skladovej synchronizácie a nehotových právnych textov však objektívne vylučuje označenie „enterprise-ready“. Po odstránení release blockerov treba vykonať retest, nezávislý pentest a právne schválenie ostrého procesu.
