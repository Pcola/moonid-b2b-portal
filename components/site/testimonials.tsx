"use client";

import { useEffect, useState } from "react";
import { MotionToggle, setMotionPaused, useMotionPaused } from "@/components/site/motion-toggle";

const ITEMS = [
  { q: "Hygienu, gastro aj amenity máme na jednom mieste a tovar do druhého dňa.", a: "prevádzková manažérka, hotel v Nitrianskom kraji" },
  { q: "Spoľahlivé dodávky a férové ceny. Celú objednávku vybavíme jedným telefonátom.", a: "majiteľ reštaurácie, Nové Zámky" },
  { q: "Oceňujeme osobný prístup a flexibilný rozvoz priamo na prevádzku.", a: "facility manažér, administratívna budova" },
  { q: "Konečne jeden dodávateľ pre celý objekt — od chémie po papierový program.", a: "správca, mestský úrad" },
];

export function Testimonials() {
  const [i, setI] = useState(0);
  const [reduced, setReduced] = useState(false);
  const globalPaused = useMotionPaused();

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const stopped = globalPaused || reduced;

  useEffect(() => {
    if (stopped) return;
    const t = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setI((p) => (p + 1) % ITEMS.length);
    }, 8000);
    return () => clearInterval(t);
  }, [stopped, i]);

  return (
    <div role="group" aria-roledescription="karusel" aria-label="Referencie zákazníkov">
      <div className="grid" aria-live={stopped ? "polite" : "off"}>
        {ITEMS.map((it, k) => (
          <figure
            key={k}
            className="m-0 transition-all duration-1000"
            role="group"
            aria-roledescription="snímka"
            aria-label={`${k + 1} z ${ITEMS.length}`}
            aria-hidden={k !== i}
            inert={k !== i}
            style={{ gridArea: "1 / 1", opacity: k === i ? 1 : 0, transform: k === i ? "none" : "translateY(16px)", pointerEvents: k === i ? "auto" : "none" }}
          >
            <blockquote className="m-0 text-ink" style={{ fontSize: "clamp(25px,3.6vw,42px)", lineHeight: 1.24, letterSpacing: "-0.015em" }}>
              „{it.q}“
            </blockquote>
            <figcaption className="mt-6 text-[14.5px] tracking-wide text-muted-2">{it.a}</figcaption>
          </figure>
        ))}
      </div>
      <div className="mt-[30px] flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
        <div className="flex items-center gap-1">
          {ITEMS.map((_, k) => (
            <button
              key={k}
              type="button"
              onClick={() => { setI(k); setMotionPaused(true); }}
              aria-label={`Recenzia ${k + 1} z ${ITEMS.length}`}
              aria-current={k === i}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full"
            >
              <span
                aria-hidden="true"
                className="block h-[9px] w-[9px] rounded-full transition-all duration-300"
                style={{ background: k === i ? "#163f38" : "#7c8c87", transform: k === i ? "scale(1.3)" : "none" }}
              />
            </button>
          ))}
        </div>
        <MotionToggle tone="light" context="referencií" />
      </div>
    </div>
  );
}
