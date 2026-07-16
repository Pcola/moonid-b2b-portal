import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { CookieBanner } from "@/components/site/cookie-banner";
import { PageHero, PreKohoSection, HotelSection, PrecoSection, ReferencieSection, CtaBand } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "O nás — Moonid s.r.o. | B2B dodávateľ hygieny a vybavenia",
  description: "Moonid s.r.o. — od roku 2017 jeden dodávateľ hygieny, čistenia a vybavenia pre prevádzky v okrese Nové Zámky a Nitrianskom kraji. Vlastný rozvoz, osobný prístup.",
  alternates: { canonical: "/o-nas" },
};

export default function ONas() {
  return (
    <>
      <SiteHeader solid />
      <main id="top">
        <PageHero
          eyebrow="O spoločnosti"
          title="Jeden spoľahlivý partner pre celý chod vašej prevádzky"
          subtitle="Moonid je B2B dodávateľ hygieny, čistenia a vybavenia. Od roku 2017 zásobujeme prevádzky v okrese Nové Zámky a Nitrianskom kraji — s vlastným rozvozom a osobným prístupom."
        />
        <PreKohoSection />
        <HotelSection />
        <PrecoSection />
        <ReferencieSection />
        <FiremneUdaje />
        <CtaBand />
      </main>
      <SiteFooter />
      <CookieBanner />
    </>
  );
}

const IDENT: { label: string; value: string }[] = [
  { label: "Obchodné meno", value: "Moonid s.r.o." },
  { label: "Sídlo", value: "Hlavná 39/78, 941 43 Dolný Ohaj" },
  { label: "IČO", value: "50 934 660" },
  { label: "DIČ", value: "2120530995" },
  { label: "IČ DPH", value: "SK2120530995" },
  { label: "Zápis v registri", value: "Obchodný register Okresného súdu Nitra, oddiel Sro, vložka č. 43461/N" },
  { label: "Bankové spojenie", value: "[DOPLNIŤ: IBAN]" },
  { label: "E-mail", value: "moonid@moonid.sk" },
  { label: "Telefón", value: "0919 216 908" },
  { label: "Orgán dozoru", value: "Slovenská obchodná inšpekcia, Inšpektorát SOI pre Nitriansky kraj (v rozsahu všeobecného trhového dozoru)" },
];

const DOKUMENTY: { label: string; href: string }[] = [
  { label: "Obchodné podmienky", href: "/obchodne-podmienky" },
  { label: "Reklamačné podmienky", href: "/obchodne-podmienky#reklamacie" },
  { label: "Doprava a platby", href: "/obchodne-podmienky#doprava" },
  { label: "Ochrana osobných údajov", href: "/ochrana-osobnych-udajov" },
  { label: "Zásady používania cookies", href: "/cookies" },
];

function FiremneUdaje() {
  return (
    <section className="mx-auto max-w-[1240px] px-5 py-[clamp(48px,6vw,88px)] sm:px-8">
      <span className="eyebrow">Fakturačné a registračné údaje</span>
      <h2 className="t-h2 mt-3 max-w-[16ch] text-ink" style={{ fontSize: "clamp(24px,3vw,36px)" }}>
        Informácie o spoločnosti
      </h2>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-0 rounded-2xl border border-line bg-white p-6 sm:grid-cols-2 sm:p-8">
          {IDENT.map((row) => (
            <div key={row.label} className="flex flex-col gap-0.5 border-b border-line/70 py-3 last:border-0 sm:[&:nth-last-child(2)]:border-0">
              <dt className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-3">{row.label}</dt>
              <dd className="text-[15px] text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-[#f6f9f8] p-6 sm:p-8">
          <h3 className="text-[15px] font-bold text-ink">Právne dokumenty</h3>
          <ul className="flex flex-col gap-2.5">
            {DOKUMENTY.map((d) => (
              <li key={d.href}>
                <Link href={d.href} className="inline-flex items-center gap-2 text-[15px] font-medium text-brand hover:text-brand-2">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
                  {d.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-3">Portál a predaj Moonid sú určené výhradne podnikateľom (B2B). Predaj sa spravuje Obchodným zákonníkom.</p>
        </div>
      </div>
    </section>
  );
}
