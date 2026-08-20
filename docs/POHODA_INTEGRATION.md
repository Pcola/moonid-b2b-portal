# Pohoda integrácia — enterprise architektúra

Obojsmerná integrácia **Moonid portál (cloud) ↔ Pohoda (on-prem notebook)**. Navrhnuté od nuly, bez existujúceho MCP.

## Rozhodnutia (potvrdené vlastníkom, jún 2026)
- **Edícia: Pohoda (MDB/Access), ale MÁ mServer** → komunikácia s Pohodou cez **mServer XML API (HTTP, lokálne)**. Žiadny file-drop, žiadne ACE OLEDB čítanie `.mdb` kópie.
- **Notebook sa uspáva** (noc + cez deň) → agent prerušovaný; joby čakajú vo fronte, agent dobehne po prebudení. Časom mini-PC alebo cloud Pohoda.
- **Alerty: e-mail (Resend).**

## Architektúra
- **Pohoda nie je na internete.** Na notebooku beží **agent** (.NET 8 Worker, Windows služba), ktorý **iniciuje všetky spojenia smerom VON** (TLS) → na notebooku sa **neotvára žiadny inbound port**.
- **Kanál = DB-as-queue cez SECURITY DEFINER RPC fasádu** v Supabase. Agent sa pripája ako rola **`pohoda_agent`**, ktorá **nemá prístup k tabuľkám** — vie volať len definované RPC funkcie z migrácie `20260820150000_security_objects`. Bezpečnejšie než priamy prístup k DB, jednoduchšie než samostatná REST vrstva.
- Agent je **tenký most**: cloud RPC ↔ lokálny **mServer** (`http://localhost:<port>`, HTTP Basic auth z Pohody). Import (objednávky) aj export (sklad, faktúry) ide cez mServer XML (DataPack obálka, viď [[pohoda-xml-schemas]]).

```
[Portál cloud: Vercel + Supabase]
        ▲  RPC (claim/ack/ingest/heartbeat) cez pooler, TLS, rola pohoda_agent
        │  (agent iniciuje, žiadny inbound port na notebooku)
[Agent .NET na notebooku]
        │  HTTP XML (DataPack) — import OBJ / export sklad,FA
        ▼
[Pohoda mServer @ localhost]  →  Pohoda MDB
```

## Bezpečnosť
- Rola `pohoda_agent`: `REVOKE ALL` na tabuľky/sekvencie/funkcie, `GRANT EXECUTE` len na RPC. Overené: 0 tabuľkových práv.
- RPC + GRANT sú súčasťou **štandardnej Prisma migrácie** `20260820150000_security_objects`; CI kontroluje funkcie, PUBLIC execute aj atribúty roly.
- Heslo agenta NIE v repo (DPAPI machine-scope na notebooku; rotácia `ALTER ROLE pohoda_agent PASSWORD`). TLS verify-full.
- Zápis do Pohody **LEN cez XML import** (nikdy SQL INSERT — rozbil by COUNTER/RefAg). Idempotencia OBJ cez `tmpEshopObjID = order.id` + `check_duplicity`.

## RPC kontrakt (rastie po fázach)
- ✅ `pohoda_heartbeat(version, mserver_ok)` — agent žije
- ✅ `pohoda_get_cursors()` — odkiaľ exportovať (skz/ad/prices/fa)
- ✅ `pohoda_ingest_stock(items, cursor)` — sklad → `Product.stockCache` cez `ProductLink`
- ⏳ `pohoda_ingest_invoices(...)` — faktúry → `Invoice` (+ DocDedup)
- ⏳ `pohoda_claim_jobs(agent, max)` / `pohoda_ack_job(...)` / `pohoda_nack_job(...)` — outbound OBJ (claim SKIP LOCKED, backoff cez `nextAttemptAt`, DLQ po N pokusoch)

## Fázy
- **0 — základ (HOTOVÉ):** migrácia (`nextAttemptAt`, partial-unique aktívneho jobu, `Order.pohodaCancelRequested`) + RPC fasáda + rola `pohoda_agent` + inbound stock RPC. Overené.
- **1 — inbound sklad:** agent .NET (mServer export skladu → `ingest_stock`), heartbeat, staleness alert. Read-only = najnižšie riziko.
- **2 — inbound faktúry:** `ingest_invoices` + PDF (signed URL) + DocDedup + multi-year kurzor.
- **3 — outbound OBJ:** `advanceOrder` (POTVRDENA) zaradí `CREATE_OBJ` job; agent claim → XML import → číslo OBJ späť; reaper, DLQ, admin UI.
- **4 — outbound storno:** kompenzačné `CANCEL_OBJ` (race so storno cez `pohodaCancelRequested`).

## Otvorené / TODO
- mServer môže vyžadovať vlastnú/exkluzívnu inštanciu Pohody (kolízia s ručnou prácou) — overiť na stroji.
- Cenové hladiny: `individualprice.xsd` → Pohoda vie individuálne ceny; vetva cien zatiaľ vypnutá (fallback `discountPct`).
- Staleness: ak agent offline > 48 h (`FRESH_MS`), katalóg → „na objednávku" (alert pri > 24 h).
