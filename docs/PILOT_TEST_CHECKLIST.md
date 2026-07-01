# Checklist — príprava na otcov test (F0)

Cieľ: aby si otec (vlastník) mohol prejsť celý portál na TEST prostredí a schváliť ho pred
spustením pre pár klientov. Nie je to ešte plné produkčné dotiahnutie — to príde až po jeho OK.

Legenda: **[TY]** = dashboard/konzola (nemám tam prístup) · **[JA]** = viem spraviť v kóde/DB.

---

## 1. Sprístupniť portál otcovi  **[TY]**
Produkcia je teraz za **Vercel Deployment Protection** (všetko presmeruje na Vercel login).
Vyber jedno:
- **A (najjednoduchšie na test):** Vercel → Project → *Settings → Deployment Protection* → dočasne
  **vypni** ochranu produkcie. Portál bude na `moonid-b2b-portal-...vercel.app` verejne dostupný.
- **B:** nechaj ochranu a pridaj otca do Vercel tímu (aby sa vedel prihlásiť cez Vercel).

> Po jeho schválení a pred ostrým pilotom sa ochrana/rozsah nastaví poriadne (viď DEPLOYMENT_READINESS).

## 2. Env premenné vo Vercel (Production)  **[TY]**
Skoro isto už máš nastavené DB/Supabase/Resend (appka beží). **Over** a doplň:
- `NEXT_PUBLIC_SENTRY_DSN` — pravdepodobne chýba (pridané do `.env.example` nedávno). Nastav
  z Sentry → Project → Client Keys (DSN). *(Na test nie je blokujúce, ale nech chyby vidíš.)*
- Ostatné (`DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM`, `STAFF_NOTIFY_EMAIL`,
  `NEXT_PUBLIC_SITE_URL`) — len over, že sú vyplnené.

## 3. Supabase Auth URL  **[TY]**
Supabase → *Authentication → URL Configuration*:
- **Site URL** = URL, na ktorej otec testuje (napr. ten `...vercel.app`).
- **Redirect URLs** obsahujú `<URL>/auth/callback`.
> Bez toho zlyhajú invite/reset odkazy. **Pozn.:** aj tak sa dá testovať — pri založení účtu
> staff **vidí pozvánkový odkaz priamo v portáli** (netreba čakať na e-mail).

## 4. Reálne ceny  **[TY, 5 min]**
`/staff/cenniky` → nastav **reálne %** pre A/B1/B2/B3 (teraz sú odhad). Ak má niekto vlastnú
dohodu → „Nová úroveň" (napr. VIP −25 %).

## 5. Pilotný zákazník + dáta  **[JA — potrebujem vstup]**
Povedz mi **ktorá firma** je pilotná (názov/IČO/tier) → spravím:
- založenie firmy + účtu (`/staff/zakaznici/novy` alebo priamo), pozvánkový odkaz,
- **cenovú validáciu z `.mdb`** (historicky fakturované ceny vs. cena v portáli),
- (voliteľne) **import histórie faktúr** tejto firmy → otec vidí reálne dáta, nie prázdno.

## 6. Účet pre otca  **[TY/JA]**
Otec sa prihlási buď ako **staff/admin** (vidí back-office) alebo ako **zákaznícky účet**
(vidí zákaznícku skúsenosť) — ideálne skús **oboje**. Zákaznícky účet mu založíme v kroku 5.

---

## Čo má otec otestovať (scenár)

**Ako zákazník:**
1. Prihlásenie → dashboard.
2. Katalóg: hľadanie, filtre, otvoriť produkt, pozrieť **jeho cenu** (má sedieť s dohodou).
3. Košík → objednávka → potvrdenie + e-mail.
4. Objednávky: história, opakovať poslednú objednávku, rýchla objednávka (SKU/CSV), obľúbené.
5. Faktúry (ak naimportujeme), nastavenia.

**Ako staff/admin:**
1. Spracovanie objednávky: prijať → potvrdiť → posúvať stavy, **upraviť objednávku**.
2. Zákazníci: detail, zmena tieru, pridať používateľa, **nový zákazník**.
3. Produkty: hľadať, upraviť, publikovať/skryť, nahrať obrázok.
4. Cenníky: upraviť %, nová úroveň.
5. Žiadosti o prístup (onboarding).

**Otázky pre otca po teste:** sedia ceny? chýba niečo, čo zákazník potrebuje? je niečo mätúce
alebo nedokončené? (dávkovače sú vedome Fáza 2).
