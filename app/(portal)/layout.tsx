import { requireUser } from "@/lib/auth";
import { getCartCount } from "@/lib/cart";
import { PortalShell } from "@/components/portal/portal-shell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const cartCount = user.companyId ? await getCartCount(user.companyId) : 0;
  return (
    <PortalShell
      companyName={user.company?.name ?? "Moonid"}
      email={user.email}
      tierCode={user.company?.priceTier?.code ?? null}
      cartCount={cartCount}
    >
      {children}
    </PortalShell>
  );
}
