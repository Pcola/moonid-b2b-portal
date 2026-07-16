import type { Metadata } from "next";
import { LegalPage, H2, P } from "@/components/site/legal-page";

export const metadata: Metadata = {
  title: "Zásady používania cookies — Moonid s.r.o.",
  description: "Informácie o súboroch cookie používaných na webe Moonid s.r.o. — používame výhradne nevyhnutné cookies.",
  alternates: { canonical: "/cookies" },
};

type Cookie = { name: string; purpose: string; duration: string; provider: string };

const COOKIES: Cookie[] = [
  {
    name: "sb-<projekt>-auth-token (vrátane častí .0 / .1)",
    purpose: "Udržiava prihlásenie do B2B portálu (autentifikačná relácia).",
    duration: "Trvanie relácie / do odhlásenia",
    provider: "Supabase (hosting EÚ – Frankfurt)",
  },
  {
    name: "moonid-sess",
    purpose: "Sleduje neaktivitu a maximálnu dĺžku relácie kvôli bezpečnosti (automatické odhlásenie).",
    duration: "Max. 14 dní / 24 h neaktivity",
    provider: "Moonid s.r.o.",
  },
];

export default function Cookies() {
  return (
    <LegalPage title="Zásady používania súborov cookie" updated="16. 7. 2026">
      <P>
        Súbory cookie sú malé textové súbory, ktoré web ukladá do vášho prehliadača. Spoločnosť
        <strong> Moonid s.r.o.</strong> (IČO 50&nbsp;934&nbsp;660) používa na tomto webe výhradne
        <strong> nevyhnutné (technické) cookies</strong>, ktoré sú potrebné na správne a bezpečné fungovanie stránky
        a B2B portálu. Nepoužívame analytické, marketingové ani profilovacie cookies a nezdieľame údaje s reklamnými
        sieťami. Keďže ide len o nevyhnutné cookies, na ich používanie sa podľa § 109 ods. 8 zákona č. 452/2021 Z. z.
        <strong> nevyžaduje súhlas</strong> — informujeme vás o nich v lište pri prvej návšteve.
      </P>

      <H2>Zoznam používaných cookies</H2>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[560px] border-collapse text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-line bg-[#f6f9f8] text-ink">
              <th className="px-4 py-2.5 font-semibold">Názov</th>
              <th className="px-4 py-2.5 font-semibold">Účel</th>
              <th className="px-4 py-2.5 font-semibold">Doba platnosti</th>
              <th className="px-4 py-2.5 font-semibold">Poskytovateľ</th>
            </tr>
          </thead>
          <tbody>
            {COOKIES.map((c) => (
              <tr key={c.name} className="border-b border-line last:border-0 align-top">
                <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                <td className="px-4 py-3">{c.purpose}</td>
                <td className="px-4 py-3 whitespace-nowrap">{c.duration}</td>
                <td className="px-4 py-3">{c.provider}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <P>
        Všetky uvedené cookies sú nevyhnutné, prenášajú sa zabezpečene (atribút <code>Secure</code> v produkcii)
        a s obmedzením <code>SameSite=Lax</code>. Bezpečnostný relačný cookie <code>moonid-sess</code> je navyše
        <code> HttpOnly</code> (neprístupný JavaScriptu); autentifikačný cookie Supabase (<code>sb-…-auth-token</code>)
        číta klientská časť portálu pri obnove relácie. Bez týchto cookies sa nedá prihlásiť do portálu ani dokončiť objednávku.
      </P>

      <H2>Súhlas s cookies</H2>
      <P>
        Váš záznam o oboznámení s používaním cookies ukladáme do <strong>lokálneho úložiska prehliadača</strong>{" "}
        (<code>localStorage</code>, položka <code>moonid_cookies</code>) spolu s verziou a časovou pečiatkou — nejde
        o cookie a neslúži na sledovanie. Ak v budúcnosti nasadíme voliteľné (napr. analytické) cookies, doplníme
        plnohodnotný súhlasový mechanizmus s možnosťou súhlas udeliť aj odmietnuť.
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
      <P className="text-[13px] text-muted-3">
        Tento zoznam môžeme aktualizovať pri zmene použitých cookies; platí znenie zverejnené na tomto webe.
      </P>
    </LegalPage>
  );
}
