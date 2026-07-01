"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { emailNewOrderToStaff, emailOrderDecision } from "@/lib/email";

const ID = z.string().min(1).max(100);

/** Kto smie schváliť/zamietnuť objednávku čakajúcu na schválenie: určený schvaľovateľ jej tvorcu,
 *  alebo správca firmy (CUSTOMER_ADMIN). Vždy len v rámci vlastnej firmy. */
async function loadForApproval(orderId: string) {
  const user = await requireUser();
  if (!user.companyId) return { error: "Konto nie je priradené k firme." as string };
  if (!ID.safeParse(orderId).success) return { error: "Neplatný vstup." };
  const order = await prisma.order.findFirst({
    where: { id: orderId, companyId: user.companyId }, // IDOR: len vlastná firma
    select: {
      id: true, status: true, number: true, total: true,
      createdBy: { select: { email: true, approverId: true } },
      company: { select: { name: true } },
      _count: { select: { items: true } },
    },
  });
  if (!order) return { error: "Objednávka neexistuje." };
  if (order.status !== "CAKA_SCHVALENIE") return { error: "Táto objednávka už nie je na schválenie." };
  const canApprove = user.role === "CUSTOMER_ADMIN" || order.createdBy.approverId === user.id;
  if (!canApprove) return { error: "Nemáte oprávnenie schvaľovať túto objednávku." };
  return { user, order };
}

/** Schváli objednávku → PRIJATÁ (vstúpi do bežného toku, staff dostane notifikáciu). */
export async function approveOrder(orderId: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await loadForApproval(orderId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const { user, order } = ctx;
  // anti-súbeh: prejde len ak je stále CAKA_SCHVALENIE (dvaja schvaľovatelia naraz → jeden vyhrá)
  const res = await prisma.order.updateMany({ where: { id: orderId, status: "CAKA_SCHVALENIE" }, data: { status: "PRIJATA" } });
  if (res.count === 0) return { ok: false, error: "Objednávka už bola medzičasom spracovaná." };
  await prisma.orderStatusEvent.create({ data: { orderId, status: "PRIJATA", source: "PORTAL", changedById: user.id } });
  await writeAudit({ userId: user.id, companyId: user.companyId, action: "ORDER_APPROVE", entity: "Order", entityId: orderId, meta: { number: order.number } });
  // až teraz ide objednávka staffu (pri vytvorení sa e-mail zámerne odložil) + zadávateľovi info o schválení
  await Promise.allSettled([
    emailNewOrderToStaff({ number: order.number, companyName: order.company.name, customerEmail: order.createdBy.email, total: Number(order.total), itemCount: order._count.items }),
    emailOrderDecision({ to: order.createdBy.email, number: order.number, approved: true }),
  ]);
  revalidatePath("/objednavky");
  revalidatePath(`/objednavky/${orderId}`);
  return { ok: true };
}

/** Zamietne objednávku → STORNO (nejde staffu). Voliteľný dôvod sa zapíše do histórie. */
export async function rejectOrder(orderId: string, reason?: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await loadForApproval(orderId);
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const { user, order } = ctx;
  const res = await prisma.order.updateMany({ where: { id: orderId, status: "CAKA_SCHVALENIE" }, data: { status: "STORNO" } });
  if (res.count === 0) return { ok: false, error: "Objednávka už bola medzičasom spracovaná." };
  const note = (reason ?? "").trim().slice(0, 500) || null;
  await prisma.orderStatusEvent.create({ data: { orderId, status: "STORNO", source: "PORTAL", changedById: user.id, note } });
  await writeAudit({ userId: user.id, companyId: user.companyId, action: "ORDER_REJECT", entity: "Order", entityId: orderId, meta: { number: order.number, reason: note } });
  // zadávateľ sa dozvie výsledok e-mailom (predtým to zistil len otvorením detailu)
  await Promise.allSettled([
    emailOrderDecision({ to: order.createdBy.email, number: order.number, approved: false, note }),
  ]);
  revalidatePath("/objednavky");
  revalidatePath(`/objednavky/${orderId}`);
  return { ok: true };
}
