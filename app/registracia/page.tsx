import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthPanel } from "@/components/auth/auth-panel";
import { RegistraciaForm } from "./registracia-form";

export const metadata: Metadata = {
  title: "Požiadať o prístup do B2B portálu — Moonid s.r.o.",
  description: "Požiadajte o zriadenie firemného účtu v B2B portáli Moonid. Po overení získate prístup k vašim cenám, objednávkam a faktúram.",
  alternates: { canonical: "/registracia" },
};

const steps = (
  <div className="flex flex-col gap-3">
    {["Vyplníte údaje o firme (IČO)", "Overíme a priradíme cenovú úroveň", "Pošleme pozvánku na nastavenie hesla"].map((s, i) => (
      <div key={i} className="flex items-center gap-3 text-[14.5px] text-[#cfe0db]">
        <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-white/10 text-[12px] font-semibold text-mint">{i + 1}</span>
        {s}
      </div>
    ))}
  </div>
);

export default function RegistraciaPage() {
  return (
    <AuthShell
      rightMax="max-w-[520px]"
      panel={
        <AuthPanel
          headline="Získajte prístup k vašim cenám a objednávkam"
          lead="Po overení firmy vám zriadime účet s vašou cenovou úrovňou — objednávate online, máte históriu, faktúry aj opakované doobjednanie poruke."
        >
          {steps}
        </AuthPanel>
      }
    >
      <div className="flex flex-col gap-2.5">
        <h2 className="text-[32px] tracking-[-0.01em] text-ink">Požiadať o prístup</h2>
        <p className="text-[15px] leading-relaxed text-muted">Vyplňte údaje o firme — ozveme sa a sprístupníme vás do portálu.</p>
      </div>
      <RegistraciaForm />
      <p className="text-[13.5px] text-muted-2">
        Už máte účet? <Link href="/login" className="font-semibold text-brand transition hover:text-brand-2">Prihláste sa</Link>
      </p>
    </AuthShell>
  );
}
