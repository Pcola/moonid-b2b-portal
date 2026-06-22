import { requireUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await requireUser();
  const firstName = user.name?.split(" ")[0];

  return (
    <div>
      <h1 className="text-[26px] font-semibold text-ink">Dobrý deň{firstName ? `, ${firstName}` : ""} 👋</h1>
      <p className="mt-1.5 text-[15px] text-muted">
        {user.company?.name ? <>Firma: <span className="font-medium text-ink">{user.company.name}</span></> : "Vitajte v B2B portáli Moonid."}
        {user.company?.priceTier ? <span className="text-muted-2"> · cenová úroveň {user.company.priceTier.code}</span> : null}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { t: "Katalóg s vašimi cenami", d: "Prezeranie sortimentu a objednávanie." },
          { t: "Objednávky", d: "História a stav vašich objednávok." },
          { t: "Faktúry", d: "Vaše faktúry a splatnosti." },
          { t: "Moje dávkovače", d: "Náplne na jeden klik." },
        ].map((c) => (
          <div key={c.t} className="rounded-2xl border border-line bg-white p-5">
            <div className="text-[15px] font-semibold text-ink">{c.t}</div>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{c.d}</p>
            <span className="mt-3 inline-block rounded-full bg-cream px-2.5 py-1 text-[11.5px] font-medium text-muted-2">Pripravujeme</span>
          </div>
        ))}
      </div>
    </div>
  );
}
