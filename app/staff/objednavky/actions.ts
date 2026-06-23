"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { nextStatus, canCancel, type OrderStatus } from "@/lib/orders/transition";

function revalidate(orderId: string) {
  revalidatePath(`/staff/objednavky/${orderId}`);
  revalidatePath("/staff/objednavky");
  revalidatePath("/staff");
}

/** Posunie objednávku o jeden stav vpred (PRIJATA→POTVRDENA→…→DORUCENA). Iba STAFF. */
export async function advanceOrder(orderId: string): Promise<{ ok: boolean; error?: string; status?: OrderStatus }> {
  const staff = await requireStaff();
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, status: true, number: true } });
  if (!order) return { ok: false, error: "Objednávka neexistuje." };

  const from = order.status as OrderStatus;
  const to = nextStatus(from);
  if (!to) return { ok: false, error: "Objednávka je už vo finálnom stave." };

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: to, ...(to === "POTVRDENA" ? { confirmedAt: new Date() } : {}) },
    });
    await tx.orderStatusEvent.create({ data: { orderId: order.id, status: to, source: "PORTAL", changedById: staff.id } });
  });
  await prisma.auditLog.create({ data: { userId: staff.id, action: "ORDER_STATUS", entity: "Order", entityId: order.id, meta: { number: order.number, from, to } } });
  // TODO: Resend notifikácia zákazníkovi o zmene stavu (čaká na overenú doménu)
  revalidate(order.id);
  return { ok: true, status: to };
}

/** Stornuje objednávku (kým nie je na ceste/doručená). Iba STAFF. */
export async function cancelOrder(orderId: string, reason?: string): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireStaff();
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, status: true, number: true } });
  if (!order) return { ok: false, error: "Objednávka neexistuje." };

  const from = order.status as OrderStatus;
  if (!canCancel(from)) return { ok: false, error: "Túto objednávku už nemožno stornovať." };

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: order.id }, data: { status: "STORNO" } });
    await tx.orderStatusEvent.create({ data: { orderId: order.id, status: "STORNO", source: "PORTAL", changedById: staff.id, note: reason?.trim() || null } });
  });
  await prisma.auditLog.create({ data: { userId: staff.id, action: "ORDER_CANCEL", entity: "Order", entityId: order.id, meta: { number: order.number, from, reason: reason?.trim() || null } } });
  revalidate(order.id);
  return { ok: true };
}
