"""
Simplified EAN fetch: requests + BeautifulSoup s fuzzy matching na produkty
Bez JS rendering, ale s lepšou logikou na vyhľadávanie v HTML.
"""

import csv, re, time, urllib.parse, requests
from bs4 import BeautifulSoup

INPUT  = r'C:\Users\lukas\Downloads\katalog-sablona-produkty-enriched.csv'
OUTPUT = r'C:\Users\lukas\Downloads\katalog-sablona-produkty-enriched.csv'

# Manual EAN map: SKU -> EAN (začínam s dvoma známymi)
MANUAL_MAP = {
    '832': '8720181293672',  # Savo WC Citrón 700ml (z fetch_webpage testu)
}

S = requests.Session()
S.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
})

def extract_ean_from_html(html):
    """Ekstrahuje EAN z produktovej stránky"""
    # Hľadaj v tabulkách
    soup = BeautifulSoup(html, 'html.parser')
    for table in soup.find_all('table'):
        for tr in table.find_all('tr'):
            cells = tr.find_all(['td','th'])
            if len(cells) >= 2:
                lab = cells[0].get_text(strip=True).upper()
                val = cells[1].get_text(strip=True)
                if any(x in lab for x in ['EAN', 'GTIN', 'KÓD']):
                    ean = re.sub(r'\D', '', val)
                    if 8 <= len(ean) <= 14:
                        return ean
    
    # Fallback: regex v celom HTML
    m = re.search(r'(?:EAN|GTIN)[:\s]+(\d{8,14})', html, re.IGNORECASE)
    if m:
        return m.group(1)
    
    # Ešte fallback: len dlhé čísla
    for match in re.finditer(r'\d{13}', html):
        ean = match.group()
        if ean in html:
            return ean
    
    return None

def search_humed(product_name):
    """Vyhľadá na humed.sk a vracia prvý nájdený EAN"""
    try:
        url = f'https://www.humed.sk/vyhladavanie/?string={urllib.parse.quote(product_name[:50])}'
        resp = S.get(url, timeout=8)
        if resp.status_code != 200:
            return None
        
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # Nájdi linky na produkty (bez "vyhladavanie" v URL)
        for a in soup.find_all('a', href=True):
            href = a['href']
            if 'vyhladavanie' not in href and 'humed.sk' in href:
                # Fetchni produktovú stránku
                prod_resp = S.get(href, timeout=8)
                if prod_resp.status_code == 200:
                    ean = extract_ean_from_html(prod_resp.text)
                    if ean:
                        return ean
                time.sleep(0.5)
        
        return None
    except:
        return None

def main():
    # Načítaj CSV
    with open(INPUT, encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f, delimiter=';')
        fieldnames = reader.fieldnames
        rows = list(reader)
    
    no_ean = [(i, r) for i, r in enumerate(rows) 
              if r.get('SKU','').strip() and not r.get('EAN / GTIN-13','').strip()]
    
    print(f'Bez EAN: {len(no_ean)}\n')
    
    found = 0
    
    # Skúšaj top 30 produktov
    for idx, (i, row) in enumerate(no_ean[:30]):
        sku = row.get('SKU','').strip()
        
        # Skontroluj manual map
        if sku in MANUAL_MAP:
            row['EAN / GTIN-13'] = MANUAL_MAP[sku]
            found += 1
            print(f'[{idx+1}] SKU {sku} -> EAN {MANUAL_MAP[sku]} (manual)')
            continue
        
        name = row.get('Zobrazovaný názov','').strip() or row.get('Názov (Pohoda)','').strip()
        if not name:
            continue
        
        # Vyhľadaj na humed
        ean = search_humed(name)
        if ean:
            row['EAN / GTIN-13'] = ean
            found += 1
            print(f'[{idx+1}] {name[:45]}... -> EAN {ean}')
        else:
            print(f'[{idx+1}] {name[:45]}... -> nenájdené')
        
        time.sleep(1)
    
    print(f'\nNájdených: {found}/30')
    
    # Ulož
    with open(OUTPUT, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=';', quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f'Uložené: {OUTPUT}')

if __name__ == '__main__':
    main()
