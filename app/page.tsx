import Link from "next/link";
import { Container } from "@/components/site/container";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";

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

const PRECO = [
  { t: "Vlastný rozvoz", d: "Pravidelné a spoľahlivé dodávky priamo k vám, bez čakania na kuriéra." },
  { t: "Dávkovače na prenájom", d: "Zariadenia umiestnime u vás, vy platíte len náplne. Servis v cene." },
  { t: "Na faktúru so splatnosťou", d: "Bez platby vopred — férové B2B podmienky a prehľad objednávok." },
  { t: "10+ rokov skúseností", d: "Stabilný partner pre hotely, wellness, gastro, úrady a školy v regióne." },
];

export default function Home() {
  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-line">
        <Container className="grid gap-10 py-16 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-brand/70">
              B2B dodávateľ hygieny a čistoty
            </p>
            <h1 className="mt-3 font-serif text-4xl font-medium leading-[1.1] tracking-tight text-ink sm:text-5xl">
              Hygiena a čistota pre vašu prevádzku — spoľahlivo a načas.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              Dodávame hotelom, wellness, gastru, úradom a školám. Vlastný rozvoz,
              dávkovače na prenájom a objednávky na faktúru — všetko na jednom mieste.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="rounded-xl bg-brand px-6 py-3 text-base font-medium text-white transition hover:bg-brand-hover"
              >
                Vstúpiť do B2B portálu
              </Link>
              <a
                href="#sortiment"
                className="rounded-xl border border-line bg-paper px-6 py-3 text-base font-medium text-ink transition hover:border-brand/40"
              >
                Pozrieť sortiment
              </a>
            </div>
          </div>

          <div className="rounded-2xl bg-brand p-8 text-mint sm:p-10">
            <div className="font-serif text-2xl font-medium text-white">
              Stály partner pre prevádzky
            </div>
            <ul className="mt-6 space-y-4 text-[15px] leading-relaxed text-white/85">
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-mint" />
                Pravidelné zásobovanie podľa vašej spotreby
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-mint" />
                Dávkovače umiestnené u vás, platíte len náplne
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-mint" />
                Objednávky a faktúry prehľadne v portáli
              </li>
            </ul>
          </div>
        </Container>
      </section>

      {/* Sortiment */}
      <section id="sortiment" className="py-16 sm:py-20">
        <Container>
          <h2 className="font-serif text-3xl font-medium tracking-tight text-ink">
            Čo dodávame
          </h2>
          <p className="mt-2 max-w-2xl text-muted">
            Kompletný sortiment pre čistotu a hygienu prevádzky — od papiera po dávkovače.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Prečo my */}
      <section id="preco" className="border-y border-line bg-tile py-16 sm:py-20">
        <Container>
          <h2 className="font-serif text-3xl font-medium tracking-tight text-ink">
            Prečo Moonid
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {PRECO.map((p) => (
              <div key={p.t} className="rounded-2xl bg-paper p-6">
                <div className="font-serif text-xl font-medium text-brand">{p.t}</div>
                <p className="mt-2 leading-relaxed text-muted">{p.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-muted">
            Zásobujeme hotely, wellness, gastro prevádzky, úrady a školy v regióne už viac než desať rokov.
          </p>
        </Container>
      </section>

      {/* Kontakt */}
      <section id="kontakt" className="py-16 sm:py-20">
        <Container className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-serif text-3xl font-medium tracking-tight text-ink">
              Máte záujem o spoluprácu?
            </h2>
            <p className="mt-3 max-w-lg leading-relaxed text-muted">
              Ozvite sa nám a pripravíme cenovú ponuku na mieru vašej prevádzke.
              Existujúci partneri majú objednávky a faktúry v B2B portáli.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="mailto:info@moonid.sk"
                className="rounded-xl bg-brand px-6 py-3 font-medium text-white transition hover:bg-brand-hover"
              >
                Napísať e-mail
              </a>
              <Link
                href="/login"
                className="rounded-xl border border-line bg-paper px-6 py-3 font-medium text-ink transition hover:border-brand/40"
              >
                Prihlásiť sa do portálu
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-paper p-6 text-[15px] leading-relaxed">
            <div className="font-medium text-ink">Moonid s.r.o.</div>
            <dl className="mt-3 space-y-2 text-muted">
              <div className="flex justify-between gap-4">
                <dt>IČO</dt>
                <dd className="text-ink">50934660</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>E-mail</dt>
                <dd className="text-ink">info@moonid.sk</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Región</dt>
                <dd className="text-ink">Nitriansky kraj a okolie</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-muted">
              (Kontaktné údaje doplníme podľa skutočnosti.)
            </p>
          </div>
        </Container>
      </section>

      <SiteFooter />
    </>
  );
}
