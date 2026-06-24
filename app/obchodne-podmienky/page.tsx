import type { Metadata } from "next";
import { LegalPage, H2, P, UL } from "@/components/site/legal-page";

export const metadata: Metadata = {
  title: "Obchodné podmienky — Moonid s.r.o.",
  description: "Všeobecné obchodné podmienky, reklamačný poriadok a podmienky dopravy a platby spoločnosti Moonid s.r.o.",
  alternates: { canonical: "/obchodne-podmienky" },
};

export default function ObchodnePodmienky() {
  return (
    <LegalPage title="Obchodné podmienky" updated="24. 6. 2026">
      <P>
        Tieto všeobecné obchodné podmienky (ďalej „VOP") upravujú práva a povinnosti medzi spoločnosťou
        <strong> Moonid s.r.o.</strong>, so sídlom Hlavná 39/78, 941 43 Dolný Ohaj, IČO 50&nbsp;934&nbsp;660,
        DIČ 2120530995, IČ DPH SK2120530995 (ďalej „predávajúci"), a podnikateľským odberateľom (ďalej „kupujúci")
        pri dodávke tovaru. Vzťah sa riadi Obchodným zákonníkom SR; ide o veľkoobchodný (B2B) predaj.
      </P>

      <H2>Objednávka a uzavretie zmluvy</H2>
      <P>
        Objednávky sa zadávajú cez B2B portál alebo e-mailom. Zmluva vzniká potvrdením objednávky predávajúcim.
        Ceny v portáli sú uvedené bez DPH; k cene sa pripočíta DPH v zákonnej sadzbe. Predávajúci si vyhradzuje
        právo úpravy cien a dostupnosti tovaru.
      </P>

      <H2 id="doprava">Doprava a platby</H2>
      <UL>
        <li><strong>Doprava:</strong> vlastným rozvozom v okrese Nové Zámky a Nitrianskom kraji, prípadne prepravnou spoločnosťou podľa dohody.</li>
        <li><strong>Termín dodania:</strong> spravidla podľa rozvozového plánu po potvrdení objednávky; o termíne informujeme.</li>
        <li><strong>Platba:</strong> faktúrou so splatnosťou dohodnutou pri zriadení účtu (bez platby vopred), prípadne v hotovosti pri prevzatí.</li>
        <li>Tovar zostáva vlastníctvom predávajúceho až do úplného zaplatenia kúpnej ceny.</li>
      </UL>

      <H2 id="reklamacie">Reklamačné podmienky</H2>
      <P>
        Kupujúci je povinný tovar pri prevzatí skontrolovať. Zjavné vady (poškodenie, chýbajúce množstvo, zámena)
        nahláste bezodkladne, najneskôr do 2 pracovných dní od prevzatia, na{" "}
        <a href="mailto:moonid@moonid.sk" className="font-semibold text-brand hover:text-brand-2">moonid@moonid.sk</a>.
      </P>
      <UL>
        <li>K reklamácii uveďte číslo faktúry/objednávky, popis vady a podľa možnosti fotodokumentáciu.</li>
        <li>Reklamáciu vybavíme bez zbytočného odkladu; o spôsobe vybavenia vás informujeme.</li>
        <li>Záruka sa nevzťahuje na vady spôsobené nesprávnym skladovaním alebo použitím v rozpore s návodom.</li>
      </UL>

      <H2>Záverečné ustanovenia</H2>
      <P>
        Vzťahy neupravené týmito VOP sa riadia právnym poriadkom SR. Spracúvanie osobných údajov upravuje samostatný
        dokument <a href="/ochrana-osobnych-udajov" className="font-semibold text-brand hover:text-brand-2">Ochrana osobných údajov</a>.
        Predávajúci si vyhradzuje právo VOP meniť; platné je znenie zverejnené na tomto webe.
      </P>
    </LegalPage>
  );
}
