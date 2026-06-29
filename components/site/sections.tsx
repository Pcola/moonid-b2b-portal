import Link from "next/link";
import Image from "next/image";
import { Testimonials } from "@/components/site/testimonials";
import { ContactForm } from "@/components/site/contact-form";

/* ───────── dáta ───────── */
const STATS = [
  { n: "Od 2017", l: "9 rokov na trhu" },
  { n: "1 600+", l: "produktov v ponuke" },
  { n: "Vlastný rozvoz", l: "Nové Zámky a Nitriansky kraj" },
];
const BRANDS = [
  { src: "/images/logo-tork.png", alt: "Tork" },
  { src: "/images/logo-kimberly-clark.png", alt: "Kimberly-Clark Professional" },
  { src: "/images/logo-katrin.png", alt: "Katrin" },
  { src: "/images/logo-lotus.png", alt: "Lotus Professional" },
  { src: "/images/logo-vileda.png", alt: "Vileda Professional" },
  { src: "/images/logo-leifheit.png", alt: "Leifheit" },
  { src: "/images/logo-sanytol.png", alt: "Sanytol" },
];
const RENTAL = [
  { t: "Vyberieme a osadíme", d: "Navrhneme dávkovače na mydlo, papierové utierky, toaletný papier a dezinfekciu podľa vašej prevádzky a osadíme ich." },
  { t: "Dopĺňame pri rozvoze", d: "Pri pravidelnom závoze sledujeme spotrebu a dopĺňame správne náplne — nikdy vám nedôjde mydlo na toaletách." },
  { t: "Jeden štandard, nula starostí", d: "Rovnaký systém naprieč celou prevádzkou. Žiadne hľadanie kompatibilných náplní, žiadna investícia do zariadení." },
];
const STEPS = [
  { n: "1", t: "Pošlete dopyt", d: "Napíšte nám, čo potrebujete, alebo pošlite zoznam položiek. Nezáväzne." },
  { n: "2", t: "Pripravíme ponuku na mieru", d: "Ozveme sa s cenovou ponukou a v prípade záujmu navrhneme aj osadenie dávkovačov." },
  { n: "3", t: "Prvý rozvoz a prístup do portálu", d: "Privezieme prvú objednávku vlastným rozvozom a zriadime vám prístup do portálu. Faktúra so splatnosťou 14 dní." },
];
const TERMS = [
  { k: "Oblasť rozvozu", v: "Okres Nové Zámky a Nitriansky kraj — vlastným rozvozom." },
  { k: "Doprava", v: "Vlastným rozvozom v rámci pravidelného závozu." },
  { k: "Splatnosť", v: "Faktúra so splatnosťou 14 dní, bez platby vopred." },
  { k: "Dodacia doba", v: "Skladové položky spravidla do 2. pracovného dňa, ostatné na objednávku s potvrdeným termínom." },
  { k: "Frekvencia závozu", v: "Pravidelný rozvoz v dohodnutých dňoch podľa vašej spotreby." },
  { k: "Pre koho", v: "Pre firmy a prevádzky (na IČO), na faktúru." },
];
const FAQ = [
  { q: "Kam rozvážate?", a: "Vlastným rozvozom zásobujeme okres Nové Zámky a Nitriansky kraj. Ak si nie ste istí, či sme vo vašej oblasti, ozvite sa nám." },
  { q: "Požičiavate dávkovače?", a: "Áno. Dávkovače vám osadíme a vy platíte len náplne, ktoré dopĺňame pri pravidelnom rozvoze — bez investície do zariadení." },
  { q: "Ako rýchlo dodáte?", a: "Skladové položky spravidla do 2. pracovného dňa. Položky na objednávku privezieme v potvrdenom termíne pri najbližšom závoze." },
  { q: "Musím mať firmu / IČO?", a: "Áno, dodávame pre prevádzky a firmy na faktúru so splatnosťou." },
  { q: "Ako získam prístup do portálu?", a: "Prístup vám zriadime po prvej objednávke. Potom si náplne a tovar doobjednáte jedným klikom za svoje dohodnuté ceny." },
  { q: "Dá sa objednať aj menšie množstvo?", a: "Áno. Objednávky riešime individuálne podľa frekvencie vášho závozu — napíšte nám, čo potrebujete." },
];
const SEGMENTS = [
  { t: "Hotely, penzióny a ubytovanie", d: "Amenity, vybavenie izieb a kompletná prevádzková hygiena.", p: <><path d="M3 8v9" /><path d="M3 17h18" /><path d="M3 12h13a4 4 0 0 1 4 4v1" /><path d="M6.5 12V9.5a1 1 0 0 1 1-1H11a1 1 0 0 1 1 1V12" /></> },
  { t: "Wellness, kúpaliská a fitness", d: "Bazénová chémia, osviežovače, posilňovne a športoviská.", p: <path d="M12 3s6 6.4 6 10.5a6 6 0 0 1-12 0C6 9.4 12 3 12 3z" /> },
  { t: "Reštaurácie a gastro", d: "Jednorazový riad, obaly, hygiena a pranie.", p: <><path d="M6 3v6a2 2 0 0 0 2 2v10" /><path d="M8 3v4" /><path d="M16 3c1.8 1.5 1.8 7 0 8.5V21" /></> },
  { t: "Administratíva a kancelárie", d: "Hygiena, papierový program a kancelárske potreby.", p: <><rect x="3" y="7" width="18" height="12" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 12h18" /></> },
  { t: "Priemysel a výrobné haly", d: "Priemyselné čistenie, utierky, odmasťovače a ochrana.", p: <><path d="M3 21V9l5 3V9l5 3V6l6 4v11" /><path d="M3 21h18" /><path d="M9 21v-4h4v4" /></> },
  { t: "Autoservisy a dielne", d: "Čističe rúk, utierky, odmasťovače a sorpčné materiály.", p: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-2.4z" /> },
  { t: "Obchod a služby", d: "Nákupné strediská, posilňovne, kaderníctva a salóny.", p: <><path d="M4 9l1.4-4.5h13.2L20 9" /><path d="M5 9v11h14V9" /><path d="M4 9h16" /><path d="M10 20v-6h4v6" /></> },
  { t: "Školy a samospráva", d: "Školy, obecné a mestské úrady, kultúrne domy a inštitúcie.", p: <><path d="M12 3l9 5H3z" /><path d="M4 21h16" /><path d="M5 21V10" /><path d="M9.5 21V10" /><path d="M14.5 21V10" /><path d="M19 21V10" /></> },
];
const PORTAL_FEATS = ["Vaše dohodnuté ceny", "Opakované objednávky jedným klikom", "História objednávok a faktúry", "Stav rozvozu a doručenia", "Moje dávkovače — náplne na jeden klik"];
const WHY = [
  { t: "Osobný prístup", d: "Jeden človek, ktorý vašu prevádzku pozná — vybavíte všetko jedným telefonátom.", p: <><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /></> },
  { t: "Jeden partner pre celý objekt", d: "Hygiena, čistenie, gastro aj hotelové vybavenie z jedného miesta — namiesto piatich dodávateľov.", p: <><path d="M12 3l8 4-8 4-8-4 8-4z" /><path d="M4 11l8 4 8-4" /><path d="M4 15l8 4 8-4" /></> },
  { t: "Stabilný partner od 2017", d: "Roky skúseností a desiatky spokojných prevádzok v regióne.", p: <path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 21l-4.9 2.6.9-5.5-4-3.9 5.5-.8z" /> },
  { t: "Spoľahlivé a načas", d: "Pravidelný vlastný rozvoz — tovar máte načas, bez výpadkov a čakania na kuriéra.", p: <><path d="M3 6h11v9H3z" /><path d="M14 9h3.5l3 3v3H14z" /><circle cx="7" cy="17.5" r="1.6" /><circle cx="17.5" cy="17.5" r="1.6" /></> },
];
const CLIENTS = [
  { src: "/images/klient-grandhotelsole.svg", alt: "Grand Hotel SOLE Nitra", h: 66 },
  { src: "/images/klient-podhajska.png", alt: "Kúpalisko Podhájska", h: 80 },
  { src: "/images/klient-westend.svg", alt: "Westend", h: 34 },
  { src: "/images/klient-loko.png", alt: "LOKO trans Slovakia", h: 70 },
];

export const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

/* ───────── helpers ───────── */
const wrap = "mx-auto max-w-[1240px] px-5 sm:px-8";
const pad = { padding: "clamp(64px,9vw,120px) 0" } as const;
const h2style = { fontSize: "clamp(30px,4.2vw,52px)", lineHeight: 1.06, letterSpacing: "-0.015em", textWrap: "balance" } as const;
const eyebrow = "text-[12.5px] font-semibold uppercase tracking-[0.16em] text-brand-2";
const Ico = ({ children }: { children: React.ReactNode }) => (
  <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const Arrow = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;

/* ───────── HERO (domov) ───────── */
export function HeroSection() {
  return (
    <section className="relative flex items-end overflow-hidden" style={{ minHeight: "clamp(560px,80vh,820px)" }}>
      <Image src="/images/hero-cleaning.png" alt="Čistiace a hygienické prostriedky pre prevádzku" fill priority sizes="100vw" className="hero-img object-cover" style={{ objectPosition: "right center" }} />
      <div className="absolute inset-0" style={{ background: "linear-gradient(100deg,rgba(16,34,29,0.94) 0%,rgba(18,40,32,0.82) 30%,rgba(20,55,48,0.45) 56%,rgba(20,55,48,0.12) 100%)" }} />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(16,34,29,0.42) 0%,rgba(16,34,29,0) 26%,rgba(16,34,29,0.30) 100%)" }} />
      <div className={`relative z-[2] w-full ${wrap}`} style={{ paddingTop: "clamp(96px,12vw,150px)", paddingBottom: "clamp(56px,7vw,96px)" }}>
        <div className="hero-stagger flex max-w-[800px] flex-col items-start gap-[26px]">
          <span className="inline-flex items-center gap-2.5 text-[12.5px] font-semibold uppercase tracking-[0.18em] text-mint"><span className="h-[1.5px] w-[26px] bg-mint" /> Dodávateľ pre vašu prevádzku · od 2017</span>
          <h1 className="text-white" style={{ fontSize: "clamp(40px,6vw,78px)", lineHeight: 1.02, letterSpacing: "-0.02em", textWrap: "balance" }}>Hygiena, čistenie a vybavenie pre vašu prevádzku</h1>
          <p className="max-w-[620px] text-[#d7e4e0]" style={{ fontSize: "clamp(17px,1.7vw,20px)", lineHeight: 1.55 }}>Jeden dodávateľ pre hotely, wellness, gastro, úrady aj školy v okrese Nové Zámky a Nitrianskom kraji. Vlastný rozvoz, dávkovače na prenájom a objednávky na faktúru.</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-3.5">
            <Link href="/kontakt" className="rounded-[10px] bg-white px-[26px] py-[15px] text-base font-semibold text-brand transition hover:-translate-y-px">Vyžiadať cenovú ponuku</Link>
            <Link href="/kontakt#ako-zacat" className="rounded-[10px] border border-white/40 px-[22px] py-[15px] text-base font-semibold text-white transition hover:border-white hover:bg-white/10">Ako sa stať zákazníkom</Link>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-x-[clamp(20px,3vw,48px)] gap-y-5 border-t border-white/20 pt-6">
            {STATS.map((s) => (
              <div key={s.l} className="flex min-w-[96px] flex-col gap-[3px]">
                <span className="text-white" style={{ fontSize: "clamp(24px,2.8vw,32px)", lineHeight: 1 }}>{s.n}</span>
                <span className="text-[12.5px] leading-snug text-[#a9c2bb]">{s.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────── PAGE HERO (podstránky, tmavý pás) ───────── */
export function PageHero({ eyebrow: eb, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <section className="relative overflow-hidden text-mintbg" style={{ background: "radial-gradient(130% 120% at 85% -10%, #21564C 0%, #163F38 52%)", paddingTop: "clamp(140px,16vw,200px)", paddingBottom: "clamp(48px,7vw,88px)" }}>
      <div className={wrap}>
        <span className="inline-flex items-center gap-2.5 text-[12.5px] font-semibold uppercase tracking-[0.16em] text-mint"><span className="h-[1.5px] w-[26px] bg-mint" /> {eb}</span>
        <h1 className="mt-4 max-w-[820px] text-white" style={{ fontSize: "clamp(34px,5vw,64px)", lineHeight: 1.04, letterSpacing: "-0.02em", textWrap: "balance" }}>{title}</h1>
        {subtitle && <p className="mt-4 max-w-[620px] text-[#b7ccc6]" style={{ fontSize: "clamp(16px,1.7vw,20px)", lineHeight: 1.55 }}>{subtitle}</p>}
      </div>
    </section>
  );
}

/* ───────── BRANDS ───────── */
export function BrandsSection() {
  return (
    <section className="border-y border-line" style={{ padding: "clamp(28px,4vw,40px) 0" }}>
      <div className={`${wrap} flex flex-col items-center gap-5`}>
        <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-muted-2">Dodávame overené značky</span>
        <div className="brand-marquee" role="img" aria-label="Dodávané značky: Tork, Kimberly-Clark, Katrin, Lotus, Vileda, Leifheit, Sanytol">
          <div className="brand-track">
            {[...BRANDS, ...BRANDS].map((b, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={b.src} alt={i < BRANDS.length ? b.alt : ""} aria-hidden={i >= BRANDS.length} loading="lazy" className={`brand-logo${i >= BRANDS.length ? " brand-dup" : ""}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────── SORTIMENT ───────── */
export function SortimentSection() {
  return (
    <section id="sortiment" className="bg-cream" style={pad}>
      <div className={wrap}>
        <div className="reveal mb-[clamp(36px,4vw,56px)] max-w-[680px]">
          <span className={eyebrow}>Sortiment</span>
          <h2 className="mt-3.5 text-ink" style={h2style}>Kompletný sortiment pre hygienu, čistenie a chod vašej prevádzky</h2>
        </div>
        <div className="mb-[clamp(16px,2vw,24px)] grid gap-[clamp(16px,2vw,24px)] lg:grid-cols-2">
          <div className="flex min-h-[280px] flex-col justify-between gap-7 rounded-2xl bg-brand p-[clamp(28px,3.5vw,44px)] text-mintbg">
            <div className="flex flex-col gap-4">
              <span className="text-white" style={{ fontSize: "clamp(34px,4vw,48px)", lineHeight: 1 }}>Cez 1 600 položiek<br />v sortimente</span>
              <p className="max-w-[420px] text-[15.5px] leading-relaxed text-[#a9c2bb]">Najpredávanejšie produkty držíme skladom, zvyšok objednáme pri vašej objednávke — od čistiacej chémie a papiera až po dávkovače, gastro a kancelárske potreby.</p>
            </div>
            <Link href="/produkty" className="inline-flex items-center gap-2.5 self-start rounded-[10px] bg-white px-[22px] py-[13px] text-[15px] font-semibold text-brand transition hover:-translate-y-px">Pozrieť celý sortiment <Arrow /></Link>
          </div>
          <div className="relative min-h-[280px] overflow-hidden rounded-2xl border border-line">
            <Image src="/images/rozvoz.jpg" alt="Vlastný rozvoz Moonid — dodávka naložená tovarom" fill sizes="(max-width:1024px) 100vw, 50vw" className="object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────── DÁVKOVAČE ───────── */
export function DavkovaceSection() {
  return (
    <section id="davkovace" style={pad}>
      <div className={wrap}>
        <div className="reveal mb-[clamp(36px,4vw,56px)] max-w-[760px]">
          <span className={eyebrow}>Dávkovače a náplne</span>
          <h2 className="mt-3.5 text-ink" style={h2style}>Dávkovače vám osadíme. Platíte len náplne.</h2>
          <p className="mt-4 text-muted-3" style={{ fontSize: "clamp(17px,1.7vw,20px)", lineHeight: 1.55 }}>Žiadna investícia do vybavenia, žiadne riešenie kompatibility — postaráme sa o dávkovače na mydlo, papier aj dezinfekciu naprieč celou prevádzkou.</p>
        </div>
        <div className="reveal-cascade grid gap-[clamp(16px,2vw,24px)] md:grid-cols-3">
          {RENTAL.map((r, i) => (
            <div key={r.t} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-[clamp(26px,3vw,34px)]">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-mintbg text-[15px] font-semibold text-brand">{i + 1}</span>
              <h3 className="text-[19px] font-semibold text-ink">{r.t}</h3>
              <p className="text-[15.5px] leading-relaxed text-muted">{r.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Link href="/kontakt" className="inline-flex items-center gap-2.5 rounded-[10px] bg-brand px-[26px] py-[14px] text-base font-semibold text-white transition hover:bg-brand-2">Chcem dávkovače pre svoju prevádzku <Arrow /></Link>
        </div>
      </div>
    </section>
  );
}

/* ───────── PORTÁL ───────── */
export function PortalSection() {
  return (
    <section id="portal" className="bg-white" style={pad}>
      <div className={wrap}>
        <div className="reveal relative overflow-hidden rounded-[24px] text-mintbg" style={{ background: "radial-gradient(130% 130% at 88% -20%, #21564C 0%, #163F38 56%)" }}>
          <div className="relative z-[2] grid items-center gap-[clamp(36px,5vw,72px)] p-[clamp(34px,5vw,72px)] lg:grid-cols-[1.15fr_0.85fr]">
            <div className="flex flex-col gap-[22px]">
              <span className="inline-flex items-center gap-2.5 text-[12.5px] font-semibold uppercase tracking-[0.16em] text-mint"><span className="h-[1.5px] w-[26px] bg-mint" /> Objednávkový portál</span>
              <h2 className="text-white" style={{ fontSize: "clamp(30px,4.2vw,50px)", lineHeight: 1.06, letterSpacing: "-0.015em", textWrap: "balance" }}>Objednávajte online cez B2B portál</h2>
              <p className="max-w-[520px] text-[#b7ccc6]" style={{ fontSize: "clamp(16px,1.6vw,18.5px)", lineHeight: 1.6 }}>Po prvej objednávke vám zriadime prístup — pozriete si svoje dohodnuté ceny, históriu aj faktúry a celý sortiment doobjednáte jedným klikom. Portál pozná vašu prevádzku, žiadne hľadanie kódov náplní.</p>
              <div className="mt-1 grid max-w-[560px] grid-cols-1 gap-x-7 gap-y-4 sm:grid-cols-2">
                {PORTAL_FEATS.map((f) => (
                  <div key={f} className="flex items-start gap-3"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#9ad3c8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-px flex-none"><path d="M20 6L9 17l-5-5" /></svg><span className="text-[15px] leading-snug text-[#d7e4e0]">{f}</span></div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-4 rounded-[18px] border border-white/15 bg-white/[0.06] p-[clamp(26px,3vw,36px)]">
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mint-2">Vstup do portálu</span>
                <h3 className="text-white" style={{ fontSize: "clamp(21px,2.3vw,26px)", lineHeight: 1.15, letterSpacing: "-0.01em" }}>Prihláste sa do svojho účtu</h3>
              </div>
              <Link href="/login" className="inline-flex items-center justify-center gap-2.5 rounded-[10px] bg-white px-[22px] py-3.5 text-[15.5px] font-semibold text-brand transition hover:-translate-y-px hover:bg-mintbg"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /></svg> Prihlásiť sa</Link>
              <Link href="/kontakt#ako-zacat" className="inline-flex items-center justify-center rounded-[10px] border border-white/30 px-[22px] py-[13px] text-[15.5px] font-semibold text-white transition hover:border-white hover:bg-white/10">Ešte nie ste zákazník?</Link>
              <p className="mt-0.5 text-[13px] leading-relaxed text-[#8fb3ab]">Prístup zriadime po prvej objednávke. Ozvite sa a poradíme, ako začať.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────── PRE KOHO ───────── */
export function PreKohoSection({ cream = false }: { cream?: boolean }) {
  return (
    <section id="prekoho" className={cream ? "bg-cream" : ""} style={pad}>
      <div className={wrap}>
        <div className="reveal mb-[clamp(36px,4vw,56px)] max-w-[680px]">
          <span className={eyebrow}>Pre koho dodávame</span>
          <h2 className="mt-3.5 text-ink" style={h2style}>Regionálny partner pre prevádzky naprieč odvetviami</h2>
          <p className="mt-4 text-muted-3" style={{ fontSize: "clamp(17px,1.7vw,20px)", lineHeight: 1.55 }}>Zásobujeme širokú škálu prevádzok v regióne — od ubytovania a gastra cez priemysel, obchod a služby až po školy a samosprávu.</p>
        </div>
        <div className="reveal-cascade grid gap-[clamp(16px,2vw,24px)]" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
          {SEGMENTS.map((s) => (
            <div key={s.t} className="card-hover flex flex-col gap-4 rounded-2xl border border-line bg-white p-[clamp(26px,3vw,34px)]">
              <span className="inline-flex h-[50px] w-[50px] items-center justify-center rounded-xl bg-mintbg text-brand"><Ico>{s.p}</Ico></span>
              <div className="flex flex-col gap-2"><h3 className="text-[19px] font-semibold text-ink">{s.t}</h3><p className="text-base leading-relaxed text-muted">{s.d}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── HOTEL ───────── */
export function HotelSection() {
  const cards = [
    { img: "/images/hotel-kozmetika.png", t: "Hotelová kozmetika a amenity", d: "Mydielka, sprchové gély, šampóny, telové mlieka a kozmetické sady — vo fľaštičkách, sáčkoch aj v dávkovačoch na steny." },
    { img: "/images/hotel-vybavenie-izieb.png", t: "Vybavenie izieb a kúpeľní", d: "Uteráky a osušky, župany, papuče, kozmetické a hygienické sady, dávkovače a jednorazové potreby pre hostí." },
  ];
  return (
    <section id="hotel" className="border-t border-line bg-cream" style={pad}>
      <div className={wrap}>
        <div className="reveal mb-[clamp(36px,4vw,56px)] max-w-[720px]">
          <span className={eyebrow}>Aj pre hotely a wellness</span>
          <h2 className="mt-3.5 text-ink" style={h2style}>Hotelové vybavenie a kozmetika</h2>
          <p className="mt-4 text-muted-3" style={{ fontSize: "clamp(17px,1.7vw,20px)", lineHeight: 1.55 }}>Okrem bežnej prevádzkovej hygieny zabezpečíme aj špecializované hotelové vybavenie a kozmetiku — všetko, čo robí pobyt hosťa príjemným.</p>
        </div>
        <div className="reveal grid gap-[clamp(20px,2.5vw,28px)] lg:grid-cols-2">
          {cards.map((c) => (
            <div key={c.t} className="flex flex-col overflow-hidden rounded-[18px] border border-line bg-white">
              <div className="relative h-[340px] w-full"><Image src={c.img} alt={c.t} fill sizes="(max-width:1024px) 100vw, 50vw" className="object-cover" /></div>
              <div className="flex flex-col gap-3 p-[clamp(26px,3vw,36px)]"><h3 className="text-ink" style={{ fontSize: "clamp(22px,2.4vw,28px)", letterSpacing: "-0.01em" }}>{c.t}</h3><p className="text-[15.5px] leading-relaxed text-muted-3">{c.d}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── PREČO MOONID ───────── */
export function PrecoSection() {
  return (
    <section id="preco" className="relative overflow-hidden text-mintbg" style={{ ...pad, background: "radial-gradient(130% 120% at 85% -10%, #21564C 0%, #163F38 52%)" }}>
      <div className={wrap}>
        <div className="reveal mb-[clamp(40px,5vw,64px)] max-w-[640px]">
          <span className="text-[12.5px] font-semibold uppercase tracking-[0.16em] text-mint-2">Prečo Moonid</span>
          <h2 className="mt-3.5 text-white" style={h2style}>Jeden spoľahlivý partner pre celý chod prevádzky</h2>
        </div>
        <div className="reveal-cascade grid gap-[clamp(18px,2vw,24px)]" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(248px,1fr))" }}>
          {WHY.map((w) => (
            <div key={w.t} className="why-card flex flex-col gap-[18px] rounded-[18px] border border-white/10 bg-white/[0.045] p-[clamp(26px,2.6vw,32px)]">
              <span className="inline-flex h-[54px] w-[54px] items-center justify-center rounded-[14px] border border-[#8fc3b9]/25 bg-[#8fc3b9]/[0.13] text-[#a9d8cd]"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{w.p}</svg></span>
              <div className="flex flex-col gap-2.5"><h3 className="text-xl font-semibold text-white" style={{ letterSpacing: "-0.01em" }}>{w.t}</h3><p className="text-[15.5px] leading-relaxed text-[#b7ccc6]">{w.d}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── REFERENCIE ───────── */
export function ReferencieSection() {
  return (
    <section id="referencie" style={pad}>
      <div className={wrap}>
        <div className="reveal mx-auto max-w-[920px] text-center">
          <span className={eyebrow}>Dôverujú nám</span>
          <div className="mt-6"><Testimonials /></div>
        </div>
        <div className="reveal-cascade mx-auto mt-[clamp(44px,5vw,64px)] grid max-w-[1000px] gap-[clamp(14px,2vw,20px)]" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
          {CLIENTS.map((c) => (
            <div key={c.alt} className="flex h-[104px] items-center justify-center rounded-[14px] border border-line bg-white px-[22px] py-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.src} alt={c.alt} loading="lazy" className="w-auto object-contain" style={{ maxHeight: c.h, maxWidth: "80%" }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── AKO ZAČAŤ ───────── */
export function AkoZacatSection() {
  return (
    <section id="ako-zacat" style={pad}>
      <div className={wrap}>
        <div className="reveal mb-[clamp(36px,4vw,56px)] max-w-[680px]">
          <span className={eyebrow}>Ako začať</span>
          <h2 className="mt-3.5 text-ink" style={h2style}>Ako sa stať zákazníkom</h2>
          <p className="mt-4 text-muted-3" style={{ fontSize: "clamp(17px,1.7vw,20px)", lineHeight: 1.55 }}>Od prvého dopytu k pravidelným dodávkam v troch krokoch — bez záväzkov a bez zbytočnej byrokracie.</p>
        </div>
        <div className="reveal-cascade grid gap-[clamp(16px,2vw,24px)] md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-[clamp(26px,3vw,34px)]">
              <span className="text-brand-2" style={{ fontSize: "clamp(40px,4vw,56px)", lineHeight: 1 }}>{s.n}</span>
              <h3 className="text-[19px] font-semibold text-ink">{s.t}</h3>
              <p className="text-[15.5px] leading-relaxed text-muted">{s.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-8"><a href="#form" className="inline-flex items-center gap-2.5 rounded-[10px] bg-brand px-[26px] py-[14px] text-base font-semibold text-white transition hover:bg-brand-2">Vyžiadať nezáväznú ponuku <Arrow /></a></div>
      </div>
    </section>
  );
}

/* ───────── PODMIENKY ───────── */
export function PodmienkySection() {
  return (
    <section id="podmienky" className="border-y border-line bg-cream" style={pad}>
      <div className={wrap}>
        <div className="reveal mb-[clamp(36px,4vw,56px)] max-w-[680px]">
          <span className={eyebrow}>Podmienky spolupráce</span>
          <h2 className="mt-3.5 text-ink" style={h2style}>Jasné B2B podmienky bez prekvapení</h2>
        </div>
        <dl className="grid gap-x-[clamp(24px,4vw,64px)] sm:grid-cols-2">
          {TERMS.map((t) => (
            <div key={t.k} className="flex flex-col gap-1 border-t border-line py-5">
              <dt className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-2">{t.k}</dt>
              <dd className="text-[15.5px] leading-relaxed text-muted">{t.v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ───────── FAQ ───────── */
export function FaqSection() {
  return (
    <section id="faq" style={pad}>
      <div className={wrap}>
        <div className="reveal mb-[clamp(36px,4vw,56px)] max-w-[680px]">
          <span className={eyebrow}>Časté otázky</span>
          <h2 className="mt-3.5 text-ink" style={h2style}>Na čo sa zákazníci pýtajú</h2>
        </div>
        <div className="mx-auto grid max-w-[1000px] gap-3 md:grid-cols-2">
          {FAQ.map((f) => (
            <div key={f.q} className="rounded-[14px] border border-line bg-white p-[clamp(22px,2.5vw,28px)]">
              <h3 className="text-[17px] font-semibold text-ink">{f.q}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </section>
  );
}

/* ───────── KONTAKT (info + formulár) ───────── */
export function KontaktSection() {
  return (
    <section id="form" className="relative overflow-hidden bg-brand-deep text-[#e7efec]" style={{ padding: "clamp(64px,9vw,120px) 0" }}>
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(120% 80% at 12% -10%, rgba(46,98,88,0.45) 0%, rgba(16,42,38,0) 60%)" }} />
      <div className={`relative ${wrap}`}>
        <div className="grid items-start gap-[clamp(44px,6vw,96px)] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col">
            <div className="flex items-center gap-3"><span className="h-px w-7" style={{ background: "#5c857b" }} /><span className="text-[11.5px] font-semibold uppercase tracking-[0.22em] text-[#8fb3ab]">Kontakt</span></div>
            <h2 className="mt-[22px] text-white" style={{ fontSize: "clamp(30px,4vw,46px)", lineHeight: 1.05, letterSpacing: "-0.02em", textWrap: "balance" }}>Napíšte nám</h2>
            <p className="mt-[18px] max-w-[430px] text-[#a9c2bb]" style={{ fontSize: "clamp(16px,1.6vw,18.5px)", lineHeight: 1.6 }}>Pripravíme cenovú ponuku na mieru a ozveme sa vám spravidla do 24 hodín.</p>
            <div className="mt-[clamp(36px,4vw,52px)] flex flex-col gap-1"><span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6e938b]">Telefón</span><a href="tel:+421919216908" className="font-medium text-white transition hover:text-[#9fe0cf]" style={{ fontSize: "clamp(26px,3vw,34px)", letterSpacing: "-0.01em" }}>0919 216 908</a></div>
            <div className="mt-6 flex flex-col gap-1"><span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6e938b]">E-mail</span><a href="mailto:moonid@moonid.sk" className="font-medium text-[#e7efec] transition hover:text-[#9fe0cf]" style={{ fontSize: "clamp(18px,1.8vw,21px)" }}>moonid@moonid.sk</a></div>
            <dl className="mt-[clamp(40px,4.5vw,56px)] flex flex-col">
              {[
                ["Kontaktná osoba", <>Jozef Slobodník <span className="text-[#7fa59c]">— konateľ</span></>],
                ["Otváracie hodiny", <>Po–Štv 8:00–17:00 <span className="text-[#7fa59c]">· Pia 8:00–14:00</span></>],
                ["Adresa", <>Hlavná 39/78 <span className="text-[#7fa59c]">· 941 43 Dolný Ohaj</span></>],
                ["Fakturačné údaje", <><span className="text-[14px] text-[#8fb3ab]">IČO 50 934 660 · IČ DPH SK2120530995</span></>],
              ].map(([k, v], idx) => (
                <div key={idx} className="flex items-baseline gap-6 border-t border-white/10 py-[18px]"><dt className="w-[124px] flex-none pt-0.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#6e938b]">{k}</dt><dd className="text-[15.5px] leading-relaxed text-[#e7efec]">{v}</dd></div>
              ))}
            </dl>
          </div>
          <div className="rounded-[14px] p-[clamp(28px,3.4vw,46px)]" style={{ background: "#fbfcfb", boxShadow: "0 40px 80px -40px rgba(0,0,0,0.55)" }}><ContactForm /></div>
        </div>
      </div>
    </section>
  );
}

/* ───────── CTA pás ───────── */
export function CtaBand() {
  return (
    <section className="border-t border-line bg-cream" style={{ padding: "clamp(64px,9vw,120px) 0" }}>
      <div className={`${wrap} flex flex-col items-center gap-6 text-center`}>
        <h2 className="max-w-[680px] text-ink" style={h2style}>Pripravíme ponuku na mieru vašej prevádzke</h2>
        <p className="max-w-[560px] text-muted-3" style={{ fontSize: "clamp(16px,1.6vw,18px)", lineHeight: 1.6 }}>Napíšte nám, čo potrebujete — ozveme sa spravidla do 24 hodín. Bez záväzkov.</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/kontakt" className="rounded-[10px] bg-brand px-[26px] py-[14px] text-base font-semibold text-white transition hover:bg-brand-2">Vyžiadať cenovú ponuku</Link>
          <Link href="/o-nas" className="rounded-[10px] border border-line bg-white px-[24px] py-[14px] text-base font-semibold text-ink transition hover:border-brand/40">Viac o nás</Link>
        </div>
      </div>
    </section>
  );
}
