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
  return (
    <div className="max-w-[940px]">
      <CartView cart={cart} />
    </div>
  );
}
