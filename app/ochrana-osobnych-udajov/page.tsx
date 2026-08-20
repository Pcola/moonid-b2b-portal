import type { Metadata } from "next";
import { LegalPage, H2, P, UL } from "@/components/site/legal-page";

export const metadata: Metadata = {
  title: "Ochrana osobných údajov — Moonid s.r.o.",
  description: "Zásady spracúvania a ochrany osobných údajov spoločnosti Moonid s.r.o. v súlade s GDPR.",
  alternates: { canonical: "/ochrana-osobnych-udajov" },
};

export default function OchranaOsobnychUdajov() {
  return (
    <LegalPage title="Ochrana osobných údajov" updated="20. 8. 2026">
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
        <li>Technické a bezpečnostné údaje nevyhnutné na prevádzku portálu (prihlasovacia identita, IP adresa, user-agent, bezpečnostné a auditné udalosti, nevyhnutné cookies).</li>
      </UL>
      <P>
        Údaje získavame spravidla <strong>priamo od dotknutej osoby</strong> (pri registrácii, objednávke či komunikácii).
        V prípade kontaktných osôb odberateľa (napr. poverený zamestnanec) môžeme údaje získať aj sprostredkovane od
        odberateľa, v ktorého mene osoba koná. Poskytnutie identifikačných a kontaktných údajov potrebných na uzavretie
        a plnenie zmluvy je <strong>zmluvnou požiadavkou</strong> — bez nich nevieme objednávku vybaviť ani viesť B2B účet.
      </P>

      <H2>Účely a právne základy spracúvania</H2>
      <UL>
        <li><strong>Plnenie zmluvy a predzmluvné opatrenia</strong> (čl. 6 ods. 1 písm. b GDPR) — ak ste podnikateľom – fyzickou osobou alebo zmluvnou stranou, vybavenie objednávky, dodanie, fakturácia a úkony vykonané na vašu žiadosť pred uzavretím zmluvy.</li>
        <li><strong>Zákonná povinnosť</strong> (písm. c) — účtovné a daňové doklady.</li>
        <li><strong>Oprávnený záujem</strong> (písm. f) — komunikácia a správa vzťahu s právnickou osobou prostredníctvom jej poverených kontaktných osôb, prevádzka B2B účtov, ochrana a bezpečnosť systémov, prevencia zneužitia, preukazovanie obchodných úkonov a obrana právnych nárokov.</li>
        <li><strong>Súhlas</strong> (písm. a) — len tam, kde ho výslovne a dobrovoľne udelíte; jeho udelenie nikdy nie je podmienkou vybavenia objednávky ani dopytu a môžete ho kedykoľvek odvolať.</li>
      </UL>

      <H2>Doba uchovávania</H2>
      <UL>
        <li>účtovné a daňové záznamy spravidla 10 rokov podľa príslušných predpisov,</li>
        <li>objednávky, zmluvná komunikácia a účty počas vzťahu a následne podľa zákonných lehôt a času potrebného na uplatnenie alebo obranu právnych nárokov,</li>
        <li>vybavené kontaktné dopyty 12 mesiacov od vybavenia; nevybavené najviac 24 mesiacov od prijatia,</li>
        <li>aplikačné bezpečnostné/auditné záznamy 24 mesiacov, rate-limit záznamy najviac 7 dní.</li>
      </UL>
      <P>Ak právny predpis, prebiehajúci spor alebo bezpečnostný incident vyžaduje dlhšie uchovanie konkrétneho záznamu, uchováme ho len v nevyhnutnom rozsahu do skončenia daného účelu.</P>

      <H2>Príjemcovia a sprostredkovatelia</H2>
      <P>Na prevádzku portálu využívame nasledujúcich sprostredkovateľov, ktorých spracúvanie prebieha na základe zmlúv o spracúvaní osobných údajov (čl. 28 GDPR) a ktorí spracúvajú údaje výlučne podľa našich pokynov a sú viazaní mlčanlivosťou:</P>
      <UL>
        <li><strong>Supabase</strong> — databáza, prihlasovanie a úložisko v zvolenom regióne projektu.</li>
        <li><strong>Vercel</strong> — hosting, CDN, cookie-free webová analytika a meranie technického výkonu.</li>
        <li><strong>Resend</strong> — odosielanie transakčných e-mailov (potvrdenia objednávok, notifikácie).</li>
        <li><strong>Sentry</strong> — monitorovanie chýb a stability; odosielané údaje minimalizujeme a bežné identifikátory filtrujeme alebo pseudonymizujeme.</li>
      </UL>
      <P>Účtovné a daňové doklady spracúvame v účtovnom systéme Pohoda (Stormware). Aktuálny zoznam sprostredkovateľov vám na požiadanie poskytneme na <a href="mailto:moonid@moonid.sk" className="font-semibold text-brand hover:text-brand-2">moonid@moonid.sk</a>.</P>

      <H2>Prenos do tretích krajín</H2>
      <P>
        Pri niektorých dodávateľoch alebo ich subdodávateľoch môže dochádzať k spracúvaniu mimo EHP. Taký prenos
        uskutočňujeme iba na základe platného mechanizmu podľa GDPR, najmä rozhodnutia o primeranosti alebo aktuálnych
        štandardných zmluvných doložiek, a podľa potreby doplnkových opatrení. Konkrétny aktuálny zoznam príjemcov,
        krajín a použitých záruk vám poskytneme na požiadanie.
      </P>

      <H2>Automatizované rozhodovanie a profilovanie</H2>
      <P>
        Nevykonávame <strong>automatizované rozhodovanie s právnym alebo obdobne významným účinkom ani profilovanie</strong>{" "}
        v zmysle čl. 22 GDPR. Vaše údaje nepoužívame na automatizované hodnotenie osobnosti, správania či bonity.
      </P>

      <H2>Vaše práva</H2>
      <UL>
        <li>právo na prístup k údajom a na ich kópiu,</li>
        <li>právo na opravu nesprávnych údajov,</li>
        <li>právo na vymazanie („právo byť zabudnutý") a na obmedzenie spracúvania,</li>
        <li>právo namietať spracúvanie a právo na prenosnosť údajov,</li>
        <li>právo kedykoľvek odvolať súhlas,</li>
        <li>právo podať sťažnosť na Úrad na ochranu osobných údajov SR (dataprotection.gov.sk).</li>
      </UL>

      <H2>Kontakt a zodpovedná osoba</H2>
      <P>
        Prevádzkovateľ nemá zákonnú povinnosť určiť zodpovednú osobu (DPO) a neurčil ju. Vo veciach ochrany osobných
        údajov a uplatnenia práv nás kontaktujte na{" "}
        <a href="mailto:moonid@moonid.sk" className="font-semibold text-brand hover:text-brand-2">moonid@moonid.sk</a>{" "}
        alebo telefonicky na 0919&nbsp;216&nbsp;908.
      </P>
      <P>
        Súvisiace dokumenty:{" "}
        <a href="/cookies" className="font-semibold text-brand hover:text-brand-2">Zásady používania cookies</a>{" "}
        a <a href="/obchodne-podmienky" className="font-semibold text-brand hover:text-brand-2">Obchodné podmienky</a>.
      </P>
      <P className="text-[13px] text-muted-3">
        Tieto zásady môžeme aktualizovať; platí vždy znenie zverejnené na tomto webe. Dátum poslednej aktualizácie je
        uvedený v hlavičke stránky.
      </P>
    </LegalPage>
  );
}
