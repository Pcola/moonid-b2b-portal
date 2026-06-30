# Testovacia a výkonová stratégia — Moonid B2B portál

> Stav: živý baseline nameraný **2026-06-30** na produkcii `https://moonid-b2b-portal.vercel.app`.
> Stack: Next.js 15 (App Router) + Prisma + Supabase Postgres (eu-central-1) na Verceli (fra1).
> Princíp: **baseline → nájdi bottleneck → zmeň JEDNU vec → premeraj.** Field > synthetic. Meraj cold path, nielen warm.

---

## 0. TL;DR

- **Steady-state čítanie je rýchle** pre cieľový región (SK/CZ ↔ Frankfurt): authed stránky majú TTFB ~25 ms (streaming shell) a plný load ~250–300 ms. Región Vercel `fra1` ↔ Supabase `eu-central-1` je **správne co-located** (overené z `x-vercel-id: fra1::fra1`).
- **Náklady sa koncentrujú do dvoch miest, nie do SQL:**
  1. **Cold path / dostupnosť** — studený štart funkcie ~0,5–1,5 s; a najmä **7-dňový auto-pause Supabase Free** (+30 s–3 min resume). Toto je #1 reálne riziko.
  2. **Mutačná cesta** — `addToCart` server action ~900 ms (vs ~25 ms čítanie), lebo `revalidatePath("/katalog")` znova spustí celý fan-out katalógu. To isté platí pre odoslanie objednávky.
- **Čo NEoptimalizovať:** read-query tuning, indexy, RLS cost, cross-region, DB size — všetko buď už OK, alebo mimo reálneho dopadu (viď §5).

---

## 1. Nameraný baseline (live, 2026-06-30)

### 1a. Verejné cesty — `curl` z lokálneho stroja (blízko Fture)

| Cesta | Cold (1. hit, nový TLS) | Warm (reuse spojenia) | Typ | Pozn. |
|---|---|---|---|---|
| `/` | TTFB 739 ms | 160 ms | CDN **HIT**, `Age` ~9 h | Statická/ISR |
| `/api/health` (funkcia + `SELECT 1`) | 548 ms | **~100–110 ms** | `fra1::fra1`, no-store, **MISS** | Reálna 1-dotazová funkčná latencia |
| `/produkty` (verejný katalóg) | 668 ms / až **1740 ms** total | 162 ms | `force-dynamic`, 99 KB HTML | Fan-out + 0 cache → vysoká variancia |
| `/katalog` | 307 → `/login` (140 ms) | — | Za authom (middleware) | — |

### 1b. Autentifikované stránky — Playwright (reálny browser, keep-alive)

**Dealer (zákazník):**

| Stránka | cold TTFB | warm TTFB | warm load | KB |
|---|---|---|---|---|
| Dashboard | 92 | 25 | 296 | 11 |
| Katalóg | 24 | 23 | 305 | 12 |
| Katalóg `?stock=1` | 25 | 24 | 254 | 12 |
| Objednávky | 23 | 24 | 264 | 7 |
| Faktúry | 23 | 23 | 256 | 7 |
| Košík | 23 | 26 | 250 | 6 |
| Nastavenia | 24 | 23 | 235 | 7 |

**Staff:** home 31 ms / objednávky–žiadosti 23–34 ms TTFB, load 184–327 ms, 6–21 KB.

**Mutácia:** `addToCart` server action round-trip = **906 ms** (n=1, môže byť mierne nafúknuté prvým volaním).

### 1c. Metodologické pozn. (DÔLEŽITÉ pre interpretáciu)

1. **Streaming SSR skresľuje TTFB.** Next.js 15 streamuje: prvý bajt (~25 ms) je statický shell, dynamické dáta dotečú neskôr. Pre authed stránky je realistická metrika **plný load (~250–300 ms)**, nie 25 ms TTFB.
2. **Reuse spojenia vs nový proces.** `curl` ako samostatný proces robí nový TLS (~65–90 ms) zakaždým → nadhodnocuje. Browser/k6 držia keep-alive. Vždy meraj z warm spojenia.
3. **Lokalita merača.** Meraj z miesta reálneho usera (SK/CZ). Vzdialený merač (CI runner v US) pridá cez-Atlantickú RTT a skreslí.
4. **Tieto čísla sú WARM.** Funkcia bola zahriata loginom — pravý cold start NIE je v tabuľke 1b. Cold ~0,5–1,5 s (viď `/api/health` 1. hit) a project-pause +30 s–3 min meraj zámerne (§3, Vrstva 0).

---

## 2. Kde sú reálne náklady

| Oblasť | Stav | Páka |
|---|---|---|
| Read latencia (warm, región) | ✅ Výborná (~25 ms TTFB / ~280 ms load) | — netreba riešiť |
| Cold start funkcie | ⚠️ ~0,5–1,5 s | menej `force-dynamic` (caching), keep-alive |
| **Supabase 7-dňový pause** | ❌ Nezabezpečené | **Vrstva 0 — keep-alive (urob hneď)** |
| Mutačná cesta (`addToCart`, `createOrder`) | ⚠️ ~900 ms | zúžiť `revalidatePath` (neinvalidovať celý katalóg) |
| Per-page auth | 2× `getUser()` (middleware + RSC) | `getSession()` kde netreba čerstvý server-check |
| Egress / obrázky | sleduj | dlhý Cache-Control + Storage CDN |

---

## 3. Testovacia pyramída — 5 vrstiev

### Vrstva 0 — Availability + keep-alive *(najvyššie ROI, urob hneď)*
- **Artefakt:** `.github/workflows/keep-alive.yml` — pinguje `/api/health` á 6 h (drží DB živú, bráni pauseu; ~120 Actions min/mes — bezpečné aj na private repo).
- **Doplň:** externý monitor (UptimeRobot/BetterStack na `/api/health`, 5-min interval) na jemný uptime/latency — GitHub cron nie je monitor.
- **SLO:** dostupnosť 99,9 %; alert pri 2 zlyhaniach za sebou.

### Vrstva 1 — Frontend / Core Web Vitals *(set-and-forget)*
- **Field RUM:** `@vercel/speed-insights` — reálne LCP / **INP** / CLS / FCP od dílerov. *(TTI je v 2026 deprecated — interaktivitu meria INP.)*
- **Lab gate:** `lighthouserc.json` + `.github/workflows/lighthouse.yml` — verejné stránky pri PR. Authed CWV → Vrstva 3 + Speed Insights.
- Spustenie lokálne: `npx @lhci/cli autorun --config=./lighthouserc.json`.

### Vrstva 2 — Backend tracing *(keď chceš vidieť, kde rezať)*
- **Sentry** (`@sentry/nextjs` už v deps) — zapni performance tracing; uvidíš 2× `getUser()` a fan-out katalógu.
- **Prisma** `log:['query']` lokálne na 1 load `/katalog`.
- **Supabase** → Query Performance report + `pg_stat_statements`; `EXPLAIN (ANALYZE, BUFFERS)` len pri >10 ms.

### Vrstva 3 — Autentifikované E2E (Playwright) *(jadro hodnoty)*
- **Artefakty:** `playwright.config.ts`, `tests/e2e/auth.setup.ts` (login + storageState), `perf-baseline.spec.ts` (dealer), `staff-baseline.spec.ts`, `order-flow.spec.ts` (opt-in).
- **Účty:** `.env.test` (gitignored) — skopíruj z `.env.test.example`, doplň heslá. V CI → GitHub Secrets.
- **Spustenie:**
  ```bash
  npm run e2e:install   # raz: stiahne chromium
  npm run e2e           # setup → dealer + staff baseline (nedeštruktívne)
  npm run e2e:report    # HTML report
  ```
- **Deštruktívny test odoslania objednávky** (vytvorí REÁLNU objednávku + e-mail staffu; Pohoda sync sa inline NEspustí — status `LOKALNA`):
  ```bash
  # PowerShell
  $env:E2E_PLACE_ORDER="1"; npx playwright test --project=dealer order-flow
  # Bash
  E2E_PLACE_ORDER=1 npx playwright test --project=dealer order-flow
  ```

### Vrstva 4 — Load test (skromný, realistický) *(až keď to mierka vyžaduje)*
- **Artefakt:** `tests/load/read-path.js` (k6) — verejná read-path + health; smoke (1 VU) → peak (~10 VU). `npm run load`.
- **Rozsah:** write-path (košík/objednávka) sa v k6 nedá spoľahlivo (cookie + Next-Action) → rieši Playwright. k6 = súbežnosť na čítaní.
- **⚠️ Free tier:** zdieľaný compute — veľký stress meria šum susedov a môže ťa rate-limitnúť. Drž jednotky–desiatky VU, nehľadaj strop.
- **⚠️ OVERENÉ: Vercel bot-mitigácia.** Náraz requestov z jednej IP (presne to robí k6) vráti HTML *„Vercel Security Checkpoint"* namiesto appky — meral by si challenge stránku a riskuješ dočasný block. **Load-testuj preview/staging deployment, nie surovú produkciu**, alebo nastav Vercel *Protection Bypass for Automation* a spusti `k6 run -e BYPASS_TOKEN=… …`. Skript túto challenge zachytí (check `not bot-challenge`). To isté riziko platí pre curl-monitor → keep-alive má retry + voliteľný bypass header.

---

## 4. SLO / prahy

| Metrika | Cieľ |
|---|---|
| Dostupnosť (`/api/health`) | 99,9 % |
| LCP (p75, field) | < 2,5 s |
| INP (p75) | < 200 ms |
| CLS | < 0,1 |
| Authed page full load (warm, región) | < 500 ms *(teraz ~280 ms ✅)* |
| `/api/health` warm | < 200 ms *(teraz ~100 ms ✅)* |
| Odoslanie objednávky (write, p95) | < 1,5 s |
| Cold start (bez pausu) | < 2 s |
| Pause resume | **nikdy** (keep-alive) |

---

## 5. Čo NEtestovať (overené mŕtve uličky)

- 200-VU stress (nemáš toľko súbežných dílerov; meriaš šum + risk ban).
- DB size limit (22 MB / 500 MB = roky rezervy).
- Mikro-tuning indexov (dotazy 1,3–1,9 ms; groupBy Seq Scan je pri malej tabuľke správny).
- RLS cost (Prisma = `postgres` BYPASSRLS → ~0 ms; tenancy v app kóde).
- Cross-region latencia (fra1 ↔ eu-central-1 sedí).
- N+1 na cenách (riešené in-memory zo scoped include).

---

## 6. Otvorené rozhodnutia

- **Plán:** Free/Hobby vs Pro? Hobby zakazuje komerčné použitie (B2B = komerčné) → pred launchom zváž Vercel Pro. Supabase Pro ruší pause.
- **Os priority:** dostupnosť vs latencia vs kapacita — určuje, čo meriame ako prvé.
- **Mutačná revalidácia:** `addToCart` invaliduje celý `/katalog` (~900 ms). Zvážiť užšiu revalidáciu / tag-based cache.
