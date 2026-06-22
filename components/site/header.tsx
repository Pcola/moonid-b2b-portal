import Link from "next/link";
import { Container } from "./container";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-cream/85 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <Link
          href="/"
          className="font-serif text-2xl font-medium tracking-tight text-brand"
        >
          moonid
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-ink/80 md:flex">
          <a href="#sortiment" className="transition hover:text-brand">
            Sortiment
          </a>
          <a href="#preco" className="transition hover:text-brand">
            Prečo my
          </a>
          <a href="#kontakt" className="transition hover:text-brand">
            Kontakt
          </a>
        </nav>

        <Link
          href="/login"
          className="rounded-[10px] bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-hover"
        >
          B2B portál
        </Link>
      </Container>
    </header>
  );
}
