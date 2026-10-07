"""
Humed EAN Fetcher
Načíta obohatenú CSV, skúsi nájsť každý produkt na humed.sk a doplniť EAN.

Požiadavky: pip install requests beautifulsoup4
Spustenie:  python fetch-ean-humed.py
"""

import csv
import re
import time
import unicodedata
import urllib.parse

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Nainštaluj: pip install requests beautifulsoup4")
    raise

INPUT  = r'C:\Users\lukas\Downloads\katalog-sablona-produkty-enriched.csv'
OUTPUT = r'C:\Users\lukas\Downloads\katalog-sablona-produkty-enriched-ean.csv'

SESSION = requests.Session()
SESSION.headers.update({'User-Agent': 'Mozilla/5.0 (compatible; catalog-enricher/1.0)'})

# ──────────────────────────────────────────────
# Manuálne známe EAN kódy (z humed.sk / overené)
# ──────────────────────────────────────────────
KNOWN_EAN = {
    '832':    '8720181293672',   # Savo WC gél Citrón 700 ml
    '290016': '7310791256108',   # Tork Matic Premium H1 2-vr 100m biel (6ks)
    '6808':   '8720181293672',   # Savo WC gél Citrón 700ml (Humed kód)
}

def slugify(text: str) -> str:
    """Prevedie text na URL slug (slovenský → ASCII)"""
    # Normalizácia diakritiky
    nfkd = unicodedata.normalize('NFD', text)
    ascii_str = ''.join(c for c in nfkd if not unicodedata.combining(c))
    ascii_str = ascii_str.lower()
    # Odstráň špeciálne znaky
    ascii_str = re.sub(r'[^a-z0-9\s-]', '', ascii_str)
    ascii_str = re.sub(r'\s+', '-', ascii_str.strip())
    ascii_str = re.sub(r'-+', '-', ascii_str)
    return ascii_str

def search_humed_ean(name: str) -> str:
    """
    Hľadá produkt na humed.sk cez vyhľadávanie a vracia EAN ak ho nájde.
    """
    try:
        query = urllib.parse.quote(name[:80])
        url = f'https://www.humed.sk/vyhladavanie/?string={query}'
        resp = SESSION.get(url, timeout=10)
        if resp.status_code != 200:
            return ''

        soup = BeautifulSoup(resp.text, 'html.parser')
        # Nájdi prvý výsledok
        links = soup.select('a[href*="humed.sk/"]')
        product_links = [
            a['href'] for a in links
            if a.get('href', '').startswith('https://www.humed.sk/')
            and a['href'].count('/') == 4  # product slug
            and 'vyhladavanie' not in a['href']
            and 'strana' not in a['href']
        ]

        if not product_links:
            return ''

        # Fetchni prvú produktovú stránku
        prod_url = product_links[0]
        prod_resp = SESSION.get(prod_url, timeout=10)
        if prod_resp.status_code != 200:
            return ''

        prod_soup = BeautifulSoup(prod_resp.text, 'html.parser')

        # Hľadaj EAN v tabuľke "Dodatočné parametre"
        tables = prod_soup.find_all('table')
        for table in tables:
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all(['td', 'th'])
                if len(cells) >= 2:
                    label = cells[0].get_text(strip=True)
                    value = cells[1].get_text(strip=True)
                    if 'EAN' in label.upper() or 'GTIN' in label.upper():
                        ean = re.sub(r'\D', '', value)
                        if len(ean) in (13, 12, 8):
                            return ean

        # Fallback: regex priamo v texte
        ean_m = re.search(r'\bEAN[:\s]+(\d{8,13})\b', prod_resp.text)
        if ean_m:
            return ean_m.group(1)

    except Exception as e:
        print(f'  ERR: {e}')

    return ''

def process():
    with open(INPUT, encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f, delimiter=';')
        fieldnames = reader.fieldnames
        rows = list(reader)

    print(f'Celkovo produktov: {len(rows)}')
    without_ean = [r for r in rows if r.get('SKU','').strip() and not r.get('EAN / GTIN-13','').strip()]
    print(f'Bez EAN: {len(without_ean)}')

    for i, row in enumerate(rows):
        sku = row.get('SKU', '').strip()
        if not sku:
            continue
        if row.get('EAN / GTIN-13', '').strip():
            continue  # Už má EAN

        # Skús manuálnu mapu
        if sku in KNOWN_EAN:
            row['EAN / GTIN-13'] = KNOWN_EAN[sku]
            print(f'  [{i+1}] SKU {sku}: EAN (manual) = {KNOWN_EAN[sku]}')
            continue

        # Hľadaj na Humed
        name = row.get('Zobrazovaný názov', '') or row.get('Názov (Pohoda)', '')
        if not name:
            continue

        print(f'  [{i+1}/{len(rows)}] Hľadám: {name[:60]}...', end=' ', flush=True)
        ean = search_humed_ean(name)
        if ean:
            row['EAN / GTIN-13'] = ean
            print(f'→ EAN: {ean}')
        else:
            print('→ nenájdené')

        time.sleep(0.5)  # Buď slušný k serveru

    # Štatistika
    with_ean = sum(1 for r in rows if r.get('EAN / GTIN-13','').strip())
    print(f'\nS EAN: {with_ean}/{len(rows)}')

    with open(OUTPUT, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=';',
                                quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        writer.writerows(rows)
    print(f'Uložené: {OUTPUT}')

if __name__ == '__main__':
    process()
