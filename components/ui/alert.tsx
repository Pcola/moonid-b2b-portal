import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Oznam nad formulárom. Doslovný reťazec
 *  „rounded-[10px] border border-danger-line bg-danger px-3.5 py-2.5 text-[13.5px] text-danger-ink"
 *  je v projekte 5× (login-form.tsx:49, set-password-form.tsx:115, access-confirmation.tsx:68,
 *  mfa-challenge-form.tsx:34, registracia-form.tsx:54); s tokenmi je z neho <Alert>.
 *
 *  Tóny sú len dva, lebo len tie majú v projekte reálne ohraničenie: danger (#f0c9c2)
 *  a warning (#e7d7af). Zelený/modrý oznam s rámikom sa nikde nepoužíva — nevymýšľame ho.
 *
 *  `role` sa zámerne NEnastavuje: formuláre už majú vždy prítomnú <LiveMessage>, ktorá text
 *  oznámi. Druhá živá oblasť by hlášku prečítala dvakrát. */

export type AlertTone = "danger" | "warning";

const TONE: Record<AlertTone, string> = {
  danger: "border-danger-line bg-danger text-danger-ink",
  warning: "border-warning-line bg-warning text-warning-ink",
};

export function Alert({
  tone = "danger",
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { tone?: AlertTone; children?: ReactNode }) {
  return (
    <div className={cn("rounded-[10px] border px-3.5 py-2.5 text-[13.5px]", TONE[tone], className)} {...rest}>
      {children}
    </div>
  );
}
