import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** „rounded-2xl border border-line bg-white p-*" je najčastejší kontajner v projekte —
 *  45 doslovných výskytov v app/ a components/. Odsadenia sú presne tie, ktoré sa už
 *  používajú (p-4 9×, p-5 13×, p-6 6×, p-8 3×, p-10 8×, p-12 6×). */

export type CardPad = "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";

const PAD: Record<CardPad, string> = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
  xl: "p-8",
  "2xl": "p-10",
  "3xl": "p-12",
};

const BASE = "rounded-2xl border border-line bg-white";

/** Pre <section>, <li>, <article> — kde <Card> ako <div> nesedí sémanticky. */
export function cardClass({ pad = "md", className }: { pad?: CardPad; className?: string } = {}): string {
  return cn(BASE, PAD[pad], className);
}

export function Card({ pad, className, ...rest }: HTMLAttributes<HTMLDivElement> & { pad?: CardPad }) {
  return <div className={cardClass({ pad, className })} {...rest} />;
}
