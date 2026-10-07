"use client";

import { useId, type ReactNode } from "react";
import { LiveMessage } from "@/components/ui/live-region";
import { cn } from "@/lib/utils";

/** Obal jedného poľa: popis + ovládač + pomocný text + chyba, správne pospájané cez id.
 *
 *  Prečo render-prop a nie `<Field><Input/></Field>`: id popisu, chyby a nápovedy vzniká
 *  až tu (useId), a musí sa dostať NA ovládač. Klonovanie detí by nefungovalo pri zloženom
 *  ovládači (pole + tlačidlo „zobraziť heslo" ako v login-form.tsx:57).
 *
 *  Rieši naraz: SC 1.3.1/3.3.2 (viditeľný <label for>), SC 3.3.1 (aria-invalid +
 *  aria-describedby na chybu) a SC 4.1.3 (chyba sa oznámi cez vždy prítomnú LiveMessage).
 *
 *  POZOR pri adopcii: ak formulár už má vlastnú <LiveMessage> pre ten istý text, treba ju
 *  odstrániť, inak sa hláška oznámi dvakrát. Kto to nechce riešiť hneď, dá `announce={false}`. */

export type FieldRenderProps = {
  id: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
};

export function Field({
  label,
  hint,
  error,
  required,
  announce = true,
  className,
  labelClassName,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  announce?: boolean;
  className?: string;
  labelClassName?: string;
  children: (props: FieldRenderProps) => ReactNode;
}) {
  const uid = useId();
  const id = `f-${uid}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className={cn("text-[13px] font-semibold text-ink", labelClassName)}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {hint && <p id={hintId} className="text-[12.5px] text-muted-2">{hint}</p>}
      {error && <p id={errorId} className="text-[13px] font-medium text-danger-ink">{error}</p>}
      {announce && <LiveMessage message={error} tone="error" />}
    </div>
  );
}
