import type { Metadata } from "next";
import Link from "next/link";
import { RegistraciaForm } from "./registracia-form";

export const metadata: Metadata = {
  title: "Požiadať o prístup do B2B portálu — Moonid s.r.o.",
  description: "Požiadajte o zriadenie firemného účtu v B2B portáli Moonid. Po overení získate prístup k vašim cenám, objednávkam a faktúram.",
  alternates: { canonical: "/registracia" },
};

export default function RegistraciaPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* ľavý zelený panel — jednotný s login stránkou */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-[clamp(40px,5vw,64px)] text-mintbg lg:flex"
        style={{ background: "radial-gradient(130% 120% at 80% -10%, #21564C 0%, #163F38 55%)" }}
      >
        <div className="relative z-[2] flex items-center gap-3">
          <span className="text-[30px] font-medium tracking-[-0.02em] text-white">moonid</span>
          <span className="border-l border-white/25 pl-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-mint-2">B2B portál</span>
        </div>

        <div className="relative z-[2] flex max-w-[440px] flex-col gap-6">
          <span className="inline-flex items-center gap-2.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-mint">
            <span className="h-[1.5px] w-[26px] bg-mint" />Pre vašu prevádzku
          </span>
          <h1 className="text-white" style={{ fontSize: "clamp(34px,4vw,52px)", lineHeight: 1.06, letterSpacing: "-0.02em", textWrap: "balance" }}>
            Získajte prístup k vašim cenám a objednávkam
          </h1>
          <p className="text-[17px] leading-relaxed text-[#b7ccc6]">
            Po overení firmy vám zriadime účet s vašou cenovou úrovňou — objednávate online, máte históriu, faktúry aj opakované doobjednanie poruke.
          </p>
          <div className="mt-1.5 flex flex-col gap-3 border-t border-white/15 pt-5">
            {["Vyplníte údaje o firme (IČO)", "Overíme a priradíme cenovú úroveň", "Pošleme pozvánku na nastavenie hesla"].map((s, i) => (
              <div key={i} className="flex items-center gap-3 text-[14.5px] text-[#cfe0db]">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-white/10 text-[12px] font-semibold text-mint">{i + 1}</span>
                {s}
              </div>
            ))}
          </div>
        </div>

        <span className="relative z-[2] text-[12.5px] text-[#6e938b]">© {new Date().getFullYear()} Moonid s.r.o. · moonid@moonid.sk</span>
      </div>

      {/* pravý formulár */}
      <div className="flex items-center justify-center bg-white p-[clamp(28px,5vw,56px)]">
        <div className="flex w-full max-w-[520px] flex-col gap-7">
          <Link href="/" className="text-[26px] font-bold tracking-[-0.02em] text-brand lg:hidden">moonid</Link>
          <div className="flex flex-col gap-2.5">
            <h2 className="text-[32px] tracking-[-0.01em] text-ink">Požiadať o prístup</h2>
            <p className="text-[15px] leading-relaxed text-muted">Vyplňte údaje o firme — ozveme sa a sprístupníme vás do portálu.</p>
          </div>
          <RegistraciaForm />
          <p className="text-[13.5px] text-muted-2">
            Už máte účet? <Link href="/login" className="font-semibold text-brand transition hover:text-brand-2">Prihláste sa</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
