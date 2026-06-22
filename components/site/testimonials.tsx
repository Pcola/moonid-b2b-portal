"use client";

import { useEffect, useState } from "react";

const ITEMS = [
  { q: "Hygienu, gastro aj amenity máme na jednom mieste a tovar do druhého dňa.", a: "prevádzková manažérka, hotel v Nitrianskom kraji" },
  { q: "Spoľahlivé dodávky a férové ceny. Celú objednávku vybavíme jedným telefonátom.", a: "majiteľ reštaurácie, Nové Zámky" },
  { q: "Oceňujeme osobný prístup a flexibilný rozvoz priamo na prevádzku.", a: "facility manažér, administratívna budova" },
  { q: "Konečne jeden dodávateľ pre celý objekt — od chémie po papierový program.", a: "správca, mestský úrad" },
];

export function Testimonials() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % ITEMS.length), 8000);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <div className="grid">
        {ITEMS.map((it, k) => (
          <figure
            key={k}
            className="m-0 transition-all duration-1000"
            style={{ gridArea: "1 / 1", opacity: k === i ? 1 : 0, transform: k === i ? "none" : "translateY(16px)", pointerEvents: k === i ? "auto" : "none" }}
          >
            <blockquote className="m-0 text-ink" style={{ fontSize: "clamp(25px,3.6vw,42px)", lineHeight: 1.24, letterSpacing: "-0.015em" }}>
              „{it.q}“
            </blockquote>
            <figcaption className="mt-6 text-[14.5px] tracking-wide text-muted-2">{it.a}</figcaption>
          </figure>
        ))}
      </div>
      <div className="mt-[30px] flex justify-center gap-[9px]">
        {ITEMS.map((_, k) => (
          <button
            key={k}
            type="button"
            onClick={() => setI(k)}
            aria-label={`Recenzia ${k + 1}`}
            className="h-[9px] w-[9px] rounded-full transition-all duration-300"
            style={{ background: k === i ? "#163f38" : "#c7d2cd", transform: k === i ? "scale(1.3)" : "none" }}
          />
        ))}
      </div>
    </div>
  );
}
