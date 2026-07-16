import type { Metadata } from "next";
import { LegalPage, H2, P, UL } from "@/components/site/legal-page";

export const metadata: Metadata = {
  title: "Obchodné podmienky — Moonid s.r.o.",
  description: "Všeobecné obchodné podmienky, reklamačný poriadok a podmienky dopravy a platby spoločnosti Moonid s.r.o. pre veľkoobchodný (B2B) predaj.",
  alternates: { canonical: "/obchodne-podmienky" },
};

export default function ObchodnePodmienky() {
  return (
    <LegalPage title="Obchodné podmienky" updated="16. 7. 2026">
      <P>
        Tieto všeobecné obchodné podmienky (ďalej „VOP") upravujú práva a povinnosti medzi spoločnosťou
        <strong> Moonid s.r.o.</strong>, so sídlom Hlavná 39/78, 941 43 Dolný Ohaj, IČO 50&nbsp;934&nbsp;660,
        DIČ 2120530995, IČ DPH SK2120530995, zapísanou v Obchodnom registri Okresného súdu Nitra, oddiel Sro,
        vložka č. 43461/N (ďalej „predávajúci"), a podnikateľským odberateľom (ďalej „kupujúci") pri dodávke tovaru.
      </P>

      <H2 id="b2b">Kupujúci je podnikateľ — výlučne veľkoobchodný (B2B) predaj</H2>
      <P>
        Portál a predaj Moonid sú určené <strong>výhradne podnikateľom</strong>. Odoslaním objednávky kupujúci
        potvrdzuje, že tovar nakupuje v rámci svojej podnikateľskej činnosti (na IČO) a <strong>nekoná ako spotrebiteľ</strong>.
        Zmluvný vzťah sa preto spravuje <strong>Obchodným zákonníkom</strong> (zákon č. 513/1991 Zb.) a týmito VOP.
      </P>
      <P>
        Na tento vzťah sa <strong>nevzťahuje zákon č. 108/2024 Z. z. o ochrane spotrebiteľa</strong> ani súvisiace
        spotrebiteľské predpisy. Kupujúcemu preto neprináležia spotrebiteľské inštitúty, najmä:
      </P>
      <UL>
        <li>právo na odstúpenie od zmluvy do 14 dní bez uvedenia dôvodu (§ 19 a nasl. zák. 108/2024),</li>
        <li>zákonná záruka v dĺžke 24 mesiacov,</li>
        <li>zákonná 30-dňová lehota na vybavenie reklamácie a spotrebiteľský reklamačný protokol,</li>
        <li>alternatívne riešenie spotrebiteľských sporov (ARS) podľa zák. 391/2015 Z. z.</li>
      </UL>

      <H2>Objednávka a uzavretie zmluvy</H2>
      <P>
        Objednávky sa zadávajú cez B2B portál (po prihlásení) alebo e-mailom. Postup v portáli: výber tovaru do
        košíka → kontrola a úprava obsahu košíka → voľba dopravy a platby → odoslanie objednávky. Až do odoslania
        môže kupujúci obsah košíka <strong>kedykoľvek opraviť alebo zmeniť</strong>.
      </P>
      <P>
        Odoslaná objednávka je záväzný návrh na uzavretie kúpnej zmluvy. <strong>Zmluva vzniká potvrdením objednávky
        predávajúcim</strong> (spravidla e-mailom). Prijatie objednávky potvrdzujeme bezodkladne elektronicky; toto
        potvrdenie zároveň slúži ako doklad o objednávke. Uzavretá zmluva (objednávka, jej potvrdenie a tieto VOP) sa
        u predávajúceho archivuje v elektronickej podobe a kupujúcemu ju na požiadanie sprístupníme. Zmluva sa uzatvára
        v slovenskom jazyku.
      </P>

      <H2>Ceny</H2>
      <UL>
        <li>Ceny v portáli sú uvedené <strong>bez DPH</strong>; k cene sa pripočíta DPH v zákonnej sadzbe (základná sadzba 23 % od 1.&nbsp;1.&nbsp;2025).</li>
        <li>Kupujúci vidí svoje dohodnuté ceny podľa pridelenej cenovej úrovne až <strong>po prihlásení</strong>; na verejnom katalógu ceny nie sú zverejnené.</li>
        <li>Minimálna hodnota objednávky: <strong>[DOPLNIŤ: napr. 30 € bez DPH / bez minima]</strong>.</li>
        <li>Predávajúci si vyhradzuje právo úpravy cien a dostupnosti tovaru; pre objednávku platí cena potvrdená predávajúcim.</li>
      </UL>

      <H2 id="doprava">Doprava, dodanie a platba</H2>
      <UL>
        <li><strong>Doprava:</strong> vlastným rozvozom v okrese Nové Zámky a Nitrianskom kraji, prípadne prepravnou spoločnosťou podľa dohody.</li>
        <li><strong>Cena dopravy:</strong> rozvoz zdarma pri objednávke nad <strong>[DOPLNIŤ: napr. 80 € bez DPH]</strong>; pri nižšej hodnote poplatok <strong>[DOPLNIŤ: napr. 5,90 € bez DPH]</strong>. Balné neúčtujeme.</li>
        <li><strong>Termín dodania:</strong> spravidla podľa rozvozového plánu po potvrdení objednávky; o termíne informujeme.</li>
        <li><strong>Platba:</strong> faktúrou so splatnosťou dohodnutou pre vašu firmu pri zriadení účtu (štandardne <strong>[DOPLNIŤ: napr. 14 dní]</strong> odo dňa vystavenia), bez platby vopred; prípadne v hotovosti pri prevzatí. Podmienky obchodného úveru (limit, splatnosť) dohodneme pri zriadení účtu.</li>
        <li><strong>Prechod nebezpečenstva škody</strong> na tovare prechádza na kupujúceho prevzatím tovaru, resp. odovzdaním prvému dopravcovi (§ 455 a nasl. Obchodného zákonníka).</li>
        <li><strong>Výhrada vlastníctva:</strong> tovar zostáva vlastníctvom predávajúceho až do úplného zaplatenia kúpnej ceny (§ 445 Obchodného zákonníka).</li>
      </UL>

      <H2 id="omeskanie">Omeškanie s platbou</H2>
      <P>
        Pri omeškaní s úhradou faktúry je predávajúci oprávnený požadovať <strong>úrok z omeškania</strong> vo výške
        podľa § 369 Obchodného zákonníka a nariadenia vlády č. 21/2013 Z. z., ako aj <strong>paušálnu náhradu nákladov</strong>{" "}
        spojených s uplatnením pohľadávky vo výške 40 € (§ 369c Obchodného zákonníka). Predávajúci je pri omeškaní ďalej
        oprávnený pozastaviť ďalšie dodávky a požadovať úhradu vopred. Náklady na upomienky a vymáhanie znáša kupujúci.
      </P>

      <H2 id="reklamacie">Zodpovednosť za vady a reklamačný poriadok</H2>
      <P>
        Zodpovednosť za vady tovaru sa spravuje <strong>§ 422 – 442 Obchodného zákonníka</strong>. Kupujúci je povinný
        tovar pri prevzatí skontrolovať. Zjavné vady (poškodenie, chýbajúce množstvo, zámena) a ostatné vady je kupujúci
        povinný <strong>vytknúť bez zbytočného odkladu</strong> po tom, čo ich zistil alebo mohol zistiť (§ 428 Obchodného
        zákonníka), najneskôr do 2 pracovných dní od prevzatia pri zjavných vadách, na{" "}
        <a href="mailto:moonid@moonid.sk" className="font-semibold text-brand hover:text-brand-2">moonid@moonid.sk</a>.
        Neskoro vytknuté vady nemusia byť uznané.
      </P>
      <P>
        <strong>Nároky z vád</strong> sa riadia § 436 – 441 Obchodného zákonníka podľa toho, či ide o podstatné alebo
        nepodstatné porušenie zmluvy — dodanie chýbajúceho alebo náhradného tovaru, odstránenie vady, primeraná zľava
        z ceny, prípadne odstúpenie od zmluvy.
      </P>
      <UL>
        <li>K reklamácii uveďte číslo faktúry/objednávky, popis vady a podľa možnosti fotodokumentáciu.</li>
        <li>Reklamáciu vybavíme bez zbytočného odkladu; o spôsobe vybavenia vás informujeme.</li>
        <li>
          <strong>Záruka za akosť:</strong> predávajúci neposkytuje paušálnu zákonnú záruku (v B2B vzťahu podľa
          Obchodného zákonníka záruka za akosť platí len ak je výslovne dohodnutá alebo vyhlásená — § 429). Pri tovare
          označenom dátumom spotreby alebo minimálnej trvanlivosti zodpovedá predávajúci za to, že tovar je do tohto
          dátumu spôsobilý na obvyklé použitie.
        </li>
        <li>Záruka sa nevzťahuje na vady spôsobené nesprávnym skladovaním alebo použitím v rozpore s návodom.</li>
      </UL>

      <H2>Vyššia moc</H2>
      <P>
        Predávajúci nezodpovedá za nesplnenie povinností spôsobené okolnosťami vylučujúcimi zodpovednosť (§ 374
        Obchodného zákonníka) — najmä živelnými udalosťami, výpadkami dodávateľov, prerušením dopravy či energií. O trvaní
        takejto prekážky a jej dôsledkoch na dodanie kupujúceho bezodkladne informujeme.
      </P>

      <H2>Riešenie sporov a rozhodné právo</H2>
      <P>
        Zmluvný vzťah a spory z neho sa spravujú <strong>právnym poriadkom Slovenskej republiky</strong>, najmä
        Obchodným zákonníkom. Spory sa strany pokúsia vyriešiť predovšetkým dohodou; ak to nie je možné, na ich
        prejednanie je príslušný <strong>všeobecný súd predávajúceho</strong> podľa procesných predpisov SR.
      </P>

      <H2>Záverečné ustanovenia</H2>
      <UL>
        <li>Spracúvanie osobných údajov upravuje samostatný dokument <a href="/ochrana-osobnych-udajov" className="font-semibold text-brand hover:text-brand-2">Ochrana osobných údajov</a>.</li>
        <li>Orgánom dozoru je Slovenská obchodná inšpekcia, Inšpektorát SOI pre Nitriansky kraj (v rozsahu všeobecného trhového dozoru).</li>
        <li>Predávajúci si vyhradzuje právo tieto VOP meniť. Zmenu oznámime v portáli, resp. e-mailom; pre už potvrdené objednávky platí znenie účinné v čase ich potvrdenia. Platné je znenie zverejnené na tomto webe.</li>
        <li>Toto znenie VOP je účinné od 16.&nbsp;7.&nbsp;2026.</li>
      </UL>
    </LegalPage>
  );
}
