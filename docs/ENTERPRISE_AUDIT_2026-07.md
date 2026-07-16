# Enterprise audit — Moonid web + B2B portál

> Dátum: **2026-07-16** · Auditované proti reálnemu kódu (`file:line`), živým HTTP hlavičkám a Supabase advisorom.
> Multi-agentový audit (6 nezávislých reportov): legal/compliance, security, frontend/UX, funkčnosť, kód/ops, syntéza.
> Live: https://moonid-b2b-portal.vercel.app · Commit v čase auditu: `b3c1f10`.

**Celkové skóre ≈ 7.8/10 — enterprise v dizajne, hobby-tier v prevádzke.**

Obsah: 1. Syntéza · 2. Legal · 3. Bezpečnosť · 4. UX · 5. Funkčnosť · 6. Kód & ops

---

# MOONID B2B — DEFINITÍVNY ENTERPRISE AUDIT VERDIKT
*Lead auditor synthesis · 5 reports reconciled · 2026-07-16*

---

## 1. Executive verdict

**Partly — premium build on hobby-tier operations.** On the two axes buyers judge in five seconds — **design craft** and **code quality** — this genuinely clears the "$10k, modern-2026" bar and is not templated: a bespoke editorial type system applied coherently across public site and portal, plus Decimal money handling, a delete-first transactional anti-duplicate order guard, compare-and-swap status transitions, SHA-pinned CI with gitleaks/semgrep, and near-zero `any`. That is legitimately senior-grade and above the median agency B2B build. It is **not yet "enterprise"** for three honest reasons, none of them architectural: (1) it runs on **free-tier infra with no backups / no PITR** for a system that is the source of record for orders — for an order system, "no tested restore" is disqualifying; (2) **transactional email does not actually send** (Resend `moonid.sk` DNS blocker) — every confirmation, invite, and status mail is logged-and-skipped, so a customer today places an order into silence; (3) **two HIGH security items** (MFA is opt-in for staff; the login lockout is browser-orchestrated and bypassable) leave a single phished staff password able to pull the full customer/PII export. Close the ~5 paid-tier/config/legal items and it earns the label outright.

---

## 2. Overall scorecard

| Oblasť | Skóre | Jednou vetou |
|---|---|---|
| **Legal & compliance (SK/EU 2026)** | **8.5/10** | B2B model correctly identified; everything B2B legally needs is present — only micro-gaps (OR vložka, dopyt legal basis, interný RoPA, EAA doc overstates itself). |
| **Security** | **8.0/10** | 0 CRITICAL, no IDOR, no committed secrets, full live header set — but MFA opt-in + bypassable login gate are real HIGHs, and tenant isolation is 100% app-layer (Prisma bypasses RLS). |
| **Frontend & UX** | **8.0/10** | Genuinely premium, bespoke, accessible, fast — the one "cheap tell" is scraped B2C consumer product descriptions on a B2B catalog. |
| **Functionality** | **7.0/10** | Order lifecycle is real, atomic, IDOR- and race-guarded; but invoices are an unpopulated placeholder, emails silently no-op, and customers can't cancel in-app. |
| **Code & ops quality** | **7.5/10** | Code axis ~9/10 (senior-grade); dragged to 7.5 by hobby-tier infra: no backups/PITR, no branch protection, Vercel Hobby ToS. |
| **OVERALL** | **≈ 7.8/10** | **Enterprise-ready in *design*, running on hobby-tier *operations*.** Premium deliverable; not yet production-hardened. |

---

## 3. 🔴 Tlačidlo na odstúpenie od zmluvy — definitívna odpoveď

### NEVZŤAHUJE SA. Nie je právne vyžadované. Neodporúčam ho pridávať.

**Prestaň sa tým trápiť — a tu je prečo, aby to bolo raz a navždy jasné:**

Povinnosť „withdrawal button" pochádza zo **Smernice (EÚ) 2023/2673** (nový **čl. 11a** smernice 2011/83/EÚ), transponovanej do **§ 20a zákona č. 108/2024 Z. z.**, účinnej **19. 6. 2026** pre zmluvy uzavreté po 18. 6. 2026. Je to **čisto spotrebiteľský (B2C)** inštitút — dva nezávislé dôvody, každý sám postačuje, ju z tohto portálu vylučujú:

1. **Osobný rozsah = len spotrebiteľ.** Registrácia vyžaduje **IČO**, VOP explicitne uvádzajú vzťah podľa **Obchodného zákonníka** („veľkoobchodný B2B predaj"). Kupujúci = podnikateľ. Právne komentáre potvrdzujú, že B2B obchodníci sú z povinnosti vyňatí.
2. **Vecný rozsah = zmluva uzavretá online.** Verejný web zmluvu online neuzatvára (cena „na vyžiadanie", CTA = dopyt, žiadna online platba) — ani hypoteticky nespadá do rozsahu.

Pridať tlačidlo by bolo **právne zavádzajúce**: B2B kupujúci podľa Obchodného zákonníka **nemá** zákonné 14-dňové právo na odstúpenie, takže tlačidlo by mu sľubovalo právo, ktoré neexistuje.

**Overené v kóde:** grep `odstúp|withdrawal|14 dní|spotrebiteľ` — žiadny withdrawal flow neexistuje. Zhody na „withdrawal" sú len session-timeout; „14 dní" = `splatDays` (splatnosť faktúry). **Absencia je správna a súladná, nie chyba.**

**Čo B2B napriek tomu právne POTREBUJE — a všetko to už MÁ:**
- ✅ **Identifikačné údaje** (Moonid s.r.o., sídlo, IČO/DIČ/IČ DPH) — footer + VOP + GDPR, kompletné
- ✅ **VOP** — B2B ladené (Obch. zák., výhrada vlastníctva)
- ✅ **Reklamačný poriadok** — sekcia + footer link (B2B záruka za vady platí, aj keď 14-dňové odstúpenie nie)
- ✅ **GDPR** — nadštandardné (právne základy, retencia, menovaní sprostredkovatelia s čl. 28 DPA / SCC)
- ❌ **SOI / ARS / poučenie o 14 dňoch** — sú **spotrebiteľské**, na B2B sa **nevzťahujú**; ich absencia je zámerná a korektná. **Nedopĺňaj ich.**

**Jediný spúšťač budúcej povinnosti:** ak by si niekedy začal predávať spotrebiteľom (fyzickým osobám-nepodnikateľom) s online uzavretím objednávky — vtedy naraz pribudne tlačidlo odstúpenia, SOI, ARS aj EAA. Dnes nie.

---

## 4. 🔴 BLOCKERS (fix before / at production)

| # | Issue · Evidence · Fix | Tag |
|---|---|---|
| **B1** | **Transakčné e-maily reálne neodchádzajú.** `lib/email.ts:45` no-op ak `RESEND_API_KEY`/`RESEND_FROM` chýba; doména `moonid.sk` = nevyriešený DNS blocker (nemáš DNS prístup). Dnes zákazník objednáva do ticha — žiadne potvrdenie, pozvánka, status. **Fix:** vyrieš doménu (subdoména `send.moonid.sk` alebo dočasne vlastná doména, ktorú kontroluješ) + over SPF/DKIM. Kód je hotový, chýba len provisioning. | `func` `ops` |
| **B2** | **MFA pre STAFF/ADMIN je opt-in, nie vynútené.** `lib/auth.ts:53-61` — `needsMfaChallenge` vráti true len ak už existuje verifikovaný TOTP faktor; staff bez faktora ostáva na AAL1 = prístup len na heslo ku všetkým PII + CSV exportu. S vypnutou leaked-password ochranou = jedno phishnuté heslo = plný únik tenantu. **Fix:** vynútiť enrolment — role ∈ {STAFF,ADMIN} bez faktora → redirect na povinné `/mfa`, blokovať staff plochy do AAL2. | `sec` HIGH |
| **B3** | **CSV export zákazníkov obchádza MFA gate.** `app/api/staff/export/route.ts:32-35` autorizuje cez inline role-check namiesto `requireStaff()`; middleware `/api/` nekryje. Aj staff s MFA vytiahne celý zoznam (IČO/DIČ/splatnosť) na AAL1. **Fix:** nahradiť inline check `await requireStaff()`. | `sec` MED→HIGH v kontexte B2 |
| **B4** | **Login lockout je obíditeľný.** `login-form.tsx:42` volá `signInWithPassword` priamo z prehliadača; útočník na `POST …/auth/v1/token` obíde `loginGate` aj `recordLoginFailure` — počítadlo sa nikdy nezvýši. **Fix:** spoľahnúť sa na Supabase server-side auth rate-limit ako autoritatívny (dotiahnuť/sprísniť), app-layer lockout brať len ako advisory. | `sec` HIGH |
| **B5** | **Enterprise infra blockers (paid-tier).** Vercel Hobby ToS zakazuje komerčné použitie → **Vercel Pro**. Supabase Free = **žiadne PITR, žiadne zálohy** pre systém záznamu objednávok → **Supabase Pro + jeden otestovaný restore drill**. GitHub Free private = **žiadna branch protection** → `main` sa dá force-pushnúť mimo CI gate. **Fix:** presun na platené tiery + jeden nacvičený restore. | `ops` |
| **B6** | **Faktúry sú prázdny placeholder prezentovaný ako feature.** `Invoice` model existuje, obe stránky ho renderujú, ale **nič ho nezapisuje** (grep `invoice.create` = 0); PDF download je comment-stub (`faktury/page.tsx:79`). **Fix pre soft-launch:** buď explicitne komunikovať „faktúry nájdete v Pohode/e-maile", alebo nepublikovať sekciu, kým nie je Pohoda→Invoice sync. Neinzerovať ako hotový portál feature. | `func` |

---

## 5. 🟡 SHOULD (before scaling / paying customers)

- **Enable Supabase leaked-password protection + min-strength** (advisor WARN). Client HIBP check v `set-password-form.tsx` je **fail-open** a obíditeľný priamym `updateUser`. `sec` MED
- **`rehostImage` SSRF:** `lib/rehost-image.ts:34` má default `redirect:"follow"` — 302 z trusted feedu na `169.254.169.254` by sa nahral do verejného `products` bucketu. Pridať `redirect:"manual"` + re-validovať `Location`. `sec` MED
- **Zákazník nevie zrušiť objednávku in-app.** Backend `canCancel` (`lib/orders/transition.ts:42`) už existuje — malý, dobre ohraničený `cancelOwnOrder` gated na PRIJATA/krátke okno. Najväčšia lifecycle diera. `func`
- **B2B popisy produktov** (frontend #1, najväčší „cheap tell"): scraped B2C texty („bezpečný pre vašu rodinu aj domáce zvieratá"), inline „Hlavné výhody/Použitie". Skrátiť na B2B špecifiká, renderovať ako `<ul>`. `ux`
- **Legal micro-gaps:** (a) doplniť **číslo vložky/oddielu v OR** (Okr. súd Nitra) do footera/VOP; (b) preformulovať **právny základ dopytu** zo „súhlasu" na predzmluvné vzťahy / oprávnený záujem (čl. 6/1/b); (c) viesť **interný RoPA** ako súbor (čl. 30); (d) opraviť **nepresné tvrdenie o EAA** v `docs/COMPLIANCE_2026.md` — EAA sa na mikropodnik + čistý B2B za loginom pravdepodobne **nevzťahuje**. `legal`
- **DPA formálne odsúhlasiť** v účtoch Supabase/Vercel/Resend/Sentry (deklarované na webe, over že aktivované). `legal` `ops`
- **Prehĺbiť testy okolo `createOrder`** — concurrency guard + backorder/on-request vetvy (len 2 integračné case-y dnes). Lacné, vysoká hodnota. `quality`

---

## 6. 🟢 NICE / polish

- Hero LCP obrázok bez `priority` → pridať `priority` (`fetchpriority=high`); to isté PDP main image. `ux`
- 7/16 homepage obrázkov bez `alt` (brand marquee) — WCAG 1.1.1; klony marquee `aria-hidden` + `alt=""`. `ux`
- Normalizovať mriežku katalógu na jednotný cream tile (dnes mix pack-shotov na #fff pôsobí ako generický e-shop proti editorial brandu). `ux`
- Číslované stránkovanie + „24 z 418" namiesto len prev/next. `ux`
- Login password show/hide toggle. `ux`
- CSP: zbaviť sa `script-src 'unsafe-inline'` cez nonce/hash (dokumentovaný accepted residual). `sec` LOW
- Overiť, že `scrubPii` je reálne zaregistrovaný v `sentry.*.config` beforeSend; zvážiť Prisma tenant-guard middleware ako RLS backstop. `sec` LOW
- E-fakturácia (ViDA/Peppol) — **nie 2026 blocker**, riešiť cez Pohoda→Peppol keď FS zverejní záväzný harmonogram (~2027+).

---

## 7. What's genuinely strong (real quality that IS there)

Toto nie je flattery — je to overené naprieč piatimi nezávislými reportmi:

1. **Money handling je urobené správne** — `Prisma.Decimal`, `ROUND_HALF_UP`, `Decimal(12,4)`, gross počítaný z *rounded* net kvôli self-consistency; `costPrice`/marža štrukturálne nikdy neuniká do client-facing ciest. To, čo väčšina buildov pokazí.
2. **Concurrency model je senior-grade** — delete-first transakčný anti-duplicate guard v `createOrder` zabíja double-click/two-tab duplikáty; compare-and-swap (`updateMany where status`) na status transitions; order číslovanie cez `OrderCounter.upsert{increment}` v tej istej tx.
3. **Tenant isolation je čistá** — žiadny IDOR; každý portal query scoped na `companyId`/`userId` a re-validovaný pri object access (`ownItemOrNull`, `findFirst({id, companyId})`). RLS enabled default-deny na všetkých 34 tabuľkách ako backstop.
4. **CI/supply chain nad úrovňou fundovaných startupov** — **SHA-pinned** GitHub Actions, least-privilege, gitleaks + semgrep `--error`, `npm audit` high-gate blokujúci, a **RLS-presence CI gate** ktorý zlyhá ak pribudne tabuľka bez RLS.
5. **Bezpečnostné hlavičky kompletné a live-overené** — CSP, HSTS preload, X-Frame DENY, COOP/CORP; auth cez `getUser()` nie spoofovateľný `getSession`; service-role `server-only`.
6. **Dizajn je bespoke, nie templated** — fluid `clamp()` type scale, Bricolage Grotesque, editorial číslované eyebrows, konzistentný jazyk public↔portál; a11y je silná stránka (`:focus-visible`, skip-link, `inert` mobile drawer, `prefers-reduced-motion`, aria-current). Výkon legitímne dobrý (137KB, load 960ms, lazy imgs, zero console errors).
7. **GDPR nadštandard** — právne základy rozlíšené, retenčné lehoty, menovaní sprostredkovatelia s čl. 28 DPA / SCC.
8. **Dokumentácia dospelá a sebakritická** — `ENTERPRISE_READINESS.md` sám enumeruje vlastné gapy a odmieta scope creep. Opak amatérskeho buildu.

---

### Bottom line pre rozhodnutie
Kód a dizajn už dnes prekonávajú väčšinu $10k deliverables. Medzi „current" a „enterprise/$10k plnohodnotne" nestojí architektúra — stoja **operácie a config: Resend doména (B1), vynútené MFA + CSV gate (B2/B3), Supabase/Vercel/GitHub paid tier s otestovaným restore (B5), a čestná komunikácia okolo faktúr (B6).** Withdrawal button medzi nimi **nie je** — a nikdy nebude, kým predávaš na IČO.

---

# COMPLIANCE AUDIT — Moonid B2B portál (SK/EU, 2026)

Auditovaný kód: `C:\workspace\websites\moonid_b2b_portal`. Live: https://moonid-b2b-portal.vercel.app

## MODEL POTVRDENÝ (dôležité pre celý verdikt)

Overil som v kóde dve povrchy a jednu jednoznačnú vec — **nikde sa neuzatvára spotrebiteľská zmluva na diaľku**:

- **Verejný web** (`app/produkt/[slug]/page.tsx`): cena = „Na vyžiadanie", CTA = „Vyžiadať ponuku" / „Ceny po prihlásení". Žiadne „Kúpiť/Do košíka", žiadna online platba. Len dopytový formulár.
- **B2B portál** (`app/(portal)/kosik/page.tsx`, `app/registracia/page.tsx`): za loginom, registrácia **vyžaduje IČO**, priraďuje sa cenová úroveň, objednáva sa „na firmu", platí sa **faktúrou so splatnosťou** (`splatDays`, default 14). VOP (`app/obchodne-podmienky/page.tsx`) explicitne: *„podnikateľským odberateľom… Vzťah sa riadi Obchodným zákonníkom SR; ide o veľkoobchodný (B2B) predaj."*

Kupujúci je teda **podnikateľ, nie spotrebiteľ**, a vzťah sa spravuje **Obchodným zákonníkom**, nie zákonom o ochrane spotrebiteľa.

---

## 1) TLAČIDLO NA ODSTÚPENIE OD ZMLUVY — VERDIKT

# ⛔ NEVZŤAHUJE SA na tento portál. Povinnosť je čisto B2C. Tu nie je právne vyžadovaná.

**Presná právna identifikácia:**
- **EÚ akt:** Smernica (EÚ) **2023/2673**, ktorá novelizuje smernicu o právach spotrebiteľov **2011/83/EÚ** a vkladá nový **článok 11a** („funkcia na odstúpenie od zmluvy" / withdrawal function — dvojkrokový mechanizmus: tlačidlo „odstúpiť od zmluvy tu" + samostatné potvrdenie + potvrdenie prijatia na trvanlivom nosiči).
- **SK transpozícia:** nový **§ 20a zákona č. 108/2024 Z. z.** o ochrane spotrebiteľa.
- **Účinnosť:** **19. júna 2026**, aplikuje sa na **zmluvy uzavreté po 18. júni 2026**.
- **Sankcia (pre tých, na koho sa vzťahuje):** pri nesúlade pokuty podľa vnútroštátneho práva; v niektorých štátoch až 2 mil. EUR / 4 % obratu.

**Prečo sa NEvzťahuje — dva nezávislé dôvody, každý sám postačuje:**

1. **Osobný rozsah = len spotrebiteľ (B2C).** Článok 11a aj § 20a hovoria výslovne o „obchodníkoch, ktorí uzatvárajú **spotrebiteľské** zmluvy na diaľku". Právnické komentáre to potvrdzujú jednoznačne — *„traders operating solely on the B2B market are exempted from the new requirement"* (Crowell & Moring). SK zdroje: 14-dňové odstúpenie „platí výlučne pre spotrebiteľov, nie pre B2B" (aksamec.sk, legalfirm.sk). Moonid predáva na IČO podnikateľom → mimo rozsahu.
2. **Vecný rozsah = zmluva uzavretá online cez rozhranie.** Povinnosť vzniká len tam, kde sa zmluva **reálne uzatvára online** a existuje k nej zákonné právo na odstúpenie. Verejný web Moonid zmluvu online neuzatvára (cena na vyžiadanie, dopyt) → ani hypoteticky by nespadol do rozsahu.

**GAP / remediácia:** Žiadna. Tlačidlo nie je povinné a **neodporúčam ho pridávať** — na B2B objednávky (Obchodný zákonník) zákonné 14-dňové odstúpenie neexistuje, takže „withdrawal button" by bol právne zavádzajúci a vytváral by falošné očakávanie práva, ktoré B2B kupujúci nemá. Jediné odporúčanie: v VOP ponechať/zvýrazniť vetu, že ide o B2B podľa Obchodného zákonníka a že spotrebiteľské právo na odstúpenie do 14 dní sa neuplatňuje (dnes je to implicitné cez „podnikateľským odberateľom" — pokojne to môže byť explicitnejšie).

⚠️ **Jediný scenár, kde by povinnosť ožila:** ak by Moonid niekedy začal predávať **fyzickým osobám-nepodnikateľom** (spotrebiteľom) s online uzavretím objednávky. Vtedy by § 20a platil. Dnes to tak nie je.

---

## 2) EXISTUJE V KÓDE ODSTÚPENIE/WITHDRAWAL FLOW?

Grep (`odstúp|withdrawal|reklamác|14 dní|spotrebiteľ`) cez `app/` + `components/`:
- **Withdrawal / odstúpenie od zmluvy: NEEXISTUJE** žiadne tlačidlo ani flow. Zhody na „withdrawal" boli len v `lib/session-timeout.ts` a `middleware.ts` (odhlásenie relácie, nesúvisí).
- **„14 dní"** = `splatDays: 14` (splatnosť faktúry) a session timeout — nie právo na odstúpenie.
- **Reklamácie: existujú** a sú B2B-korektné — `app/obchodne-podmienky/page.tsx` má sekciu „Reklamačné podmienky" (kontrola pri prevzatí, zjavné vady do 2 prac. dní, kontakt), footer na ňu odkazuje (`/obchodne-podmienky#reklamacie`).
- **„spotrebiteľ"** sa v UI textoch nevyskytuje (dobre — nesľubuje spotrebiteľské práva); slovo je len v `docs/`.

**Záver bodu 2:** Absencia withdrawal flow je **správna a súladná**, nie chyba.

---

## 3) GDPR

**REQUIRED? Áno** (spracúva sa meno, e-mail, IČO/DIČ, adresy, história objednávok — čl. 4 GDPR; kontaktné údaje živnostníkov = osobné údaje).

**PRESENT? Väčšinou áno, kvalitne.** `app/ochrana-osobnych-udajov/page.tsx`:
- ✅ Totožnosť prevádzkovateľa (Moonid s.r.o., sídlo, IČO), odkaz na GDPR + zákon 18/2018.
- ✅ Kategórie údajov, **právne základy** (čl. 6/1 b, c, f, a) — správne rozlíšené.
- ✅ **Retenčné lehoty** (10 rokov účtovné doklady).
- ✅ **Menovaní sprostredkovatelia**: Supabase (EÚ-Frankfurt), Vercel (EÚ-Frankfurt), Resend, Sentry, Pohoda/Stormware — s odkazom na **čl. 28 DPA** a **SCC (čl. 46)** pri prenose mimo EÚ. Toto je nadštandard.
- ✅ Práva dotknutých osôb vrátane sťažnosti na ÚOOÚ.
- **Cookies (`app/cookies/page.tsx` + `components/site/cookie-banner.tsx`)**: ✅ len **nevyhnutné** cookies, žiadne analytické/marketingové, banner len informuje („Rozumiem"), ukladá verziu + timestamp. Consent-model je súladný s ePrivacy — pri nevyhnutných cookies netreba súhlas, takže banner bez „Odmietnuť" je OK.

**GAPY / remediácia (drobné, nie blokery):**
- **RoPA (záznam o spracovateľských činnostiach, čl. 30):** verejná stránka RoPA nenahrádza — RoPA je **interný dokument**, nemusí byť na webe. Overiť, že reálne existuje ako súbor (checklist `docs/COMPLIANCE_2026.md` ho spomína, ale samotný RoPA v repo nevidím). **Remediácia:** viesť interný RoPA (aj jednoduchý XLSX/DOCX).
- **DPA zmluvy:** stránka ich deklaruje — over, že sú **reálne podpísané/aktivované** (Supabase, Vercel, Resend, Sentry majú štandardné DPA cez ToS; treba ich formálne odsúhlasiť v účte).
- **Právny základ dopytového formulára:** stránka uvádza „súhlas (písm. a)" pre dopyt. Pre B2B dopyt je vhodnejší **oprávnený záujem / predzmluvné opatrenia (čl. 6/1 b)** — súhlas by musel byť odvolateľný a formulár by inak nefungoval. Drobná nekonzistencia, odporúčam preformulovať na „predzmluvné vzťahy / oprávnený záujem".
- **Kontakt na zodpovednú osobu (DPO):** DPO nie je pre túto veľkosť povinný — OK, netreba.

---

## 4) POVINNÉ INFO POVINNOSTI SK E-SHOPU / DIAĽKOVÉHO PREDAJA

Rozlíšenie: časť povinností je **spotrebiteľských** (na B2B sa nevzťahujú), časť platí **vždy** (živnostenský zákon, zákon o e-commerce 22/2004, zákon o DPH).

| Povinnosť | Platí pre B2B? | Present? | Poznámka / remediácia |
|---|---|---|---|
| **Identifikačné údaje predávajúceho** (názov, sídlo, IČO/DIČ/IČ DPH, register) | ✅ Áno (§ 3a Obch. zák., zák. 22/2004) | ✅ **Áno** | Footer + VOP + GDPR: Moonid s.r.o., Hlavná 39/78 Dolný Ohaj, IČO 50 934 660, DIČ 2120530995, IČ DPH SK2120530995. Kompletné. |
| **Zápis v OR** (súd, oddiel, vložka) | ✅ Áno | ⚠️ **Čiastočne** | Uvádza sa „zapísaná v Obchodnom registri SR", ale **bez čísla vložky/oddielu**. Remediácia: doplniť „Okresný súd Nitra, odd. Sro, vl. č. …". |
| **VOP** | ✅ Áno | ✅ Áno | `app/obchodne-podmienky` — B2B ladené (Obch. zák.), objednávka, doprava/platba, výhrada vlastníctva. Dobré. |
| **Reklamačný poriadok** | ✅ Áno (aj B2B záruka za vady) | ✅ Áno | Sekcia „Reklamačné podmienky", footer link. OK pre B2B. |
| **Doprava a platby** | ✅ Áno | ✅ Áno | Sekcia `#doprava`. OK. |
| **DPH sadzba** | ✅ Áno | ⚠️ Skontrolovať | VOP hovorí „DPH v zákonnej sadzbe" (dobre, nezaväzuje sa číslom). `docs/COMPLIANCE_2026.md` uvádza 23 % základná — over aktuálnu sadzbu pri fakturácii. |
| **Orgán dozoru (SOI)** | ❌ **NIE pre B2B** | ❌ Chýba | Uvedenie SOI je **spotrebiteľská** povinnosť. Pri čisto B2B **nie je povinné**. Grep potvrdil: SOI/ARS sa v `app/` **nikde neuvádza** — a je to **v poriadku**. |
| **Alternatívne riešenie sporov (ARS/ADR)** | ❌ **NIE pre B2B** | ❌ Chýba | ARS (zák. 391/2015) je **výlučne pre spotrebiteľské spory**. B2B subjekt naň nemá nárok. Absencia je **korektná**. |
| **Poučenie o práve na odstúpenie do 14 dní + vzorový formulár** | ❌ **NIE pre B2B** | ❌ Chýba | Spotrebiteľská povinnosť. Neuvádzať — B2B ho nemá (viď bod 1). |

**Záver bodu 4:** Všetko, čo pre B2B **platí**, je prítomné (jediný drobný gap: číslo vložky v OR). Všetko, čo **chýba** (SOI, ARS, 14-dňové odstúpenie), sú **spotrebiteľské** povinnosti, ktoré sa na tento model **nevzťahujú** — ich absencia je zámerná a správna.

⚠️ **Jedno upozornenie na konzistenciu:** footer navigácia sa volá „Sortiment/Portál", nie je tam nič klamlivo spotrebiteľské. Ak by sa niekedy pridala možnosť predaja spotrebiteľom, VŠETKY tri riadky (SOI, ARS, odstúpenie do 14 dní) by sa stali povinné.

---

## 5) ĎALŠIE 2026 SK/EÚ POVINNOSTI

- **EAA — European Accessibility Act (smernica 2019/882), účinná 28. 6. 2025.** **REQUIRED? Diskutabilné, pravdepodobne NIE pre čistý B2B.** EAA sa vzťahuje na produkty/služby pre **spotrebiteľov** (e-commerce = „služba spotrebiteľom uzatváraná na diaľku"). Čistý **B2B portál za loginom** typicky **nespadá** pod EAA, a navyše platí **výnimka pre mikropodniky** poskytujúce služby (< 10 zamestnancov a ≤ 2 mil. EUR obrat) — Moonid tomu zodpovedá. **Verdikt:** EAA právne pravdepodobne **nie je povinný**. `docs/COMPLIANCE_2026.md` tvrdí opak („povinný pre B2B e-commerce") — to je **príliš prísne / nepresné**; oprav v dokumentácii. **Napriek tomu** WCAG 2.1 AA odporúčam ako dobrý štandard (najmä verejný web má SEO/UX prínos). Nie je to launch-bloker.
- **E-fakturácia (ViDA + SK).** **REQUIRED? Zatiaľ NIE (2026), povinné neskôr.** EÚ ViDA (EN 16931, Peppol) a povinná SK B2B e-fakturácia sa zavádzajú **postupne (rozbeh ~2027+)**. Dnes žiadna okamžitá povinnosť; keďže fakturuje Pohoda (SoR), riešiť to napojením Pohoda → Peppol access point, keď FS zverejní záväzný harmonogram. **Nie je launch-bloker 2026.**
- **NIS2.** Pre mikropodnik v gastro-zásobovaní sa **pravdepodobne nevzťahuje** (nie je „essential/important entity" podľa sektorov/veľkosti). Netreba riešiť.
- **eIDAS 2.0** — relevantné len ak by sa elektronicky podpisovali zmluvy; teraz irelevantné.

---

## SÚHRN PRE ROZHODNUTIE

1. **Tlačidlo na odstúpenie od zmluvy (19. 6. 2026): NEPOVINNÉ — a neodporúčam ho pridávať.** Portál je B2B (IČO, Obchodný zákonník) a verejný web neuzatvára zmluvy online. Smernica 2023/2673 / § 20a zák. 108/2024 = čisto B2C.
2. **Súlad je celkovo dobrý.** Reálne gapy sú len drobné: (a) doplniť **číslo vložky v OR** do footera/VOP, (b) preformulovať **právny základ dopytu** z „súhlasu" na predzmluvné vzťahy/oprávnený záujem, (c) mať **interný RoPA** ako súbor, (d) opraviť **nepresné tvrdenie o EAA** v `docs/COMPLIANCE_2026.md`.
3. **Absencia SOI / ARS / 14-dňového odstúpenia nie je chyba** — sú to spotrebiteľské inštitúty mimo tohto B2B modelu.
4. **Jediný „spúšťač" budúcej povinnosti:** akékoľvek otvorenie predaja spotrebiteľom s online objednávkou → vtedy naraz pribudne tlačidlo odstúpenia, SOI, ARS, EAA aj poučenie o 14 dňoch.

**Zdroje:**
- [Directive (EU) 2023/2673 / Art. 11a — Crowell & Moring: B2B exempt](https://www.crowell.com/en/insights/client-alerts/from-checkout-to-opt-out-the-eu-withdrawal-button-is-here-what-e-commerce-businesses-need-to-know)
- [Greenberg Traurig — Withdrawal Button, 19 June 2026 scope](https://www.gtlaw.com/en/insights/2026/5/eu-consumer-law-new-withdrawal-button-requirements-for-online-contracts)
- [legalfirm.sk — § 20a zák. 108/2024, len spotrebiteľské zmluvy](https://www.legalfirm.sk/sk/stranky/clanok/eshop-online-formular-odstupenie-od-zmluvy-povinnost)
- [Slov-Lex — zákon 108/2024 Z. z.](https://www.slov-lex.sk/ezbierky/pravne-predpisy/SK/ZZ/2024/108/)
- [aksamec.sk — Odstúpenie 2026: Občiansky vs Obchodný zákonník (B2B nemá 14 dní)](https://www.aksamec.sk/odstupenie-od-zmluvy-2026/)

Relevantné súbory: `C:\workspace\websites\moonid_b2b_portal\app\obchodne-podmienky\page.tsx`, `app\ochrana-osobnych-udajov\page.tsx`, `app\cookies\page.tsx`, `components\site\cookie-banner.tsx`, `components\site\footer.tsx`, `app\produkt\[slug]\page.tsx`, `app\registracia\page.tsx`, `app\(portal)\kosik\page.tsx`, `docs\COMPLIANCE_2026.md`.

---

Audit complete. All six areas covered with live verification. Findings below.

---

# MOONID B2B PORTAL — CRITICAL SECURITY AUDIT (read-only)
Target: `C:\workspace\websites\moonid_b2b_portal` · Live: https://moonid-b2b-portal.vercel.app · Supabase project `gckvseqlaxydsbutsjhm` · Date 2026-07-16

**Verdict: 0 CRITICAL, 2 HIGH, 5 MED, 3 LOW.** No IDOR, no committed secrets, no XSS vector found, all security headers present live. The real risk surface is that tenant isolation is 100% application-layer (Prisma bypasses RLS) plus MFA/lockout being advisory rather than enforced.

---

## 1. Supabase advisors + RLS state

**RLS state:** RLS is `enabled` on **all 34 public tables** (verified via `list_tables`), but **zero policies exist** — security advisor returns `rls_enabled_no_policy` INFO for every table (`User`, `Company`, `Order`, `Invoice`, `Cart`, `AuditLog`, `ProductSource`, … all 34). This is **default-deny** for the anon/`authenticated` PostgREST role: the public `NEXT_PUBLIC_SUPABASE_ANON_KEY` cannot read/write any row directly. The app reaches data exclusively through **Prisma over a direct Postgres connection** (`DATABASE_URL` pooler as the `postgres` role), which **bypasses RLS entirely**. So the empty-policy state is defense-in-depth, not a live hole.
- **State:** working as designed, but ALL tenant isolation depends on app code (see §3). **Severity: LOW (INFO).** If the anon key were ever used for data (`.from()` reads) it would fail closed — good. **Fix:** none required; keep it this way. Do not add permissive policies.

**Security advisor — every finding verbatim:**
- `rls_enabled_no_policy` (INFO) ×34 tables — see above.
- **`auth_leaked_password_protection` (WARN):** *"Leaked password protection is currently disabled."* HaveIBeenPwned check at the Supabase Auth layer is OFF. **Severity: MED.** The app does a client-side HIBP check in `set-password-form.tsx:8-19` but it is **fail-open** (`return false` on error) and only on the set-password screen — a client calling `supabase.auth.updateUser({password})` directly skips it. **Fix:** enable Supabase → Auth → Password protection (leaked-password + min strength) so it is enforced server-side. Remediation: https://supabase.com/docs/guides/auth/password-security

**Performance advisor — every finding verbatim (all INFO `unused_index`):** `User_role_idx`, `Order_pohodaSync_idx`, `Invoice_status_idx`, `PohodaSyncJob_status_idx`, `AuditLog_entity_entityId_idx`, `ProductSource_externalSku_idx`, `ProductGroup_categoryId_idx`, `ProductLink_pohodaSku_idx`, `Product_systemCode_idx`, `Product_scent_idx`, `Product_color_idx`, `Product_packSize_idx`, `Product_attributes_idx`, `PohodaSyncJob_status_nextAttemptAt_idx`, `AuditLog_companyId_idx`, `Order_createdById_idx`, `Order_deliveryLocationId_idx`, `Favorite_companyId_idx`, `OrderItem_productId_idx`, `OrderStatusEvent_changedById_idx`, `RepeatDraftItem_productId_idx`, `RepeatDraftItem_userId_idx`, `Cart_createdById_idx`, `CartItem_productId_idx`, `CompanyDispenser_dispenserModelId_idx`, `User_approverId_idx`, `Category_parentId_idx`. **Severity: LOW.** "Unused" reflects a low-traffic pre-launch DB (Order rows=9, Cart=1) — these back real FKs/filters and will be used in production. **Fix:** none now; re-check post-launch.

---

## 2. Auth: brute-force, MFA, session

**Login gate is client-orchestrated → bypassable. Severity: HIGH.**
`login-form.tsx:33` calls the `loginGate` server action, then authenticates with `supabase.auth.signInWithPassword` **directly from the browser** (`login-form.tsx:42`). The per-IP limit (`login:<ip>` 30/10min) and per-account lockout (`login-fail:<email>` threshold 10/15min, `actions.ts:12-27`) run only if the attacker goes through the app UI. An attacker hitting `POST https://gckvseqlaxydsbutsjhm.supabase.co/auth/v1/token?grant_type=password` directly (anon key + URL are public) **skips `loginGate` and `recordLoginFailure` entirely** — the lockout counter never increments and never fires. Only Supabase's own (generous) auth rate limit applies.
- **Evidence:** `app/(auth)/login/login-form.tsx:33-49`, `app/(auth)/actions.ts:17-27,53-63`.
- **Fix:** rely on Supabase's server-side auth rate-limiting as the authoritative control (tune it up), and/or move sign-in behind a server action/route that enforces `loginGate` before proxying to Supabase. Treat the current app-layer lockout as advisory only — don't count on it.

**MFA for staff is opt-in, not enforced. Severity: HIGH.**
`requireStaff`/`requireAdmin` gate on `needsMfaChallenge()` (`lib/auth.ts:53-61,78,88`), which returns true **only when a verified TOTP factor already exists** (`nextLevel==='aal2' && currentLevel==='aal1'`). A STAFF/ADMIN who never enrols a factor stays at AAL1 with `nextLevel==='aal1'` → **no challenge, password-only access** to all customer data, order management, and the customer/PII CSV export. Combined with leaked-password-protection OFF (§1), a single phished/weak staff password fully compromises the tenant.
- **Fix:** enforce enrolment — if `role∈{STAFF,ADMIN}` and no verified factor, redirect to a mandatory `/mfa` enrolment page; block staff surfaces until AAL2.

**Staff CSV export skips the MFA gate. Severity: MED.**
`app/api/staff/export/route.ts:32-35` authorizes via `getCurrentUser()` + a manual role check, **not** `requireStaff()`, so it never calls `needsMfaChallenge()`. Even a staff user who *has* enrolled MFA can pull the full customer list (IČO/DIČ/IČ DPH/splatnosť) and all orders at AAL1. `middleware.ts:67` matcher excludes `/api/`, so middleware doesn't cover it either.
- **Fix:** replace the inline check with `await requireStaff()` (which enforces MFA + `active`), keeping the response logic.

**Session timeout / cookie flags — solid. Severity: LOW (residual).**
App-layer idle 24h / absolute 14d (`lib/session-timeout.ts:13-14`) evaluated in `middleware.ts:25-47` **and** in `getCurrentUser` for `/api`/actions (`lib/auth.ts:15-27,36`) — closes the CSV-export-bypasses-timeout hole. Session cookie is `httpOnly`, `sameSite:lax`, `secure` in prod, `path:/` (`middleware.ts:9-15`). On timeout it revokes the refresh token and clears chunked `sb-*` cookies (`middleware.ts:32-43`). Documented residual (`session-timeout.ts:6-10`): state lives only in the client cookie, so a stolen `sb-*` token replayed *without* the `moonid-sess` cookie gets a fresh window (INIT) — full fix needs Supabase Pro server-side timebox. **Fix:** accept, or upgrade to Pro.

**Password change invalidation — good.** `set-password-form.tsx:48` calls `signOut({scope:"others"})` after `updateUser`, revoking other sessions. Client-orchestrated but acceptable.

---

## 3. Tenant isolation / IDOR — clean

Every portal query I inspected is scoped by `companyId` (or `userId`) and re-validated on object access. No object is fetched by `id` alone and returned:
- **Cart items:** `ownItemOrNull(itemId, companyId)` checks `item.cart.companyId === companyId` before update/delete (`kosik/actions.ts:52-57,98,111`).
- **Order detail:** `prisma.order.findFirst({ where:{ id, companyId: user.companyId ?? "__none__" }})` then `canView` role/creator/approver check → `notFound()` (`objednavky/[id]/page.tsx:19-32`). `costSnapshot` deliberately excluded.
- **Order approve/reject:** `loadForApproval` filters `companyId`, requires `CAKA_SCHVALENIE`, and `canApprove = CUSTOMER_ADMIN || approverId===user.id` (`objednavky/actions.ts:18-31`); state transition guarded by conditional `updateMany` (anti-race).
- **Repeat order:** source order filtered by `companyId` + non-admins restricted to own `createdById` (`kosik/actions.ts:441-446`); draft items ownership-checked (`kosik/actions.ts:420-421`).
- **Delivery address reuse:** `findFirst({ id, companyId })` (`kosik/actions.ts:211,501`).
- **Invoices:** `findMany({ where:{ companyId }})` + `role==='CUSTOMER_ADMIN'` gate (`faktury/page.tsx:28,33-37`).
- **State:** no IDOR found. **Severity: none.** Note the systemic risk: because Prisma bypasses RLS (§1), a single missing `companyId` filter in any *future* query = cross-tenant leak with no DB backstop. **Fix (hardening):** consider a Prisma middleware/extension that asserts `companyId` on tenant-scoped models, or add RLS policies + run app queries as an RLS-bound role.

---

## 4. Secrets & Sentry PII

- **.env gitignored:** yes — `.gitignore` `.env*` with only `.env.example`/`.env.test.example` allow-listed. `git ls-files` tracks only those two examples.
- **Committed secrets:** none. `git grep` for `eyJ…`/`service_role`/`sk_live` returns only a `package-lock.json` integrity-hash false positive. `.env.example` is all `<placeholders>`.
- **Service-role key:** used only in `lib/supabase/admin.ts` (`server-only`, `persistSession:false`); no `SERVICE_ROLE` reference anywhere in client/component code (grep clean).
- **Sentry beforeSend scrub:** `lib/sentry-scrub.ts:4-19` deletes `request.cookies`, `authorization`/`Authorization`/`cookie`/`Cookie` headers, `query_string`, and reduces `user` to `{id}` only. `lib/observability.ts` restricts `context` to non-PII operational keys. **State:** good. **Severity: LOW** — confirm `scrubPii` is actually wired into `beforeSend` in `sentry.server/edge/client.config.*` (not re-read here; the scrub function exists and is correct — verify the hook is registered).

---

## 5. Input validation, SSRF, upload, CSP

- **Zod on server actions / API:** consistent. Cart/order actions validate `ID`/`QTY` and `newAddressSchema` (`kosik/actions.ts:19-20,181-186`); `/api/dopyt` full zod schema + max lengths + honeypot + Origin/Referer CSRF check + rate limit (`api/dopyt/route.ts:14-56`). SKU paste capped at 500 lines / 60-char SKU (`kosik/actions.ts:121-123`).
- **SSRF — `/api/img`: well-hardened. LOW.** Takes opaque `ProductSource.id` (not a URL), pins `hostname==='www.partner.humed.sk'` + `https:`, `redirect:"manual"` (won't follow to internal), 8s timeout, content-type `image/*`, 10MB cap, STAFF-only (`api/img/route.ts:8,21-46`).
- **SSRF — `rehostImage`: redirect not pinned. Severity: MED.** `lib/rehost-image.ts:34` does `fetch(u.toString())` with **default `redirect:"follow"`** after validating only the initial host. A 302 from the trusted feed host (or an open-redirect on it) to `http://169.254.169.254/…`/internal would be followed and its body uploaded to the **public** `products` bucket. SVG is blocked (good, `:38`). **Fix:** add `redirect:"manual"` (as `/api/img` already does) and re-validate any `Location`, or reject 3xx.
- **CSP:** defined in `next.config.ts:16-29`, applied to `/:path*`, **production only** (`:43-46`). `default-src 'self'`, `object-src/frame-ancestors/frame-src 'none'`, `form-action 'self'`, `img/connect` pinned to the exact project Supabase host + HIBP. **`script-src 'self' 'unsafe-inline'` — Severity: MED (documented, accepted).** `'unsafe-inline'` weakens XSS defense; the code comments justify it (App-Router static rendering vs nonce). No reflected/stored XSS sink found (React auto-escape; JSON-LD escaped per comment). **Fix (optional):** move to nonce/hash-based `script-src` to drop `'unsafe-inline'`.

---

## 6. Live headers — `curl -sI https://moonid-b2b-portal.vercel.app` (all present, verified)

| Header | Present | Value |
|---|---|---|
| Content-Security-Policy | ✅ | `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; frame-src 'none'; form-action 'self'; img-src 'self' data: https://gckvseqlaxydsbutsjhm.supabase.co; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https://…supabase.co wss://…supabase.co https://api.pwnedpasswords.com; upgrade-insecure-requests` |
| Strict-Transport-Security | ✅ | `max-age=63072000; includeSubDomains; preload` |
| X-Frame-Options | ✅ | `DENY` |
| X-Content-Type-Options | ✅ | `nosniff` |
| Referrer-Policy | ✅ | `strict-origin-when-cross-origin` |
| Permissions-Policy | ✅ | `camera=(), microphone=(), geolocation=()` |
| Cross-Origin-Opener-Policy / Resource-Policy | ✅ | `same-origin` / `same-origin` |

Only residual: `script-src 'unsafe-inline'` (§5, MED). Note `Access-Control-Allow-Origin: *` appears on the static page — harmless for public HTML, but ensure it is **not** emitted on `/api/*` responses (the API routes don't set CORS, so cross-origin JS can't read them; fine).

---

## Prioritized fix list
1. **HIGH** — Enforce MFA enrolment for STAFF/ADMIN (`lib/auth.ts`); don't rely on opt-in `needsMfaChallenge`.
2. **HIGH** — Treat login lockout as advisory; harden Supabase-side auth rate limits (login is browser→Supabase direct, `loginGate` bypassable).
3. **MED** — `/api/staff/export`: swap inline check for `requireStaff()` so MFA/`active` gates apply.
4. **MED** — Enable Supabase leaked-password protection + min-strength (advisor WARN; client HIBP is fail-open only).
5. **MED** — `rehostImage`: set `redirect:"manual"` + re-validate `Location` (SSRF via redirect to public bucket).
6. **MED** — (optional) Drop CSP `script-src 'unsafe-inline'` via nonce/hash.
7. **LOW** — Verify `scrubPii` is registered in `sentry.*.config.*` beforeSend; consider Prisma tenant-guard middleware as an RLS backstop.

Key files: `lib/auth.ts`, `app/(auth)/login/login-form.tsx`, `app/(auth)/actions.ts`, `app/api/staff/export/route.ts`, `lib/rehost-image.ts`, `next.config.ts`, `lib/session-timeout.ts`, `middleware.ts`, `lib/sentry-scrub.ts`.

---

I have a comprehensive picture across public pages, the catalog/PDP, and the portal code. Here is the audit.

---

# Moonid B2B — Frontend / UX / UI Audit

**Verdict up front:** This genuinely clears the "$10k, modern 2026" bar on craft. It is not templated. The design language (deep-green editorial + Bricolage Grotesque display + fluid `clamp()` type + mint accent + hairline rules + oversized wordmark watermark) is coherent and confidently applied across public site *and* portal. The engineering underneath (next/image, next/font woff2, `prefers-reduced-motion`, `inert` mobile drawers, skip links, `:focus-visible`) is above what most agencies ship. The defects below are polish and content, not structural — but a few directly undercut the premium impression and are worth fixing before it's a reference piece.

## Strengths (verified live)
- **Typographic system is bespoke and disciplined.** Fluid scale via CSS vars (`--fs-display: clamp(44px,6.4vw,92px)`, h1/h2/h3/stat all clamped). Hero renders at 92px Bricolage on desktop, scales cleanly. Numbered section eyebrows (`01 / SORTIMENT`) are a real editorial device, not decoration.
- **Consistent language public↔portal.** Portal (`components/portal/portal-shell.tsx`) reuses the same mint/green/cream tokens, Bricolage display, B2B chip, grouped nav — reads as one product, not two.
- **Hidden-price B2B flow is clear and correct.** Every card shows "Cena na vyžiadanie → "; PDP shows a dedicated price card ("Na vyžiadanie / Firemné ceny vidíte po prihlásení") with dual CTA (Vyžiadať ponuku / Ceny po prihlásení). No dead ends. Catalog H1 pre-frames it ("Ceny vidíte po prihlásení alebo na vyžiadanie").
- **Performance is legitimately good.** /produkty: 137KB transfer, `load` 960ms, 546 DOM nodes, 24 cards/page (paginated, not 418 dumped), all product imgs `loading="lazy"` with correct `sizes`. next/image serving `w=256&q=75`. Fonts self-hosted woff2 with `display:swap` → no font CLS. **Zero console errors, zero 404s** across all pages; Sentry monitoring wired.
- **Accessibility is a strong point, not an afterthought.** Global `:focus-visible` (2px brand outline, offset), skip-link, mobile menu as `role="dialog" aria-modal inert={!open}` with Escape→return-focus, `aria-current="page"` on active nav, `aria-label` on all icon-only buttons (cart/menu/logout/search), `aria-hidden` on decorative SVGs, `prefers-reduced-motion` disables the marquees. Body/label contrast measured strong: hero mint eyebrow **13.7:1**, catalog subtitle **7.9:1**, price link **18:1**.
- **Responsive is properly built** (verified in code — the browser tool clamps window width so I couldn't reflow visually): `hidden lg:flex` desktop nav + `lg:hidden` dialog drawer; portal grid `lg:grid-cols-[256px_1fr]` with sliding drawer; primary CTAs are 44px tall.

## Ranked defects

**1 — HIGH (biggest "cheap" tell): Product descriptions are scraped B2C consumer blobs.**
PDP copy is unformatted run-on text aimed at the wrong audience: "bezpečný pre vás, vašu rodinu aj domáce zvieratá", "uľahčuje údržbu domácnosti", and it ignores its own structure — "Hlavné výhody:" and "Použitie:" are jammed inline instead of broken into lists. On 418 products this is the single element that most contradicts the premium marketing shell. *Fix:* strip to B2B-relevant specs, render "Hlavné výhody/Použitie" as real `<ul>`, cap length; even a templated 2-line B2B blurb beats a 300-word consumer scrape.

**2 — MEDIUM: Hero image is the LCP element but is not prioritized.** The full-bleed hero still-life (`~1905px`, next/image) has `loading="auto"`, `fetchpriority=null` — no `priority`. Observable: on first paint the hero showed plain green, image landed a beat late. *Fix:* add `priority` to the hero `<Image>` (sets `fetchpriority=high`, eager). Same on the PDP main image (currently `loading="auto"`).

**3 — MEDIUM: 7 of 16 homepage images have no `alt`.** Fails WCAG 1.1.1 — these are the brand-logo marquee (Sanytol/Tork/Katrin/…) and/or mockup images. *Fix:* give logos `alt="Sanytol"` etc.; if a set is duplicated for the infinite-scroll marquee, mark the clone `aria-hidden` + `alt=""`.

**4 — MEDIUM (aesthetic): Product grid dilutes the bespoke feel.** Cards use retail brand pack-shots on white with mixed lighting/aspect (green Ajax, blue Cif, Bref multipack). Correct for B2B, but against the editorial dark-green brand the grid reads like a generic e-shop — the sharpest drop in perceived tier between the marketing pages and the catalog. *Fix:* normalize to a consistent padded square on a single off-white/cream tile (not pure #fff), unified padding, subtle shadow — buys back most of the premium feel cheaply.

**5 — LOW/MED: Pagination is prev/next only.** 418 products ÷ 24 = ~18 pages with just "‹ Späť / Ďalej ›" — no page numbers, no jump, no result count per page. Deep items are slow to reach (search + category filters partly mitigate). *Fix:* add numbered pages or "load more", and show "24 z 418".

**6 — LOW: Card images fetched at `w=256 q=75` for ~280px slots** → slightly soft on 2× displays. *Fix:* let the `sizes` drive a srcset that includes a 2× candidate (e.g. 384/512) or nudge quality.

**7 — LOW: Login password field has no show/hide toggle** (`app/(auth)/login`). Minor B2B usability. Add a reveal button (`aria-pressed`).

**8 — NIT: Eyebrow/label sizes at 12.5–13px** (`.eyebrow`, stat captions) are at the small end. Contrast passes and these are labels, not body copy, so it's acceptable — just the floor.

## Notes for the record
- Could not visually verify 375/768 reflow — the browser's `resize_window` was clamped (window stayed 1920px, DPR 1); assessment of responsive is code-verified (clamp type + `lg:`/`md:`/`sm:` breakpoints + dialog drawers), which is sound.
- Consistency across `/`, `/produkty`, `/produkt/[slug]`, `/o-nas`, `/kontakt`, `/login` is tight — same header/footer, breadcrumb pattern, eyebrow system, CTA styling. Footer (nav + info + contact + legal + IČO/DIČ + wordmark watermark) is complete and professional.
- Sticky header light/dark state transition on scroll works; RFQ contact form has proper labels + required markers + typed dropdown.

Relevant files: `components/site/header.tsx` (mobile menu), `components/portal/portal-shell.tsx` (portal a11y — exemplary), `app/globals.css:32-37,96-106,225-259` (type scale, focus, reduced-motion), `app/layout.tsx` (next/font). The two things I'd fix first for maximum perceived-quality gain per hour: **#1 (B2B descriptions)** and **#4 (normalize card imagery)** — both are what a design director notices in 5 seconds on the catalog.

---

Audit complete. Full findings below.

---

# Moonid B2B Portal — Functional Lifecycle Audit

READ-ONLY trace. All claims cited `file:line`. Verdict up front: **core order lifecycle is real and coherent; two things are structurally absent — a customer-initiated cancel/withdrawal (reklamácia) flow, and any invoice population (Pohoda sync).**

## 1. CUSTOMER lifecycle

| Step | Works? | Evidence |
|---|---|---|
| Registration (access request) | ✅ real | `app/registracia/actions.ts` creates `AccessRequest`; landing at `/cakajuce` if no company (`app/cakajuce/page.tsx:14`) |
| Approval → account+invite | ✅ real | `app/staff/ziadosti/actions.ts:17` `approveRequest` upserts Company by IČO, sets tier+splatDays, creates Supabase invite, upserts User as CUSTOMER_ADMIN |
| Login / set password | ✅ real | `app/(auth)/login`, `/nastav-heslo`, `/zabudnute-heslo` |
| Browse catalog, per-tier price | ✅ real | `app/(portal)/kosik/actions.ts:74` `resolveUnitPrice` with `tierUnitNet` + `tierDiscount()`; tier price rows joined via `prices where priceTierCode` |
| Cart (add/qty/remove) | ✅ real, persists, IDOR-guarded | `kosik/actions.ts:59,94,107`; `ownItemOrNull` company check :53 |
| Quick order (SKU paste/CSV) | ✅ real | `kosik/actions.ts:134` `quickAddToCart` |
| Place order | ✅ real, persists, atomic | `createOrder` `kosik/actions.ts:188`; delete-first cart guard :281, order-counter numbering :283, snapshots prices/cost/pohodaSku, writes `OrderStatusEvent` :295 |
| Approval branch (restricted user) | ✅ real | `!user.canOrderDirectly` → `CAKA_SCHVALENIE` :192,288; notifies approver :311 |
| Order history + detail | ✅ real, IDOR-guarded | `objednavky/page.tsx`; detail `objednavky/[id]/page.tsx:19` company filter + role/approver view check :31 |
| Reorder | ✅ real, idempotent | `startRepeatOrder` :335 → `placeRepeatOrder` :430; unique `idempotencyKey` dedup :533; repeat-draft staging separate from cart |
| Invoices | ⚠️ **display-only placeholder** | `faktury/page.tsx:33` reads `Invoice` table; empty-state text "po vystavení a synchronizácii" :64; PDF download stubbed as comment :79. **No code anywhere writes Invoice** (grep `invoice.create` = 0 hits) |
| Settings (name/pwd, addresses, GDPR) | ✅ real | `nastavenia/*`; GDPR export+erasure request buttons `gdpr-section.tsx:47,69` |
| User management (invite/activate/role) | ✅ real | `nastavenia/member-manager.tsx`; `pouzivatelia/page.tsx` |
| **Cancel own order** | ❌ **absent** | Detail page `objednavky/[id]/page.tsx` has only "Opakovať objednávku" (:43) + back link — **no cancel button**. List page has STORNO only as a badge label (`page.tsx:17`). The customer's only STORNO path is an **approver rejecting a not-yet-approved colleague order** (`objednavky/actions.ts:55` `rejectOrder`, restricted to `CAKA_SCHVALENIE`). |

**Dead buttons / TODO:** none found in customer flow. The only "placeholder" strings are legitimate empty-states. Invoice PDF is the one real stub (comment `faktury/page.tsx:79`).

## 2. STAFF/ADMIN lifecycle

| Area | Works? | Evidence |
|---|---|---|
| Order status transitions | ✅ real, optimistic-locked | `staff/objednavky/actions.ts:22` `advanceOrder` (one step fwd, race guard :35, `confirmedAt` on POTVRDENA); UI `[id]/order-actions.tsx:28` |
| Order cancel (staff) | ✅ real | `cancelOrder` :50 (guarded by `canCancel`), confirm dialog + button `order-actions.tsx:20,42` |
| Order edit (qty/items/addr/note) | ✅ real, price-snapshot preserved | `updateOrder` :84, only in PRIJATA/POTVRDENA :73 |
| Access requests approve/reject | ✅ real | `ziadosti/actions.ts:17 approveRequest`, :98 `rejectRequest` |
| Inquiries (dopyty) | ✅ real | `dopyty/actions.ts:12 setInquiryHandled`; intake `app/api/dopyt/route.ts:89` creates `Inquiry` |
| Customers CRM | ✅ real | `zakaznici/actions.ts`: createCustomer, addUserToCompany, setActive, setRole, resendInvite (:26–125) |
| Products edit/publish/price/image | ✅ real | `produkty/actions.ts`: updateProduct, setProductPrices, setProductPublished, updateProductImage (:36–139) |
| Price tiers | ✅ real | `cenniky/actions.ts`: update/create/deleteTier (:16–58) |
| Categories | ✅ real, full tree | `kategorie/actions.ts`: create/rename/move/reorder/delete (:37–129) |
| Pohoda pairing | ✅ present | `staff/katalog/parovanie/*` |
| Audit log | ✅ real | `staff/audit/page.tsx`; `writeAudit` called on every mutation |
| MFA / security | ✅ present | `staff/bezpecnost/*` |
| Invoices (staff) | ⚠️ **display-only placeholder** | `staff/faktury/page.tsx:20` reads only; empty-state "po synchronizácii z Pohody" :44 |

Staff side is **complete** for the order+catalog+CRM lifecycle. No stubs except the invoice list (which has no data source).

## 3. Withdrawal / reklamácia / odstúpenie — VERDICT: **ABSENT as a functional flow**

There is **no button, no form, no server action, no state machine, and no admin queue** for withdrawal, order cancellation-by-customer, return, or complaint. Grep for `withdraw|reklam|odstúp|complaint|refund|dobropis|vrátenie` across `app lib prisma` returns only:
- **Legal prose**: `app/obchodne-podmienky/page.tsx:35` "Reklamačné podmienky" section (`#reklamacie`), lines 42–43 describe the manual process.
- **Help FAQ**: `app/pomoc/page.tsx:46` — "Reklamácia alebo vrátenie tovaru?" answer points to **email `moonid@moonid.sk` / phone 0919 216 908**, no in-app action.

So reklamácia is a **documented manual/email process only**. Customer-side: nothing to click. Admin-side: nothing to process (a returned/complained order has no representation — no RETURN/REFUND status, no credit note). This is the single largest functional gap versus a full B2B order lifecycle.

## 4. Order state machine (`lib/orders/transition.ts`)

- **States** (:4): `CAKA_SCHVALENIE, PRIJATA, POTVRDENA, PRIPRAVUJE, NA_CESTE, DORUCENA, STORNO`.
- **Forward flow** (:7, staff-only): PRIJATA → POTVRDENA → PRIPRAVUJE → NA_CESTE → DORUCENA. Triggered exclusively by `advanceOrder` (`requireStaff`).
- **STORNO / cancel window** (`canCancel` :42): allowed only while `PRIJATA | POTVRDENA | PRIPRAVUJE` — i.e. **not** once NA_CESTE/DORUCENA. Trigger = **staff** (`cancelOrder`), or **approver reject** while `CAKA_SCHVALENIE`.
- **Can a customer cancel?** **No.** A customer/approver can only reject an order still awaiting approval (`rejectOrder`). Once an order is PRIJATA it is staff-only.
- **Return / credit / refund flow?** **None.** No dobropis, no reverse transition, no partial return. STORNO is a terminal branch with no financial reversal.
- No time-based auto-cancel window (e.g. "cancel within X hours") — purely status-gated and staff-driven.

## 5. Notifications / email (`lib/email.ts`)

- **Architecture is real**: Resend integration, best-effort, never throws (`sendEmail` :44), HTML+text templates, PII masking, `Promise.allSettled` at call sites.
- **Wired events**: new-order-to-staff + customer confirmation on direct order (`kosik/actions.ts:305`), approval request to approver (:311), approve/reject decision to requester (`objednavky/actions.ts:47,66`), status-change to customer (`staff/objednavky/actions.ts:44`), access-invite (`ziadosti/actions.ts`).
- **BUT silently no-ops if unconfigured**: `if (!KEY || !FROM) … return { ok:false, skipped:true }` (:45–49). Per project memory the Resend domain (`moonid.sk`) is an unresolved DNS blocker — meaning in the current environment **every one of these emails is logged-and-skipped, not sent.** Code is correct; the dependency is not provisioned. This is a config/launch blocker, not a code gap.

## 6. Invoices — real or placeholder?

**Placeholder.** The `Invoice` model exists (`prisma/schema.prisma:681`), both customer and staff pages render it, but **nothing populates it** — no `Invoice.create`/`upsert` anywhere in `app`, `lib`, or an API route; no Pohoda→Invoice sync job exists. Both pages show a permanent empty-state. PDF download is an explicit comment stub (`faktury/page.tsx:79`). Acceptable for a soft launch **only if** customers are told invoices live in Pohoda/email for now; not acceptable as an advertised portal feature.

---

## Ranked gap list

1. **Customer cannot cancel/withdraw an order in-app** — no button on order detail (`objednavky/[id]/page.tsx`), no customer-facing action. Direct orders are staff-cancel-only. Highest-impact lifecycle hole. *(Backend `canCancel` already exists — a customer `cancelOwnOrder` action gated to PRIJATA/short window would be a small, well-scoped add.)*
2. **No reklamácia / return / complaint flow at all** (customer create + admin process + state) — currently email-only (`pomoc/page.tsx:46`, `obchodne-podmienky/page.tsx:35`). No RETURN/REFUND/dobropis state in the machine.
3. **Invoices never populated** — `Invoice` table has no writer; Pohoda invoice sync unimplemented (`faktury` pages display-only). Plus invoice PDF download stubbed.
4. **Emails silently skipped** — Resend `RESEND_API_KEY`/`RESEND_FROM` unset ⇒ confirmations, status changes, approval + invite mails all no-op (`lib/email.ts:45`). Domain/DNS provisioning blocker; wiring itself is complete.
5. **No return/credit path in the state machine** — STORNO is terminal with no financial reversal (`lib/orders/transition.ts`).

Everything else in both the customer and staff lifecycles is implemented, persists, is IDOR-guarded, race-guarded, and audited. No dead buttons or leftover TODOs were found outside the invoice PDF stub.

---

I have enough evidence for an honest verdict. Here is the scorecard.

---

# Enterprise-readiness audit — Moonid B2B portal
Staff-engineer verdict, evidence-based. Read-only pass over `lib/`, `app/`, `prisma/`, `.github/`, `tests/`, `docs/`.

## Bottom line
This is **genuinely well-engineered code — top ~10% of what "a solo dev + AI" ships, and above the median $10k agency B2B build on the code axis.** The money handling, order-creation concurrency, tenant-scoping discipline, and CI security posture are the real thing, not cargo-culted. Where it falls short of a literal "enterprise" label is **not the code — it's the operational tier**: it runs on free-tier infra (Vercel Hobby / Supabase Free) whose ToS and durability guarantees are themselves the enterprise blockers, and the author knows it (docs say so explicitly). No amateur tells of substance. A few honest gaps below.

---

## Scorecard (0–10)

### 1. Code architecture & money handling — **9/10**
Genuinely strong.
- Clean `lib/` vs `app/` separation; server actions consistently `requireUser()/requireStaff()` → validate with Zod → scope by `companyId`. Every action I read (`kosik/actions.ts`, `staff/objednavky/actions.ts`) gates auth first, validates input, and does explicit IDOR ownership checks (`ownItemOrNull`, `findFirst({ where:{ id, companyId }})`).
- **Money is done correctly** — the thing most builds get wrong. `lib/money.ts` uses `Prisma.Decimal` with `ROUND_HALF_UP`, DB columns are `Decimal(12,4)` for money / `Decimal(12,3)` for qty, gross is computed from the *rounded* net for self-consistency (`lib/pricing.ts`), and cost/margin (`costPrice`) is structurally never selected into client-facing paths. The comments show the author actually understands float failure at `.005` boundaries.
- **`any` abuse: essentially none** — 3 occurrences total in `app/`+`lib/`, all legitimate (Supabase cookie option shims, a generic Sentry-scrub constraint). That is exceptional discipline for this stack.
- Order snapshotting (price/name/SKU/cost frozen onto `OrderItem`) is correct B2B practice.
Deduction: `updateOrder` recomputes shipping VAT with a single blended `SHIPPING_VAT_RATE` rather than per-charge — minor, documented.

### 2. Concurrency, reliability & observability — **9/10**
This is where it clearly outclasses typical agency work.
- **Anti-duplicate order guard**: `createOrder` wraps everything in `prisma.$transaction`, does a *delete-first* `cartItem.deleteMany` and bails if `count === 0` — kills the double-click/two-tab duplicate-order class of bug. Order number allocated via `OrderCounter.upsert{ increment }` inside the same tx.
- **Optimistic locking**: `advanceOrder`/`cancelOrder` use `updateMany({ where:{ id, status: from }})` and detect `count === 0` as a race ("stav sa medzitým zmenil") — a proper compare-and-swap on state, no naive read-then-write.
- `reportError` (Sentry + structured JSON) is threaded through every fail-open path (audit, rate-limit, email). Audit writes are DB-level append-only (trigger). `/api/health` does a real `SELECT 1`. `x-request-id` correlation in middleware. Sentry server/edge/client all wired.
Deduction: no per-request structured logger beyond ad-hoc `console.error(JSON.stringify(...))`; no true APM/uptime (offloaded to external monitor by design).

### 3. Testing — **7.5/10**
Real, targeted, and CI-gated — but shallow in absolute count.
- ~68 unit/integration cases. The *right* things are covered: `money.test.ts` (17), `pricing.test.ts` (10), `transition.test.ts` (6), `tenant-isolation.test.ts` (4, real cross-company 404 assertions against ephemeral Postgres), `rls-enabled.test.ts` (CI gate that fails if any new table ships without RLS — genuinely clever), `session-timeout`, `staff-orders`, `create-order`.
- Playwright E2E (auth setup + order-flow + perf baseline) and a k6 load script exist.
Gaps: `createOrder` has only 2 integration cases — the concurrency guard and the backorder/on-request branches deserve explicit tests; no coverage threshold gate (deliberate, per docs). Money/pricing/tenant isolation are well covered, which is the correct priority.

### 4. CI/CD & supply chain — **9/10**
Better than most funded startups.
- **All GitHub Actions are SHA-pinned** (not `@v4` tags) — this alone puts it ahead of ~90% of repos.
- `ci.yml`: least-privilege `contents: read`, ephemeral Postgres, `tsc --noEmit` + ESLint + full `next build` + tests + `npm audit --audit-level=high`, all blocking.
- `security.yml`: gitleaks (full history, run as binary to avoid needing API perms) + semgrep `p/security-audit` with `--error`. Dependabot for npm + Actions (minor/patch grouped, majors held for manual). Lighthouse CI (warn-only). keep-alive cron with retries + bypass handling.
Deduction: semgrep/lint are the SAST depth ceiling (no CodeQL); `npm audit` high-gate can get noisy. Minor.

### 5. Security posture — **8.5/10**
- Strict CSP in prod (`default-src 'self'`, `object/frame-src/frame-ancestors` locked, connect/img pinned to the *exact* Supabase host, not `*.supabase.co`). Full header set incl. HSTS preload, COOP/CORP. Auth via `supabase.auth.getUser()` (not the spoofable `getSession` for trust), server-only service-role, HIBP password check, app-layer idle/absolute session timeout enforced in middleware **and** in `lib/auth` (so the `/api` CSV-export path can't bypass it — a subtle correct catch).
- **Honest caveat the author already documents**: `script-src 'unsafe-inline'` is retained (accepted residual risk); and **RLS is enabled default-deny but with no policies while Prisma connects as `postgres` (BYPASSRLS)** — so RLS is a backstop against direct Data-API/anon access, *not* a second enforcement layer for app queries. Tenant isolation is therefore **entirely app-layer**. That's a defensible design for this scale and is documented plainly — not hidden. MFA is scaffolded but gated on a Supabase toggle.

### 6. Docs — **9/10**
Unusually mature: `ENTERPRISE_READINESS.md` (a candid tracker that *lists its own remaining gaps and explicit "won't do" over-scope*), multiple dated `SECURITY_AUDIT_*`, `INCIDENT_RESPONSE.md`, `TESTING_STRATEGY.md`, `DEPLOYMENT_READINESS.md`, `PILOT_TEST_CHECKLIST.md`, Pohoda integration SOPs. The self-awareness here is the opposite of an amateur build.

### 7. "Enterprise infra tier" honesty — **5/10** (the real ceiling)
This is where the "$10k enterprise" claim must be qualified, and to the author's credit the docs don't oversell it:
- **Vercel Hobby**: commercial use violates Hobby ToS — a real B2B commercial portal must be on **Pro ($20/mo)**. Enterprise blocker until moved.
- **Supabase Free**: **no PITR, no automated backups**, 7-day auto-pause (hence the keep-alive hack). For a system of record for orders, "no backups" is disqualifying for an enterprise SLA — needs Supabase Pro + a tested restore drill.
- **GitHub Free private repo**: **no branch protection** available → `main` can be force-pushed / merged without required checks. The CI is excellent but not *enforceable* as a merge gate on this plan.
- No DPA/RoPA (GDPR Art. 30) executed with subprocessors; no PITR restore rehearsal.

---

## Genuine strengths (not flattery)
1. Decimal money + rounded-gross self-consistency + cost/margin never leaking client-side.
2. Delete-first transactional anti-duplicate order guard + compare-and-swap status transitions.
3. SHA-pinned Actions, gitleaks+semgrep, least-privilege CI, RLS-presence CI gate.
4. Near-zero `any`; consistent Zod-at-the-boundary; IDOR checks on every ownership path.
5. Documentation that honestly enumerates its own gaps and refuses scope creep.

## The real gap between "current" and "enterprise/$10k"
It is **operational, not architectural**:
- Move off free tiers: **Vercel Pro + Supabase Pro with PITR + one tested restore**, then **branch protection** (needs paid GitHub or public repo). These three are the honest launch blockers.
- Execute **DPA/RoPA** with Vercel/Supabase/Resend/Sentry.
- Turn on **Supabase MFA** for staff (code is ready) and add a **login rate-limit + bot challenge** on the public auth surface (the one hard security gap the docs also flag).
- Deepen tests around `createOrder` concurrency/backorder branches (cheap, high-value).

**Verdict:** Not an amateur build in any meaningful sense — the code, concurrency model, and CI are legitimately senior-grade and would pass a demanding review. It is "enterprise-*ready in design*, running on hobby-*tier infra*." Close the ~4 paid-tier/legal items and it earns the label outright; on the code axis alone it already exceeds most $10k deliverables.

Key files reviewed: `C:\workspace\websites\moonid_b2b_portal\lib\money.ts`, `lib\pricing.ts`, `lib\auth.ts`, `lib\rate-limit.ts`, `lib\orders\transition.ts`, `app\(portal)\kosik\actions.ts`, `app\staff\objednavky\actions.ts`, `middleware.ts`, `next.config.ts`, `prisma\schema.prisma`, `prisma\migrations\20260629150000_enable_rls\migration.sql`, `.github\workflows\{ci,security,lighthouse,keep-alive}.yml`, `.github\dependabot.yml`, `tests\*`, `docs\ENTERPRISE_READINESS.md`.