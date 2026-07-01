import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { MethodsEditor } from "./methods-editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Doprava a platba — Moonid", robots: { index: false, follow: false } };

export default async function DopravaPlatbaPage() {
  await requireStaff();
  const [delivery, payment] = await Promise.all([
    prisma.deliveryMethod.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.paymentMethod.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <MethodsEditor
      delivery={delivery.map((d) => ({
        code: d.code, label: d.label, description: d.description, enabled: d.enabled,
        requiresAddress: d.requiresAddress, flatFee: Number(d.flatFee),
        freeThreshold: d.freeThreshold != null ? Number(d.freeThreshold) : null,
      }))}
      payment={payment.map((p) => ({ code: p.code, label: p.label, description: p.description, enabled: p.enabled, surcharge: Number(p.surcharge) }))}
    />
  );
}
