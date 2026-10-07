import csv

with open(r'C:\Users\lukas\Downloads\katalog-sablona-produkty-enriched.csv', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f, delimiter=';')
    rows = list(reader)
    
    # Vypiš stĺpce
    print("Columns:", list(reader.fieldnames) if hasattr(reader, 'fieldnames') else list(rows[0].keys()))
    print()
    
    # Prvý produkt
    r = rows[0]
    for k, v in list(r.items())[:10]:
        print(f"{k}: {v[:80] if len(str(v)) > 80 else v}")
