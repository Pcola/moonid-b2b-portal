import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GdprSection } from "./gdpr-section";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nastavenia — Moonid portál", robots: { index: false, follow: false } };

const ROLE: Record<string, string> = {
  CUSTOMER_ADMIN: "Správca firmy", CUSTOMER_USER: "Používateľ", STAFF: "Moonid tím", ADMIN: "Administrátor",
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-line py-3 last:border-0 sm:flex-row sm:items-center sm:gap-4">
      <span className="w-[180px] flex-none text-[13px] text-muted-2">{label}</span>
      <span className="text-[14.5px] text-ink">{value || "—"}</span>
    </div>
  );
}

export default async function NastaveniaPage() {
  const user = await requireUser();
  const company = user.companyId
    ? await prisma.company.findUnique({
        where: { id: user.companyId },
        select: { name: true, ico: true, dic: true, icDph: true, city: true, address: true, splatDays: true, priceTier: { select: { code: true, name: true } } },
      })
    : null;
  const users = user.companyId
    ? await prisma.user.findMany({ where: { companyId: user.companyId }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, role: true, active: true } })
    : [];

  return (
    <div className="flex max-w-[820px] flex-col gap-6">
      {/* firma */}
      <section className="rounded-2xl border border-line bg-white">
        <div className="border-b border-line px-6 py-4"><h2 className="text-[18px] font-normal text-ink">Firemné údaje</h2></div>
        <div className="px-6 py-2">
          <Row label="Názov firmy" value={company?.name} />
          <Row label="IČO" value={company?.ico} />
          <Row label="DIČ" value={company?.dic} />
          <Row label="IČ DPH" value={company?.icDph} />
          <Row label="Adresa" value={[company?.address, company?.city].filter(Boolean).join(", ")} />
          <Row label="Cenová úroveň" value={company?.priceTier ? `${company.priceTier.code} — ${company.priceTier.name}` : "—"} />
          <Row label="Splatnosť faktúr" value={company ? `${company.splatDays} dní` : "—"} />
        </div>
        <div className="border-t border-line px-6 py-3.5 text-[12.5px] text-muted-2">
          Potrebujete zmeniť údaje? Napíšte nám na <a href="mailto:obchod@moonid.sk" className="font-medium text-brand hover:text-brand-2">obchod@moonid.sk</a>.
        </div>
      </section>

      {/* používatelia */}
      <section className="rounded-2xl border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-[18px] font-normal text-ink">Používatelia</h2>
          <span className="text-[12.5px] text-muted-2">{users.length} {users.length === 1 ? "konto" : "kont"}</span>
        </div>
        <div className="divide-y divide-line">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-6 py-3.5">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-mintbg text-[12.5px] font-bold text-brand">{(u.name || u.email).slice(0, 2).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-medium text-ink">{u.name || u.email}</div>
                {u.name && <div className="truncate text-[12.5px] text-muted-2">{u.email}</div>}
              </div>
              <span className="rounded-full bg-cream px-2.5 py-0.5 text-[11.5px] font-medium text-muted">{ROLE[u.role] ?? u.role}</span>
              {!u.active && <span className="rounded-full bg-[#fdeceb] px-2.5 py-0.5 text-[11.5px] font-medium text-[#9a3025]">neaktívne</span>}
            </div>
          ))}
        </div>
        <div className="border-t border-line px-6 py-3.5 text-[12.5px] text-muted-2">
          Správu používateľov (pozvánky, deaktivácia) pripravujeme. Zatiaľ nás kontaktujte.
        </div>
      </section>

      <GdprSection />
    </div>
  );
}
