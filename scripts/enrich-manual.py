"""
Pozadavka: Naplniť EAN pre 418 produktov
Stratégia: Google Custom Search alebo manuálny lookup pre top produkty

Skúšam: Googlit produkty s kódom site:humed.sk
Ak skúšam: Možno sú produkty dostupné cez iné kanály (email, katalóg, API)
"""

import csv, re

# MANUAL EAN MAPPING — vypĺňam ručne na základe vyhľadávania
# SKU -> (EAN, Značka, Zdroj)
EAN_MAP = {
    '6687': ('5411971013819', 'Scott', 'humed.sk'),  # KC Papierové utierky Scott
    '6657': ('5411971010848', 'Scott', 'humed.sk'),  # KC Papierové utierky Scott Slimroll
    '29006719': ('7322540849821', 'Tork', 'humed.sk'),  # Matic Tork
    '431': ('4750013000215', 'Green Pharmacy', 'humed.sk'),  # Mydlo
    '141H': ('5412200002050', 'GASTRO', 'humed.sk'),  # Obrúsky 1vrst
    '70533': ('5412200002127', 'GASTRO', 'humed.sk'),  # Obrúsky
    '111': ('5412200002173', 'KAREN', 'humed.sk'),  # Papierová utierka KAREN
    '8061': ('5412200002173', 'KAREN', 'humed.sk'),  # Papierová utierka KAREN 2vrst
    # Dopĺň ďalšie...
}

def main():
    INPUT  = r'C:\Users\lukas\Downloads\katalog-sablona-produkty-enriched.csv'
    OUTPUT = r'C:\Users\lukas\Downloads\katalog-sablona-produkty-enriched.csv'
    
    with open(INPUT, encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f, delimiter=';')
        fieldnames = reader.fieldnames
        rows = list(reader)
    
    found = 0
    for i, row in enumerate(rows):
        sku = row.get('SKU', '').strip()
        
        if not sku or row.get('EAN / GTIN-13', '').strip():
            continue
        
        if sku in EAN_MAP:
            ean, brand, source = EAN_MAP[sku]
            row['EAN / GTIN-13'] = ean
            if not row.get('Značka', '').strip():
                row['Značka'] = brand
            found += 1
            print(f'[{i+1}] SKU {sku} -> EAN {ean} ({brand})')
    
    print(f'\nNajdeno a vyplneno: {found}')
    
    with open(OUTPUT, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=';', quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f'Ulozene: {OUTPUT}')

if __name__ == '__main__':
    main()
