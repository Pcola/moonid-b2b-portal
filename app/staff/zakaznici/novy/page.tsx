import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewCustomerForm } from "./new-customer-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff · Nový zákazník", robots: { index: false, follow: false } };

export default async function NewCustomerPage() {
  await requireStaff();
  const tiers = await prisma.priceTier.findMany({ orderBy: { code: "asc" }, select: { code: true, name: true, discountPct: true } });
  return (
    <div className="flex max-w-[760px] flex-col gap-5">
      <Link href="/staff/zakaznici" className="text-[13.5px] font-medium text-muted transition hover:text-ink">← Zákazníci</Link>
      <NewCustomerForm tiers={tiers.map((t) => ({ code: t.code, name: t.name, discountPct: Number(t.discountPct) }))} />
    </div>
  );
}
