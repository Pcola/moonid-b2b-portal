import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthPanel } from "@/components/auth/auth-panel";
import { SetPasswordForm } from "./set-password-form";

export const metadata: Metadata = { title: "Nastavenie hesla — Moonid B2B portál" };

export default function SetPasswordPage() {
  return (
    <AuthShell
      panel={
        <AuthPanel
          headline="Nastavte si nové heslo"
          lead="Zvoľte si bezpečné heslo a pokračujte rovno do portálu."
        />
      }
    >
      <div className="flex flex-col gap-2.5">
        <h2 className="text-[32px] tracking-[-0.01em] text-ink">Nastavenie hesla</h2>
        <p className="text-[15px] leading-relaxed text-muted">Zadajte nové heslo k vášmu firemnému účtu.</p>
      </div>
      <SetPasswordForm />
    </AuthShell>
  );
}
