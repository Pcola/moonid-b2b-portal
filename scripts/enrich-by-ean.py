"""
Enrich produkty podľa EAN kódov z Shoptet stránok
Ak máš EAN → skript nájde všetky info o produkte a vyplní CSV
"""

import csv, re, time, urllib.parse, asyncio
try:
    from playwright.async_api import async_playwright
except ImportError:
    print("INSTALL: pip install playwright && python -m playwright install chromium")
    exit(1)

INPUT  = r'C:\Users\lukas\Downloads\katalog-sablona-produkty-enriched.csv'
OUTPUT = r'C:\Users\lukas\Downloads\katalog-sablona-produkty-enriched-ean-full.csv'

# Shoptet sites
STORES = {
    'humed.sk': 'https://www.humed.sk',
    'leoness.sk': 'https://www.leoness.sk',
    'roin.sk': 'https://www.roin.sk',
    'aldakozmetika.sk': 'https://www.aldakozmetika.sk',
    'corwell.sk': 'https://www.corwell.sk',
}

async def extract_product_data(page, store_url):
    """Extrahovať všetky dostupné údaje z produktovej stránky"""
    try:
        content = await page.content()
        
        data = {}
        
        # Extrahovať z tabuliek "Dodatočné parametre"
        lines = content.split('\n')
        for i, line in enumerate(lines):
            line_upper = line.upper()
            
            # Popis
            if 'POPIS' in line_upper or '<description' in line_upper:
                text = re.search(r'>([^<]{10,200})<', line)
                if text:
                    data['Dlhý popis'] = text.group(1).strip()
            
            # Váha
            if any(x in line_upper for x in ['VÁHA', 'WEIGHT', 'G,', 'KG']):
                weight = re.search(r'(\d+\s*(?:g|kg|ml|l|cm))', line, re.IGNORECASE)
                if weight and 'Čistý obsah' not in data:
                    data['Čistý obsah'] = weight.group(1)
            
            # Balenie
            if any(x in line_upper for x in ['BALENÍ', 'PACKING', 'KS/', 'KARTÓ', '/KRT']):
                pack = re.search(r'(\d+\s*(?:ks|krt|x))', line, re.IGNORECASE)
                if pack and 'Balenie (ks/kartón)' not in data:
                    data['Balenie (ks/kartón)'] = pack.group(1)
            
            # Farba
            if 'FARBA' in line_upper or 'COLOR' in line_upper:
                color = re.search(r':\s*([^<,;]{3,30})', line)
                if color and 'Farba' not in data:
                    data['Farba'] = color.group(1).strip()
            
            # Vôňa
            if 'VÔŇA' in line_upper or 'SCENT' in line_upper:
                scent = re.search(r':\s*([^<,;]{3,30})', line)
                if scent and 'Vôňa' not in data:
                    data['Vôňa'] = scent.group(1).strip()
            
            # Materiál
            if 'MATERIÁL' in line_upper or 'MATERIAL' in line_upper:
                mat = re.search(r':\s*([^<,;]{3,50})', line)
                if mat and 'Materiál' not in data:
                    data['Materiál'] = mat.group(1).strip()
            
            # CLP piktogramy
            if any(x in line_upper for x in ['GHS', 'PIKTOGRAM', 'SIGNÁL']):
                ghs = re.findall(r'GHS\d{2}', line)
                if ghs and 'CLP piktogramy' not in data:
                    data['CLP piktogramy'] = ','.join(ghs)
        
        # Obrázky
        imgs = re.findall(r'<img[^>]*src="([^"]*)"', content)
        if imgs and 'Obrázky (URL, viac cez |)' not in data:
            img_urls = [u for u in imgs if 'product' in u.lower() or 'image' in u.lower()]
            if img_urls:
                data['Obrázky (URL, viac cez |)'] = '|'.join(img_urls[:3])
        
        # Bezpečnostný list PDF
        pdfs = re.findall(r'href="([^"]*\.pdf)"', content, re.IGNORECASE)
        if pdfs and 'KBÚ / bezp. list (URL PDF)' not in data:
            safety_pdfs = [p for p in pdfs if any(x in p.lower() for x in ['safety', 'sds', 'bezp', 'list'])]
            if safety_pdfs:
                data['KBÚ / bezp. list (URL PDF)'] = safety_pdfs[0]
        
        return data
        
    except Exception as e:
        print(f"  Error extracting: {e}")
        return {}

async def search_by_ean(browser, ean, store_name='humed.sk'):
    """Hľadá produkt podľa EAN na Shoptet stránke"""
    if store_name not in STORES:
        return None
    
    try:
        page = await browser.new_page()
        page.set_default_timeout(10000)
        
        store_url = STORES[store_name]
        search_url = f"{store_url}/vyhladavanie/?string={urllib.parse.quote(ean)}"
        
        await page.goto(search_url, wait_until='networkidle')
        await asyncio.sleep(1)
        
        # Nájdi prvý produktový link
        links = await page.query_selector_all('a')
        for link in links:
            href = await link.get_attribute('href')
            if href and 'vyhladavanie' not in href and store_name.split('.')[0] in href:
                await page.goto(href, wait_until='networkidle')
                data = await extract_product_data(page, store_url)
                await page.close()
                return data
        
        await page.close()
        return None
        
    except Exception as e:
        try:
            await page.close()
        except:
            pass
        return None

async def main():
    with open(INPUT, encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f, delimiter=';')
        fieldnames = reader.fieldnames
        rows = list(reader)
    
    with_ean = [(i, r) for i, r in enumerate(rows) 
                if r.get('SKU', '').strip() and r.get('EAN / GTIN-13', '').strip()]
    
    print(f'Produktov s EAN: {len(with_ean)}\n')
    print('Fetching product data by EAN...\n')
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        enriched = 0
        for idx, (i, row) in enumerate(with_ean[:100]):  # Prvých 100
            ean = row.get('EAN / GTIN-13', '').strip()
            name = row.get('Zobrazovaný názov', '')[:50]
            
            if not ean:
                continue
            
            # Skúšaj všetky obchody
            data = None
            for store in list(STORES.keys())[:2]:  # Skúšaj prvé 2 obchody (rýchlejšie)
                data = await search_by_ean(browser, ean, store)
                if data:
                    enriched += 1
                    print(f'[{idx+1}] {name}... -> OK ({store})')
                    
                    # Vyplň nájdené poľa
                    for key, value in data.items():
                        if key in row and not row.get(key, '').strip():
                            row[key] = value
                    
                    break
            
            if not data:
                print(f'[{idx+1}] {name}... -> nenájdené')
            
            if (idx + 1) % 10 == 0:
                await asyncio.sleep(2)  # Rate limit
        
        await browser.close()
    
    print(f'\n\nEnriched: {enriched}/{min(100, len(with_ean))}')
    
    # Ulož
    with open(OUTPUT, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=';', quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f'Uložené: {OUTPUT}')

if __name__ == '__main__':
    asyncio.run(main())
