# SOP — spracovanie objednávky z portálu do Pohody (manuálne)

**Kontext:** Pohoda je single-user; mServer (automatický sync) sa počas ručnej práce v Pohode
nedá spustiť. Preto sa objednávky z portálu **prepisujú do Pohody ručne**. Portál slúži ako
kanál na príjem objednávok + komunikáciu stavu; Pohoda ostáva systém záznamu (faktúry, sklad).

Každá položka objednávky nesie **presný Pohoda kód** (`SKU = SKz.IDS = „Kód" karty`), takže
produkt v Pohode nájdeš 1:1 podľa neho. Objednávka má aj zamknutý `pohodaSkuSnapshot`.

---

## Denný postup (odporúčané ráno + poobede)

1. **Skontroluj nové objednávky.** `/staff/objednavky` → filter **Nové** (stav *Prijatá*).
   V bočnej navigácii svieti počet nových na „Objednávky".

2. **Otvor detail** objednávky. Skontroluj:
   - položky, množstvá, ceny (ceny sú zamknuté = dohodnutá cena zákazníka),
   - dodaciu adresu a poznámku zákazníka,
   - maržu (interné, len staff) — či je objednávka OK.

3. **Uprav, ak treba** (tel. dohoda, korekcia): tlačidlo **Upraviť objednávku** — množstvá,
   odobratie položiek, dodacia adresa, poznámka. (Len v stave *Prijatá* / *Potvrdená*.)

4. **Potvrď objednávku** v portáli → tlačidlo **Potvrdiť** (stav *Prijatá → Potvrdená*).
   Zákazníkovi odíde e-mail o potvrdení.

5. **Prepíš do Pohody** (Pohoda zatvorená pre mServer, ty pracuješ ručne):
   - vytvor v Pohode **prijatú objednávku / faktúru** na danú firmu,
   - každú položku pridaj podľa **SKU z portálu** (= Kód karty v Pohode),
   - skontroluj, že sa uplatnila správna **cenová hladina zákazníka** (viď [SOP ceny](#ceny)),
   - dokonči doklad v Pohode (dodací list / faktúra) štandardným Pohoda postupom.

6. **Aktualizuj stav v portáli** ako objednávka postupuje:
   *Potvrdená → Pripravuje sa → Na ceste → Doručená.*
   Každá zmena stavu pošle zákazníkovi e-mail — vidí, kde jeho objednávka je.

7. **Storno** (ak treba): tlačidlo **Stornovať** (kým nie je *Na ceste*). Nevratné, zákazník
   dostane e-mail.

---

## <a id="ceny"></a>Ceny — jednorazové nastavenie pred pilotom

Aby Pohoda pri fakturácii automaticky aplikovala správnu zľavu zákazníka:

1. V Pohode vytvor **4 percentuálne cenové hladiny** (typ „cenník − %"):
   A −8 %, B1 −12 %, B2 −18 %, B3 −22 % (alebo reálne dohodnuté %).
2. Prirad každému pilotnému zákazníkovi jeho hladinu (v karte adresára).

Tým sa cena v Pohode = cena v portáli (`ProdejKc × (1 − %)`) — **z princípu rovnaká**.
Reálne % nastav aj v portáli: `/staff/cenniky` (editovateľné).

---

## Poznámky

- **Neotváraj mServer počas ručnej práce** v Pohode (single-user konflikt).
- Objednávky v portáli majú stav Pohoda syncu **„Lokálna (nesynced)"** — je to očakávané
  (automatický sync nie je zapnutý). Fakturuje sa v Pohode.
- Číslo objednávky portálu (`WEB-RRRR-NNNNN`) si poznač do poznámky Pohoda dokladu pre
  jednoduché dohľadanie.
