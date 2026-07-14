import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { CookieBanner } from "@/components/site/cookie-banner";
import { PageHero, AkoZacatSection, PodmienkySection, KontaktSection, FaqSection } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "Kontakt — Moonid s.r.o. | dopyt a cenová ponuka",
  description: "Kontaktujte Moonid s.r.o. — cenová ponuka na mieru, prenájom dávkovačov, prístup do B2B portálu. Tel 0919 216 908, moonid@moonid.sk, Dolný Ohaj.",
  alternates: { canonical: "/kontakt" },
};

export default function Kontakt() {
  return (
    <>
      <SiteHeader solid />
      <main id="top">
        <PageHero
          eyebrow="Kontakt"
          title="Začnime spoluprácu"
          subtitle="Napíšte nám, čo vaša prevádzka potrebuje — pripravíme cenovú ponuku na mieru a ozveme sa vám spravidla do 24 hodín."
        />
        <AkoZacatSection />
        <PodmienkySection />
        <KontaktSection />
        <FaqSection />
      </main>
      <SiteFooter />
      <CookieBanner />
    </>
  );
}
