import Link from "next/link";
import { Container } from "./container";

const NAV = [
  { href: "#sortiment", label: "Sortiment" },
  { href: "#hotel", label: "Pre hotely" },
  { href: "#prekoho", label: "Pre koho" },
  { href: "#preco", label: "Prečo my" },
  { href: "#kontakt", label: "Kontakt" },
];

export function SiteHeader() {
  return (
    <div className="sticky top-0 z-50">
      {/* top bar */}
      <div className="hidden bg-brand-dark text-[13px] text-mint md:block">
        <Container className="flex h-9 items-center justify-between">
          <span>B2B dodávateľ hygieny, čistenia a vybavenia · Slovensko</span>
          <div className="flex items-center gap-5 text-white/80">
            <a href="mailto:moonid@moonid.sk" className="hover:text-white">moonid@moonid.sk</a>
            <span className="text-white/40">·</span>
            <span>Po–Štv 8:00–17:00 · Pia 8:00–14:00</span>
          </div>
        </Container>
      </div>

      {/* main header */}
      <header className="border-b border-line bg-cream/90 backdrop-blur">
        <Container className="flex h-16 items-center justify-between">
          <Link href="/" className="font-serif text-2xl font-medium tracking-tight text-brand">
            moonid
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-ink/80 lg:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="transition hover:text-brand">
                {n.label}
              </a>
            ))}
          </nav>
          <Link
            href="/login"
            className="rounded-[10px] bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-hover"
          >
            B2B portál
          </Link>
        </Container>
      </header>
    </div>
  );
}
