# EAN Import Status

## Problem Summary
Katalóg má **418 produktov** bez EAN/GTIN kódov. Všetci 5 maloobchodníci (humed.sk, leoness.sk, roin.sk, aldakozmetika.sk, corwell.sk) používajú **Shoptet e-shop platformu s JavaScript renderingom**.

## Why Scraping Failed
- **requests library** vracia 404 alebo prázdnu HTML (JS rendering blokuje)
- **Playwright** - dependency conflict (inspect.FrameInfo AttributeError)
- **Selenium** - Firefox nie je nainštalovaný
- **Shoptet XML API** - nepublicky dostupná (404)
- **HTTP vyhľadávacie URL-y** - generované JavaScript-om

## Completed Tasks
- ✅ Zobrazovaný názov: 418/418 (100%)
- ✅ Krátky popis: 129/418 (30%)
- ✅ Značka: 148/418 (35%)
- ✅ Čistý obsah: 161/418 (38%)
- ✅ Krajina pôvodu: 80/418 (19%)
- ✅ CLP piktogramy: 16/418 (3%)

## Remaining Work
- 🟡 **EAN / GTIN-13**: 1/418 (0.2%) — **BLOCKADED**
- 🟡 **Balenie (ks/kartón)**: 29/418 (6%)
- ❌ **H/EUH vety**: 1/418 (0%) — requires detailed safety data
- ❌ **Obrázky**: validation needed

## Solutions Available

### Option 1: Browser Automation (Manual)
1. Otvor [https://www.humed.sk](https://www.humed.sk)
2. Hľadaj produkt podľa názvu → klikni → vypis EAN z detailov
3. Opakovať pre všetky 418 produktov

### Option 2: Python Script - Manual Interactive Entry
```bash
python "c:\workspace\websites\moonid_b2b_portal\scripts\manual-ean-entry.py"
```
Interaktívne vloží EANy pre prvých 50 produktov.

### Option 3: Contact Retailers Directly
Poslať email humed.sk, leoness.sk, roin.sk s žiadosťou o **B2B katalóg Excel/CSV** s cenami a EAN kódmi.

### Option 4: Use BrowserStack / Playwright Cloud
Ak máš Playwright Cloud account, možno ich API by renderoval bez dependency issues.

### Option 5: MCP Connector for E-commerce
Vytvoriť MCP server s Shoptet API (potrebný API key od obchodu).

## Recommended Next Steps

1. **Skontaktuj maloobchodníkov** (humed.sk, leoness.sk) — požiadaj o B2B katalóg CSV
2. **Alebo**: Použi manual-ean-entry.py script a "copy-paste" EAN z prehliadača
3. **Alebo**: Vytvor Playwright Cloud account a prepoj s mojim skriptom

## Files Created This Session
- `enrich-multisite.py` - ThreadPool fetcher (froze)
- `enrich-ean-simple.py` - requests + BeautifulSoup (0% success)
- `enrich-selenium.py` - Selenium wrapper (Firefox missing)
- `enrich-playwright.py` - Playwright + Chromium (dependency error)
- `manual-ean-entry.py` - Interactive CSV editor
- `enrich-manual.py` - Hardcoded EAN map (manual)

## Current CSV Status
- **Input**: `katalog-sablona-produkty-enriched.csv` (417/418 bez EAN)
- **Last Output**: Same file (no EAN changes due to scraping failure)
- **Recommendation**: Add EAN field populated before marking as "FINAL"

---

**Note**: Bez JavaScript rendering engine alebo B2B API, nemôžeme automatizovať EAN fetch.
