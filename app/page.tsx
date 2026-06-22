import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/site/container";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";

const BRANDS = [
  { src: "/images/brands/tork.png", alt: "Tork" },
  { src: "/images/brands/kimberly-clark.png", alt: "Kimberly-Clark Professional" },
  { src: "/images/brands/lotus.png", alt: "Lotus" },
  { src: "/images/brands/katrin.png", alt: "Katrin" },
  { src: "/images/brands/vileda.png", alt: "Vileda" },
  { src: "/images/brands/leifheit.png", alt: "Leifheit" },
  { src: "/images/brands/sanytol.png", alt: "Sanytol" },
];

const SORTIMENT = [
  { n: "Hygienický papier", d: "Toaletný papier, utierky, vreckovky." },
  { n: "Mydlá a peny", d: "Tekuté a penové mydlá, náplne." },
  { n: "Dezinfekcia", d: "Na ruky aj plošná, profi prípravky." },
  { n: "Čistiace prostriedky", d: "Univerzálne, sanitárne, kuchynské." },
  { n: "Dávkovače a zásobníky", d: "Prenájom aj predaj, vrátane servisu." },
  { n: "Upratovanie", d: "Mopy, vozíky, pomôcky." },
  { n: "Vrecia a obaly", d: "Odpadové vrecia, jednorazový riad." },
  { n: "Príslušenstvo", d: "Doplnky pre vašu prevádzku." },
];

const SEGMENTY = [
  { t: "Hotely, penzióny a ubytovanie", d: "Amenity, vybavenie izieb a kompletná prevádzková hygiena." },
  { t: "Wellness, kúpaliská a fitness", d: "Bazénová chémia, osviežovače, posilňovne a športoviská." },
  { t: "Reštaurácie a gastro", d: "Jednorazový riad, obaly, hygiena a pranie." },
  { t: "Administratíva a kancelárie", d: "Hygiena, papierový program a kancelárske potreby." },
  { t: "Priemysel a výrobné haly", d: "Priemyselné čistenie, utierky, odmasťovače a ochrana." },
  { t: "Autoservisy a dielne", d: "Čističe rúk, utierky, odmasťovače a sorpčné materiály." },
  { t: "Obchod a služby", d: "Nákupné strediská, posilňovne, kaderníctva a salóny." },
  { t: "Školy a samospráva", d: "Školy, úrady, kultúrne domy a inštitúcie." },
];

const PORTAL = [
  "Vaše dohodnuté ceny",
  "Opakované objednávky jedným klikom",
  "História objednávok a faktúry",
  "Stav rozvozu a doručenia",
];

const PRECO = [
  { t: "Všetko na jednom mieste", d: "Hygiena, čistenie, gastro aj hotelové vybavenie od jedného dodávateľa." },
  { t: "Vlastný rozvoz", d: "Pravidelný a flexibilný závoz priamo na vašu prevádzku v regióne." },
  { t: "Faktúra so splatnosťou", d: "Štandardné B2B podmienky bez platby vopred." },
  { t: "Osobný prístup", d: "Stabilný partner od roku 2017 — vybavíte všetko jedným telefonátom." },
];

const REFERENCIE = [
  { q: "Spoľahlivé dodávky a férové ceny. Celú objednávku vybavíme jedným telefonátom.", a: "prevádzková manažérka, hotel v Nitrianskom kraji" },
  { q: "Oceňujeme osobný prístup a flexibilný rozvoz priamo na prevádzku.", a: "majiteľ reštaurácie, Nové Zámky" },
  { q: "Konečne jeden dodávateľ pre celý objekt — od chémie po papierový program.", a: "facility manažér, administratívna budova" },
];

export default function Home() {
  return (
    <>
      <SiteHeader />

      {/* HERO */}
      <section className="relative flex min-h-[560px] items-end overflow-hidden sm:min-h-[680px]">
        <Image
          src="/images/hero-rozvoz.jpg"
          alt="Rozvoz tovaru dodávkou Moonid"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-dark/95 via-brand-dark/70 to-brand/20" />
        <Container className="relative py-16 sm:py-24">
          <p className="text-sm font-medium uppercase tracking-wide text-mint">
            Dodávateľ pre vašu prevádzku · od 2017
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl font-medium leading-[1.04] tracking-tight text-white sm:text-6xl">
            Hygiena, čistenie a vybavenie pre vašu prevádzku.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/85">
            Jeden spoľahlivý dodávateľ pre hotely, wellness, gastro, úrady aj školy.
            Vlastný rozvoz, dávkovače na prenájom a objednávky na faktúru.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#kontakt"
              className="rounded-xl bg-white px-6 py-3 text-base font-medium text-brand transition hover:bg-mint"
            >
              Vyžiadať cenovú ponuku
            </a>
            <Link
              href="/login"
              className="rounded-xl border border-white/30 px-6 py-3 text-base font-medium text-white transition hover:bg-white/10"
            >
              Vstúpiť do portálu
            </Link>
          </div>
        </Container>
      </section>

      {/* OVERENÉ ZNAČKY */}
      <section className="border-b border-line bg-paper">
        <Container className="py-8">
          <p className="text-center text-sm text-muted">Dodávame overené značky</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
            {BRANDS.map((b) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={b.alt}
                src={b.src}
                alt={b.alt}
                className="h-7 w-auto object-contain opacity-65 transition hover:opacity-100 sm:h-8"
              />
            ))}
          </div>
        </Container>
      </section>

      {/* SORTIMENT */}
      <section id="sortiment" className="py-16 sm:py-24">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-brand/70">Sortiment</p>
              <h2 className="mt-2 max-w-2xl font-serif text-3xl font-medium tracking-tight text-ink sm:text-[42px]">
                Kompletný sortiment pre hygienu, čistenie a chod prevádzky
              </h2>
            </div>
            <div className="rounded-xl bg-tile px-5 py-3 text-sm">
              <span className="font-serif text-2xl font-medium text-brand">cez 1 600</span>
              <span className="ml-2 text-muted">položiek v sortimente</span>
            </div>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SORTIMENT.map((s) => (
              <div
                key={s.n}
                className="rounded-2xl border border-line bg-paper p-5 transition hover:-translate-y-0.5 hover:border-brand/30"
              >
                <div className="font-serif text-lg font-medium text-ink">{s.n}</div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.d}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* HOTEL & WELLNESS */}
      <section id="hotel" className="border-y border-line bg-tile py-16 sm:py-24">
        <Container className="grid items-center gap-10 lg:grid-cols-2">
          <div className="order-2 grid grid-cols-2 gap-4 lg:order-1">
            <div className="relative col-span-2 aspect-[16/10] overflow-hidden rounded-2xl">
              <Image src="/images/foto-hotel-izba.png" alt="Hotelová izba s amenitami" fill sizes="(max-width:1024px) 100vw, 50vw" className="object-cover" />
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image src="/images/foto-hotel-amenity.png" alt="Hotelová kozmetika a amenity" fill sizes="(max-width:1024px) 50vw, 25vw" className="object-cover" />
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image src="/images/foto-cistenie.png" alt="Čistiace prostriedky" fill sizes="(max-width:1024px) 50vw, 25vw" className="object-cover" />
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <p className="text-sm font-medium uppercase tracking-wide text-brand/70">Aj pre hotely a wellness</p>
            <h2 className="mt-2 font-serif text-3xl font-medium tracking-tight text-ink sm:text-[42px]">
              Hotelové vybavenie a kozmetika
            </h2>
            <div className="mt-6 space-y-5">
              <div>
                <h3 className="font-serif text-xl font-medium text-ink">Hotelová kozmetika a amenity</h3>
                <p className="mt-1.5 leading-relaxed text-muted">
                  Mydielka, sprchové gély, šampóny, telové mlieka a kozmetické sady — vo fľaštičkách,
                  sáčkoch aj v nástenných dávkovačoch.
                </p>
              </div>
              <div>
                <h3 className="font-serif text-xl font-medium text-ink">Vybavenie izieb a kúpeľní</h3>
                <p className="mt-1.5 leading-relaxed text-muted">
                  Uteráky a osušky, župany, papuče, kozmetické a hygienické sady, dávkovače
                  a jednorazové potreby pre hostí.
                </p>
              </div>
              <p className="text-sm text-muted">
                Doplníme aj chémiu do bazénov a víriviek a osviežovače vzduchu pre wellness priestory.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* PRE KOHO */}
      <section id="prekoho" className="py-16 sm:py-24">
        <Container>
          <p className="text-sm font-medium uppercase tracking-wide text-brand/70">Pre koho dodávame</p>
          <h2 className="mt-2 max-w-2xl font-serif text-3xl font-medium tracking-tight text-ink sm:text-[42px]">
            Partner pre prevádzky naprieč odvetviami
          </h2>
          <p className="mt-3 max-w-2xl text-muted">
            Zásobujeme širokú škálu prevádzok — od ubytovania a gastra cez priemysel, obchod
            a služby až po školy a samosprávu.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SEGMENTY.map((s) => (
              <div key={s.t} className="rounded-2xl border border-line bg-paper p-5">
                <div className="text-[15px] font-semibold text-ink">{s.t}</div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.d}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* PORTÁL */}
      <section className="bg-[radial-gradient(130%_120%_at_85%_-10%,#21564C_0%,#163F38_55%)] py-16 text-white sm:py-24">
        <Container className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-mint">Pre stálych zákazníkov</p>
            <h2 className="mt-2 font-serif text-3xl font-medium tracking-tight text-white sm:text-[42px]">
              Objednávajte online cez B2B portál
            </h2>
            <ul className="mt-7 space-y-3">
              {PORTAL.map((p) => (
                <li key={p} className="flex items-center gap-3 text-white/90">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mint/20 text-mint">✓</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-white/5 p-7 ring-1 ring-white/15 backdrop-blur">
            <h3 className="font-serif text-2xl font-medium text-white">Vstup do portálu</h3>
            <p className="mt-2 text-white/75">Prihláste sa do svojho účtu a objednávajte za svoje dohodnuté ceny.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="rounded-xl bg-white px-6 py-3 text-center font-medium text-brand transition hover:bg-mint">
                Prihlásiť sa
              </Link>
              <a href="#kontakt" className="rounded-xl border border-white/30 px-6 py-3 text-center font-medium text-white transition hover:bg-white/10">
                Požiadať o prístup
              </a>
            </div>
            <p className="mt-4 text-sm text-white/60">
              Ešte nemáte konto? Ozvite sa nám a zriadime vám prístup do portálu.
            </p>
          </div>
        </Container>
      </section>

      {/* PREČO MY */}
      <section id="preco" className="py-16 sm:py-24">
        <Container>
          <p className="text-sm font-medium uppercase tracking-wide text-brand/70">Prečo Moonid</p>
          <h2 className="mt-2 max-w-2xl font-serif text-3xl font-medium tracking-tight text-ink sm:text-[42px]">
            Jeden spoľahlivý partner pre celý chod prevádzky
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PRECO.map((p) => (
              <div key={p.t} className="rounded-2xl border border-line bg-paper p-6">
                <div className="font-serif text-xl font-medium text-brand">{p.t}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{p.d}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* DÔVERUJÚ NÁM */}
      <section className="border-y border-line bg-tile py-16 sm:py-24">
        <Container>
          <h2 className="font-serif text-3xl font-medium tracking-tight text-ink">Dôverujú nám</h2>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {REFERENCIE.map((r) => (
              <figure key={r.a} className="flex flex-col rounded-2xl bg-paper p-6">
                <blockquote className="font-serif text-lg leading-relaxed text-ink">„{r.q}“</blockquote>
                <figcaption className="mt-4 text-sm text-muted">{r.a}</figcaption>
              </figure>
            ))}
          </div>
        </Container>
      </section>

      {/* KONTAKT */}
      <section id="kontakt" className="bg-brand-dark py-16 text-white sm:py-24">
        <Container className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-mint">Kontakt</p>
            <h2 className="mt-2 font-serif text-3xl font-medium tracking-tight text-white sm:text-[44px]">
              Začnime spoluprácu
            </h2>
            <p className="mt-4 max-w-lg leading-relaxed text-white/80">
              Napíšte nám, čo vaša prevádzka potrebuje — pripravíme cenovú ponuku na mieru
              a ozveme sa vám spravidla do 24 hodín.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="mailto:moonid@moonid.sk" className="rounded-xl bg-white px-6 py-3 font-medium text-brand transition hover:bg-mint">
                Napísať e-mail
              </a>
              <Link href="/login" className="rounded-xl border border-white/30 px-6 py-3 font-medium text-white transition hover:bg-white/10">
                Prihlásiť sa do portálu
              </Link>
            </div>
          </div>
          <div className="rounded-2xl bg-white/5 p-7 ring-1 ring-white/15">
            <div className="font-medium text-white">Moonid s.r.o.</div>
            <dl className="mt-4 space-y-3 text-[15px]">
              <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
                <dt className="text-white/60">E-mail</dt>
                <dd><a href="mailto:moonid@moonid.sk" className="hover:text-mint">moonid@moonid.sk</a></dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
                <dt className="text-white/60">Adresa</dt>
                <dd className="text-right">Hlavná 39/78<br />941 43 Dolný Ohaj</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
                <dt className="text-white/60">Otváracie hodiny</dt>
                <dd className="text-right">Po–Štv 8:00–17:00<br />Pia 8:00–14:00</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-white/60">IČO</dt>
                <dd>50934660</dd>
              </div>
            </dl>
          </div>
        </Container>
      </section>

      <SiteFooter />
    </>
  );
}
