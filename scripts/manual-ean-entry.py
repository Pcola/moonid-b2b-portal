"""
Manual EAN entry CSV tool
Iteruje produkt po produkte a umožní user-u zadať EAN ručne
"""

import csv, sys

INPUT  = r'C:\Users\lukas\Downloads\katalog-sablona-produkty-enriched.csv'
OUTPUT = r'C:\Users\lukas\Downloads\katalog-sablona-produkty-enriched-manual.csv'

def main():
    with open(INPUT, encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f, delimiter=';')
        fieldnames = reader.fieldnames
        rows = list(reader)
    
    no_ean = [(i, r) for i, r in enumerate(rows) 
              if r.get('SKU', '').strip() and not r.get('EAN / GTIN-13', '').strip()]
    
    print(f'Produktov bez EAN: {len(no_ean)}\n')
    print('Zadaj EAN pre produkty (alebo preskoč s ENTER):\n')
    
    entered = 0
    for idx, (i, row) in enumerate(no_ean[:50]):  # Prvých 50
        name = row.get('Zobrazovaný názov', '')[:70]
        brand = row.get('Značka', '') or ''
        
        print(f'\n[{idx+1}/{min(50, len(no_ean))}]')
        print(f'  Názov: {name}')
        print(f'  Značka: {brand}')
        
        ean_input = input('  EAN: ').strip()
        
        if ean_input:
            row['EAN / GTIN-13'] = ean_input
            entered += 1
            print(f'  ✓ Vloženo')
        else:
            print(f'  (Preskočeno)')
    
    print(f'\n\nVloženych: {entered}')
    
    # Ulož
    with open(OUTPUT, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=';', quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f'Ulozene: {OUTPUT}')

if __name__ == '__main__':
    main()
