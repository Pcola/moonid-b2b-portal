import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GdprSection } from "./gdpr-section";
import { AddressManager } from "./address-manager";
import { MemberManager } from "./member-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nastavenia — Moonid portál", robots: { index: false, follow: false } };

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
        select: { name: true, ico: true, dic: true, icDph: true, city: true, address: true, zip: true, splatDays: true, priceTier: { select: { code: true, name: true } } },
      })
    : null;
  const users = user.companyId
    ? await prisma.user.findMany({ where: { companyId: user.companyId }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, role: true, active: true, canOrderDirectly: true, approverId: true } })
    : [];
  const locations = user.companyId
    ? await prisma.deliveryLocation.findMany({ where: { companyId: user.companyId }, orderBy: [{ isDefault: "desc" }, { label: "asc" }], select: { id: true, label: true, street: true, zip: true, city: true, isDefault: true } })
    : [];
  const isAdmin = user.role === "CUSTOMER_ADMIN";

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
          <Row label="Cenová úroveň" value={company?.priceTier ? `${company.priceTier.code} — ${company.priceTier.name}` : "—"} />
          <Row label="Splatnosť faktúr" value={company ? `${company.splatDays} dní` : "—"} />
        </div>
        <div className="border-t border-line px-6 py-3.5 text-[12.5px] text-muted-2">
          Názov, IČO alebo DIČ treba zmeniť? Napíšte nám na <a href="mailto:obchod@moonid.sk" className="font-medium text-brand hover:text-brand-2">obchod@moonid.sk</a>.
        </div>
      </section>

      {/* adresy */}
      {company && <AddressManager isAdmin={isAdmin} billing={{ street: company.address ?? null, zip: company.zip ?? null, city: company.city ?? null }} locations={locations} />}

      {/* používatelia + práva */}
      {company && <MemberManager isAdmin={isAdmin} members={users} currentUserId={user.id} />}

      <GdprSection />
    </div>
  );
}
