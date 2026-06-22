import Link from "next/link";
import { Container } from "./container";

export function SiteFooter() {
  return (
    <footer className="bg-brand-dark text-white/80">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="font-serif text-2xl font-medium text-white">moonid</div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed">
            Jeden dodávateľ pre celú vašu prevádzku — hygiena, čistenie a vybavenie.
            Pravidelný rozvoz, faktúra so splatnosťou.
          </p>
        </div>

        <div>
          <div className="text-sm font-medium text-white">Navigácia</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href="#sortiment" className="hover:text-white">Sortiment</a></li>
            <li><a href="#hotel" className="hover:text-white">Pre hotely a wellness</a></li>
            <li><a href="#prekoho" className="hover:text-white">Pre koho dodávame</a></li>
            <li><a href="#kontakt" className="hover:text-white">Kontakt</a></li>
            <li><Link href="/login" className="hover:text-white">Prihlásiť sa do portálu</Link></li>
          </ul>
        </div>

        <div>
          <div className="text-sm font-medium text-white">Informácie</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><span className="opacity-70">Obchodné podmienky</span></li>
            <li><span className="opacity-70">Reklamačné podmienky</span></li>
            <li><span className="opacity-70">Doprava a platby</span></li>
            <li><span className="opacity-70">Ochrana osobných údajov</span></li>
            <li><span className="opacity-70">Cookies</span></li>
          </ul>
        </div>

        <div>
          <div className="text-sm font-medium text-white">Spojenie</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href="mailto:moonid@moonid.sk" className="hover:text-white">moonid@moonid.sk</a></li>
            <li>Hlavná 39/78</li>
            <li>941 43 Dolný Ohaj</li>
            <li className="pt-1 text-white/60">Po–Štv 8:00–17:00 · Pia 8:00–14:00</li>
          </ul>
        </div>
      </Container>

      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-2 py-5 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Moonid s.r.o. · IČO 50934660</span>
          <span>Jeden dodávateľ pre celú vašu prevádzku.</span>
        </Container>
      </div>
    </footer>
  );
}
