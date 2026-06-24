import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCartDetail } from "@/lib/cart";
import { CartView } from "./cart-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Košík — Moonid portál", robots: { index: false, follow: false } };

export default async function KosikPage() {
  const user = await requireUser();
  const tierCode = user.company?.priceTier?.code ?? null;
  const discountPct = tierCode
    ? Number((await prisma.priceTier.findUnique({ where: { code: tierCode }, select: { discountPct: true } }))?.discountPct ?? 0)
    : 0;
  const cart = await getCartDetail(user.companyId ?? "__none__", tierCode, discountPct);
  const locations = user.companyId
    ? await prisma.deliveryLocation.findMany({
        where: { companyId: user.companyId },
        orderBy: [{ isDefault: "desc" }, { label: "asc" }],
        select: { id: true, label: true, street: true, city: true, zip: true },
      })
    : [];
  const billing = user.company
    ? { name: user.company.name, ico: user.company.ico, address: user.company.address, city: user.company.city }
    : null;
  return (
    <div className="max-w-[940px]">
      <CartView cart={cart} locations={locations} billing={billing} />
    </div>
  );
}
