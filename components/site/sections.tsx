import Link from "next/link";
import Image from "next/image";
import { Testimonials } from "@/components/site/testimonials";
import { ContactForm } from "@/components/site/contact-form";
import { safeJsonLd } from "@/lib/json-ld";

/* ───────── dáta ───────── */
const STATS = [
  { n: "2017", l: "na trhu od roku" },
  { n: "1 600+", l: "produktov v ponuke" },
  { n: "48 h", l: "skladové položky na ceste" },
];
const MARQUEE = ["Hygiena", "Čistiaca chémia", "Papierový program", "Dávkovače", "Gastro", "Kancelária", "Hotelové amenity"];
const BRANDS = [
  { src: "/images/logo-tork.png", alt: "Tork" },
  { src: "/images/logo-kimberly-clark.png", alt: "Kimberly-Clark Professional" },
  { src: "/images/logo-katrin.png", alt: "Katrin" },
  { src: "/images/logo-lotus.png", alt: "Lotus Professional" },
  { src: "/images/logo-vileda.png", alt: "Vileda Professional" },
  { src: "/images/logo-leifheit.png", alt: "Leifheit" },
  { src: "/images/logo-sanytol.png", alt: "Sanytol" },
];
const KATEGORIE = [
  "Čistiace prostriedky", "Hygienický papier", "Dávkovače a zásobníky", "Upratovanie",
  "Dezinfekcia", "Mydlá a peny", "Vrecia a obaly", "Príslušenstvo",
];
const RENTAL = [
  { t: "Vyberieme a osadíme", d: "Navrhneme dávkovače na mydlo, papierové utierky, toaletný papier a dezinfekciu podľa vašej prevádzky a osadíme ich." },
  { t: "Dopĺňame pri rozvoze", d: "Pri pravidelnom závoze sledujeme spotrebu a dopĺňame správne náplne — nikdy vám nedôjde mydlo na toaletách." },
  { t: "Jeden štandard, nula starostí", d: "Rovnaký systém naprieč celou prevádzkou. Žiadne hľadanie kompatibilných náplní, žiadna investícia do zariadení." },
];
const STEPS = [
  { t: "Pošlete dopyt", d: "Napíšte nám, čo potrebujete, alebo pošlite zoznam položiek. Nezáväzne." },
  { t: "Pripravíme ponuku na mieru", d: "Ozveme sa s cenovou ponukou a v prípade záujmu navrhneme aj osadenie dávkovačov." },
  { t: "Prvý rozvoz a prístup do portálu", d: "Privezieme prvú objednávku vlastným rozvozom a zriadime vám prístup do portálu. Faktúra so splatnosťou 14 dní." },
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
  { src: "/images/klient-grandhotelsole.svg", alt: "Grand Hotel SOLE Nitra", h: 60 },
  { src: "/images/klient-podhajska.png", alt: "Kúpalisko Podhájska", h: 72 },
  { src: "/images/klient-westend.svg", alt: "Westend", h: 32 },
  { src: "/images/klient-loko.png", alt: "LOKO trans Slovakia", h: 64 },
];

export const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

/* ───────── helpers ───────── */
const wrap = "mx-auto max-w-[1240px] px-5 sm:px-8";
const pad = { padding: "clamp(76px,10vw,148px) 0" } as const;
const lead = { fontSize: "clamp(17px,1.7vw,20px)", lineHeight: 1.6 } as const;

function Eyebrow({ num, children, dark = false }: { num?: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <span className={`eyebrow ${dark ? "eyebrow-dark" : ""}`}>
      {num && <span className="eyebrow-num">{num} /</span>}
      {children}
    </span>
  );
}
const Ico = ({ children, size = 24 }: { children: React.ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const Arrow = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;

const btnPrimary = "inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-xl bg-brand px-[26px] py-[15px] text-base font-semibold text-white transition-colors duration-200 hover:bg-brand-2";
const btnOnDark = "inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-xl bg-white px-[26px] py-[15px] text-base font-semibold text-brand transition-colors duration-200 hover:bg-mintbg";
const btnGhostDark = "inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-white/55 px-[22px] py-[15px] text-base font-semibold text-white transition-colors duration-200 hover:border-white hover:bg-white/10";
const btnGhost = "inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-[#b9cac4] bg-white px-[24px] py-[15px] text-base font-semibold text-brand transition-colors duration-200 hover:border-brand hover:bg-mintbg/50";

/* ═════════ HERO — split layout + textový marquee ═════════ */
export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-brand-deep">
      <div className="microgrid-dark pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(90% 70% at 8% 0%, rgba(46,98,88,0.4) 0%, rgba(13,28,24,0) 55%)" }} aria-hidden="true" />

      <div className={`relative ${wrap}`} style={{ paddingTop: "clamp(110px,13vw,152px)" }}>
        <div className="grid items-stretch gap-8 pb-[clamp(40px,5vw,72px)] lg:grid-cols-[1.04fr_0.96fr] lg:gap-14">
          {/* ľavý stĺpec — obsah */}
          <div className="hero-stagger flex flex-col justify-center gap-7 py-2 lg:py-8">
            <Eyebrow dark>Dodávateľ pre vašu prevádzku · od 2017</Eyebrow>
            <h1 className="t-display text-white">
              Hygiena a<br /><span className="wipe wipe-dark wipe-anim">čistenie</span> pre<br />vašu prevádzku
            </h1>
            <p className="max-w-[520px] text-[#cfe0db]" style={lead}>
              Jeden dodávateľ pre hotely, wellness, gastro, úrady aj školy v okrese Nové Zámky
              a Nitrianskom kraji. Vlastný rozvoz, dávkovače na prenájom a objednávky na faktúru.
            </p>
            <div className="flex flex-wrap items-center gap-3.5">
              <Link href="/kontakt" className={btnOnDark}>Vyžiadať cenovú ponuku</Link>
              <Link href="/kontakt#ako-zacat" className={btnGhostDark}>Ako začať</Link>
            </div>
            <div className="mt-2 grid max-w-[560px] grid-cols-3 border-t border-white/15 pt-6">
              {STATS.map((s, i) => (
                <div key={s.l} className={`flex flex-col gap-1.5 ${i > 0 ? "border-l border-white/12 pl-[clamp(14px,2vw,28px)]" : ""}`}>
                  <span className="font-display text-white" style={{ fontSize: "clamp(24px,2.9vw,38px)", lineHeight: 1, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{s.n}</span>
                  <span className="text-[12.5px] leading-snug text-[#9db8b1]">{s.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* pravý stĺpec — obrazový panel */}
          <div className="rise-load relative min-h-[380px] overflow-hidden rounded-[28px] border border-white/10 lg:min-h-0" style={{ animationDelay: ".25s" }}>
            <Image src="/images/hero-still-life.jpg" alt="Biele uteráky, dávkovač mydla a čistiace potreby na tmavozelenom pozadí" fill priority sizes="(max-width:1024px) 100vw, 46vw" className="object-cover" style={{ objectPosition: "72% center" }} />
            <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-brand-deep/60 px-5 py-4 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span className="dot-mint !bg-mint" style={{ boxShadow: "0 0 0 3px rgba(143,224,205,.18)" }} />
                <div className="flex flex-col">
                  <span className="text-[13.5px] font-semibold text-white">Vlastný rozvoz</span>
                  <span className="text-[12px] text-[#9db8b1]">Nové Zámky a Nitriansky kraj</span>
                </div>
              </div>
              <Link href="/o-nas" aria-label="Viac o rozvoze" className="flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-xl border border-white/20 text-white transition-colors hover:bg-white/10"><Arrow /></Link>
            </div>
          </div>
        </div>
      </div>

      {/* textový marquee pás */}
      <div className="marquee-band relative border-t border-white/10 py-[clamp(18px,2.4vw,28px)]" role="img" aria-label={`Sortiment: ${MARQUEE.join(", ")}`}>
        <div className="marquee-track">
          {[...MARQUEE, ...MARQUEE].map((m, i) => (
            <span key={i} aria-hidden={i >= MARQUEE.length} className="flex items-center gap-[clamp(28px,4vw,56px)]">
              <span className="text-outline font-display whitespace-nowrap font-semibold uppercase" style={{ fontSize: "clamp(26px,3.4vw,44px)", letterSpacing: "0.01em" }}>{m}</span>
              <span className="h-2 w-2 flex-none rounded-full bg-mint/40" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═════════ PAGE HERO — svetlý editoriálny header podstránok ═════════ */
export function PageHero({ eyebrow: eb, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <section className="relative border-b border-line bg-white" style={{ paddingTop: "clamp(128px,15vw,180px)", paddingBottom: "clamp(44px,6vw,76px)" }}>
      <div className="microgrid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className={`relative ${wrap}`}>
        <nav aria-label="Omrvinková navigácia" className="mb-6 flex items-center gap-2.5 text-[13px] font-medium text-muted-2">
          <Link href="/" className="transition-colors hover:text-brand">Domov</Link>
          <span className="text-line">/</span>
          <span className="text-mint-ink">{eb}</span>
        </nav>
        <h1 className="t-h1 max-w-[900px] text-ink" style={{ fontSize: "clamp(38px,5.4vw,76px)" }}>{title}</h1>
        {subtitle && <p className="mt-6 max-w-[640px] text-muted-3" style={lead}>{subtitle}</p>}
      </div>
    </section>
  );
}

/* ═════════ BRANDS ═════════ */
export function BrandsSection() {
  return (
    <section className="border-b border-line bg-white" style={{ padding: "clamp(30px,4vw,44px) 0" }}>
      <div className={`${wrap} flex flex-col items-center gap-6`}>
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.2em] text-muted-2">Dodávame overené značky</span>
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

/* ═════════ SORTIMENT — bento grid ═════════ */
export function SortimentSection() {
  const tiles = [
    { name: "Čistiace prostriedky", icon: <><path d="M9 3h6" /><path d="M10 3v4l-4.5 8A4 4 0 0 0 9 21h6a4 4 0 0 0 3.5-6L14 7V3" /></> },
    { name: "Hygienický papier", icon: <><circle cx="9" cy="9" r="5.5" /><circle cx="9" cy="9" r="1.6" /><path d="M14.5 6H20a1 1 0 0 1 1 1v13H6a2.5 2.5 0 0 1 0-5" /></> },
  ];
  return (
    <section id="sortiment" className="bg-cream" style={pad}>
      <div className={wrap}>
        <div className="reveal mb-[clamp(40px,5vw,64px)] flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-[680px]">
            <Eyebrow num="01">Sortiment</Eyebrow>
            <h2 className="t-h2 mt-4 text-ink">Všetko pre chod prevádzky,<br />z jedného miesta</h2>
          </div>
          <Link href="/produkty" className="navlink hidden items-center gap-2 text-[15px] font-semibold text-mint-ink md:inline-flex">Celý katalóg <Arrow /></Link>
        </div>

        {/* bento */}
        <div className="reveal grid gap-[clamp(12px,1.6vw,18px)] md:grid-cols-2 lg:grid-cols-4 lg:[grid-template-rows:repeat(2,minmax(220px,auto))]">
          {/* A — veľká zelená dlaždica 2×2 */}
          <div className="relative flex flex-col justify-between gap-10 overflow-hidden rounded-[22px] bg-brand p-[clamp(26px,3vw,40px)] md:col-span-2 lg:row-span-2">
            <div className="microgrid-dark pointer-events-none absolute inset-0" aria-hidden="true" />
            <div className="relative flex flex-col gap-3">
              <span className="stat-num text-white" style={{ fontSize: "clamp(56px,7vw,110px)" }}>1 600+</span>
              <span className="t-h3 text-mint">položiek v sortimente</span>
              <p className="mt-1 max-w-[400px] text-[15.5px] leading-relaxed text-[#a9c2bb]">
                Najpredávanejšie produkty držíme skladom, zvyšok objednáme pri vašej objednávke —
                od čistiacej chémie a papiera až po dávkovače, gastro a kancelárske potreby.
              </p>
            </div>
            <Link href="/produkty" className={`${btnOnDark} relative self-start !py-[13px] text-[15px]`}>Pozrieť celý sortiment <Arrow /></Link>
          </div>

          {/* B — obrazová dlaždica 2×1 */}
          <div className="relative min-h-[220px] overflow-hidden rounded-[22px] border border-line md:col-span-2">
            <Image src="/images/rozvoz.jpg" alt="Vlastný rozvoz Moonid — dodávka naložená tovarom" fill sizes="(max-width:1024px) 100vw, 50vw" className="object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-2.5 bg-gradient-to-t from-brand-deep/85 to-transparent p-5 pt-12">
              <span className="dot-mint !bg-mint" style={{ boxShadow: "0 0 0 3px rgba(143,224,205,.2)" }} />
              <span className="text-[13.5px] font-semibold text-white">Pravidelný závoz priamo na prevádzku</span>
            </div>
          </div>

          {/* C, D — kategórie 1×1 */}
          {tiles.map((t) => (
            <Link key={t.name} href={`/produkty?cat=${encodeURIComponent(t.name)}`} className="group flex min-h-[190px] cursor-pointer flex-col justify-between gap-6 rounded-[22px] border border-line bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-brand/30 hover:shadow-[0_18px_40px_-24px_rgba(13,33,27,0.35)]">
              <span className="text-mint-ink"><Ico size={30}>{t.icon}</Ico></span>
              <div className="flex items-end justify-between gap-3">
                <span className="t-h3 !text-[19px] text-ink">{t.name}</span>
                <span className="text-muted-2 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-brand"><Arrow /></span>
              </div>
            </Link>
          ))}
        </div>

        <div className="reveal mt-[clamp(20px,2.5vw,28px)] flex flex-wrap gap-2.5">
          {KATEGORIE.map((k) => (
            <Link key={k} href={`/produkty?cat=${encodeURIComponent(k)}`} className="cursor-pointer rounded-full border border-line bg-white px-4 py-2.5 text-[13.5px] font-medium text-muted-3 transition-colors duration-200 hover:border-brand/40 hover:text-brand">
              {k}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═════════ DÁVKOVAČE — sticky split editoriál ═════════ */
export function DavkovaceSection() {
  return (
    <section id="davkovace" className="bg-white" style={pad}>
      <div className={wrap}>
        <div className="grid gap-[clamp(40px,6vw,96px)] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="reveal lg:sticky lg:top-[120px] lg:self-start">
            <Eyebrow num="02">Dávkovače a náplne</Eyebrow>
            <h2 className="t-h2 mt-4 text-ink">Dávkovače vám <span className="wipe">osadíme</span>. Platíte len náplne.</h2>
            <p className="mt-5 max-w-[420px] text-muted-3" style={lead}>
              Žiadna investícia do vybavenia, žiadne riešenie kompatibility — naprieč celou prevádzkou.
            </p>
            <Link href="/kontakt" className={`${btnPrimary} mt-8`}>Chcem dávkovače <Arrow /></Link>
          </div>
          <div className="reveal-cascade flex flex-col">
            {RENTAL.map((r, i) => (
              <div key={r.t} className="grid grid-cols-[auto_1fr] items-start gap-x-[clamp(20px,3vw,40px)] border-t border-line py-[clamp(28px,3.4vw,44px)] last:border-b">
                <span className="font-display font-semibold text-mint-ink" style={{ fontSize: "clamp(44px,5vw,72px)", lineHeight: 0.9, fontVariantNumeric: "tabular-nums", opacity: 0.85 }}>{String(i + 1).padStart(2, "0")}</span>
                <div className="flex flex-col gap-2.5 pt-1.5">
                  <h3 className="t-h3 text-ink">{r.t}</h3>
                  <p className="max-w-[480px] text-[15.5px] leading-relaxed text-muted">{r.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═════════ PORTÁL — s CSS mockupom aplikácie ═════════ */
export function PortalSection() {
  return (
    <section id="portal" className="bg-cream" style={pad}>
      <div className={wrap}>
        <div className="reveal relative overflow-hidden rounded-[28px] text-mintbg" style={{ background: "radial-gradient(130% 130% at 88% -20%, #21564C 0%, #143A33 56%)" }}>
          <div className="microgrid-dark absolute inset-0" aria-hidden="true" />
          <div className="relative z-[2] grid items-center gap-[clamp(36px,5vw,64px)] p-[clamp(30px,4.5vw,64px)] lg:grid-cols-[1fr_1.05fr]">
            <div className="flex flex-col gap-6">
              <Eyebrow num="03" dark>Objednávkový portál</Eyebrow>
              <h2 className="t-h2 text-white">Objednávajte online cez B2B portál</h2>
              <p className="max-w-[480px] text-[#b7ccc6]" style={{ fontSize: "clamp(16px,1.6vw,18px)", lineHeight: 1.6 }}>
                Po prvej objednávke vám zriadime prístup — pozriete si svoje dohodnuté ceny, históriu aj faktúry
                a celý sortiment doobjednáte jedným klikom.
              </p>
              <div className="grid grid-cols-1 gap-x-7 gap-y-3.5 sm:grid-cols-2">
                {PORTAL_FEATS.map((f) => (
                  <div key={f} className="flex items-start gap-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8fe0cd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-px flex-none" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
                    <span className="text-[14.5px] leading-snug text-[#d7e4e0]">{f}</span>
                  </div>
                ))}
              </div>
              <div className="mt-1 flex flex-wrap gap-3">
                <Link href="/login" className={`${btnOnDark} !py-3.5 text-[15px]`}>Prihlásiť sa</Link>
                <Link href="/kontakt#ako-zacat" className={`${btnGhostDark} !py-3.5 text-[15px]`}>Ešte nie ste zákazník?</Link>
              </div>
            </div>

            {/* CSS mockup portálu — okno prehliadača */}
            <div aria-hidden="true" className="select-none overflow-hidden rounded-2xl border border-white/15 bg-[#0d1c18] shadow-[0_50px_100px_-40px_rgba(0,0,0,0.7)]">
              {/* chrome lišta */}
              <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                <span className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-white/15" /><span className="h-2.5 w-2.5 rounded-full bg-white/15" /><span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                </span>
                <span className="flex-1 rounded-md bg-white/8 px-3 py-1 text-center text-[11px] tracking-wide text-[#7fa199]">portal.moonid.sk</span>
              </div>
              <div className="grid grid-cols-[104px_1fr]">
                {/* mini sidebar */}
                <div className="flex flex-col gap-2.5 border-r border-white/10 p-3.5">
                  <span className="font-display mb-1 text-[14px] font-semibold text-white">m<span className="text-mint">.</span></span>
                  {["Prehľad", "Katalóg", "Objednávky", "Faktúry"].map((l, i) => (
                    <span key={l} className={`rounded-md px-2 py-1 text-[10.5px] font-semibold ${i === 1 ? "bg-mint/20 text-mint" : "text-[#7fa199]"}`}>{l}</span>
                  ))}
                </div>
                {/* obsah */}
                <div className="flex flex-col gap-3 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-white/80">Katalóg — vaše ceny</span>
                    <span className="rounded-lg bg-mint px-2.5 py-1 text-[10px] font-bold text-brand-deep">Košík · 3</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[["1 600+", "položiek"], ["48 h", "dodanie"], ["−18 %", "vaša zľava"]].map(([v, l]) => (
                      <div key={v} className="rounded-xl bg-white/8 p-2.5">
                        <div className="font-display text-[15px] font-semibold text-white">{v}</div>
                        <div className="mt-0.5 text-[9.5px] font-medium text-[#8fb3ab]">{l}</div>
                      </div>
                    ))}
                  </div>
                  {[["Tork utierky v roli H1", "2-vrstvové · 6 ks", "12,40 €"], ["Jar Professional 5 l", "koncentrát", "8,90 €"], ["Sanytol dezinfekcia", "univerzálna · 1 l", "24,10 €"]].map(([n, d, p]) => (
                    <div key={n} className="flex items-center gap-3 rounded-xl bg-white/6 p-2.5">
                      <span className="h-9 w-9 flex-none rounded-lg bg-white/12" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[11px] font-semibold text-white/90">{n}</span>
                        <span className="text-[9.5px] text-[#7fa199]">{d}</span>
                      </span>
                      <span className="font-display text-[12px] font-semibold text-mint">{p}</span>
                      <span className="rounded-md bg-mint/20 px-2 py-1 text-[9px] font-bold text-mint">+ Pridať</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═════════ PRE KOHO ═════════ */
export function PreKohoSection({ cream = false }: { cream?: boolean }) {
  return (
    <section id="prekoho" className={cream ? "bg-cream" : "bg-white"} style={pad}>
      <div className={wrap}>
        <div className="reveal mb-[clamp(40px,5vw,64px)] max-w-[720px]">
          <Eyebrow>Pre koho dodávame</Eyebrow>
          <h2 className="t-h2 mt-4 text-ink">Regionálny partner pre prevádzky naprieč odvetviami</h2>
          <p className="mt-5 text-muted-3" style={lead}>Zásobujeme širokú škálu prevádzok v regióne — od ubytovania a gastra cez priemysel, obchod a služby až po školy a samosprávu.</p>
        </div>
        <div className="reveal-cascade grid sm:grid-cols-2 lg:grid-cols-4">
          {SEGMENTS.map((s, i) => (
            <div key={s.t} className="relative flex flex-col gap-4 border-t border-line py-7 sm:pr-[clamp(18px,2.5vw,36px)]">
              <div className="flex items-center justify-between">
                <span className="text-mint-ink"><Ico>{s.p}</Ico></span>
                <span className="font-display text-[12px] tabular-nums text-muted-2">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-[17px] font-semibold leading-snug text-ink">{s.t}</h3>
                <p className="text-[14.5px] leading-relaxed text-muted">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═════════ HOTEL ═════════ */
export function HotelSection() {
  const cards = [
    { img: "/images/hotel-kozmetika.png", t: "Hotelová kozmetika a amenity", d: "Mydielka, sprchové gély, šampóny, telové mlieka a kozmetické sady — vo fľaštičkách, sáčkoch aj v dávkovačoch na steny." },
    { img: "/images/hotel-vybavenie-izieb.png", t: "Vybavenie izieb a kúpeľní", d: "Uteráky a osušky, župany, papuče, kozmetické a hygienické sady, dávkovače a jednorazové potreby pre hostí." },
  ];
  return (
    <section id="hotel" className="border-t border-line bg-cream" style={pad}>
      <div className={wrap}>
        <div className="reveal mb-[clamp(40px,5vw,64px)] max-w-[720px]">
          <Eyebrow>Aj pre hotely a wellness</Eyebrow>
          <h2 className="t-h2 mt-4 text-ink">Hotelové vybavenie a kozmetika</h2>
          <p className="mt-5 text-muted-3" style={lead}>Okrem bežnej prevádzkovej hygieny zabezpečíme aj špecializované hotelové vybavenie a kozmetiku — všetko, čo robí pobyt hosťa príjemným.</p>
        </div>
        <div className="reveal grid gap-[clamp(20px,2.5vw,28px)] lg:grid-cols-2">
          {cards.map((c) => (
            <div key={c.t} className="card-hover flex flex-col overflow-hidden rounded-[22px] border border-line bg-white">
              <div className="relative h-[340px] w-full"><Image src={c.img} alt={c.t} fill sizes="(max-width:1024px) 100vw, 50vw" className="object-cover" /></div>
              <div className="flex flex-col gap-3 p-[clamp(26px,3vw,36px)]">
                <h3 className="t-h3 !text-[clamp(22px,2.4vw,28px)] text-ink">{c.t}</h3>
                <p className="text-[15.5px] leading-relaxed text-muted-3">{c.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═════════ PREČO MOONID ═════════ */
export function PrecoSection() {
  return (
    <section id="preco" className="relative overflow-hidden text-mintbg" style={{ ...pad, background: "radial-gradient(130% 120% at 85% -10%, #21564C 0%, #163F38 52%)" }}>
      <div className="microgrid-dark absolute inset-0" aria-hidden="true" />
      <div className={`relative ${wrap}`}>
        <div className="reveal mb-[clamp(44px,5vw,68px)] max-w-[680px]">
          <Eyebrow dark>Prečo Moonid</Eyebrow>
          <h2 className="t-h2 mt-4 text-white">Jeden spoľahlivý partner pre celý chod prevádzky</h2>
        </div>
        <div className="reveal-cascade grid gap-[clamp(18px,2vw,24px)]" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(248px,1fr))" }}>
          {WHY.map((w) => (
            <div key={w.t} className="why-card flex flex-col gap-[18px] rounded-[20px] border border-white/10 bg-white/[0.045] p-[clamp(26px,2.6vw,32px)]">
              <span className="inline-flex h-[54px] w-[54px] items-center justify-center rounded-[14px] border border-mint/25 bg-mint/[0.12] text-mint"><Ico size={26}>{w.p}</Ico></span>
              <div className="flex flex-col gap-2.5">
                <h3 className="t-h3 !text-xl text-white">{w.t}</h3>
                <p className="text-[15.5px] leading-relaxed text-[#b7ccc6]">{w.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═════════ REFERENCIE — pull-quote editoriál ═════════ */
export function ReferencieSection() {
  return (
    <section id="referencie" className="bg-white" style={pad}>
      <div className={wrap}>
        <div className="reveal mx-auto max-w-[960px] text-center">
          <Eyebrow>Dôverujú nám</Eyebrow>
          <div className="mt-8"><Testimonials /></div>
        </div>
        <div className="reveal mx-auto mt-[clamp(48px,6vw,72px)] flex max-w-[1000px] flex-wrap items-center justify-center gap-x-[clamp(40px,6vw,80px)] gap-y-8 border-t border-line pt-[clamp(36px,4vw,52px)]">
          {CLIENTS.map((c) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={c.alt} src={c.src} alt={c.alt} loading="lazy" className="w-auto object-contain opacity-60 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0" style={{ maxHeight: c.h }} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═════════ AKO ZAČAŤ ═════════ */
export function AkoZacatSection() {
  return (
    <section id="ako-zacat" className="bg-white" style={pad}>
      <div className={wrap}>
        <div className="grid gap-[clamp(40px,6vw,96px)] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="reveal lg:sticky lg:top-[120px] lg:self-start">
            <Eyebrow>Ako začať</Eyebrow>
            <h2 className="t-h2 mt-4 text-ink">Ako sa stať zákazníkom</h2>
            <p className="mt-5 max-w-[420px] text-muted-3" style={lead}>Od prvého dopytu k pravidelným dodávkam v troch krokoch — bez záväzkov a bez zbytočnej byrokracie.</p>
            <a href="#form" className={`${btnPrimary} mt-8`}>Vyžiadať nezáväznú ponuku <Arrow /></a>
          </div>
          <div className="reveal-cascade flex flex-col">
            {STEPS.map((s, i) => (
              <div key={s.t} className="grid grid-cols-[auto_1fr] items-start gap-x-[clamp(20px,3vw,40px)] border-t border-line py-[clamp(28px,3.4vw,44px)] last:border-b">
                <span className="font-display font-semibold text-mint-ink" style={{ fontSize: "clamp(44px,5vw,72px)", lineHeight: 0.9, fontVariantNumeric: "tabular-nums", opacity: 0.85 }}>{String(i + 1).padStart(2, "0")}</span>
                <div className="flex flex-col gap-2.5 pt-1.5">
                  <h3 className="t-h3 text-ink">{s.t}</h3>
                  <p className="max-w-[480px] text-[15.5px] leading-relaxed text-muted">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═════════ PODMIENKY ═════════ */
export function PodmienkySection() {
  return (
    <section id="podmienky" className="border-y border-line bg-cream" style={pad}>
      <div className={wrap}>
        <div className="reveal mb-[clamp(40px,5vw,64px)] max-w-[680px]">
          <Eyebrow>Podmienky spolupráce</Eyebrow>
          <h2 className="t-h2 mt-4 text-ink">Jasné B2B podmienky bez prekvapení</h2>
        </div>
        <dl className="grid gap-x-[clamp(24px,4vw,64px)] sm:grid-cols-2">
          {TERMS.map((t) => (
            <div key={t.k} className="flex flex-col gap-1.5 border-t border-line py-5">
              <dt className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-mint-ink">{t.k}</dt>
              <dd className="text-[15.5px] leading-relaxed text-muted">{t.v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ═════════ FAQ — akordeón (AEO friendly) ═════════ */
export function FaqSection() {
  return (
    <section id="faq" className="bg-white" style={pad}>
      <div className={wrap}>
        <div className="grid gap-[clamp(36px,5vw,80px)] lg:grid-cols-[0.8fr_1.2fr]">
          <div className="reveal lg:sticky lg:top-[120px] lg:self-start">
            <Eyebrow num="04">Časté otázky</Eyebrow>
            <h2 className="t-h2 mt-4 text-ink">Na čo sa zákazníci pýtajú</h2>
            <p className="mt-5 max-w-[380px] text-muted-3" style={lead}>Nenašli ste odpoveď? Zavolajte nám na <a href="tel:+421919216908" className="font-semibold text-mint-ink hover:underline">0919 216 908</a>.</p>
          </div>
          <div className="reveal flex flex-col">
            {FAQ.map((f) => (
              <details key={f.q} className="faq-item group border-t border-line last:border-b">
                <summary className="flex items-center justify-between gap-5 py-[22px]">
                  <h3 className="text-[17px] font-semibold text-ink">{f.q}</h3>
                  <span className="faq-icon flex h-8 w-8 flex-none items-center justify-center rounded-full border border-line text-muted-2" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                  </span>
                </summary>
                <div className="faq-body">
                  <div><p className="max-w-[560px] pb-[22px] text-[15px] leading-relaxed text-muted">{f.a}</p></div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqLd) }} />
    </section>
  );
}

/* ═════════ KONTAKT (info + formulár) ═════════ */
export function KontaktSection() {
  return (
    <section id="form" className="relative overflow-hidden bg-brand-deep text-[#e7efec]" style={pad}>
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(120% 80% at 12% -10%, rgba(46,98,88,0.45) 0%, rgba(16,42,38,0) 60%)" }} />
      <div className="microgrid-dark absolute inset-0" aria-hidden="true" />
      <div className={`relative ${wrap}`}>
        <div className="grid items-start gap-[clamp(44px,6vw,96px)] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col">
            <Eyebrow dark>Kontakt</Eyebrow>
            <h2 className="t-h2 mt-5 text-white">Napíšte nám</h2>
            <p className="mt-[18px] max-w-[430px] text-[#a9c2bb]" style={lead}>Pripravíme cenovú ponuku na mieru a ozveme sa vám spravidla do 24 hodín.</p>
            <div className="mt-[clamp(36px,4vw,52px)] flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6e938b]">Telefón</span>
              <a href="tel:+421919216908" className="font-display font-semibold text-white transition-colors hover:text-mint" style={{ fontSize: "clamp(28px,3.2vw,40px)", letterSpacing: "-0.02em" }}>0919 216 908</a>
            </div>
            <div className="mt-6 flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6e938b]">E-mail</span>
              <a href="mailto:moonid@moonid.sk" className="font-medium text-[#e7efec] transition-colors hover:text-mint" style={{ fontSize: "clamp(18px,1.8vw,21px)" }}>moonid@moonid.sk</a>
            </div>
            <dl className="mt-[clamp(40px,4.5vw,56px)] flex flex-col">
              {[
                ["Kontaktná osoba", <span key="1">Jozef Slobodník <span className="text-[#7fa59c]">— konateľ</span></span>],
                ["Otváracie hodiny", <span key="2">Po–Štv 8:00–17:00 <span className="text-[#7fa59c]">· Pia 8:00–14:00</span></span>],
                ["Adresa", <span key="3">Hlavná 39/78 <span className="text-[#7fa59c]">· 941 43 Dolný Ohaj</span></span>],
                ["Fakturačné údaje", <span key="4" className="text-[14px] text-[#8fb3ab]">IČO 50 934 660 · IČ DPH SK2120530995</span>],
              ].map(([k, v], idx) => (
                <div key={idx} className="flex items-baseline gap-6 border-t border-white/10 py-[18px]">
                  <dt className="w-[124px] flex-none pt-0.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#6e938b]">{k}</dt>
                  <dd className="text-[15.5px] leading-relaxed text-[#e7efec]">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="rounded-[22px] p-[clamp(28px,3.4vw,46px)]" style={{ background: "#fbfcfb", boxShadow: "0 40px 80px -40px rgba(0,0,0,0.55)" }}><ContactForm /></div>
        </div>
      </div>
    </section>
  );
}

/* ═════════ CTA pás ═════════ */
export function CtaBand() {
  return (
    <section className="relative border-t border-line bg-cream" style={pad}>
      <div className="microgrid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className={`${wrap} relative flex flex-col items-center gap-7 text-center`}>
        <h2 className="t-h2 max-w-[760px] text-ink">Pripravíme ponuku na mieru <span className="wipe">vašej prevádzke</span></h2>
        <p className="max-w-[560px] text-muted-3" style={lead}>Napíšte nám, čo potrebujete — ozveme sa spravidla do 24 hodín. Bez záväzkov.</p>
        <div className="flex flex-wrap items-center justify-center gap-3.5">
          <Link href="/kontakt" className={btnPrimary}>Vyžiadať cenovú ponuku</Link>
          <Link href="/o-nas" className={btnGhost}>Viac o nás</Link>
        </div>
      </div>
    </section>
  );
}
