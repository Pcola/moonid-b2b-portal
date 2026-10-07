"""
Fetchne EAN + ďalšie dáta pre každý produkt priamo z humed.sk.
Matchuje podľa 'Kód' na humed.sk = SKU v CSV (pre Tork, Karen, atď.)
alebo vyhľadáva podľa Zobrazovaného názvu.
"""

import csv, re, time, unicodedata, urllib.parse
import requests
from bs4 import BeautifulSoup

INPUT  = r'C:\Users\lukas\Downloads\katalog-sablona-produkty-enriched.csv'
OUTPUT = r'C:\Users\lukas\Downloads\katalog-sablona-produkty-enriched.csv'

S = requests.Session()
S.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept-Language': 'sk-SK,sk;q=0.9',
})

def slugify(text):
    nfkd = unicodedata.normalize('NFD', text)
    s = ''.join(c for c in nfkd if not unicodedata.combining(c))
    s = s.lower()
    s = re.sub(r'[®™©]', '', s)
    s = re.sub(r'[^a-z0-9\s\-]', '', s)
    s = re.sub(r'\s+', '-', s.strip())
    s = re.sub(r'-+', '-', s)
    return s

def parse_product_page(html):
    """Z HTML stránky extrahuje: ean, balenie, hmotnost"""
    data = {}
    soup = BeautifulSoup(html, 'html.parser')

    # EAN z tabuľky Dodatočné parametre
    for table in soup.find_all('table'):
        for tr in table.find_all('tr'):
            cells = tr.find_all(['td','th'])
            if len(cells) >= 2:
                lab = cells[0].get_text(strip=True).upper()
                val = cells[1].get_text(strip=True)
                if 'EAN' in lab or 'GTIN' in lab:
                    ean = re.sub(r'\D','',val)
                    if 8 <= len(ean) <= 14:
                        data['ean'] = ean
                elif 'HMOTNO' in lab:
                    data['weight'] = val

    # Fallback: regex
    if 'ean' not in data:
        m = re.search(r'EAN[:\s]+(\d{8,14})', html)
        if m:
            data['ean'] = m.group(1)

    return data

def try_direct_url(sku):
    """Skús priamy URL podľa SKU kódu (Tork, Karen, ...)"""
    url = f'https://www.humed.sk/vyhladavanie/?string={urllib.parse.quote(str(sku))}'
    try:
        r = S.get(url, timeout=8)
        if r.status_code != 200: return None, None
        soup = BeautifulSoup(r.text, 'html.parser')
        # Nájdi link kde text obsahuje kód
        for a in soup.select('a[href*="humed.sk/"]'):
            href = a.get('href','')
            if href.count('/') == 4 and 'vyhladavanie' not in href and 'strana' not in href:
                return href, None
    except: pass
    return None, None

def search_by_name(name):
    """Vyhľadá produkt podľa názvu, vráti URL prvého výsledku"""
    q = urllib.parse.quote(name[:70])
    url = f'https://www.humed.sk/vyhladavanie/?string={q}'
    try:
        r = S.get(url, timeout=8)
        if r.status_code != 200: return None
        soup = BeautifulSoup(r.text, 'html.parser')
        for a in soup.select('a[href*="humed.sk/"]'):
            href = a.get('href','')
            if (href.count('/') == 4
                    and 'vyhladavanie' not in href
                    and 'strana' not in href
                    and href.startswith('https://www.humed.sk/')):
                return href
    except: pass
    return None

def fetch_product(product_url):
    try:
        r = S.get(product_url, timeout=10)
        if r.status_code == 200:
            return parse_product_page(r.text)
    except: pass
    return {}

# ─── Hlavné spracovanie ───────────────────────────────────────────────────────

with open(INPUT, encoding='utf-8-sig', newline='') as f:
    reader = csv.DictReader(f, delimiter=';')
    fieldnames = reader.fieldnames
    rows = list(reader)

total    = len([r for r in rows if r.get('SKU','').strip()])
no_ean   = [r for r in rows if r.get('SKU','').strip() and not r.get('EAN / GTIN-13','').strip()]
print(f'Produktov spolu: {total}  |  Bez EAN: {len(no_ean)}')

found = 0
for i, row in enumerate(rows):
    sku  = row.get('SKU','').strip()
    if not sku: continue
    if row.get('EAN / GTIN-13','').strip(): continue

    name = row.get('Zobrazovaný názov','').strip() or row.get('Názov (Pohoda)','').strip()
    print(f'[{i+1}/{total}] {sku} | {name[:55]}...', end=' ', flush=True)

    prod_url = None

    # 1. Skús URL odvodenú od Zobrazovaného názvu
    if name:
        candidate = f'https://www.humed.sk/{slugify(name)}/'
        try:
            chk = S.head(candidate, timeout=5, allow_redirects=True)
            if chk.status_code == 200:
                prod_url = candidate
        except: pass

    # 2. Vyhľadaj podľa názvu
    if not prod_url and name:
        prod_url = search_by_name(name)
        time.sleep(0.3)

    # 3. Fetch produktovej stránky
    if prod_url:
        pdata = fetch_product(prod_url)
        time.sleep(0.3)
        if pdata.get('ean'):
            row['EAN / GTIN-13'] = pdata['ean']
            found += 1
            print(f'→ EAN {pdata["ean"]}')
        else:
            print('→ stránka bez EAN')
    else:
        print('→ nenájdené')

print(f'\nNájdených EAN: {found}/{len(no_ean)}')

with open(OUTPUT, 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=';',
                            quoting=csv.QUOTE_MINIMAL)
    writer.writeheader()
    writer.writerows(rows)
print(f'Uložené: {OUTPUT}')
