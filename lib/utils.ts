import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge pozná len predvolené škály Tailwindu. Vlastné škály z @theme v app/globals.css
// (--text-*, --radius-*, --ease-*) mu treba dodať, inak napr. `text-13` považuje za FARBU textu
// a cn("text-info-ink", "text-13") by farbu zahodil. Pri novom tokene v týchto menných
// priestoroch ho doplň aj sem (a do tests/cn.test.ts). Farby (--color-*) netreba — tie tailwind-merge
// rozpozná sám.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["13", "15"],
      radius: ["control", "card", "panel"],
      ease: ["precise"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
