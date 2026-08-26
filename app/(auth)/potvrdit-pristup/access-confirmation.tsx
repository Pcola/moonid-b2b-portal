"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { confirmAccessLink } from "./actions";
import { LiveMessage } from "@/components/ui/live-region";

type AccessToken = { tokenHash: string; type: "invite" | "recovery" };

export function AccessConfirmation() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [token, setToken] = useState<AccessToken | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const tokenHash = hash.get("token_hash");
    const type = hash.get("type");
    // Bearer odstránime z adresného riadka/histórie hneď po načítaní; ostáva iba v pamäti komponentu.
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    let focusFrame: number | null = null;
    const stateFrame = window.requestAnimationFrame(() => {
      if (!tokenHash || (type !== "invite" && type !== "recovery")) {
        setError("Prístupový odkaz je neplatný alebo neúplný. Požiadajte správcu o nový.");
        return;
      }
      setToken({ tokenHash, type });
      focusFrame = window.requestAnimationFrame(() => buttonRef.current?.focus());
    });
    return () => {
      window.cancelAnimationFrame(stateFrame);
      if (focusFrame !== null) window.cancelAnimationFrame(focusFrame);
    };
  }, []);

  function confirm() {
    if (!token) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await confirmAccessLink(token);
        if (!result.ok) setError(result.error);
      } catch {
        setError("Odkaz sa nepodarilo overiť. Skontrolujte pripojenie a skúste to znova.");
      }
    });
  }

  const checking = !token && !error;

  return (
    <div className="flex flex-col gap-5" aria-busy={pending || checking}>
      <LiveMessage message={pending ? "Overujem prístupový odkaz…" : checking ? "Kontrolujem prístupový odkaz…" : null} />
      <LiveMessage message={error} tone="error" />
      <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-mintbg text-mint-ink" aria-hidden="true">
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      </div>
      <div>
        <h1 className="font-display text-[30px] font-semibold tracking-[-0.025em] text-ink">Potvrďte otvorenie prístupu</h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-muted">
          Odkaz sme zatiaľ nepoužili. Pokračujte iba vtedy, ak ste si vyžiadali prístup alebo obnovu hesla do Moonid B2B portálu.
        </p>
      </div>
      {error && (
        <div className="rounded-[10px] border border-[#f0c9c2] bg-[#fdecea] px-3.5 py-2.5 text-[13.5px] text-[#9a3025]">
          {error}
          <p className="mt-1.5">
            <a href="/zabudnute-heslo" className="font-semibold underline underline-offset-2">Požiadať o nový odkaz</a>
            <span className="px-1.5">·</span>
            <a href="/login" className="font-semibold underline underline-offset-2">Späť na prihlásenie</a>
          </p>
        </div>
      )}
      <button ref={buttonRef} type="button" onClick={confirm} disabled={pending || !token} aria-describedby="confirm-access-hint"
        className="min-h-11 rounded-[10px] bg-brand px-5 py-3 text-[15px] font-semibold text-white outline-none transition hover:bg-brand-2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55">
        {pending ? "Overujem odkaz…" : "Pokračovať a nastaviť heslo"}
      </button>
      <p id="confirm-access-hint" className="text-[12.5px] text-muted-2">
        {checking ? "Kontrolujeme prístupový odkaz — chvíľu to potrvá." : error ? "Odkaz nie je platný, pokračovať sa nedá." : "Kliknutím jednorazový odkaz uplatníte a prejdete na nastavenie hesla."}
      </p>
      <p className="text-[12.5px] leading-relaxed text-muted-2">
        Tento medzikrok chráni jednorazový odkaz pred automatickými kontrolami firemných e-mailov. Moonid od vás na tejto obrazovke nikdy nepýta heslo ani kód z autentifikátora.
      </p>
    </div>
  );
}
