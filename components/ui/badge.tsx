import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Stavové pilulky (Nová / Po splatnosti / neaktívne / čiastočne na objednávku …).
 *  Farby sú tokeny z @theme, nie hexy — doteraz sa tá istá dvojica podklad+text opakovala
 *  v 4 mierne odlišných odtieňoch (#fdecea vs #fdeceb, #8a5a00 vs #9a6b0e).
 *
 *  Kontrasty (WCAG relatívna luminancia, malý text ⇒ min. 4,5:1):
 *    success  #14633f na #ecfdf3 = 6,90:1
 *    warning  #8a5a00 na #fdf6e7 = 5,51:1
 *    danger   #9a3025 na #fdecea = 6,50:1
 *    info     #3730a3 na #eef2ff = 8,88:1
 *    brand    #163f38 na #eaf3f0 = 10,31:1
 *    neutral  #5c584f na #f5f7f6 = 6,59:1 */

export type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";
export type BadgeSize = "sm" | "md";

const TONE: Record<BadgeTone, string> = {
  neutral: "bg-cream text-muted",
  brand: "bg-mintbg text-brand",
  success: "bg-success text-success-ink",
  warning: "bg-warning text-warning-ink",
  danger: "bg-danger text-danger-ink",
  info: "bg-info text-info-ink",
};

const SIZE: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-[11px] font-medium",
  md: "px-2.5 py-1 text-[11.5px] font-semibold",
};

const BASE = "inline-flex items-center whitespace-nowrap rounded-full";

export function badgeClass({
  tone = "neutral",
  size = "sm",
  className,
}: { tone?: BadgeTone; size?: BadgeSize; className?: string } = {}): string {
  return cn(BASE, TONE[tone], SIZE[size], className);
}

export function Badge({
  tone,
  size,
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone; size?: BadgeSize }) {
  return <span className={badgeClass({ tone, size, className })} {...rest} />;
}
