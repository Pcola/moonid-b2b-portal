"use client";

import { useState, useTransition } from "react";
import { toggleFavorite } from "@/app/(portal)/oblubene/actions";

export function FavoriteButton({ productId, initial, className = "" }: { productId: string; initial: boolean; className?: string }) {
  const [fav, setFav] = useState(initial);
  const [pending, start] = useTransition();

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation(); // nech klik nepretečie na kartu/link
    start(async () => {
      const res = await toggleFavorite(productId);
      if (res.ok) setFav(!!res.favorited);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={fav ? "Odobrať z obľúbených" : "Pridať do obľúbených"}
      aria-pressed={fav}
      title={fav ? "Odobrať z obľúbených" : "Pridať do obľúbených"}
      className={`flex h-8 w-8 flex-none items-center justify-center rounded-full transition disabled:opacity-50 ${fav ? "text-[#e0a83b]" : "text-muted-2 hover:text-ink"} ${className}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m12 17.3-6.18 3.7 1.64-7.03L2 9.24l7.19-.61L12 2l2.81 6.63 7.19.61-5.46 4.73 1.64 7.03z" />
      </svg>
    </button>
  );
}
