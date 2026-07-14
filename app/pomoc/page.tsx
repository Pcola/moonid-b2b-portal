import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { CookieBanner } from "@/components/site/cookie-banner";

export const metadata: Metadata = {
  title: "Pomoc a časté otázky — Moonid B2B portál",
  description: "Časté otázky o objednávaní, cenách, dodaní, platbe a portáli Moonid.",
  alternates: { canonical: "/pomoc" },
};

type QA = { q: string; a: React.ReactNode };
type Section = { title: string; items: QA[] };

const SECTIONS: Section[] = [
  {
    title: "Účet a prístup",
    items: [
      { q: "Ako získam prístup do portálu?", a: <>Vyplňte <Link href="/registracia" className="font-semibold text-brand underline underline-offset-2">žiadosť o prístup</Link>. Po overení vás sprístupníme a pošleme e-mail s pozvánkou na nastavenie hesla.</> },
      { q: "Zabudol som heslo.", a: <>Na <Link href="/login" className="font-semibold text-brand underline underline-offset-2">prihlasovacej stránke</Link> kliknite na „Zabudli ste heslo?" a pošleme vám odkaz na obnovu.</> },
      { q: "Ako pridám ďalšieho kolegu z firmy?", a: <>Kontaktujte nás na <a href="mailto:moonid@moonid.sk" className="font-semibold text-brand underline underline-offset-2">moonid@moonid.sk</a> — pridáme ďalšie konto k vašej firme.</> },
    ],
  },
  {
    title: "Objednávanie",
    items: [
      { q: "Ako objednávam?", a: <>V <Link href="/katalog" className="font-semibold text-brand underline underline-offset-2">katalógu</Link> pridáte produkty do košíka a odošlete objednávku. Bez platby vopred — platíte až faktúrou.</> },
      { q: "Aké ceny vidím?", a: <>Vidíte svoje dohodnuté ceny podľa vašej cenovej úrovne — zobrazia sa až po prihlásení. Na verejnom katalógu ceny zámerne nie sú.</> },
      { q: "Čo znamená produkt na vyžiadanie?", a: <>Cenu alebo dostupnosť riešime individuálne (napr. dotované dávkovače). Napíšte nám a pripravíme ponuku.</> },
      { q: "Môžem zopakovať predošlú objednávku?", a: <>Áno. Pri každej objednávke a na nástenke je tlačidlo „Objednať znova" — položky sa pridajú do košíka (nedostupné preskočí).</> },
    ],
  },
  {
    title: "Dodanie a platba",
    items: [
      { q: "Kedy mi doručíte?", a: <>Rozvoz plánujeme my — po prijatí objednávky vám potvrdíme termín. Dátum si pri objednávke nevyberáte.</> },
      { q: "Ako platím?", a: <>Faktúrou so splatnosťou dohodnutou pre vašu firmu. Žiadna platba vopred.</> },
      { q: "Kde nájdem faktúry?", a: <>Po prihlásení v sekcii <Link href="/faktury" className="font-semibold text-brand underline underline-offset-2">Faktúry</Link> — so stavom úhrady a splatnosťou.</> },
      { q: "Vidím dostupnosť skladom?", a: <>Áno, pri produkte je stav „skladom" alebo „na objednávku". Položky na objednávku doručíme v dohodnutom termíne.</> },
    ],
  },
  {
    title: "Reklamácie a údaje",
    items: [
      { q: "Reklamácia alebo vrátenie tovaru?", a: <>Napíšte nám na <a href="mailto:moonid@moonid.sk" className="font-semibold text-brand underline underline-offset-2">moonid@moonid.sk</a> alebo zavolajte na 0919 216 908. Postup nájdete aj v <Link href="/obchodne-podmienky#reklamacie" className="font-semibold text-brand underline underline-offset-2">reklamačných podmienkach</Link>.</> },
      { q: "Ako naložím so svojimi údajmi (GDPR)?", a: <>Po prihlásení v <Link href="/nastavenia" className="font-semibold text-brand underline underline-offset-2">Nastaveniach</Link> si môžete stiahnuť export svojich údajov alebo požiadať o výmaz. Viac v <Link href="/ochrana-osobnych-udajov" className="font-semibold text-brand underline underline-offset-2">ochrane osobných údajov</Link>.</> },
    ],
  },
];

export default function PomocPage() {
  return (
    <>
      <SiteHeader solid />
      <main id="top" className="mx-auto max-w-[820px] px-5 pb-[clamp(40px,6vw,80px)] pt-[clamp(120px,14vw,160px)] sm:px-8">
        <span className="eyebrow">Podpora</span>
        <h1 className="t-h1 mt-4 text-ink" style={{ fontSize: "clamp(30px,4vw,48px)" }}>Pomoc a časté otázky</h1>
        <p className="mt-2 text-[15.5px] leading-relaxed text-muted">Odpovede na najčastejšie otázky o portáli, objednávaní a dodaní. Nenašli ste odpoveď? Napíšte na <a href="mailto:moonid@moonid.sk" className="font-semibold text-brand underline underline-offset-2">moonid@moonid.sk</a> alebo zavolajte na <a href="tel:+421919216908" className="font-semibold text-brand">0919 216 908</a>.</p>

        <div className="mt-10 flex flex-col gap-10">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="text-[20px] font-bold tracking-[-0.01em] text-ink">{s.title}</h2>
              <div className="mt-3 flex flex-col divide-y divide-line rounded-2xl border border-line bg-white">
                {s.items.map((it) => (
                  <details key={it.q} className="group px-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15.5px] font-medium text-ink marker:hidden">
                      {it.q}
                      <svg className="flex-none text-muted-2 transition-transform group-open:rotate-180" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                    </summary>
                    <div className="pb-4 text-[14.5px] leading-relaxed text-muted">{it.a}</div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
      <CookieBanner />
    </>
  );
}
