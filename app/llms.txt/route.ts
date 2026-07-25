// llms.txt — machine-readable sumár pre LLM agentov / AI vyhľadávače (llmstxt.org).
// Odvodené od firemných údajov; URL z NEXT_PUBLIC_SITE_URL (konzistentné s canonical/OG).

import { SITE_URL } from "@/lib/site-url";

export const dynamic = "force-static";
export const revalidate = 86400;

export function GET() {
  const base = SITE_URL;
  const body = `# Moonid s.r.o.

> B2B veľkoobchodný dodávateľ hygieny, čistiacich prostriedkov, papierového programu, dávkovačov, gastro a kancelárskych potrieb pre prevádzky — vrátane hotelovej kozmetiky a vybavenia. Vlastný rozvoz v okrese Nové Zámky a Nitrianskom kraji, predaj na faktúru so splatnosťou (bez platby vopred).

Moonid s.r.o. (IČO 50934660, IČ DPH SK2120530995) je slovenský veľkoobchod so sídlom v Dolnom Ohaji (okres Nové Zámky), na trhu od roku 2017. Ceny sú na mieru podľa objemu odberu a viditeľné až po prihlásení do B2B portálu. Objednávky sa potvrdzujú a fakturujú so splatnosťou; nie je to okamžitý e-shop nákup.

Kontakt: +421 919 216 908 · moonid@moonid.sk · Po–Štv 8:00–17:00, Pia 8:00–14:00.

## Sortiment
- [Produkty a sortiment](${base}/produkty): katalóg — hygiena, čistiace a dezinfekčné prostriedky, hygienický papier a utierky, dávkovače a zásobníky, mydlá a peny, vrecia a obaly, gastro a kancelária

## Firma
- [O nás](${base}/o-nas): profil dodávateľa, rozvozová oblasť, spôsob spolupráce
- [Kontakt](${base}/kontakt): dopyt, kontaktné údaje, časté otázky

## B2B portál
- [Prihlásenie do portálu](${base}/login): firemné ceny, história objednávok, opakované objednávky jedným klikom, faktúry
- [Žiadosť o prístup](${base}/registracia): registrácia firmy do B2B portálu

## Právne
- [Obchodné podmienky](${base}/obchodne-podmienky)
- [Ochrana osobných údajov](${base}/ochrana-osobnych-udajov)
- [Cookies](${base}/cookies)
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
