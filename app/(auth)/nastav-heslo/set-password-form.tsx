"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LiveMessage } from "@/components/ui/live-region";
import { setPasswordFromGrant } from "./actions";

export function SetPasswordForm({ email }: { email?: string | null }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 12 || password.length > 256) {
      setError("Heslo musí mať 12 až 256 znakov.");
      return;
    }

    setLoading(true);
    const result = await setPasswordFromGrant(password);
    if (!result.ok) {
      setError(result.error ?? "Heslo sa nepodarilo nastaviť.");
      setLoading(false);
      return;
    }

    router.replace("/login?password=changed");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} aria-busy={loading} className="flex flex-col gap-4">
      {email && <input type="text" name="username" autoComplete="username" value={email} readOnly hidden />}
      <LiveMessage message={loading ? "Ukladám heslo…" : null} />
      <LiveMessage message={error} tone="error" />
      {error && <div id="set-password-error" className="rounded-[10px] border border-danger-line bg-danger px-3.5 py-2.5 text-[13.5px] text-danger-ink">{error}</div>}
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-muted-3">
        Nové heslo
        <input
          type="password"
          required
          disabled={loading}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          minLength={12}
          maxLength={256}
          aria-invalid={!!error}
          aria-describedby={error ? "set-password-error" : "set-password-rules"}
          className="rounded-[10px] border border-field bg-white px-3.5 py-2.5 text-[15px] text-ink outline-none transition focus:border-brand"
        />
        <span id="set-password-rules" className="text-[12px] font-normal text-muted-2">Minimálne 12 znakov. Heslo overujeme voči databáze uniknutých hesiel.</span>
      </label>
      <button type="submit" disabled={loading} className="rounded-[10px] bg-brand px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-brand-2 disabled:opacity-60">
        {loading ? "Ukladám…" : "Uložiť heslo"}
      </button>
    </form>
  );
}
