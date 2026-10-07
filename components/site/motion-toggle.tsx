"use client";

import { useSyncExternalStore } from "react";

/* Zdieľaný stav pohybu — jeden vypínač zastaví oba marquee pásy aj rotáciu referencií.
   WCAG 2.2, SC 2.2.2 Pause, Stop, Hide (úroveň A). Stav je modulový, takže prežije
   klientskú navigáciu; po tvrdom reloade sa vráti na „beží“. */
let paused = false;
const listeners = new Set<() => void>();

export function setMotionPaused(next: boolean) {
  paused = next;
  if (typeof document !== "undefined") {
    // CSS hook pre marquee pásy — [data-motion="paused"] v globals.css
    document.documentElement.dataset.motion = paused ? "paused" : "running";
  }
  listeners.forEach((l) => l());
}

export function useMotionPaused() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => paused,
    () => false,
  );
}

export function MotionToggle({
  tone = "light",
  context,
  className = "",
}: {
  tone?: "light" | "dark";
  context?: string;
  className?: string;
}) {
  const isPaused = useMotionPaused();
  const visible = isPaused ? "Spustiť pohyb" : "Zastaviť pohyb";
  return (
    <button
      type="button"
      onClick={() => setMotionPaused(!isPaused)}
      // SC 2.5.3 Label in Name: prístupný názov začína viditeľným textom, len ho spresňuje
      aria-label={context ? `${visible} ${context}` : undefined}
      className={`motion-toggle motion-toggle-${tone} ${className}`}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        {isPaused ? <path d="M8 5v14l11-7z" /> : <path d="M7 5h4v14H7zm6 0h4v14h-4z" />}
      </svg>
      {visible}
    </button>
  );
}
