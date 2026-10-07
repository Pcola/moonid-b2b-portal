"""
Multi-site EAN enrich: humed.sk, leoness.sk, corwell.sk, roin.sk, aldakozmetika.sk
Hľadá produkty a EAN na všetkých weboch paralelne.
"""

import csv, re, time, unicodedata, urllib.parse, random
import requests
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed

INPUT  = r'C:\Users\lukas\Downloads\katalog-sablona-produkty-enriched.csv'
OUTPUT = r'C:\Users\lukas\Downloads\katalog-sablona-produkty-enriched.csv'

# Webové stránky s ich URL vyhľadávacími vzormi
STORES = {
    'humed': {
        'search_url': lambda q: f'https://www.humed.sk/vyhladavanie/?string={urllib.parse.quote(q[:60])}',
        'parse': 'humed'
    },
    'leoness': {
        'search_url': lambda q: f'https://www.leoness.sk/vyhladavanie/?string={urllib.parse.quote(q[:60])}',
        'parse': 'leoness'
    },
    'corwell': {
        'search_url': lambda q: f'https://www.corwell.sk/hledani/?hledani={urllib.parse.quote(q[:60])}',
        'parse': 'corwell'
    },
    'roin': {
        'search_url': lambda q: f'https://www.roin.sk/vyhladavanie?search={urllib.parse.quote(q[:60])}',
        'parse': 'roin'
    },
}

S = requests.Session()
S.headers.update({'User-Agent': 'Mozilla/5.0'})

def parse_humed_leoness(html):
    """Extrahuje EAN z humed/leoness produktovej stránky"""
    soup = BeautifulSoup(html, 'html.parser')
    for table in soup.find_all('table'):
        for tr in table.find_all('tr'):
            cells = tr.find_all(['td','th'])
            if len(cells) >= 2:
                lab = cells[0].get_text(strip=True).upper()
                val = cells[1].get_text(strip=True)
                if 'EAN' in lab or 'GTIN' in lab:
                    ean = re.sub(r'\D','',val)
                    if 8 <= len(ean) <= 14:
                        return ean
    # Fallback: regex v HTML
    m = re.search(r'EAN[:\s]+(\d{8,14})', html)
    return m.group(1) if m else ''

def search_on_store(store_name, product_name, sku):
    """Hľadá produkt na jednom webe a vracia (EAN, store_name) alebo None"""
    if store_name not in STORES:
        return None

    try:
        store_cfg = STORES[store_name]
        search_url = store_cfg['search_url'](product_name)
        
        # Vyhľadávacie výsledky
        resp = S.get(search_url, timeout=8)
        if resp.status_code != 200:
            return None

        soup = BeautifulSoup(resp.text, 'html.parser')

        # Nájdi prvý link na produkt
        prod_link = None
        for a in soup.select('a[href]'):
            href = a.get('href', '')
            # Predpoklad: produktové URL s 4-5 / v path
            if (store_name in href or 'http' in href) and \
               href.count('/') >= 4 and 'vyhladavanie' not in href:
                if any(x in href for x in ['.sk/', '.cz/']):
                    prod_link = href
                    break

        if not prod_link:
            return None

        # Fetchni produktovú stránku
        if not prod_link.startswith('http'):
            base = f'https://{store_name}.sk/'
            prod_link = base + prod_link.lstrip('/')

        prod_resp = S.get(prod_link, timeout=8)
        if prod_resp.status_code != 200:
            return None

        # Extrahuj EAN podľa parsera
        parser = store_cfg['parse']
        if parser in ['humed', 'leoness']:
            ean = parse_humed_leoness(prod_resp.text)
            if ean:
                return (ean, store_name)

        # Generic fallback
        ean_m = re.search(r'(\d{8,14}).*(?:EAN|GTIN)', prod_resp.text)
        if ean_m:
            return (ean_m.group(1), store_name)

    except Exception as e:
        pass

    return None

def process():
    with open(INPUT, encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f, delimiter=';')
        fieldnames = reader.fieldnames
        rows = list(reader)

    total = len([r for r in rows if r.get('SKU','').strip()])
    no_ean = [r for r in rows if r.get('SKU','').strip() and not r.get('EAN / GTIN-13','').strip()]
    print(f'Produktov: {total} | Bez EAN: {len(no_ean)}\n')

    found = 0

    # ThreadPool na paralelný search
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {}

        for i, row in enumerate(rows):
            sku = row.get('SKU','').strip()
            if not sku or row.get('EAN / GTIN-13','').strip():
                continue

            name = row.get('Zobrazovaný názov','').strip() or row.get('Názov (Pohoda)','').strip()
            if not name:
                continue

            # Spusť search na všetkých weboch pre tento produkt
            for store in STORES.keys():
                future = executor.submit(search_on_store, store, name, sku)
                futures[future] = (i, row, store)

            # Limiter: čakaj po každých 20 submitoch
            if (i + 1) % 20 == 0:
                time.sleep(1)

        # Zber výsledkov
        for future in as_completed(futures):
            i, row, store = futures[future]
            result = future.result()
            if result and not row.get('EAN / GTIN-13','').strip():
                ean, store_found = result
                row['EAN / GTIN-13'] = ean
                found += 1
                name = row.get('Zobrazovaný názov','')[:50]
                print(f'  [{i+1}] {name}... → EAN {ean} ({store_found})')

    print(f'\nNájdených: {found}/{len(no_ean)}')

    with open(OUTPUT, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=';',
                                quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        writer.writerows(rows)
    print(f'Uložené: {OUTPUT}')

if __name__ == '__main__':
    process()
