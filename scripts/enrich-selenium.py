"""
EAN enrich s Selenium (Firefox headless) pre viac webov
Prekonáva JS rendering a zisťuje EAN z reálnych produktových stránok.
"""

import csv, re, time, urllib.parse
try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.firefox.options import Options
except ImportError:
    print("Selenium not found. Install: pip install selenium")
    exit(1)

INPUT  = r'C:\Users\lukas\Downloads\katalog-sablona-produkty-enriched.csv'
OUTPUT = r'C:\Users\lukas\Downloads\katalog-sablona-produkty-enriched.csv'

STORES = {
    'humed': 'https://www.humed.sk',
    'leoness': 'https://www.leoness.sk',
    'corwell': 'https://www.corwell.sk',
    'roin': 'https://www.roin.sk',
}

def init_driver():
    """Inicializuje Selenium Firefox headless"""
    opts = Options()
    opts.add_argument('--headless')
    opts.add_argument('--disable-gpu')
    opts.add_argument('--window-size=1280,800')
    opts.set_preference('browser.download.folderList', 2)
    opts.set_preference('browser.helperApps.neverAsk.saveToDisk', 'application/pdf')
    
    driver = webdriver.Firefox(options=opts)
    driver.set_page_load_timeout(10)
    return driver

def search_and_extract(driver, store_name, product_name, max_attempts=2):
    """Vyhľadá produkt a extrahuje EAN z produktovej stránky"""
    if store_name not in STORES:
        return None
    
    base_url = STORES[store_name]
    search_url = f"{base_url}/vyhladavanie/?string={urllib.parse.quote(product_name[:50])}"
    
    try:
        # Otvor search
        driver.get(search_url)
        time.sleep(2)
        
        # Nájdi prvý produktový link
        try:
            prod_link = WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'a.product-name, a.product-link, h2 a'))
            )
            prod_link.click()
            time.sleep(1.5)
        except:
            # Skúsim direktny CSS selektor
            links = driver.find_elements(By.TAG_NAME, 'a')
            found = False
            for link in links:
                href = link.get_attribute('href')
                if href and store_name in href and 'vyhladavanie' not in href:
                    driver.get(href)
                    time.sleep(1.5)
                    found = True
                    break
            if not found:
                return None
        
        # Extrahuj EAN z page
        html = driver.page_source
        
        # Hľadaj v tabulke "Dodatočné parametre"
        ean_match = re.search(r'(?:EAN|GTIN)[:\s]*(\d{8,14})', html, re.IGNORECASE)
        if ean_match:
            return ean_match.group(1)
        
        # Fallback: len čísla s 8+ číslicami blízko "EAN"
        ean_match = re.search(r'EAN[^\d]*(\d{8,14})', html, re.IGNORECASE)
        if ean_match:
            return ean_match.group(1)
        
        return None
        
    except Exception as e:
        return None

def main():
    with open(INPUT, encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f, delimiter=';')
        fieldnames = reader.fieldnames
        rows = list(reader)
    
    no_ean = [r for r in rows if r.get('SKU','').strip() and not r.get('EAN / GTIN-13','').strip()]
    print(f'Bez EAN: {len(no_ean)}\n')
    
    driver = init_driver()
    found = 0
    
    try:
        for i, row in enumerate(no_ean[:50]):  # Limit na prvých 50
            sku = row.get('SKU','').strip()
            name = row.get('Zobrazovaný názov','').strip() or row.get('Názov (Pohoda)','').strip()
            if not name:
                continue
            
            # Skúšaj všetky obchody
            for store in ['humed', 'leoness', 'corwell', 'roin']:
                ean = search_and_extract(driver, store, name)
                if ean:
                    row['EAN / GTIN-13'] = ean
                    found += 1
                    print(f'  [{i+1}] {name[:45]}... → EAN {ean} ({store})')
                    break  # Prejdi na ďalší produkt
            
            # Refresh driver po každých 10
            if (i + 1) % 10 == 0:
                driver.quit()
                driver = init_driver()
    
    finally:
        driver.quit()
    
    print(f'\nNájdených: {found}/{len(no_ean[:50])}')
    
    with open(OUTPUT, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=';', quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f'Uložené: {OUTPUT}')

if __name__ == '__main__':
    main()
