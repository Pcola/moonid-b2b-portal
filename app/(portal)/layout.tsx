import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCartCount } from "@/lib/cart";
import { prisma } from "@/lib/prisma";
import { PortalShell } from "@/components/portal/portal-shell";
import { ToastProvider } from "@/components/portal/toast";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // Staff/admin nepatrí do zákazníckeho portálu (nemá firmu) → administrácia.
  if (user.role === "STAFF" || user.role === "ADMIN") redirect("/staff");
  const cartCount = user.companyId ? await getCartCount(user.companyId, user.id) : 0;
  // Objednávky čakajúce na schválenie: správca vidí celofiremné, bežný člen len svoje →
  // badge v navigácii upozorní, že niečo visí (e-maily sú best-effort/blokované).
  const pendingApproval = user.companyId
    ? await prisma.order.count({
        where: {
          companyId: user.companyId,
          status: "CAKA_SCHVALENIE",
          ...(user.role === "CUSTOMER_ADMIN" ? {} : { createdById: user.id }),
        },
      })
    : 0;
  return (
    <PortalShell
      companyName={user.company?.name ?? "Moonid"}
      userName={user.name ?? null}
      email={user.email}
      tierCode={user.company?.priceTier?.code ?? null}
      cartCount={cartCount}
      pendingApproval={pendingApproval}
      isAdmin={user.role === "CUSTOMER_ADMIN"}
    >
      <ToastProvider>{children}</ToastProvider>
    </PortalShell>
  );
}
