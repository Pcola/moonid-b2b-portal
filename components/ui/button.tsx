import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Tlačidlá boli doteraz prepisované na každej stránke zvlášť — v app/ a components/ je
 *  19 rôznych variantov reťazca „rounded-… bg-brand … hover:bg-brand-2". Tento súbor je
 *  jediný zdroj pravdy; triedy sú DOSLOVA tie, ktoré sa už v projekte používajú, takže
 *  výmena volajúceho miesta za <Button> nemení vzhľad ani o pixel.
 *
 *  Zámerne tu NIE JE `display` ani `cursor`: časť volajúcich miest má obyčajný text
 *  (inline-block s baseline zarovnaním), časť má ikonu a vlastné `inline-flex items-center
 *  gap-2`. Kto ikonu potrebuje, dodá si tieto triedy cez `className` — vďaka cn()/twMerge
 *  sa nič nebije.
 *
 *  Zámerne tu NIE JE ani predvolené `type`: v HTML je predvolená hodnota "submit" a niektoré
 *  tlačidlá vo formulároch na tom stoja. Predvolené "button" by ich ticho pokazilo. */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "dangerOutline";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  // rounded-[10px] bg-brand … text-white transition hover:bg-brand-2  (19 miest)
  primary: "bg-brand text-white hover:bg-brand-2",
  // border border-line bg-white text-ink hover:border-brand/40        (10+ miest)
  secondary: "border border-line bg-white text-ink hover:border-brand/40",
  // border border-line text-muted hover:text-ink                      (7 miest)
  ghost: "border border-line text-muted hover:text-ink",
  // plná červená (gdpr-section.tsx:97, cancel-order-button.tsx:42)
  danger: "bg-danger-ink text-white hover:bg-danger-ink-2",
  // obrysová červená (gdpr-section.tsx:89, approval-queue.tsx:41, mfa-setup.tsx:56)
  dangerOutline: "border border-danger-line text-danger-ink hover:bg-danger",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-[13.5px]",
  md: "px-5 py-2.5 text-[14px]",
  lg: "px-5 py-3 text-[15px]",
};

const BASE = "rounded-[10px] font-semibold transition disabled:opacity-60";

/** Pre <Link> a <a>, ktoré vyzerajú ako tlačidlo (v projekte ich je 12+). */
export function buttonClass({
  variant = "primary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
  return cn(BASE, VARIANT[variant], SIZE[size], className);
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ variant, size, className, ...rest }: ButtonProps) {
  return <button className={buttonClass({ variant, size, className })} {...rest} />;
}
