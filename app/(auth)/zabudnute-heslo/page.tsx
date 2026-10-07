import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthPanel } from "@/components/auth/auth-panel";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Zabudnuté heslo — Moonid B2B portál" };
// Ohraničí čas requestu aj jeho `after()` callbacku. Nie je to durable queue ani retry.
export const maxDuration = 30;

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      panel={
        <AuthPanel
          headline="Obnovte si prístup do portálu"
          lead="Pošleme vám na firemný e-mail odkaz na nastavenie nového hesla. Stačí pár sekúnd."
        />
      }
    >
      <div className="flex flex-col gap-2.5">
        <h1 className="text-[32px] tracking-[-0.01em] text-ink">Zabudnuté heslo</h1>
        <p className="text-[15px] leading-relaxed text-muted">Zadajte e-mail a pošleme vám odkaz na obnovu hesla.</p>
      </div>
      <ForgotForm />
      <p className="text-[13.5px] text-muted-2">
        <Link href="/login" className="font-semibold text-brand transition hover:text-brand-2">Späť na prihlásenie</Link>
      </p>
    </AuthShell>
  );
}
