import Link from "next/link";
import { Container } from "./container";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper">
      <Container className="flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-serif text-xl font-medium text-brand">moonid</div>
          <p className="mt-1 text-sm text-muted">
            Moonid s.r.o. · IČO 50934660 · hygiena a čistota pre prevádzky
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <a href="#sortiment" className="hover:text-brand">Sortiment</a>
          <a href="#preco" className="hover:text-brand">Prečo my</a>
          <a href="#kontakt" className="hover:text-brand">Kontakt</a>
          <Link href="/login" className="hover:text-brand">B2B portál</Link>
        </nav>
        <p className="text-xs text-muted">© {new Date().getFullYear()} Moonid s.r.o.</p>
      </Container>
    </footer>
  );
}
