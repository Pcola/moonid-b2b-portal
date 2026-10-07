"""
Katalóg – obohatenie produktových dát
Číta: katalog-sablona-produkty.csv
Píše: katalog-sablona-produkty-enriched.csv
"""

import csv
import re
import os

INPUT  = r'C:\Users\lukas\Downloads\katalog-sablona-produkty.csv'
OUTPUT = r'C:\Users\lukas\Downloads\katalog-sablona-produkty-enriched.csv'

# ──────────────────────────────────────────────
# 1. Značky – poradie: dlhší reťazec pred kratším (Green Pharmacy pred Green)
# ──────────────────────────────────────────────
BRANDS_RAW = [
    # B2B / profesionálne
    'Green Pharmacy', 'Well Done', 'GREEN LINE', 'SmartAir',
    'ECOLAB', 'MEDICARINE', 'INCIDIN', 'SKINMAN', 'Suprachlor',
    'Cleamen', 'CLEAMEN', 'Masterclip', 'SpringAir', 'perlGLANZ',
    'Phytanola', 'LUCART', 'SOVIO', 'SATINO', 'LEWI',
    # Papierová hygiena
    'Tork', 'TORK', 'Karen', 'KAREN', 'Harmony', 'Daisy',
    'Scott', 'Kleenex', 'LOTUS', 'Reflex', 'Softly',
    'Cellart', 'CELLART', 'Velvet', 'VELVET', 'GRITE', 'Miléne',
    # Čistiace prostriedky
    'SIDOLUX', 'Sanytol', 'SANYTOL', 'Savo', 'SAVO',
    'Ajax', 'Cif', 'Jar', 'Domestos', 'Bref',
    'Fixinela', 'FIXINELA', 'Krystal', 'KRYSTAL',
    'Citra', 'CITRA', 'Pulirapid', 'Luxon', 'LUXON',
    'CIPRO', 'SIFO', 'Badex', 'Cheiron',
    'RAVA', 'Kolorado', 'KOLORADO', 'FOX',
    # Pracie
    'Ariel', 'Bonux', 'Lovela', 'Roberta',
    # Mydlá / gély
    'VIONE', 'Vione', 'SATUR', 'DIAVA',
    # Hotelová kozmetika
    'Simple and Pure', 'Only Nature Enjoy',
    'Eldia', 'ELDIA', 'Dolesh', 'Rofe', 'ROFE',
    'Isolda', 'ISOLDA',
    # Dávkovače / HW
    'Elite', 'ELITE', 'Tork',
    # Dez
    'Sanitiz', 'SANITIZ', 'WINSUN',
    # Iné
    'Victoria', 'VICTORIA', 'GO!',
]
# Normalizovaná mapa: lower → kanonická forma
BRAND_MAP = {}
for b in BRANDS_RAW:
    BRAND_MAP[b.lower()] = b
# Zoradené: dlhší → kratší (greedy match)
BRAND_KEYS_SORTED = sorted(BRAND_MAP.keys(), key=len, reverse=True)

# ──────────────────────────────────────────────
# 2. CLP piktogramy – kľúčové slová z popisu
# ──────────────────────────────────────────────
GHS_KEYWORDS = {
    'GHS01': ['výbušn'],
    'GHS02': ['horľav', 'flammable', 'horľavá kvapalina'],
    'GHS03': ['oxiduj'],
    'GHS04': ['plyn pod tlakom', 'aerosol'],
    'GHS05': ['vážne poleptanie', 'korozívn', 'vážne poškodenie očí', 'spôsobuje vážne poškodenie',
               'h314', 'h318'],
    'GHS06': ['akútna toxicit', 'smrteľn', 'h300', 'h310', 'h330'],
    'GHS07': ['dráždi kožu', 'dráždi oči', 'vážne podráždenie očí', 'škodliv po požití',
               'podráždenie dýchacích', 'h315', 'h319', 'h302', 'h335',
               'môže spôsobiť podráždenie'],
    'GHS08': ['nebezpečn pre zdravie', 'karcinogén', 'dlhodobé účinky na zdravie', 'h373', 'h372'],
    'GHS09': ['vodné organizmy', 'toxická pre vodné', 'škodlivá pre vodné', 'životné prostredie',
               'h400', 'h410', 'h411', 'h412', 'zabráňte uvoľneniu do životného'],
}

H_PATTERN = re.compile(r'\b(H\d{3}|EUH\d{3})\b')
SIGNAL_PATTERN = re.compile(r'\b(Nebezpečenstvo|Pozor)\b', re.IGNORECASE)

def extract_brand(name: str, popis: str) -> str:
    # Priorita: Pohoda názov (je spoľahlivejší)
    name_low = name.lower()
    for k in BRAND_KEYS_SORTED:
        if k in name_low:
            return BRAND_MAP[k]
    # Fallback: prvý riadok popisu (nie celý popis – zamedzí false-match pri substitúciách)
    first_line = popis.split('\n')[0].lower() if popis else ''
    for k in BRAND_KEYS_SORTED:
        if k in first_line:
            return BRAND_MAP[k]
    return ''

def extract_volume(name: str) -> str:
    """Extrahuj objem/hmotnosť z názvu"""
    # Vzor: číslo + jednotka (ml, l, kg, g, m) – môže mať desatinnú čiarku/bodku
    m = re.search(
        r'(\d+(?:[,\.]\d+)?\s*(?:ml|l|kg|g)\b)',
        name, re.IGNORECASE
    )
    if m:
        vol = m.group(1).strip()
        # Normalize space
        vol = re.sub(r'\s+', ' ', vol)
        return vol
    return ''

def extract_display_name(pohoda: str, popis: str) -> str:
    """
    Zobrazovaný názov: prvý riadok popisu ak vyzerá ako názov produktu,
    inak vyčistený Pohoda názov.
    """
    if popis:
        first = popis.split('\n')[0].strip()
        # Ak prvý riadok nie je príliš dlhý a nezdá sa byť vetou (nezačína slovom ako "Používajte")
        if first and len(first) <= 150 and not first[0].islower():
            # Odstrán trailing tech. info (napr. "6ks" alebo podobne pri skupinách)
            return first
    # Fallback: vyčisti Pohoda názov
    clean = re.sub(r'\s*\([^)]{1,20}\)', '', pohoda)  # odstrán (111), (8061)…
    clean = re.sub(r'\s+', ' ', clean).strip()
    # Orezanie na 100 znakov
    if len(clean) > 100:
        clean = clean[:100].rsplit(' ', 1)[0]
    return clean

def extract_short_desc(popis: str) -> str:
    """Prvé 1-2 vety z dlhého popisu, max 200 znakov"""
    if not popis:
        return ''
    # Rozdeľ na vety
    sents = re.split(r'(?<=[.!?])\s+', popis.strip())
    out = ''
    for s in sents:
        if len(out) + len(s) + 1 > 220:
            break
        out = (out + ' ' + s).strip()
    return out[:220]

def extract_clp(popis: str):
    """Vráti (piktogramy_str, signal, h_vety_str)"""
    if not popis:
        return '', '', ''
    low = popis.lower()

    # Piktogramy
    pikto = []
    for code, kws in GHS_KEYWORDS.items():
        for kw in kws:
            if kw in low:
                if code not in pikto:
                    pikto.append(code)
                break

    # Signálne slovo
    sig_m = SIGNAL_PATTERN.search(popis)
    signal = sig_m.group(1).capitalize() if sig_m else ''

    # H/EUH vety
    h_vety = sorted(set(H_PATTERN.findall(popis)))

    return '|'.join(pikto), signal, ';'.join(h_vety)

def extract_packaging(name: str, popis: str) -> str:
    """
    Balenie (ks/kartón) – hľadaj vzory ako "6ks/krt", "12 x 410 ks", "6ks", "bal./6ks"
    """
    text = name + ' ' + popis
    patterns = [
        r'(\d+\s*ks\s*/\s*(?:krt|kartón|bal|box))',
        r'(\d+\s*x\s*\d+\s*ks)',
        r'bal\.\s*/\s*(\d+\s*ks)',
        r'cena\s+(?:za|je\s+za)\s+bal\.\s*/\s*(\d+\s*ks)',
        r'balenie[:\s]+(\d+\s*(?:ks|x))',
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return m.group(1).strip()
    return ''

# ──────────────────────────────────────────────
# 3. Krajina pôvodu – jednoduché pravidlá podľa značky
# ──────────────────────────────────────────────
COUNTRY_MAP = {
    'tork': 'Švédsko',
    'ecolab': 'USA',
    'sanytol': 'Francúzsko',
    'savo': 'Česká republika',
    'ajax': 'Holandsko',
    'cif': 'Holandsko',
    'jar': 'Holandsko',
    'domestos': 'Holandsko',
    'sidolux': 'Česká republika',
    'cleamen': 'Česká republika',
    'fixinela': 'Česká republika',
    'citra': 'Slovensko',
    'rava': 'Slovensko',
    'satur': 'Slovensko',
    'vione': 'Slovensko',
    'krystal': 'Česká republika',
    'ariel': 'Holandsko',
    'bonux': 'Česká republika',
    'luxon': 'Česká republika',
    'harmony': 'Česká republika',
    'karen': 'Česká republika',
    'sanitiz': 'Slovensko',
    'green pharmacy': 'Poľsko',
}

def get_country(brand: str) -> str:
    return COUNTRY_MAP.get(brand.lower(), '')

# ──────────────────────────────────────────────
# 4. Hlavné spracovanie
# ──────────────────────────────────────────────
def process():
    with open(INPUT, encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f, delimiter=';')
        fieldnames = reader.fieldnames
        rows = list(reader)

    print(f"Načítaných: {len(rows)} produktov")
    changed = 0

    for row in rows:
        sku        = row.get('SKU', '').strip()
        pohoda     = row.get('Názov (Pohoda)', '').strip()
        popis_dlhy = row.get('Dlhý popis', '').strip()
        mj         = row.get('MJ', '').strip()

        # Preskočiť prázdne riadky
        if not sku:
            continue

        modified = False

        # ── Zobrazovaný názov ──
        if not row.get('Zobrazovaný názov', '').strip():
            val = extract_display_name(pohoda, popis_dlhy)
            if val:
                row['Zobrazovaný názov'] = val
                modified = True

        # ── Značka ──
        if not row.get('Značka', '').strip():
            val = extract_brand(pohoda, popis_dlhy)
            if val:
                row['Značka'] = val
                modified = True

        # ── Čistý obsah ──
        if not row.get('Čistý obsah', '').strip():
            val = extract_volume(pohoda)
            if not val and popis_dlhy:
                val = extract_volume(popis_dlhy[:200])
            if val:
                row['Čistý obsah'] = val
                modified = True

        # ── Krátky popis ──
        if not row.get('Krátky popis', '').strip() and popis_dlhy:
            val = extract_short_desc(popis_dlhy)
            if val:
                row['Krátky popis'] = val
                modified = True

        # ── Balenie ──
        if not row.get('Balenie (ks/kartón)', '').strip() and popis_dlhy:
            val = extract_packaging(pohoda, popis_dlhy)
            if val:
                row['Balenie (ks/kartón)'] = val
                modified = True

        # ── Krajina pôvodu ──
        if not row.get('Krajina pôvodu', '').strip():
            brand = row.get('Značka', '').strip()
            if brand:
                val = get_country(brand)
                if val:
                    row['Krajina pôvodu'] = val
                    modified = True

        # ── CLP (len ak nie sú vyplnené) ──
        no_pikto   = not row.get('CLP piktogramy', '').strip()
        no_signal  = not row.get('Signálne slovo', '').strip()
        no_hvety   = not row.get('H / EUH vety', '').strip()

        if popis_dlhy and (no_pikto or no_signal or no_hvety):
            pikto, signal, hvety = extract_clp(popis_dlhy)
            if no_pikto and pikto:
                row['CLP piktogramy'] = pikto
                modified = True
            if no_signal and signal:
                row['Signálne slovo'] = signal
                modified = True
            if no_hvety and hvety:
                row['H / EUH vety'] = hvety
                modified = True

        if modified:
            changed += 1

    print(f"Upravených riadkov: {changed}")

    with open(OUTPUT, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=';',
                                quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Uložené: {OUTPUT}")

if __name__ == '__main__':
    process()
