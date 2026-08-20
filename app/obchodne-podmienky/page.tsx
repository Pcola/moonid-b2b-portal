import type { Metadata } from "next";
import { LegalPage, H2, P } from "@/components/site/legal-page";
import { TERMS_SECTIONS, TERMS_SHA256, TERMS_VERSION } from "@/lib/terms";

export const metadata: Metadata = {
  title: "Obchodné podmienky — Moonid s.r.o.",
  description: "Všeobecné obchodné podmienky spoločnosti Moonid s.r.o. pre veľkoobchodný (B2B) predaj.",
  alternates: { canonical: "/obchodne-podmienky" },
};

export default function ObchodnePodmienky() {
  return (
    <LegalPage title="Všeobecné obchodné podmienky Moonid s.r.o." updated="20. 8. 2026">
      <P>
        Toto je kanonické znenie VOP, ktoré portál pri odoslaní objednávky uloží spolu s verziou,
        hashom a obchodným snapshotom. Premenlivé ceny, DPH, doprava, platba a splatnosť sú uvedené
        v rekapitulácii konkrétnej objednávky.
      </P>
      <P>
        Verzia: <strong>{TERMS_VERSION}</strong><br />
        SHA-256: <code className="break-all text-[12px]">{TERMS_SHA256}</code>
      </P>

      {TERMS_SECTIONS.map((section, index) => (
        <section key={section.title}>
          <H2>{index + 1}. {section.title}</H2>
          {section.paragraphs.map((paragraph) => <P key={paragraph}>{paragraph}</P>)}
        </section>
      ))}
    </LegalPage>
  );
}
