import type { Metadata } from "next";
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
        <CtaBand />
      </main>
      <SiteFooter />
      <CookieBanner />
    </>
  );
}
