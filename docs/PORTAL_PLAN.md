# Moonid B2B Portál — fázovaný implementačný plán

> Pripravené multi-agent návrhom + adversariálnou kritikou (opravy kritiky sú zapracované nižšie, označené ✅opr.). Stavia na existujúcej schéme (`prisma/schema.prisma`) — väčšina modelov už existuje.

## 1. Cieľ

Tenký, **always-on** B2B objednávkový kanál nad Pohodou (System of Record), ktorý čo najskôr dostane prihláseného zákazníka k objednávke **s jeho cenou**. Portál zrkadlí Pohodu (katalóg/sklad/firmy/faktúry cez inbound sync) a rozširuje ju o objednávanie, históriu a installed-base dávkovačov.

Dve tvrdé reality určujú architektúru:
- **Prisma ide privilegovaným spojením → Postgres RLS sa neuplatní.** Multi-tenant izolácia aj utajenie nákladových cien sa vynucujú v **app vrstve cez jeden vstupný bod**.
- **Notebook s Pohodou nie je always-on.** Celý sync je offline-resilientný; objednávka nikdy nečaká na Pohodu.

---

## 2. Fázy (MVP-first)

### FÁZA A — Auth jadro + izolácia
Základ pre všetko za loginom; nahrádza dočasný Basic-auth na `/staff`.
- `lib/auth.ts`: `getCurrentUser()` (React `cache()`, Supabase `getUser()` → Prisma `User` podľa `authId`), `requireUser()` (redirect `/login`, resp. `/cakajuce` ak `companyId==null`), `requireStaff()`, `requireAdmin()`. **Rola/firma sa NEdáva do JWT** — lookup per request.
- **✅opr. Dátová vrstva namiesto generického wrappera:** `lib/data/*.ts` = explicitné per-model funkcie, ktoré berú `companyId` ako povinný prvý argument (`getOrders(companyId)`, `getOrder(companyId, id)` → `findFirst{id,companyId}`). Žiadny „magický" `scopedDb` proxy (typovo riskantný). + ESLint guard `no-restricted-syntax` proti `prisma.<tenantModel>` mimo `lib/data`.
- `lib/selects.ts`: whitelist `select` bez `costPrice`/`costSnapshot`/`purchasePrice` (default-deny, `select` nie `include`).
- **✅opr.** `lib/supabase/middleware.ts` (`updateSession(request)` podľa `@supabase/ssr` vzoru — tretí variant; `client.ts`/`server.ts` na middleware nestačia).
- `middleware.ts`: zmazať Basic-auth, refresh session cookie, redirect neprihlásených z `/dashboard,/katalog,/kosik,/objednavky,/nastavenia,/staff`. `/api/sync/*` a `/api/dopyt` mimo matchera.
- `app/(auth)/login` (nahradiť stub) + `zabudnute-heslo`, `nastav-heslo`, `app/auth/callback/route.ts` (PKCE), logout.
- `app/staff/layout.tsx`→`requireStaff()`; `app/(portal)/layout.tsx`→`requireUser()`; `app/cakajuce/page.tsx`.
- SQL migrácia `REVOKE SELECT` pre `anon` na citlivé stĺpce (poistka, nie primárna izolácia).
- **Akceptácia:** neprihlásený→`/login?next=`; CUSTOMER na `/staff`→redirect; Basic-auth už nič nerobí; ESLint zelený.
- **Závislosti:** žiadne. Jednorazovo: Supabase Auth (email+heslo, confirm ON, invite-only, SMTP Resend). **Odhad: M**

### FÁZA B — Onboarding cez IČO
Prístup len cez staff-schválenú žiadosť (žiadna sebaregistrácia).
- Migrácia: `AccessRequest(ico, companyName, contactName, email, phone, status PENDING/APPROVED/REJECTED, note, resolvedById, companyId?)` + enum `RequestStatus`.
- `app/registracia` — verejný formulár → `AccessRequest(PENDING)`.
- `app/staff/ziadosti` — staff dotiahne/založí `Company` podľa `ico`, priradí `PriceTier`+`splatDays`, APPROVE → Supabase `inviteUserByEmail` → `User{role:CUSTOMER_ADMIN, companyId}`.
- `inviteColleague(email)` (CUSTOMER_ADMIN pozýva kolegov, role CUSTOMER_USER).
- Resend šablóny (pozvánka/reset/confirm); `AuditLog` (ACCESS_REQUEST_*, USER_INVITE, LOGIN_*).
- **Závislosti:** A. **Odhad: M**

### FÁZA C — Inbound sync (read-only dáta z Pohody)
- `lib/sync/auth.ts`: service-token constant-time verify (`SYNC_SERVICE_TOKEN` + `_PREV` na rotáciu); `/api/sync/*` mimo Supabase auth.
- API: `POST /api/sync/heartbeat`, `GET /pull/cursor`, `POST /inbound/{products,customers,prices,invoices}`, `POST /inbound/reconcile`.
- `lib/sync/inbound.ts`: upsert by-key (Product←`SKz.IDS`, Company←`AD.ICO`, Invoice←`pohodaNumber` + link `FA.CisloObj⇄Order`), posun `SyncCursor` až **po commitnutom** batchi (~500). Píše [C] polia vrátane `costPrice` (nikdy von).
- Reconcile/tombstone s grace oknom (chýbajúce → `isPublished=false`/`ARCHIVED`, Company `active=false`; nikdy hard delete) — vyrieši aj dnešný chýbajúci tombstone.
- Agent (PowerShell/.NET single-file) + Task Scheduler (10 min + at-logon + StartWhenAvailable + RunOnlyIfNetworkAvailable); token vo Windows Credential Manager.
- Vercel Cron staleness check (`now() − SyncState.lastHeartbeatAt > N h`) → Resend alert (de-dup `lastStaleAlertAt`). Staff widget: staleness banner.
- **✅opr.** 10-ročný `FApol` backfill **PRESUNUTÝ do Fázy G** (slúži len dávkovačom; nezaťažovať najťažšiu fázu). C dodáva len bežný inbound.
- **Akceptácia:** po behu agenta sú stock/ceny/firmy/faktúry aktuálne; opakovaný beh = bez duplikátov; cursor sa neposunie bez commitu; staleness alert keď notebook spí.
- **Závislosti:** A. **Odhad: L (najväčšie riziko — agent + Pohoda + idempotencia)**

### FÁZA D — Ceny + portálový katalóg `/katalog`
- **✅opr.** `lib/pricing.ts` — `resolveUnitPrice()` → DTO `PricedLine` (`PRICE | ON_REQUEST | UNAVAILABLE`). **Priorita: `ProductPrice` (existuje 1 riadok per tier — `@@unique([productId,priceTierCode])`; `.source` len hovorí ODKIAĽ hodnota je, POHODA prepíše COMPUTED pri upserte) → inak fallback `basePrice × (1 − discountPct/100)`.** (Nie 3-stupňová priorita — schéma drží 1 riadok per tier.) `isSubsidized` → `ON_REQUEST` (cena neopustí server). `Decimal`, gross z `vatRate`.
- `lib/catalog-select.ts`: bezpečný select (bez `costPrice`); mapper na DTO = jediná cesta von (žiadny `basePrice`/`discountPct`/`prices[]` klientovi).
- `app/(portal)/katalog/page.tsx`: tier z firmy usera (nie z requestu), zoznam + badge skladu (Skladom ak `isStocked && stockCache>0`, inak Na objednávku + `leadDays`; číslo skladu sa nezobrazuje; neutrál ak `stockSyncedAt > 48 h`). Sidebar prevziať z `/produkty`.
- Seed `PriceTier.discountPct` — **čísla od otca** (bez nich = 0 %).
- **Akceptácia:** 2 tiery → 2 ceny; payload bez `basePrice|costPrice|discountPct`; dotované = „na vyžiadanie".
- **Závislosti:** A. Reálne ceny z Pohody prídu cez C (interim funguje aj bez). **Odhad: S–M**

### FÁZA E — Košík → objednávka → lifecycle (MVP jadro)
- `lib/cart.ts`: `getOrCreateCart(companyId,userId)`, **1 košík per firma**. `addToCart` (upsert `@@unique([cartId,productId])`, blok ak `price.kind!=PRICE`), update/remove/clear. CartItem = len `productId+qty`.
- `app/(portal)/kosik` + mini-košík v hlavičke (cena indikatívna, live z resolvera).
- `checkout` + `createOrder()` v jednej `$transaction`: re-fetch scoped, snapshot `OrderItem` (sku/name/unitPrice/**cost**/lineTotal). **✅opr. `fulfillment` = SKLADOM len ak `isStocked && stockCache>=qty` AND `stockSyncedAt ≤ 48 h`, inak NA_OBJEDNAVKU** (aby snapshot neklamal oproti UI). `hasBackorder`, `priceTierCode` snapshot, `status=PRIJATA`, `pohodaSync=LOKALNA`, prvý `OrderStatusEvent`, clear cart, `AuditLog`. Po commite Resend e-maily. **Žiadny outbound push tu.**
- **✅opr. Číslovanie:** natívna Postgres `SEQUENCE` (migrácia) → `WEB-{rok}-{seq:05}`, `Order.number @unique` ako poistka. (Nie `count()+1`; `OrderCounter` v schéme nie je.)
- `lib/orders/transition.ts`: jediná cesta zmeny stavu (state machine + side-effecty + event). `PRIJATA→POTVRDENA`: `confirmedAt`, `pohodaSync=CAKA_NA_OBJ`, vytvorí `PohodaSyncJob(CREATE_OBJ, QUEUED, payload XML, tmpEshopObjID=order.id)`.
- Zákaznícke UI: `objednavky` (zoznam scoped) + `[id]` (IDOR `where:{id,companyId}`→404; bez `costSnapshot`; „Doobjednať", „Požiadať o storno"). Dashboard KPI.
- Staff UI: `staff/objednavky` (cross-company, marža z `costSnapshot` len tu, `pohodaSync` badge) + „Potvrdiť".
- **Akceptácia:** zákazník dokončí → e-mail; staff potvrdí → `PohodaSyncJob(QUEUED)`; firma A nevidí B (404); žiadny cost v odpovedi.
- **Závislosti:** A, D. **Odhad: L**

> **★ Po Fáze E je MVP hotové: zákazník objedná, staff potvrdí, objednávka bezpečne čaká v queue.**

### FÁZA F — Outbound agent (zápis do Pohody)
- API: `GET /outbound/queue` (atomický claim QUEUED + stale CLAIMED >15 min, `attempts++`), `POST /outbound/ack` (→`OBJ_VYTVORENA`+`pohodaObjNumber`, idempotentný), `POST /outbound/nack` (FAILED/retry).
- `lib/sync/outbound.ts`: claim/ack/nack, re-claim, backoff (10/30/60 min, max ~5 → CHYBA + alert).
- Agent: XML generátor OBJ, `Pohoda.exe /XML import` (alebo watched-folder fallback), parse `response.xml`, idempotencia cez `OBJ.tmpEshopObjID=order.id` (pred importom check → preskoč + ack).
- FA cez inbound (C) → `pohodaFaNumber`, `FA_VYTVORENA`, `Invoice`, Resend „faktúra vystavená".
- **Akceptácia:** potvrdená objednávka sa objaví v Pohode práve raz; chyba → CHYBA + alert + re-queue.
- **Závislosti:** E (queue), C (overený inbound). **Bloker: edícia Pohody — je dostupný XML import?** **Odhad: L**

### FÁZA G — „Moje dávkovače" + refill nudge (killer feature, odložené)
- UI nad `CompanyDispenser`/`DispenserModel`/`DispenserRefill`; refill nudge z `nextRefillDue`.
- **✅opr.** 10-ročný `FApol` backfill (sem presunutý z C): co-purchase → refill mapping, installed base.
- Faktúry detail + PDF (Supabase Storage).
- **Závislosti:** C, E. **Odhad: M–L**

---

## 3. Prierezové

**Bezpečnosť/izolácia:** jediný vstup `requireUser()` + `lib/data/*` (companyId povinný); žiadna route nesiaha na `prisma.<tenantModel>` priamo (lintnuté). `costPrice/costSnapshot/purchasePrice` len v service-role cestách + staff marža. IDOR → `where:{id,companyId}`→404. RLS/REVOKE len poistka. Stav výhradne cez `transitionOrder()`.

**Cenový bloker (od otca, PRED Fázou D):** hodnoty `discountPct` pre A/B1/B2/B3; ktoré produkty sú `isSubsidized` (inak konzervatívne `DISPENSER → ON_REQUEST`); pre TOP zákazníkov radšej „cena na vyžiadanie" než COMPUTED odhad. Keď otec niekedy nastaví hladiny v Pohode → C ich naplní do `ProductPrice(source=POHODA)`, UI/košík/snapshoty sa nemenia.

**Sync agent:** jeden binár, dve role (inbound pull / outbound drain), vždy iniciuje notebook (Pohoda sa nevystavuje). Service-token, heartbeat→`SyncState`, cursor→`SyncCursor`, queue→`PohodaSyncJob`. Offline nikdy neblokuje zákazníka.

---

## 4. Poradie a závislosti

```
A (auth+izolácia) ─┬─► B (onboarding)
                   ├─► D (ceny+katalóg) ─► E (košík→objednávka) ─► F (outbound) ─► G (dávkovače)
                   └─► C (inbound sync) ──┘   (C feeduje D ceny, E sklad; C je podmienka F)
```
- **A blokuje všetko** za loginom.
- **C feeduje** D (reálne ceny) a E (sklad/firmy) a je **podmienkou F**.
- **D blokuje E**; **E blokuje F a G**.
- Bloker otca (discountPct/isSubsidized) **pred D**; bloker edície Pohody (XML import) **pred F**.

**Najtenší MVP = A + D + E** (+ tenké C pre dáta, + B pre reálnych zákazníkov). F a G odložiť — objednávka medzitým čaká v queue.

---

## 5. Odhad (relatívny S/M/L)

| Fáza | Obsah | Odhad |
|---|---|---|
| A | auth + data vrstva + selecty + middleware + login/callback + layouty + guard | **M** |
| B | AccessRequest + registrácia + staff schvaľovanie + invite + Resend | **M** |
| C | inbound API + mapery + cursor + reconcile + agent + scheduler + staleness | **L** |
| D | pricing resolver + bezpečný select + `/katalog` + seed tierov | **S–M** |
| E | košík + checkout `$transaction` + sequence + state machine + UI + e-maily | **L** |
| F | outbound queue/ack/nack + retry + XML + idempotencia + agent write | **L** |
| G | dávkovače UI + refill + co-purchase backfill + faktúry/PDF | **M–L** |

Kritická cesta k MVP (**A → D → E**, + tenké C, + B) ≈ niekoľko sústredených dní pre solo dev. **C a F nesú najväčšie riziko** (agent + Pohoda integrácia + idempotencia).
