"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { nextStatus, canCancel, type OrderStatus } from "@/lib/orders/transition";
import { emailOrderStatus } from "@/lib/email";
import { writeAudit } from "@/lib/audit";
import { z } from "zod";

const ID = z.string().min(1).max(100);

function revalidate(orderId: string) {
  revalidatePath(`/staff/objednavky/${orderId}`);
  revalidatePath("/staff/objednavky");
  revalidatePath("/staff");
}

/** Posunie objednávku o jeden stav vpred (PRIJATA→POTVRDENA→…→DORUCENA). Iba STAFF. */
export async function advanceOrder(orderId: string): Promise<{ ok: boolean; error?: string; status?: OrderStatus }> {
  const staff = await requireStaff();
  if (!ID.safeParse(orderId).success) return { ok: false, error: "Neplatný vstup." };
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, status: true, number: true, createdBy: { select: { email: true } } } });
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
  await writeAudit({ userId: staff.id, action: "ORDER_STATUS", entity: "Order", entityId: order.id, meta: { number: order.number, from, to } });
  if (order.createdBy?.email) await emailOrderStatus({ to: order.createdBy.email, number: order.number, status: to });
  revalidate(order.id);
  return { ok: true, status: to };
}

/** Stornuje objednávku (kým nie je na ceste/doručená). Iba STAFF. */
export async function cancelOrder(orderId: string, reason?: string): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireStaff();
  if (!ID.safeParse(orderId).success) return { ok: false, error: "Neplatný vstup." };
  const cleanReason = reason?.trim().slice(0, 500) || null;
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, status: true, number: true, createdBy: { select: { email: true } } } });
  if (!order) return { ok: false, error: "Objednávka neexistuje." };

  const from = order.status as OrderStatus;
  if (!canCancel(from)) return { ok: false, error: "Túto objednávku už nemožno stornovať." };

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: order.id }, data: { status: "STORNO" } });
    await tx.orderStatusEvent.create({ data: { orderId: order.id, status: "STORNO", source: "PORTAL", changedById: staff.id, note: cleanReason } });
  });
  await writeAudit({ userId: staff.id, action: "ORDER_CANCEL", entity: "Order", entityId: order.id, meta: { number: order.number, from, reason: cleanReason } });
  if (order.createdBy?.email) await emailOrderStatus({ to: order.createdBy.email, number: order.number, status: "STORNO", note: cleanReason });
  revalidate(order.id);
  return { ok: true };
}
