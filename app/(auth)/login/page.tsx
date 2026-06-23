import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthPanel } from "@/components/auth/auth-panel";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Prihlásenie — Moonid B2B portál" };

const stats = (
  <div className="flex gap-7">
    <div className="flex flex-col gap-0.5"><span className="text-[28px] text-white">1 600+</span><span className="text-[12.5px] text-[#8fb3ab]">položiek v sortimente</span></div>
    <div className="flex flex-col gap-0.5"><span className="text-[28px] text-white">Vlastný rozvoz</span><span className="text-[12.5px] text-[#8fb3ab]">Nové Zámky a okolie</span></div>
  </div>
);

export default function LoginPage() {
  return (
    <AuthShell
      rightMax="max-w-[380px]"
      panel={
        <AuthPanel
          headline="Objednávajte hygienu a vybavenie na jednom mieste"
          lead="Vaše ceny, história objednávok, opakované doobjednanie jedným klikom a faktúry — vždy poruke."
        >
          {stats}
        </AuthPanel>
      }
    >
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
    </AuthShell>
  );
}
