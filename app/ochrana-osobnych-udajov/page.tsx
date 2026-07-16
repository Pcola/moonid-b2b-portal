import type { Metadata } from "next";
import { LegalPage, H2, P, UL } from "@/components/site/legal-page";

export const metadata: Metadata = {
  title: "Ochrana osobných údajov — Moonid s.r.o.",
  description: "Zásady spracúvania a ochrany osobných údajov spoločnosti Moonid s.r.o. v súlade s GDPR.",
  alternates: { canonical: "/ochrana-osobnych-udajov" },
};

export default function OchranaOsobnychUdajov() {
  return (
    <LegalPage title="Ochrana osobných údajov" updated="30. 6. 2026">
      <P>
        Tieto zásady popisujú, ako spoločnosť <strong>Moonid s.r.o.</strong>, so sídlom Hlavná 39/78, 941 43 Dolný Ohaj,
        IČO 50&nbsp;934&nbsp;660, zapísaná v Obchodnom registri Okresného súdu Nitra, oddiel Sro, vložka č. 43461/N
        (ďalej len „prevádzkovateľ"), spracúva osobné údaje
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
        <li><strong>Plnenie zmluvy a predzmluvné opatrenia</strong> (čl. 6 ods. 1 písm. b GDPR) — vybavenie objednávky, dodanie tovaru, fakturácia, prevádzka B2B portálu a vybavenie Vášho dopytu či žiadosti o cenovú ponuku pred prípadným uzavretím zmluvy (na Vašu žiadosť).</li>
        <li><strong>Zákonná povinnosť</strong> (písm. c) — účtovné a daňové doklady.</li>
        <li><strong>Oprávnený záujem</strong> (písm. f) — ochrana a bezpečnosť systémov, prevencia zneužitia a vedenie evidencie komunikácie.</li>
        <li><strong>Súhlas</strong> (písm. a) — len tam, kde ho výslovne a dobrovoľne udelíte; jeho udelenie nikdy nie je podmienkou vybavenia objednávky ani dopytu a môžete ho kedykoľvek odvolať.</li>
      </UL>

      <H2>Doba uchovávania</H2>
      <P>Osobné údaje uchovávame len po nevyhnutný čas — po dobu trvania zmluvného vzťahu a následne po dobu vyžadovanú právnymi predpismi (najmä účtovné doklady 10 rokov). Dopyty uchovávame po dobu nevyhnutnú na ich vybavenie.</P>

      <H2>Príjemcovia a sprostredkovatelia</H2>
      <P>Na prevádzku portálu využívame nasledujúcich sprostredkovateľov, ktorých spracúvanie prebieha na základe zmlúv o spracúvaní osobných údajov (čl. 28 GDPR) a ktorí spracúvajú údaje výlučne podľa našich pokynov a sú viazaní mlčanlivosťou:</P>
      <UL>
        <li><strong>Supabase</strong> — databáza, prihlasovanie a úložisko (hosting v EÚ — Frankfurt).</li>
        <li><strong>Vercel</strong> — hosting a doručovanie portálu/webu, CDN (región EÚ — Frankfurt).</li>
        <li><strong>Resend</strong> — odosielanie transakčných e-mailov (potvrdenia objednávok, notifikácie).</li>
        <li><strong>Sentry</strong> — monitorovanie chýb a stability; osobné údaje sa pred odoslaním odstraňujú (anonymizujú).</li>
      </UL>
      <P>Účtovné a daňové doklady spracúvame v účtovnom systéme Pohoda (Stormware). Tam, kde sprostredkovateľ spracúva údaje mimo EÚ, je prenos krytý štandardnými zmluvnými doložkami (SCC) podľa čl. 46 GDPR. Aktuálny zoznam sprostredkovateľov vám na požiadanie poskytneme na <a href="mailto:moonid@moonid.sk" className="font-semibold text-brand hover:text-brand-2">moonid@moonid.sk</a>.</P>

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
