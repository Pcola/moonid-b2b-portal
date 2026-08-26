# Záznam o spracovateľských činnostiach

**Prevádzkovateľ:** Moonid s.r.o., Hlavná 39/78, 941 43 Dolný Ohaj, IČO 50 934 660, DIČ 2120530995, IČ DPH SK2120530995, Obchodný register Okresného súdu Nitra, oddiel Sro, vložka č. 43461/N.
Kontakt vo veciach ochrany údajov: moonid@moonid.sk, 0919 216 908.
**Zodpovedná osoba (DPO):** neurčená — prevádzkovateľ nemá zákonnú povinnosť ju určiť (zhodné s `app/ochrana-osobnych-udajov/page.tsx`).

**Právny rámec:** čl. 30 ods. 1 Nariadenia (EÚ) 2016/679 (GDPR), zákon č. 18/2018 Z. z.
**Verzia záznamu:** 1.0 · **Zostavené:** [POTVRDIŤ MAJITEĽ — dátum]

> **Upozornenie.** Tento dokument je **technický podklad odvodený z kódu portálu**, nie právne stanovisko ani právne poradenstvo. Obsah bol zostavený z dátového modelu (`prisma/schema.prisma`) a zo server actions/route handlerov, ktoré osobné údaje reálne zapisujú a čítajú. Položky označené **[POTVRDIŤ MAJITEĽ]** kód doložiť nevie — musí ich pred použitím záznamu doplniť a potvrdiť prevádzkovateľ (najmä organizačné údaje, zmluvné vzťahy so sprostredkovateľmi, konkrétne mechanizmy prenosu do tretích krajín a záväzné retenčné lehoty). Záznam sa musí aktualizovať pri každej zmene dátového modelu alebo pri pridaní/výmene sprostredkovateľa.

---

## Prehľad činností

| # | Spracovateľská činnosť | Hlavný právny základ | Kde v kóde |
|---|---|---|---|
| 1 | Žiadosť o prístup do portálu (registrácia) | čl. 6(1)(b) predzmluvné opatrenia; čl. 6(1)(f) | `app/registracia/actions.ts`, `app/staff/ziadosti/actions.ts`, model `AccessRequest` |
| 2 | Správa používateľských kont a prihlasovanie | čl. 6(1)(b), čl. 6(1)(f) | `lib/auth.ts`, `lib/invite.ts`, `app/(auth)/actions.ts`, modely `User`, `Company` |
| 3 | Objednávanie a plnenie zmluvy | čl. 6(1)(b) | `app/(portal)/kosik/actions.ts`, modely `Cart`, `CartItem`, `RepeatDraftItem`, `Order`, `OrderItem`, `OrderStatusEvent`, `DeliveryLocation` |
| 4 | Fakturácia, účtovníctvo a synchronizácia s Pohodou | čl. 6(1)(c) | model `Invoice`, `PohodaSyncJob`, `app/api/pohoda/*` |
| 5 | Verejné dopyty (kontaktný formulár) | čl. 6(1)(b) predzmluvné; čl. 6(1)(f) | `app/api/dopyt/route.ts`, model `Inquiry` |
| 6 | Bezpečnostný a auditný záznam | čl. 6(1)(f), čl. 32 GDPR | `lib/audit.ts`, model `AuditLog` |
| 7 | Ochrana pred zneužitím (rate limiting) | čl. 6(1)(f), čl. 32 GDPR | `lib/rate-limit.ts`, model `RateLimit` |
| 8 | Transakčné a notifikačné e-maily | čl. 6(1)(b), čl. 6(1)(f) | `lib/email.ts` |
| 9 | Monitorovanie chýb a stability aplikácie | čl. 6(1)(f) | `lib/observability.ts` |
| 10 | Vybavovanie práv dotknutých osôb | čl. 6(1)(c) v spojení s čl. 12–22 GDPR | `app/(portal)/nastavenia/actions.ts` |
| 11 | Riadené mazanie po uplynutí lehôt (retenčný purge) | čl. 5(1)(e), čl. 5(2) accountability | `lib/retention.ts` |

---

## 1. Žiadosť o prístup do portálu (registrácia)

- **Účel:** posúdenie žiadosti podnikateľa o zriadenie B2B účtu, overenie firmy podľa IČO, vytvorenie firmy a pozvanie správcu firmy.
- **Právny základ:** čl. 6 ods. 1 písm. b) GDPR — opatrenia pred uzavretím zmluvy na žiadosť dotknutej osoby; pri zamietnutých žiadostiach a preukazovaní priebehu čl. 6 ods. 1 písm. f) (oprávnený záujem na evidencii a obrane nárokov).
- **Kategórie dotknutých osôb:** kontaktné osoby žiadajúcich podnikateľov (fyzické osoby — podnikatelia aj poverení zamestnanci právnických osôb).
- **Kategórie osobných údajov** (model `AccessRequest`): `contactName` (meno a priezvisko), `email`, `phone`, `ico`, `companyName`, `note` (voľný text zadaný žiadateľom — môže obsahovať ďalšie údaje), `status`, `resolvedById`, `resolvedAt`, `companyId`, `createdAt`, `updatedAt`.
- **Ďalšie súvisiace záznamy:** auditná udalosť `PRIVACY_NOTICE_PROVIDED` s verziou privacy notice (`lib/consent.ts`, `PRIVACY_VERSION`), pri schválení `ACCESS_APPROVE` s `email`, `ico`, cenovou úrovňou a splatnosťou.
- **Príjemcovia:** interní používatelia s rolou STAFF/ADMIN; Supabase (databáza); Resend (notifikačný e-mail staffu s obsahom žiadosti — `app/registracia/actions.ts`).
- **Prenos do tretej krajiny:** áno, možný u Supabase/Resend — pozri kapitolu „Sprostredkovatelia a prenosy“.
- **Lehota výmazu:** zamietnuté 12 mesiacov od vybavenia, schválené 24 mesiacov od vybavenia, nevybavené najviac 24 mesiacov od prijatia (`lib/retention.ts`). **[POTVRDIŤ MAJITEĽ]** — lehoty musia zostať zhodné so znením zverejneným v `app/ochrana-osobnych-udajov/page.tsx`.
- **Bezpečnostné opatrenia:** honeypot pole, rate limit 5 žiadostí/hod na IP (pseudonymizovaný HMAC kľúč), validácia vstupu cez zod, žiadosť s IČO existujúcej firmy sa nikdy neschváli automaticky.

## 2. Správa používateľských kont a prihlasovanie

- **Účel:** zriadenie a správa prístupu do B2B portálu, rozdelenie práv (objednáva priamo / schvaľovateľ), deaktivácia kont, obnova hesla, dvojfaktorové overenie.
- **Právny základ:** čl. 6 ods. 1 písm. b) (plnenie zmluvy voči podnikateľovi — fyzickej osobe), čl. 6 ods. 1 písm. f) (správa vzťahu s právnickou osobou cez poverené kontaktné osoby, bezpečnosť systémov).
- **Kategórie dotknutých osôb:** používatelia zákazníckych firiem (CUSTOMER_USER, CUSTOMER_ADMIN), interní zamestnanci a spolupracovníci (STAFF, ADMIN).
- **Kategórie osobných údajov** (model `User`): `authId` (identita v Supabase Auth), `email`, `name`, `role`, `companyId`, `mfaEnabled`, `active`, `canOrderDirectly`, `approverId`, `lastLoginAt`, `createdAt`, `updatedAt` a technické polia synchronizácie s Auth (`authSyncPending`, `authDesiredActive`, `authManagedBan`, `authSyncedAt`). Heslá portál **neukladá** — autentifikáciu vykonáva Supabase Auth.
- **Firemný kontext** (model `Company`): `name`, `ico`, `dic`, `icDph`, `address`, `zip`, `city`, `splatDays` — údaje o podnikateľovi; osobným údajom sú tam, kde je odberateľom fyzická osoba — podnikateľ.
- **Príjemcovia:** Supabase (Auth + databáza), Vercel (hosting/beh aplikácie), Resend (pozvánky a odkazy na nastavenie hesla).
- **Prenos do tretej krajiny:** áno, možný — pozri kapitolu „Sprostredkovatelia a prenosy“.
- **Lehota výmazu:** počas trvania vzťahu a následne podľa zákonných lehôt a času potrebného na uplatnenie alebo obranu nárokov. **[POTVRDIŤ MAJITEĽ — konkrétna lehota po zániku vzťahu]**
- **Bezpečnostné opatrenia:** rate limit na prihlásenie a reset hesla (`app/(auth)/actions.ts`), rate limit na pozvánky (`lib/invite.ts`), zákaz pozvať interný e-mail do zákazníckej firmy (`lib/internal-user-policy.ts`), DB constraint „musí ostať aspoň jeden aktívny správca firmy“.

## 3. Objednávanie a plnenie zmluvy

- **Účel:** vedenie košíka, schvaľovacieho workflowu, prijatie a spracovanie objednávky, dodanie tovaru, evidencia priebehu objednávky, opakovanie objednávky.
- **Právny základ:** čl. 6 ods. 1 písm. b) GDPR.
- **Kategórie dotknutých osôb:** používatelia zákazníckych firiem, ktorí objednávku vytvorili alebo schvaľujú; kontaktné osoby na mieste dodania.
- **Kategórie osobných údajov:** `Order.createdById` (kto objednal), `Order.note`, `Order.poNumber`, `Order.buyerSnapshot` / `deliveryAddressSnapshot` (JSON snapshot odberateľa a dodacej adresy), `DeliveryLocation.label/street/zip/city`, `OrderStatusEvent.changedById` a `note`, `Cart.createdById`, `RepeatDraftItem.userId`. Ďalej obchodné údaje (položky, množstvá, ceny, doprava, platba) viazané na identifikovateľnú osobu objednávateľa.
- **Zmluvný snapshot:** `Order.termsVersion`, `termsSha256`, `termsUrl`, `termsSnapshot`, `termsAcknowledgedAt`, `sellerSnapshot` — nemenný dôkaz znenia VOP platného pre danú objednávku.
- **Príjemcovia:** interní používatelia STAFF/ADMIN; Supabase; Vercel; Resend (potvrdenia a notifikácie); účtovný systém Pohoda (Stormware) po potvrdení objednávky; prepravca / vlastný rozvoz **[POTVRDIŤ MAJITEĽ — či a ktorý externý dopravca sa používa a na akom zmluvnom základe]**.
- **Lehota výmazu:** počas trvania vzťahu a následne podľa zákonných lehôt a času potrebného na uplatnenie alebo obranu nárokov; údaje, ktoré sa stali súčasťou účtovného dokladu, podliehajú činnosti č. 4. **[POTVRDIŤ MAJITEĽ]**
- **Bezpečnostné opatrenia:** tenant izolácia (každý dotaz je viazaný na `companyId` prihláseného používateľa), kontrola oprávnenia na detail objednávky (`app/(portal)/objednavky/[id]/page.tsx` — vlastná objednávka, objednávka na schválenie, alebo správca firmy), `costSnapshot` sa zákazníkovi nikdy neposkytuje, idempotencia odoslania objednávky.

## 4. Fakturácia, účtovníctvo a synchronizácia s Pohodou

- **Účel:** vystavenie a evidencia faktúr, sledovanie splatnosti a úhrad, plnenie účtovných a daňových povinností.
- **Právny základ:** čl. 6 ods. 1 písm. c) GDPR — zákonná povinnosť (zákon č. 431/2002 Z. z. o účtovníctve, zákon č. 222/2004 Z. z. o DPH).
- **Kategórie dotknutých osôb:** odberatelia — fyzické osoby podnikatelia; kontaktné osoby uvedené na doklade.
- **Kategórie osobných údajov** (model `Invoice`): `pohodaNumber`, `companyId`, `orderId`, `status`, `issuedAt`, `dueAt`, `paidAt`, `subtotal`, `vat`, `total`, `pdfStoragePath` (uložené PDF dokladu obsahuje identifikačné a fakturačné údaje odberateľa), `sourceDbYear`, `syncedAt`.
- **Príjemcovia:** účtovný systém Pohoda (Stormware) ako system of record; účtovník / účtovná kancelária **[POTVRDIŤ MAJITEĽ — či ide o externého sprostredkovateľa a či je uzavretá zmluva podľa čl. 28]**; Supabase (úložisko PDF a databáza); daňové a kontrolné orgány na základe zákona.
- **Prenos do tretej krajiny:** u Supabase možný — pozri kapitolu „Sprostredkovatelia a prenosy“.
- **Lehota výmazu:** 10 rokov podľa účtovných a daňových predpisov (zhodne so zverejnenými zásadami). **[POTVRDIŤ MAJITEĽ]**

## 5. Verejné dopyty (kontaktný formulár)

- **Účel:** prijatie a vybavenie nezáväzného dopytu z verejného webu, príprava ponuky.
- **Právny základ:** čl. 6 ods. 1 písm. b) (opatrenia pred uzavretím zmluvy na žiadosť dotknutej osoby), subsidiárne čl. 6 ods. 1 písm. f) (oprávnený záujem na obchodnej komunikácii s podnikateľom).
- **Kategórie dotknutých osôb:** osoby, ktoré odoslali dopyt z verejného webu.
- **Kategórie osobných údajov** (model `Inquiry`): `name`, `company`, `email`, `phone`, `location`, `type`, `segment`, `message` (voľný text), `emailSent`, `handledAt`, `createdAt`.
- **Príjemcovia:** interní používatelia STAFF/ADMIN; Supabase; Resend (notifikácia staffu).
- **Lehota výmazu:** vybavené 12 mesiacov od vybavenia, nevybavené najviac 24 mesiacov od prijatia — vynucované automaticky v `lib/retention.ts`.
- **Bezpečnostné opatrenia:** rate limit 5 dopytov/10 min na IP (pseudonymizovaný kľúč), validácia vstupu, escapovanie hodnôt v e-mailových šablónach (`lib/email.ts`).

## 6. Bezpečnostný a auditný záznam

- **Účel:** preukázateľnosť obchodných a administratívnych úkonov, detekcia a vyšetrovanie bezpečnostných incidentov, obrana právnych nárokov, plnenie čl. 32 GDPR.
- **Právny základ:** čl. 6 ods. 1 písm. f) GDPR (oprávnený záujem na bezpečnosti a preukázateľnosti) v spojení s čl. 32 GDPR; pri auditoch týkajúcich sa vybavovania práv aj čl. 6 ods. 1 písm. c).
- **Kategórie dotknutých osôb:** všetci prihlásení používatelia (zákaznícki aj interní); pri neúspešnom prihlásení aj neregistrovaní žiadatelia.
- **Kategórie osobných údajov** (model `AuditLog`): `userId`, `companyId`, `action`, `entity`, `entityId`, `meta` (JSON — podľa udalosti môže obsahovať e-mail, IČO, číslo objednávky, dôvod žiadosti o výmaz), `ip`, `userAgent`, `createdAt`.
- **Príjemcovia:** interní používatelia s rolou ADMIN; Supabase.
- **Lehota výmazu:** 24 mesiacov — vynucované dvojito: aplikačne v `lib/retention.ts` aj DB triggerom (migrácia `20260820150000_security_objects`), takže staršie záznamy sa nedajú ponechať ani omylom.
- **Poznámka k právu na prístup:** pole `meta` sa do individuálneho exportu podľa čl. 15 **nezaraďuje**, pretože môže obsahovať údaje iných osôb (čl. 15 ods. 4 GDPR) — pozri `exportMyData` v `app/(portal)/nastavenia/actions.ts`.

## 7. Ochrana pred zneužitím (rate limiting)

- **Účel:** obmedzenie pokusov o prihlásenie, reset hesla, registráciu, dopyt, pozvánky a export — ochrana pred brute-force a DoS.
- **Právny základ:** čl. 6 ods. 1 písm. f) GDPR v spojení s čl. 32 GDPR.
- **Kategórie osobných údajov** (model `RateLimit`): kľúč `key` je **pseudonymizovaný HMAC-SHA-256** z IP adresy, e-mailu alebo ID používateľa (`rateLimitKey` v `lib/rate-limit.ts`) — plaintext identifikátor sa neukladá. Ďalej `count`, `windowStart`.
- **Príjemcovia:** nikto mimo prevádzkovateľa a Supabase.
- **Lehota výmazu:** najviac 7 dní (`lib/retention.ts`).

## 8. Transakčné a notifikačné e-maily

- **Účel:** potvrdenie objednávky, notifikácie o zmene stavu, pozvánky do portálu a odkazy na nastavenie hesla, interné notifikácie staffu o nových žiadostiach a dopytoch.
- **Právny základ:** čl. 6 ods. 1 písm. b) (komunikácia nevyhnutná na plnenie zmluvy) a čl. 6 ods. 1 písm. f) (prevádzková komunikácia s podnikateľom). **Nejde o marketing** — portál neposiela newsletter ani obchodné oznámenia.
- **Kategórie osobných údajov:** e-mailová adresa príjemcu, meno, obsah správy (číslo objednávky, položky, sumy, prípadne obsah dopytu alebo žiadosti o výmaz).
- **Príjemca / sprostredkovateľ:** Resend.
- **Lehota výmazu:** doručovacie logy u sprostredkovateľa podľa jeho nastavenia. **[POTVRDIŤ MAJITEĽ — retencia logov v účte Resend]**
- **Bezpečnostné opatrenia:** e-maily v aplikačných logoch sú maskované (`maskEmail` v `lib/email.ts`); odosielanie je best-effort a nikdy nezastaví obchodnú operáciu.

## 9. Monitorovanie chýb a stability aplikácie

- **Účel:** zistenie a odstránenie chýb aplikácie, dostupnosť a bezpečnosť služby.
- **Právny základ:** čl. 6 ods. 1 písm. f) GDPR v spojení s čl. 32 GDPR.
- **Kategórie osobných údajov:** technické údaje o chybe (scope, správa výnimky, stack trace). Kontext sa posiela **bez PII** — `lib/observability.ts` výslovne zakazuje odosielať e-maily, mená a IP adresy a povoľuje len operačné kľúče (action, entity, scope). Nedá sa však vylúčiť, že runtime údaje o requeste zachytí samotné SDK. **[POTVRDIŤ MAJITEĽ — nastavenie `sendDefaultPii` a scrubbingu v projekte Sentry]**
- **Príjemca / sprostredkovateľ:** Sentry.
- **Lehota výmazu:** podľa nastavenia retencie v projekte Sentry. **[POTVRDIŤ MAJITEĽ]**

## 10. Vybavovanie práv dotknutých osôb

- **Účel:** vybavenie žiadosti o prístup, prenosnosť a výmaz.
- **Právny základ:** čl. 6 ods. 1 písm. c) GDPR — plnenie zákonnej povinnosti podľa čl. 12 až 22 GDPR.
- **Kategórie osobných údajov:** identita žiadateľa, obsah a rozsah žiadosti, dátum podania a vybavenia. Zaznamenáva sa auditnými akciami `GDPR_ACCESS` a `GDPR_ERASURE_REQUEST` (`app/(portal)/nastavenia/actions.ts`), žiadosť o výmaz sa zároveň notifikuje na internú adresu.
- **Príjemcovia:** interní používatelia STAFF/ADMIN; Resend (notifikácia).
- **Lehota výmazu:** 24 mesiacov spolu s auditným záznamom (činnosť č. 6).
- **Poznámka:** export podľa čl. 15/20 je autentifikovaný, obmedzený sadzbou a vracia **výhradne údaje žiadateľa** — nikdy údaje kolegov z tej istej firmy. Firemný export (`exportCompanyData`) je samostatná prevádzková funkcia správcu firmy, **nie** individuálna odpoveď podľa čl. 15.

## 11. Riadené mazanie po uplynutí lehôt (retenčný purge)

- **Účel:** vynútenie zásady minimalizácie uchovávania a preukázateľnosť jej dodržiavania.
- **Právny základ:** čl. 5 ods. 1 písm. e) a čl. 5 ods. 2 GDPR.
- **Popis:** `lib/retention.ts` beží najviac raz denne (throttle cez rate-limit okno), maže auditné záznamy staršie ako 24 mesiacov, vybavené a mŕtve dopyty, vybavené a mŕtve žiadosti o prístup a rate-limit okná. O vykonanom purge zapisuje auditnú udalosť `RETENTION_PURGE` s počtami zmazaných záznamov.
- **Bez samostatnej cron infraštruktúry:** purge sa spúšťa pri používaní portálu, čo je zámerné prevádzkové rozhodnutie.

---

## Sprostredkovatelia a prenosy do tretích krajín

| Sprostredkovateľ | Spracúvanie | Zmluva podľa čl. 28 | Prenos mimo EHP |
|---|---|---|---|
| Supabase | databáza, autentifikácia, úložisko súborov | **[POTVRDIŤ MAJITEĽ]** | možný — **[POTVRDIŤ MAJITEĽ — región projektu a použitý mechanizmus]** |
| Vercel | hosting, CDN, beh aplikácie, cookie-free analytika | **[POTVRDIŤ MAJITEĽ]** | možný — **[POTVRDIŤ MAJITEĽ]** |
| Resend | odosielanie transakčných e-mailov | **[POTVRDIŤ MAJITEĽ]** | možný — **[POTVRDIŤ MAJITEĽ]** |
| Sentry | monitorovanie chýb a stability | **[POTVRDIŤ MAJITEĽ]** | možný — **[POTVRDIŤ MAJITEĽ]** |
| Stormware (Pohoda) | účtovný systém, faktúry | **[POTVRDIŤ MAJITEĽ]** | **[POTVRDIŤ MAJITEĽ]** |

**[POTVRDIŤ MAJITEĽ]** Pri každom príjemcovi treba doplniť, či sa prenos opiera o rozhodnutie o primeranosti (napr. certifikácia v rámci EU–US Data Privacy Framework) alebo o štandardné zmluvné doložky podľa čl. 46 ods. 2 písm. c) GDPR, a uchovať kópiu záruk. Zverejnené znenie v `app/ochrana-osobnych-udajov/page.tsx` musí zostať s týmto záznamom v súlade.

## Technické a organizačné opatrenia (čl. 30 ods. 1 písm. g)

Doložiteľné z kódu:

- prístup do portálu výhradne po prihlásení (Supabase Auth), voliteľné dvojfaktorové overenie (`User.mfaEnabled`);
- rolový model prístupu CUSTOMER_USER / CUSTOMER_ADMIN / STAFF / ADMIN (`lib/permissions.ts`) — cenové hladiny môže meniť len ADMIN;
- tenant izolácia: každý zákaznícky dotaz je viazaný na `companyId` prihláseného používateľa, detail objednávky navyše kontroluje autorstvo alebo rolu schvaľovateľa;
- validácia všetkých vstupov cez zod, escapovanie hodnôt v e-mailových šablónach;
- rate limiting s pseudonymizovaným kľúčom na všetkých verejných a citlivých vstupoch;
- nemenný auditný záznam s dvojitým vynútením retencie (aplikácia + DB trigger);
- zákaz PII v kontexte odosielanom do monitoringu chýb, maskovanie e-mailov v logoch;
- automatizovaný retenčný purge s auditnou stopou.

**[POTVRDIŤ MAJITEĽ]** Organizačné opatrenia mimo kódu (mlčanlivosť osôb s prístupom, správa hesiel a prístupov, zálohovanie a testy obnovy, postup pri bezpečnostnom incidente a ohlasovaní podľa čl. 33/34) nie sú z repozitára doložiteľné a musia byť doplnené.
