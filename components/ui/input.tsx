import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Formulárové prvky. Základ je DOSLOVA najčastejší reťazec v projekte
 *  („rounded-[10px] border border-field bg-white px-3 py-2 text-[14px] text-ink outline-none
 *  transition focus:border-brand" — 7 doslovných výskytov), takže výmena je vizuálne nulová.
 *
 *  `border-field` (#7f8d88, 3,46:1 na bielej) je tu napevno — je to jediné miesto, kde sa
 *  dá udržať WCAG 2.2 SC 1.4.11 pre ohraničenie ovládača. `outline-none` ostáva: focus ring
 *  dodáva unlayered pravidlo :focus-visible v globals.css a to `outline-none` prebíja.
 *
 *  Súbor je zámerne BEZ "use client" — je čisto prezentačný, takže `inputClass()` sa dá
 *  volať aj zo serverových komponentov. Field (potrebuje useId) je preto vo field.tsx. */

export type FieldSize = "sm" | "md" | "lg";

const SIZE: Record<FieldSize, string> = {
  sm: "rounded-lg px-2.5 py-1.5 text-[13.5px]",
  md: "px-3 py-2 text-[14px]",
  lg: "px-3.5 py-2.5 text-[15px]",
};

const BASE =
  "rounded-[10px] border border-field bg-white text-ink outline-none transition focus:border-brand aria-[invalid=true]:border-danger-ink";

export function inputClass({
  size = "md",
  className,
}: { size?: FieldSize; className?: string } = {}): string {
  return cn(BASE, SIZE[size], className);
}

export function Input({ size = "md", className, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & { size?: FieldSize }) {
  return <input className={inputClass({ size, className })} {...rest} />;
}

export function Textarea({ size = "md", className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { size?: FieldSize }) {
  return <textarea className={inputClass({ size, className })} {...rest} />;
}

export function Select({ size = "md", className, ...rest }: Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & { size?: FieldSize }) {
  return <select className={inputClass({ size, className })} {...rest} />;
}
