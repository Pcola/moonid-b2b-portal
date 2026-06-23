import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Prihlásenie — Moonid B2B portál" };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* ľavý zelený panel */}
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
            Objednávajte hygienu a vybavenie na jednom mieste
          </h1>
          <p className="text-[17px] leading-relaxed text-[#b7ccc6]">
            Vaše ceny, história objednávok, opakované doobjednanie jedným klikom a faktúry — vždy poruke.
          </p>
          <div className="mt-1.5 flex gap-7 border-t border-white/15 pt-5">
            <div className="flex flex-col gap-0.5">
              <span className="text-[28px] text-white">1 600+</span>
              <span className="text-[12.5px] text-[#8fb3ab]">položiek v sortimente</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[28px] text-white">Vlastný rozvoz</span>
              <span className="text-[12.5px] text-[#8fb3ab]">Nové Zámky a okolie</span>
            </div>
          </div>
        </div>

        <span className="relative z-[2] text-[12.5px] text-[#6e938b]">© {new Date().getFullYear()} Moonid s.r.o. · moonid@moonid.sk</span>
      </div>

      {/* pravý formulár */}
      <div className="flex items-center justify-center bg-white p-[clamp(32px,5vw,64px)]">
        <div className="flex w-full max-w-[380px] flex-col gap-8">
          <Link href="/" className="text-[26px] font-bold tracking-[-0.02em] text-brand lg:hidden">moonid</Link>
          <div className="flex flex-col gap-2.5">
            <h2 className="text-[32px] tracking-[-0.01em] text-ink">Prihlásenie</h2>
            <p className="text-[15px] leading-relaxed text-muted">Zadajte firemné prihlasovacie údaje pre prístup do portálu.</p>
          </div>
          <Suspense>
            <LoginForm />
          </Suspense>
          <p className="border-t border-line pt-5 text-[13.5px] leading-relaxed text-muted-2">
            Nemáte ešte prístup?{" "}
            <Link href="/registracia" className="font-semibold text-brand transition hover:text-brand-2">Požiadajte o zriadenie účtu</Link>{" "}
            alebo nám napíšte na <a href="mailto:moonid@moonid.sk" className="font-semibold text-brand transition hover:text-brand-2">moonid@moonid.sk</a>.
          </p>
        </div>
      </div>
    </main>
  );
}
