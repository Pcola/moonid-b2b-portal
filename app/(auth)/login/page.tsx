import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Prihlásenie — Moonid B2B portál" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-5 py-12">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <Link href="/" className="text-[30px] font-bold tracking-[-0.02em] text-brand">moonid</Link>
          <p className="mt-2 text-[14px] text-muted">B2B objednávkový portál</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-7 shadow-[0_20px_50px_-30px_rgba(16,42,38,0.3)]">
          <h1 className="mb-5 text-[20px] font-semibold text-ink">Prihlásenie</h1>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-[13.5px] text-muted-2">
          Ešte nemáte prístup?{" "}
          <Link href="/kontakt" className="font-medium text-brand transition hover:text-brand-2">Požiadať o prístup</Link>
        </p>
      </div>
    </main>
  );
}
