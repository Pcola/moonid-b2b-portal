# Gap analýza právnych stránok — Moonid s.r.o. (čistý B2B veľkoobchod)

*Compliance audit k 16. 7. 2026 · východisko: SK/EU právne požiadavky 2026, reálny obsah portálu Moonid, štruktúra 5 konkurentov (humed.sk, leoness.sk, corwell.sk, aldakozmetika.sk, roin.sk)*

---

## 1. Zhrnutie

Moonid má nasadené štyri z piatich právne kľúčových stránok (obchodné podmienky, GDPR, cookies, informácie o spoločnosti) a ich základná kostra je pre čistý B2B režim správne postavená — vzťah je výslovne podriadený Obchodnému zákonníku, ceny sú bez DPH, chýba (správne) spotrebiteľské 14-dňové odstúpenie a odkaz na RSO/ARS. Z **11 posudzovaných inštitútov je pre Moonid povinných 8**; z nich **žiadny úplne nechýba**, ale **5 je obsahovo slabých** (nedostatočne dopracovaných). Najzávažnejšie reálne medzery nie sú v počte stránok, ale v detailoch B2B fakturačného režimu: chýba klauzula o úroku z omeškania a postupe pri nezaplatení, konkrétna dĺžka záruky za akosť a lehota vybavenia reklamácie, inventár cookies a explicitné pomenovanie prenosu údajov do USA (Resend, Sentry). Hlavné právne riziko čistého B2B — nechcené priznanie spotrebiteľských práv v texte VOP — Moonid zatiaľ zvláda, ale mal by ho výslovne poistiť definíciou kupujúceho ako podnikateľa nakupujúceho na IČO.

---

## 2. Master tabuľka povinných stránok

| Stránka | Právny základ | Platí pre Moonid | Stav u Moonidu |
|---|---|---|---|
| Identifikácia predávajúceho (impressum) | § 4 ods. 1 a § 15 zák. 22/2004; § 3a ObchZ | **áno** | **slabé** — údaje sú len v pätičke, nie v tele stránky „O nás / Informácie o spoločnosti"; chýba dozorný orgán |
| Všeobecné obchodné podmienky (VOP) | § 273, § 269 a nasl. ObchZ; § 4–5 zák. 22/2004 | **áno** | **má, ale slabé** — chýba omeškanie/úroky, dĺžka záruky, lehota reklamácie, force majeure, rozhodný súd |
| Reklamačný poriadok / zodpovednosť za vady | § 422–442 ObchZ (najmä § 428, § 429) | **áno** | **slabé** — má sekciu #reklamacie vo VOP, ale bez konkrétnej záručnej doby a lehoty vybavenia |
| Doprava, platba, dodacie podmienky | § 4 zák. 22/2004; § 409, § 455 a nasl. ObchZ; zák. 222/2004 | **áno** | **slabé** — má sekciu #doprava, ale bez cien dopravy, minimálnej objednávky, prahu rozvozu zdarma |
| Ochrana osobných údajov (GDPR) | Nar. 2016/679 čl. 13–14; zák. 18/2018 | **áno** | **má, drobné medzery** — chýba čl. 22 (profilovanie), konkrétny prenos do USA, čl. 13 ods. 2 e) |
| Cookies / ePrivacy | § 109 ods. 8 zák. 452/2021; čl. 5 ods. 3 smernice 2002/58/ES | **áno** | **má, ale slabé** — chýba inventár cookies (tabuľka), pomenovanie Supabase/Vercel cookies |
| Kroky uzavretia objednávky (info pred odoslaním) | § 4 ods. 1 a § 5 zák. 22/2004 | **áno** | **čiastočne** — pokryté vo VOP a FAQ, ale bez uceleného popisu technických krokov a opravy chýb |
| Náležitosti faktúry (DPH) | § 71–75 zák. 222/2004; § 3a ObchZ; zák. 431/2002 | **podmienečne** (Moonid je platiteľ DPH, IČ DPH SK2120530995) | mimo webu — týka sa dokladu, nie stránky; sadzba 23 % od 1. 1. 2025 |
| ~~Odstúpenie do 14 dní (formulár + poučenie)~~ | § 19 a nasl. zák. 108/2024 | **NIE — B2C-only** | **správne absentuje** — nevzťahuje sa na predaj na IČO |
| ~~Alternatívne riešenie sporov (ARS/RSO) + ODR~~ | zák. 391/2015; nar. 524/2013 (ODR zrušená 20. 7. 2025) | **NIE — B2C-only** | **správne absentuje** — ODR navyše zrušená pre všetkých |
| Vyhlásenie o prístupnosti (EAA/WCAG) | Smernica 2019/882; zák. 351/2022 | **NIE — dvojitá výnimka** (B2C-služba + mikropodnik) | neuplatní sa; prístupnosť odporúčaná ako dobrý štandard |

> **Pozor na zadanie:** správny predpis o prístupnosti je **zák. 351/2022 Z. z.**, nie 351/2015 (ten upravuje niečo iné). Moonid pod EAA nespadá dvojnásobne — cieli na B2C služby a má výnimku pre mikropodniky (< 10 zamestnancov, obrat/bilancia do 2 mil. EUR).

---

## 3. Gap analýza po stránkach

### 3.1 Identifikácia predávajúceho / „Informácie o spoločnosti" (`/o-nas`)

**(a) Musí obsahovať (zák. 22/2004, § 3a ObchZ):** obchodné meno a sídlo; IČO, DIČ, IČ DPH; zápis v OR (súd/oddiel/vložka); e-mail a telefón; názov a adresa orgánu dozoru; údaj o povolení, ak činnosť podlieha povoleniu.

**(b) Moonid aktuálne má:** identifikačné údaje (Moonid s.r.o., IČO 50 934 660, DIČ, IČ DPH SK2120530995, zápis OS Nitra vl. 43461/N) — ale **len v pätičke**. Telo `/o-nas` je čisto marketingové (hero, segmenty, referencie, CTA).

**(c) Čo majú konkurenti navyše:** všetci piati majú samostatnú stránku „Kontakt/Kontakty" s uceleným identifikačným blokom; **corwell.sk a roin.sk uvádzajú aj bankové spojenie (IBAN/SWIFT)** a personálny adresár oddelení — čo B2B odberateľ pri due-diligence očakáva. humed a leoness majú blok „Fakturačné údaje".

**(d) GAP + odporúčanie:** **DOPLNIŤ** do tela `/o-nas` (alebo vytvoriť sekciu „Fakturačné a registračné údaje") ucelený identifikačný blok podľa § 3a ObchZ + priame odkazy na VOP, GDPR a reklamačné podmienky. **DOPLNIŤ** označenie dozorného orgánu — pre čistý B2B je to primárne **živnostenský úrad**, prípadne SOI len ako všeobecný trhový dozor (nie ako spotrebiteľský dozor). Zvážiť uvedenie bankového spojenia (B2B štandard).

---

### 3.2 Všeobecné obchodné podmienky (`/obchodne-podmienky`)

**(a) Musí obsahovať:** definíciu strán (kupujúci = podnikateľ na IČO); kroky a moment vzniku zmluvy; podmienky registrácie a cien za prihlásením; ceny/DPH/minimálna objednávka; platobné a dodacie podmienky vrátane výhrady vlastníctva (§ 445) a prechodu rizika (§ 455 a nasl.); zodpovednosť za vady; riešenie sporov, rozhodné právo a súd, úrok z omeškania (nar. vlády 21/2013); jazyk a archiváciu zmluvy.

**(b) Moonid aktuálne má:** identifikáciu predávajúceho + podriadenie ObchZ; objednávku a vznik zmluvy potvrdením; ceny bez DPH; dopravu (vlastný rozvoz NZ/NR), platbu faktúrou so splatnosťou, výhradu vlastníctva do zaplatenia; reklamačné podmienky (kontrola pri prevzatí, zjavné vady do 2 prac. dní); záverečné ustanovenia + odkaz na GDPR. Aktualizované 24. 6. 2026.

**(c) Čo majú konkurenti navyše (len štruktúra):** corwell.sk (čistý B2B) rieši spory **rozhodcovským súdom** — B2B prístup namiesto ARS; aldakozmetika.sk má samostatné sekcie **Sankcie (VIII)** a **Riešenie sporov a rozhodné právo (IX)**; humed/leoness/roin uvádzajú konkrétny **prah dopravy zdarma** a cenník prepravy priamo v podmienkach.

**(d) GAP + odporúčanie — DOPLNIŤ sekcie:**
1. **Omeškanie a úrok z omeškania** (§ 369 ObchZ / nar. vlády 21/2013) + poplatky za upomienky a postup pri nezaplatení — kritické pre fakturáciu so splatnosťou. **(P1)**
2. **Konkrétna dĺžka záruky za akosť** (§ 429 — v B2B len ak dohodnutá) a lehota vybavenia reklamácie namiesto len „bez zbytočného odkladu". **(P1)**
3. **Explicitné vymedzenie kupujúceho ako podnikateľa nakupujúceho na IČO** + výslovné konštatovanie, že sa neuplatní zák. 108/2024 (14-dňové odstúpenie, 24-mes. záruka). **(P1 — poistka proti nechcenému priznaniu spotrebiteľských práv)**
4. **Minimálna hodnota objednávky a cenník/podmienky dopravného** (kedy rozvoz zdarma, poplatok pri malej objednávke). **(P2)**
5. **Doložka o rozhodnom práve a príslušnom súde** nad rámec „právny poriadok SR". **(P2)**
6. **Vyššia moc (force majeure)** a dôsledky nemožnosti dodania. **(P2)**
7. **Verzia/účinnosť VOP a mechanizmus oznamovania zmien** odberateľom (nie len dátum aktualizácie). **(P2)**
8. Zvážiť označenie dozorného orgánu a údaj o obalovom hospodárstve (zákon o odpadoch/obaloch), ak sa uplatní. **(P2)**

---

### 3.3 Reklamačný poriadok / zodpovednosť za vady (sekcia `#reklamacie`)

**(a) Musí obsahovať (§ 422–442 ObchZ):** určenie, že vzťah sa spravuje ObchZ (nie spotrebiteľským právom); lehotu a spôsob vytknutia vád (§ 428 — bez zbytočného odkladu); nároky z vád (náhradné dodanie, oprava, zľava, odstúpenie — § 436–441) s rozlíšením podstatné/nepodstatné porušenie; rozsah záruky za akosť a záručnú dobu (§ 429–431 — len ak dohodnutá); postup podania, doklady, kontaktné miesto; prechod nebezpečenstva škody (§ 425).

**(b) Moonid aktuálne má:** kontrolu pri prevzatí, nahlásenie zjavných vád do 2 prac. dní, náležitosti reklamácie, výluky zo záruky (v rámci VOP).

**(c) Čo majú konkurenti navyše:** humed.sk správne oddeľuje **„Záruka pre spotrebiteľa" vs. „Záruka pre nespotrebiteľa"**; corwell.sk (B2B) má reklamáciu zlúčenú vo VOP §5 s explicitnou záručnou dobou. Pozor — **leoness/roin/aldakozmetika uvádzajú 24-mesačnú záruku a 30-dňové vybavenie**; to sú **spotrebiteľské inštitúty, ktoré Moonid preberať NESMIE**.

**(d) GAP + odporúčanie — DOPLNIŤ do B2B režimu:** konkrétnu dohodnutú záručnú dobu (alebo výslovné vyhlásenie, že zákonná 24-mes. záruka sa neuplatní a platí len dohodnutá); jasný katalóg nárokov z vád s rozlíšením podstatného/nepodstatného porušenia; väzbu zániku nároku na včasné vytknutie (§ 428). **NEPREBERAŤ** 30-dňovú lehotu vybavenia ani spotrebiteľský reklamačný protokol. **(P1)**

---

### 3.4 Doprava, platba a dodacie podmienky (sekcia `#doprava`)

**(a) Musí obsahovať:** spôsoby dopravy, lehoty, miesta dodania; cenu dopravy a balné; platobné metódy, splatnosť, podmienky obchodného úveru; moment prechodu rizika a výhradu vlastníctva; údaj o cenách bez/s DPH.

**(b) Moonid aktuálne má:** vlastný rozvoz NZ/NR kraj, termín podľa rozvozového plánu, platbu faktúrou so splatnosťou, výhradu vlastníctva do zaplatenia.

**(c) Čo majú konkurenti navyše:** leoness.sk má **tabuľku doprava/cena/poznámka** a prah zdarma nad 123 €; roin.sk uvádza poštovné 5,90 € bez DPH a dopravu zdarma nad 80 €; humed „bezplatné doručenie". Všetci majú **konkrétne čísla**, ktoré Moonidu chýbajú.

**(d) GAP + odporúčanie — DOPLNIŤ:** konkrétne podmienky rozvozu (prah objednávky pre rozvoz zdarma, poplatok pri malej objednávke, balné), splatnosť faktúr a podmienky obchodného úveru. Môže zostať súčasťou VOP. **(P2)**

---

### 3.5 Ochrana osobných údajov / GDPR (`/ochrana-osobnych-udajov`)

**(a) Musí obsahovať:** totožnosť prevádzkovateľa (a DPO, ak je); účely a právne základy; kategórie údajov; príjemcov/sprostredkovateľov; prenos do tretích krajín a záruky; doby uchovávania; práva dotknutej osoby + sťažnosť na ÚOOÚ; info o automatizovanom rozhodovaní a o tom, či je poskytnutie údajov zákonná/zmluvná požiadavka.

**(b) Moonid aktuálne má:** identifikáciu prevádzkovateľa; kategórie údajov; účely a právne základy (čl. 6 ods. 1 b/c/f/a); doby uchovávania (účtovníctvo 10 rokov); príjemcov (Supabase, Vercel — EÚ Frankfurt; Resend; Sentry; Pohoda/Stormware; SCC podľa čl. 46); práva vrátane sťažnosti na ÚOOÚ; kontakt. Solídny základ.

**(c) Čo majú konkurenti navyše (len štruktúra):** corwell.sk a aldakozmetika.sk majú **výslovnú sekciu o profilovaní/automatizovanom rozhodovaní** a samostatný **kontakt na zodpovednú osobu**; leoness.sk člení spracúvanie **podľa kategórií dotknutých osôb** (návštevník, klient, dodávateľ, uchádzač…).

**(d) GAP + odporúčanie — DOPLNIŤ:**
1. Výslovné vyhlásenie o **(ne)existencii automatizovaného rozhodovania a profilovania** (čl. 22). **(P1 — jednoveta)**
2. **Konkrétne pomenovať prenos do USA** (Resend, Sentry sú US spoločnosti) a uvedené záruky (SCC / DPF), nielen všeobecný odkaz na SCC. **(P1)**
3. Info, či je poskytnutie údajov **zákonná/zmluvná požiadavka** a následky neposkytnutia (čl. 13 ods. 2 e)). **(P2)**
4. Uviesť **zdroj údajov** — priamo od dotknutej osoby vs. nepriamo získané kontaktné osoby odberateľa. **(P2)**
5. Info o **DPO/zodpovednej osobe** (aj keď nie je povinná) + verziovanie zásad. **(P2)**

---

### 3.6 Cookies / ePrivacy (`/cookies`)

**(a) Musí obsahovať:** súhlas PRED načítaním nie nevyhnutných cookies (bez predznačených políčok); rovnocennú možnosť odmietnuť; zoznam/kategórie cookies s účelom, dobou a tretími stranami; odvolanie súhlasu; prepojenie na GDPR. **Pri čisto nevyhnutných cookies postačí informačná lišta bez súhlasu.**

**(b) Moonid aktuálne má:** vyhlásenie o používaní **výhradne nevyhnutných/technických cookies** (prihlásenie, košík, bezpečnosť relácie); vyhlásenie, že sa nepoužíva analytika/marketing a súhlas sa nevyžaduje; správa cez prehliadač; kontakt. **Tento minimalistický režim je právne v poriadku** — Moonid tým elegantne obchádza povinnosť súhlasovej lišty.

**(c) Čo majú konkurenti navyše:** leoness.sk a humed.sk majú **kategorizáciu cookies** (nevyhnutné/funkčné/analytické/marketingové) a inventár. Naopak humed používa **zastaraný model implicitného súhlasu** („ďalším prechádzaním") — to je nesúlad, ktorý Moonid nemá kopírovať.

**(d) GAP + odporúčanie — DOPLNIŤ (best practice, nie tvrdá povinnosť pri len-nevyhnutných):**
1. **Konkrétny inventár cookies** (tabuľka: názov, účel, doba platnosti, poskytovateľ) — vrátane fakticky vznikajúcich **autentifikačných/relačných cookies Supabase a Vercel**, hoci sú nevyhnutné. **(P2)**
2. Vyjasniť, **čo robí CookieBanner pri prvej návšteve** (ak sa web tvári, že súhlas netreba, lišta má byť čisto informačná). **(P2)**
3. Verzia/účinnosť + mechanizmus aktualizácie pri pridaní nových cookies. Ak by sa niekedy pridala analytika/marketing, **NUTNO doplniť plnohodnotný súhlasový mechanizmus** (aktívny súhlas, granularita, odmietnutie). **(P2)**

---

### 3.7 Kroky uzavretia objednávky (`/pomoc` + VOP)

**(a) Musí obsahovať (§ 4–5 zák. 22/2004):** popis technických krokov k uzavretiu zmluvy; info, či bude zmluva uložená a prístupná; prostriedky na opravu chýb pred odoslaním (edit košíka); ponúkané jazyky; bezodkladné elektronické potvrdenie prijatia objednávky; jednoznačné označenie záväznosti objednávky.

**(b) Moonid aktuálne má:** FAQ `/pomoc` (účet, objednávanie, dodanie, platba, reklamácie s odkazom na #reklamacie a GDPR); vo VOP vznik zmluvy potvrdením. Korektne odkazuje na dokumenty.

**(c) Čo majú konkurenti navyše:** leoness.sk a roin.sk majú samostatnú stránku **„Ako nakupovať / FAQ"** s krok-za-krokom popisom (výber → košík → kontrola/úprava → doprava → platba → potvrdenie → e-mailová notifikácia).

**(d) GAP + odporúčanie — DOPLNIŤ:**
1. Do VOP alebo `/pomoc` **ucelený popis technických krokov** objednávky + info o **oprave chýb pred odoslaním** a o **archivácii/prístupnosti zmluvy**. **(P2)**
2. Do FAQ **odkaz na plné VOP** (nielen na kotvu #reklamacie). **(P2)**
3. Explicitné upozornenie, že **portál je určený výhradne podnikateľom (B2B), nie spotrebiteľom** — pre jednoznačnosť právneho režimu. **(P1 — jednoveta, súvisí s 3.2 bod 3)**

> V B2B sa zmluvné strany môžu od časti § 4–5 dohodou odchýliť; nie je povinná spotrebiteľská formulácia tlačidla „objednávka s povinnosťou platby", ale jasné označenie záväznosti sa odporúča.

---

## 4. Prioritizovaný akčný plán

### P1 — must-have pred spustením

1. **VOP: doplniť B2B poistku** — definícia kupujúceho ako podnikateľa na IČO + výslovné konštatovanie neuplatnenia zák. 108/2024. *(nízka náročnosť — 1 sekcia)*
2. **VOP: klauzula o omeškaní a úroku z omeškania** (§ 369 ObchZ / nar. vlády 21/2013) + postup pri nezaplatení a upomienkach. *(stredná)*
3. **Reklamácie: konkretizovať záruku a lehoty** — dohodnutá záručná doba (alebo vylúčenie zákonnej 24-mes.), lehota vybavenia, väzba na § 428; bez preberania spotrebiteľských inštitútov. *(stredná)*
4. **GDPR: doplniť profilovanie (čl. 22) + prenos do USA** (Resend, Sentry) s uvedením záruk. *(nízka)*
5. **Impressum: presunúť identifikačný blok do tela `/o-nas`** + dozorný orgán (živnostenský úrad) + odkazy na právne dokumenty. *(nízka)*
6. **B2B upozornenie** na `/pomoc` a v hlavičke VOP, že portál je výhradne pre podnikateľov. *(nízka)*

### P2 — nice-to-have / dopracovanie po spustení

7. **VOP: cenník dopravy, minimálna objednávka, prah rozvozu zdarma, balné.** *(nízka)*
8. **VOP: rozhodné právo a príslušný súd + force majeure.** *(nízka)*
9. **VOP + GDPR + cookies: verziovanie a mechanizmus oznamovania zmien.** *(nízka)*
10. **Cookies: inventár (tabuľka)** vrátane Supabase/Vercel relačných cookies + vyjasnenie CookieBanner. *(nízka)*
11. **GDPR: zdroj údajov, zákonná/zmluvná požiadavka (čl. 13 ods. 2 e), info o DPO.** *(nízka)*
12. **Objednávkový proces: ucelený popis technických krokov + archivácia zmluvy + odkaz na plné VOP z FAQ.** *(stredná)*
13. Zvážiť **bankové spojenie** v identifikačnom bloku (B2B due-diligence štandard). *(nízka)*

**NEROBIŤ (aktívne sa vyhnúť):** samostatná stránka odstúpenia do 14 dní; formulár na odstúpenie; stránka ARS/RSO a odkaz na ODR; 24-mesačná zákonná záruka; 30-dňová lehota vybavenia reklamácie; vyhlásenie o prístupnosti podľa EAA. Všetky sú B2C-only alebo pre Moonid vylúčené — ich pridanie by len zbytočne naviazalo spotrebiteľské povinnosti.

---

## 5. Poznámka o autorských právach a B2B rozsahu

- **Originálne texty.** Všetky doplnené a prepísané sekcie musia byť napísané vlastnými slovami Moonidu. Štruktúra a témy konkurentov (humed, leoness, corwell, aldakozmetika, roin) v tejto analýze slúžia len ako **inšpirácia usporiadania a kontrolný zoznam tém** — ich text sa **nekopíruje**. Doslovné preberanie cudzích VOP/GDPR/reklamačných poriadkov je porušením autorských práv a navyše prenáša ich chyby (napr. humed má zastaraný implicitný súhlas s cookies, roin uvádza neplatných „7 pracovných dní" na odstúpenie).

- **Prečo sa B2C inštitúty vynechávajú.** Moonid predáva **výlučne podnikateľom na IČO**, ceny a objednávanie sú za prihlásením. Tým sa **neuplatní zák. 108/2024 o ochrane spotrebiteľa** — odpadá 14-dňové odstúpenie, zákonná 24-mesačná záruka, 30-dňové vybavenie reklamácie, spotrebiteľský reklamačný poriadok, informačná povinnosť o ARS aj (už aj pre B2C zrušený) odkaz na ODR. Vzťah sa spravuje **Obchodným zákonníkom** (zodpovednosť za vady § 422–442, záruka len ak dohodnutá, vytknutie vád podľa § 428) a zmluvnou voľnosťou.

- **Kľúčové riziko čistého B2B je opačné než u B2C.** Nie je ním nedostatok stránok, ale **nechcené priznanie spotrebiteľských práv** v texte VOP alebo reklamačného poriadku (napr. skopírovaním B2C šablóny). Ak by Moonid dobrovoľne priznal 14-dňové odstúpenie alebo 24-mesačnú záruku, stalo by sa to **zmluvne záväzným**. Preto je bod P1.1 (definícia kupujúceho ako podnikateľa) rovnako dôležitý ako ktorákoľvek chýbajúca sekcia.

- **Čo naopak platí bez ohľadu na B2B/B2C a musí byť správne:** identifikácia predávajúceho a informačné povinnosti podľa zák. 22/2004; GDPR/zák. 18/2018 (kontaktné osoby, štatutári a prihlasovacie účty sú osobné údaje); cookies podľa § 109 zák. 452/2021 (chráni koncové zariadenie každého návštevníka); a náležitosti faktúry podľa zák. 222/2004 so základnou sadzbou **23 % od 1. 1. 2025** (Moonid je platiteľ DPH — IČ DPH SK2120530995).