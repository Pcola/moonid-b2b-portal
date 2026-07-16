import Link from "next/link";

const NAV = [
  { label: "Sortiment", href: "/produkty" },
  { label: "Dávkovače", href: "/#davkovace" },
  { label: "Portál", href: "/#portal" },
  { label: "O nás", href: "/o-nas" },
  { label: "Kontakt", href: "/kontakt" },
];

const INFO = [
  { label: "Pomoc a časté otázky", href: "/pomoc" },
  { label: "Informácie o spoločnosti", href: "/o-nas" },
  { label: "Obchodné podmienky", href: "/obchodne-podmienky" },
  { label: "Reklamačné podmienky", href: "/obchodne-podmienky#reklamacie" },
  { label: "Doprava a platby", href: "/obchodne-podmienky#doprava" },
  { label: "Ochrana osobných údajov", href: "/ochrana-osobnych-udajov" },
  { label: "Zásady používania súborov cookie", href: "/cookies" },
];

function LoginIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="overflow-hidden bg-brand-foot text-[#9fbab3]" style={{ padding: "clamp(56px,7vw,96px) 0 clamp(24px,2.6vw,34px)" }}>
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        {/* CTA band */}
        <div className="flex flex-wrap items-end justify-between gap-x-12 gap-y-8 border-b border-white/10 pb-[clamp(40px,5vw,64px)]">
          <div className="flex max-w-[560px] flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="h-px w-7" style={{ background: "#5c857b" }} />
              <span className="text-[11.5px] font-semibold uppercase tracking-[0.22em] text-[#8fb3ab]">Moonid s.r.o.</span>
            </div>
            <h2 className="font-display font-semibold text-white" style={{ fontSize: "clamp(28px,3.6vw,44px)", lineHeight: 1.08, letterSpacing: "-0.03em" }}>
              Jeden dodávateľ pre celú vašu prevádzku.
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
            <a href="tel:+421919216908" className="font-medium text-white hover:text-[#9fe0cf]" style={{ fontSize: "clamp(22px,2.4vw,28px)", letterSpacing: "-0.01em" }}>0919 216 908</a>
            <Link href="/login" className="inline-flex items-center gap-2 rounded-[9px] border border-white/30 px-[22px] py-[13px] text-[14.5px] font-semibold text-white transition hover:border-white hover:bg-white/10">
              <LoginIcon /> Prihlásiť sa
            </Link>
            <Link href="/kontakt" className="inline-flex items-center gap-2 rounded-[9px] bg-white px-[22px] py-[13px] text-[14.5px] font-semibold text-[#143a33] transition hover:bg-[#e7efec]">Vyžiadať ponuku</Link>
          </div>
        </div>

        {/* columns */}
        <div className="grid grid-cols-2 gap-x-[clamp(32px,5vw,64px)] gap-y-12 py-[clamp(40px,5vw,64px)] lg:grid-cols-[1.6fr_1fr_1.2fr_1.1fr]">
          <div className="col-span-2 flex max-w-[320px] flex-col gap-4 lg:col-span-1">
            <span className="font-display text-[28px] font-semibold leading-none tracking-[-0.03em] text-white">moonid<span className="text-mint">.</span></span>
            <p className="text-[15.5px] leading-relaxed text-[#88a8a1]">Hygiena, čistenie a vybavenie pre hotely, gastro, kancelárie aj inštitúcie. Pravidelný rozvoz, faktúra so splatnosťou.</p>
          </div>
          <nav className="flex flex-col gap-[13px]" aria-label="Navigácia">
            <span className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6e908a]">Navigácia</span>
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="text-[15.5px] font-medium text-[#c7d8d3] transition hover:text-white">{n.label}</Link>
            ))}
          </nav>
          <nav className="flex flex-col gap-[13px]" aria-label="Informácie">
            <span className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6e908a]">Informácie</span>
            {INFO.map((i) => (
              <Link key={i.href} href={i.href} className="text-[15.5px] font-medium text-[#c7d8d3] transition hover:text-white">{i.label}</Link>
            ))}
          </nav>
          <div className="flex flex-col gap-[13px]">
            <span className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6e908a]">Spojenie</span>
            <Link href="/login" className="inline-flex items-center gap-2 text-[15.5px] font-semibold text-[#c7d8d3] transition hover:text-white"><LoginIcon /> Prihlásiť sa do portálu</Link>
            <a href="mailto:moonid@moonid.sk" className="text-[15.5px] font-medium text-[#c7d8d3] transition hover:text-white">moonid@moonid.sk</a>
            <span className="text-[15.5px] leading-relaxed text-[#88a8a1]">Hlavná 39/78<br />941 43 Dolný Ohaj</span>
            <span className="text-[15.5px] leading-relaxed text-[#88a8a1]">Po–Štv 8:00–17:00<br />Pia 8:00–14:00</span>
          </div>
        </div>

        {/* oversized wordmark */}
        <div aria-hidden="true" className="font-display select-none font-semibold text-white/5" style={{ fontSize: "clamp(74px,17vw,236px)", lineHeight: 0.82, letterSpacing: "-0.05em", whiteSpace: "nowrap", margin: "clamp(8px,1.5vw,20px) 0 clamp(28px,3.5vw,48px)" }}>
          moonid<span className="text-mint/15">.</span>
        </div>

        {/* bottom row */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3.5 border-t border-white/10 pt-[clamp(20px,2.4vw,28px)]">
          <span className="text-[13.5px] text-[#6e908a]">IČO 50 934 660 · DIČ 2120530995 · IČ DPH SK2120530995 · OR OS Nitra, odd. Sro, vl. č. 43461/N · © {new Date().getFullYear()} Moonid s.r.o.</span>
          <a href="#top" className="inline-flex items-center gap-2 text-[13px] font-medium tracking-wide text-[#88a8a1] transition hover:text-white">
            Späť hore
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
