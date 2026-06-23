import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { CookieBanner } from "@/components/site/cookie-banner";
import { PageHero } from "@/components/site/sections";
import { RegistraciaForm } from "./registracia-form";

export const metadata: Metadata = {
  title: "Požiadať o prístup do B2B portálu — Moonid s.r.o.",
  description: "Požiadajte o zriadenie firemného účtu v B2B portáli Moonid. Po overení získate prístup k vašim cenám, objednávkam a faktúram.",
  alternates: { canonical: "/registracia" },
};

export default function RegistraciaPage() {
  return (
    <>
      <SiteHeader />
      <main id="top">
        <PageHero
          eyebrow="B2B portál"
          title="Požiadať o prístup"
          subtitle="Vyplňte údaje o firme a ozveme sa vám. Po overení vám zriadime účet s vašou cenovou úrovňou a pošleme pozvánku na nastavenie hesla."
        />
        <section style={{ padding: "clamp(40px,5vw,72px) 0" }}>
          <div className="mx-auto max-w-[760px] px-5 sm:px-8">
            <RegistraciaForm />
            <p className="mt-5 text-center text-[13.5px] text-muted-2">
              Už máte účet? <a href="/login" className="font-semibold text-brand transition hover:text-brand-2">Prihláste sa</a>
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
      <CookieBanner />
    </>
  );
}
