"""
EAN fetch s Playwright (async Chromium rendering)
Prekonáva JS blokádu na Shoptet stránkach.
"""

import asyncio, csv, re, time, urllib.parse
try:
    from playwright.async_api import async_playwright
except ImportError:
    print("Playwright not installed. Run: playwright install")
    exit(1)

INPUT  = r'C:\Users\lukas\Downloads\katalog-sablona-produkty-enriched.csv'
OUTPUT = r'C:\Users\lukas\Downloads\katalog-sablona-produkty-enriched.csv'

async def fetch_ean_playwright(store_url, product_name, browser):
    """Fetchne EAN z produktovej stránky cez Playwright"""
    try:
        page = await browser.new_page()
        page.set_default_timeout(10000)
        
        search_url = f"{store_url}/vyhladavanie/?string={urllib.parse.quote(product_name[:50])}"
        await page.goto(search_url, wait_until='networkidle')
        
        # Počkaj na produktové linky
        try:
            await page.wait_for_selector('a', timeout=3000)
        except:
            pass
        
        # Nájdi prvý link na produkt
        links = await page.query_selector_all('a')
        if not links:
            await page.close()
            return None
        
        # Fetchni prvý produktový link
        for link in links:
            href = await link.get_attribute('href')
            if href and 'vyhladavanie' not in href and store_url.split('/')[2] in href:
                await page.goto(href, wait_until='networkidle')
                content = await page.content()
                
                # Extrahuj EAN
                ean_m = re.search(r'(?:EAN|GTIN)[:\s]*(\d{8,14})', content, re.IGNORECASE)
                if ean_m:
                    await page.close()
                    return ean_m.group(1)
                
                break
        
        await page.close()
        return None
    except Exception as e:
        try:
            await page.close()
        except:
            pass
        return None

async def main():
    # Načítaj CSV
    with open(INPUT, encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f, delimiter=';')
        fieldnames = reader.fieldnames
        rows = list(reader)
    
    no_ean = [(i, r) for i, r in enumerate(rows) 
              if r.get('SKU','').strip() and not r.get('EAN / GTIN-13','').strip()]
    
    print(f'Bez EAN: {len(no_ean)}\n')
    
    found = 0
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        for idx, (i, row) in enumerate(no_ean[:15]):
            name = row.get('Zobrazovaný názov','').strip() or row.get('Názov (Pohoda)','').strip()
            if not name:
                continue
            
            # Skúšaj humed
            ean = await fetch_ean_playwright('https://www.humed.sk', name, browser)
            if ean:
                row['EAN / GTIN-13'] = ean
                found += 1
                print(f'[{idx+1}] {name[:45]}... -> EAN {ean}')
            else:
                print(f'[{idx+1}] {name[:45]}... -> nenájdené')
            
            await asyncio.sleep(1)
        
        await browser.close()
    
    print(f'\nNájdených: {found}/15')
    
    # Ulož
    with open(OUTPUT, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=';', quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f'Uložené: {OUTPUT}')

if __name__ == '__main__':
    asyncio.run(main())
