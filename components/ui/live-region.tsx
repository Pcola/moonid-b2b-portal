"use client";

import { useEffect, useRef } from "react";

/** Vždy prítomná živá oblasť pre výsledky server actions (WCAG 2.2 — 4.1.3 Status Messages).
 *
 *  Prečo komponent a nie atribút na existujúcom prvku: v celej aplikácii sa výsledok
 *  vykresľuje ako `{msg && <span…>}`, teda prvok so živou sémantikou sa mountne AŽ SPOLU
 *  so svojím textom. Živá oblasť, ktorá je do DOM vložená už naplnená, sa neoznámi —
 *  NVDA, JAWS ani VoiceOver ju neprečítajú. Kontajner preto musí byť v DOM stále a meniť
 *  sa smie iba jeho obsah.
 *
 *  `sr-only` je position:absolute, takže element nezaberá miesto vo flex/grid mriežke —
 *  vizuál sa nikde nemení a nepribúda prázdny `gap-*` krok. */
export function LiveMessage({ message, tone = "status" }: { message?: string | null; tone?: "status" | "error" }) {
  return (
    <p
      className="sr-only"
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      aria-atomic="true"
    >
      {message ?? ""}
    </p>
  );
}

/** Presunie fokus na potvrdzovaciu obrazovku, keď formulár zmizne a nahradí ho výsledok.
 *  Prepnutá vetva sa mountne AJ S OBSAHOM, takže živá oblasť by ju neoznámila — jediné
 *  spoľahlivé riešenie je presunúť fokus.
 *
 *  Efekt musí visieť na PODMIENKE, nie na mountnutí komponentu: potvrdzovacia vetva je
 *  early-return v tom istom komponente, takže pri mountnutí ešte neexistuje a ref by bol
 *  null. Cieľový prvok potrebuje tabIndex={-1}, aby fokus vôbec prijal. */
export function useFocusWhen<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (active) ref.current?.focus();
  }, [active]);
  return ref;
}
