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

  let raced = false;
  await prisma.$transaction(async (tx) => {
    // optimistic lock: posuň len ak je stav STÁLE 'from' (anti dvojklik / súbeh 2 staffov)
    const res = await tx.order.updateMany({
      where: { id: order.id, status: from },
      data: { status: to, ...(to === "POTVRDENA" ? { confirmedAt: new Date() } : {}) },
    });
    if (res.count === 0) { raced = true; return; }
    await tx.orderStatusEvent.create({ data: { orderId: order.id, status: to, source: "PORTAL", changedById: staff.id } });
  });
  if (raced) return { ok: false, error: "Stav objednávky sa medzitým zmenil — obnovte stránku." };
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

  let raced = false;
  await prisma.$transaction(async (tx) => {
    const res = await tx.order.updateMany({ where: { id: order.id, status: from }, data: { status: "STORNO" } });
    if (res.count === 0) { raced = true; return; }
    await tx.orderStatusEvent.create({ data: { orderId: order.id, status: "STORNO", source: "PORTAL", changedById: staff.id, note: cleanReason } });
  });
  if (raced) return { ok: false, error: "Stav objednávky sa medzitým zmenil — obnovte stránku." };
  await writeAudit({ userId: staff.id, action: "ORDER_CANCEL", entity: "Order", entityId: order.id, meta: { number: order.number, from, reason: cleanReason } });
  if (order.createdBy?.email) await emailOrderStatus({ to: order.createdBy.email, number: order.number, status: "STORNO", note: cleanReason });
  revalidate(order.id);
  return { ok: true };
}

function r2(n: number) { return Math.round(n * 100) / 100; }
function canEditOrder(s: OrderStatus) { return s === "PRIJATA" || s === "POTVRDENA"; }

const editSchema = z.object({
  items: z.array(z.object({ itemId: z.string().min(1).max(100), qty: z.coerce.number().int().min(0).max(9999) })).max(500),
  note: z.string().trim().max(2000).nullable().optional(),
  deliveryLocationId: z.string().max(100).nullable().optional(),
});

/** Úprava objednávky staffom (korekcia po prijatí): množstvá, odobratie položiek, dodacia adresa,
 *  poznámka. Iba v raných stavoch (PRIJATA/POTVRDENA). Ceny ostávajú zo snapshotu (dohodnutá cena);
 *  prepočítajú sa len sumy. Aspoň 1 položka musí ostať. */
export async function updateOrder(orderId: string, input: z.input<typeof editSchema>): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireStaff();
  if (!ID.safeParse(orderId).success) return { ok: false, error: "Neplatný vstup." };
  const parsed = editSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Neplatný vstup." };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true, status: true, companyId: true, note: true, deliveryLocationId: true, number: true,
      items: { select: { id: true, unitPriceSnapshot: true, qty: true, product: { select: { vatRate: true } } } },
    },
  });
  if (!order) return { ok: false, error: "Objednávka neexistuje." };
  if (!canEditOrder(order.status as OrderStatus)) return { ok: false, error: "Objednávku v tomto stave už nemožno upraviť." };

  const qtyMap = new Map(parsed.data.items.map((i) => [i.itemId, i.qty]));
  const effQty = (it: { id: string; qty: unknown }) => (qtyMap.has(it.id) ? qtyMap.get(it.id)! : Math.floor(Number(it.qty)));
  const keep = order.items.filter((it) => effQty(it) > 0);
  if (keep.length === 0) return { ok: false, error: "Objednávka musí mať aspoň jednu položku." };
  const removeIds = order.items.filter((it) => effQty(it) <= 0).map((it) => it.id);

  // dodacia adresa (IDOR: musí patriť firme objednávky)
  let deliveryLocationId = order.deliveryLocationId;
  if (parsed.data.deliveryLocationId !== undefined) {
    if (parsed.data.deliveryLocationId) {
      const loc = await prisma.deliveryLocation.findFirst({ where: { id: parsed.data.deliveryLocationId, companyId: order.companyId }, select: { id: true } });
      if (!loc) return { ok: false, error: "Neplatná dodacia adresa." };
      deliveryLocationId = loc.id;
    } else deliveryLocationId = null;
  }

  let subtotal = 0, vat = 0;
  const updates = keep.map((it) => {
    const q = effQty(it);
    const net = Number(it.unitPriceSnapshot);
    const line = r2(net * q);
    const vr = Number(it.product?.vatRate ?? 23);
    const grossUnit = r2(net * (1 + vr / 100)); // rovnaká metóda ako createOrder (zaokr. gross/kus)
    subtotal += line;
    vat += r2((grossUnit - net) * q);
    return { id: it.id, qty: q, lineTotal: line };
  });
  subtotal = r2(subtotal); vat = r2(vat);
  const total = r2(subtotal + vat);

  await prisma.$transaction(async (tx) => {
    if (removeIds.length) await tx.orderItem.deleteMany({ where: { id: { in: removeIds }, orderId } });
    for (const u of updates) await tx.orderItem.update({ where: { id: u.id }, data: { qty: u.qty, lineTotal: u.lineTotal } });
    await tx.order.update({
      where: { id: orderId },
      data: { subtotal, vat, total, deliveryLocationId, note: parsed.data.note !== undefined ? (parsed.data.note?.trim().slice(0, 2000) || null) : order.note },
    });
  });

  await writeAudit({ userId: staff.id, action: "ORDER_EDIT", entity: "Order", entityId: orderId, meta: { number: order.number, total, items: updates.length, removed: removeIds.length } });
  revalidate(order.id);
  return { ok: true };
}
