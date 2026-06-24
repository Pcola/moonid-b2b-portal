import type { Metadata } from "next";
import { LegalPage, H2, P, UL } from "@/components/site/legal-page";

export const metadata: Metadata = {
  title: "Zásady používania cookies — Moonid s.r.o.",
  description: "Informácie o súboroch cookie používaných na webe Moonid s.r.o.",
  alternates: { canonical: "/cookies" },
};

export default function Cookies() {
  return (
    <LegalPage title="Zásady používania súborov cookie" updated="24. 6. 2026">
      <P>
        Súbory cookie sú malé textové súbory, ktoré web ukladá do vášho prehliadača. Spoločnosť
        <strong> Moonid s.r.o.</strong> (IČO 50&nbsp;934&nbsp;660) používa na tomto webe výhradne
        <strong> nevyhnutné cookies</strong>, ktoré sú potrebné na správne fungovanie stránky a portálu.
      </P>

      <H2>Aké cookies používame</H2>
      <UL>
        <li><strong>Nevyhnutné (technické) cookies</strong> — udržiavajú vaše prihlásenie do B2B portálu, obsah košíka a bezpečnosť relácie. Bez nich portál nefunguje.</li>
      </UL>
      <P>
        Nepoužívame analytické, marketingové ani profilovacie cookies a nezdieľame údaje s reklamnými sieťami.
        Keďže ide len o nevyhnutné cookies, na ich používanie sa podľa zákona nevyžaduje súhlas — informujeme vás o nich
        v lište pri prvej návšteve.
      </P>

      <H2>Správa cookies</H2>
      <P>
        Cookies môžete kedykoľvek vymazať alebo zablokovať v nastaveniach svojho prehliadača. Upozorňujeme, že po
        zablokovaní nevyhnutných cookies sa nebudete môcť prihlásiť do portálu ani dokončiť objednávku.
      </P>

      <H2>Kontakt</H2>
      <P>
        Otázky k cookies: <a href="mailto:moonid@moonid.sk" className="font-semibold text-brand hover:text-brand-2">moonid@moonid.sk</a>.
        Viac o spracúvaní údajov v sekcii <a href="/ochrana-osobnych-udajov" className="font-semibold text-brand hover:text-brand-2">Ochrana osobných údajov</a>.
      </P>
    </LegalPage>
  );
}
