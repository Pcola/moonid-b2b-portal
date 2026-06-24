import type { Metadata } from "next";
import { LegalPage, H2, P, UL } from "@/components/site/legal-page";

export const metadata: Metadata = {
  title: "Ochrana osobných údajov — Moonid s.r.o.",
  description: "Zásady spracúvania a ochrany osobných údajov spoločnosti Moonid s.r.o. v súlade s GDPR.",
  alternates: { canonical: "/ochrana-osobnych-udajov" },
};

export default function OchranaOsobnychUdajov() {
  return (
    <LegalPage title="Ochrana osobných údajov" updated="24. 6. 2026">
      <P>
        Tieto zásady popisujú, ako spoločnosť <strong>Moonid s.r.o.</strong>, so sídlom Hlavná 39/78, 941 43 Dolný Ohaj,
        IČO 50&nbsp;934&nbsp;660, zapísaná v Obchodnom registri SR (ďalej len „prevádzkovateľ"), spracúva osobné údaje
        v súlade s Nariadením (EÚ) 2016/679 (GDPR) a zákonom č. 18/2018 Z. z. o ochrane osobných údajov.
      </P>

      <H2>Aké údaje spracúvame</H2>
      <UL>
        <li>Identifikačné a kontaktné údaje: meno, e-mail, telefón, firma, IČO/DIČ, fakturačná a dodacia adresa.</li>
        <li>Údaje o objednávkach a komunikácii (obsah dopytu, história objednávok).</li>
        <li>Technické údaje nevyhnutné na prevádzku portálu (prihlasovacia identita, nevyhnutné cookies).</li>
      </UL>

      <H2>Účely a právne základy spracúvania</H2>
      <UL>
        <li><strong>Plnenie zmluvy</strong> (čl. 6 ods. 1 písm. b GDPR) — vybavenie objednávky, dodanie tovaru, fakturácia, B2B portál.</li>
        <li><strong>Zákonná povinnosť</strong> (písm. c) — účtovné a daňové doklady.</li>
        <li><strong>Oprávnený záujem</strong> (písm. f) — vybavenie dopytu, ochrana a bezpečnosť systémov.</li>
        <li><strong>Súhlas</strong> (písm. a) — tam, kde ho výslovne udelíte (napr. zaslanie dopytu cez formulár).</li>
      </UL>

      <H2>Doba uchovávania</H2>
      <P>Osobné údaje uchovávame len po nevyhnutný čas — po dobu trvania zmluvného vzťahu a následne po dobu vyžadovanú právnymi predpismi (najmä účtovné doklady 10 rokov). Dopyty uchovávame po dobu nevyhnutnú na ich vybavenie.</P>

      <H2>Príjemcovia a sprostredkovatelia</H2>
      <P>Údaje môžu byť poskytnuté spracovateľom, ktorí pre nás zabezpečujú prevádzku (hosting, e-mailové a databázové služby, účtovný systém, doručovanie). Všetci sú viazaní mlčanlivosťou a spracúvajú údaje len podľa našich pokynov. Údaje neposkytujeme do tretích krajín mimo EÚ bez primeraných záruk.</P>

      <H2>Vaše práva</H2>
      <UL>
        <li>právo na prístup k údajom a na ich kópiu,</li>
        <li>právo na opravu nesprávnych údajov,</li>
        <li>právo na vymazanie („právo byť zabudnutý") a na obmedzenie spracúvania,</li>
        <li>právo namietať spracúvanie a právo na prenosnosť údajov,</li>
        <li>právo kedykoľvek odvolať súhlas,</li>
        <li>právo podať sťažnosť na Úrad na ochranu osobných údajov SR (dataprotection.gov.sk).</li>
      </UL>

      <H2>Kontakt</H2>
      <P>
        Vo veciach ochrany osobných údajov nás kontaktujte na{" "}
        <a href="mailto:moonid@moonid.sk" className="font-semibold text-brand hover:text-brand-2">moonid@moonid.sk</a>{" "}
        alebo telefonicky na 0919&nbsp;216&nbsp;908.
      </P>
    </LegalPage>
  );
}
