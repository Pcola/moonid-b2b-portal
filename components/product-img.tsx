import Image from "next/image";

type Props = {
  src?: string | null;
  alt: string;
  /** responsive `sizes` — dôležité pre správny výber variantu z optimizera */
  sizes: string;
  /** true len pre LCP obrázok (hlavný obrázok detailu) — inak lazy */
  priority?: boolean;
  /** veľkosť placeholder ikony (px) keď obrázok chýba */
  iconSize?: number;
  /** extra triedy na obrázok (napr. group-hover:scale-105) */
  imgClassName?: string;
};

/**
 * Produktový obrázok cez next/image (AVIF/WebP, srcset, Vercel optimizer).
 * Renderuje sa DO existujúceho aspect-square / fixed kontajnera, ktorý si drží padding
 * a centrovanie — komponent si vytvorí vlastný `relative` wrapper pre `fill`.
 * Pri chýbajúcom obrázku vykreslí neutrálny placeholder (centruje ho flex kontajnera).
 */
export function ProductImg({ src, alt, sizes, priority = false, iconSize = 36, imgClassName = "" }: Props) {
  if (!src) {
    return (
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-muted-2 opacity-40" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2.5" /><circle cx="8.5" cy="8.5" r="1.6" /><path d="m21 15-5-5L5 21" />
      </svg>
    );
  }
  return (
    <div className="relative h-full w-full">
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={`object-contain ${imgClassName}`.trim()} />
    </div>
  );
}
