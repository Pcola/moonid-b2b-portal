import "server-only";
import { prisma } from "@/lib/prisma";

// Štandardná sadzba DPH na dopravu/služby (SK). Dráha/príplatok sa zdaňujú touto sadzbou.
export const SHIPPING_VAT_RATE = 23;

function r2(n: number) { return Math.round(n * 100) / 100; }

export type DeliveryMethodView = {
  code: string; label: string; description: string | null;
  requiresAddress: boolean; flatFee: number; freeThreshold: number | null;
};
export type PaymentMethodView = {
  code: string; label: string; description: string | null; surcharge: number;
};

export async function getEnabledDeliveryMethods(): Promise<DeliveryMethodView[]> {
  const rows = await prisma.deliveryMethod.findMany({ where: { enabled: true }, orderBy: { sortOrder: "asc" } });
  return rows.map((m) => ({
    code: m.code, label: m.label, description: m.description, requiresAddress: m.requiresAddress,
    flatFee: Number(m.flatFee), freeThreshold: m.freeThreshold != null ? Number(m.freeThreshold) : null,
  }));
}

export async function getEnabledPaymentMethods(): Promise<PaymentMethodView[]> {
  const rows = await prisma.paymentMethod.findMany({ where: { enabled: true }, orderBy: { sortOrder: "asc" } });
  return rows.map((m) => ({ code: m.code, label: m.label, description: m.description, surcharge: Number(m.surcharge) }));
}

/** Doprava netto pre metódu a hodnotu tovaru (netto): zdarma nad prahom, inak paušál. */
export function shippingFor(m: { flatFee: number; freeThreshold: number | null }, itemsNet: number): number {
  if (m.freeThreshold != null && itemsNet >= m.freeThreshold) return 0;
  return r2(m.flatFee);
}

/**
 * Server-side AUTORITA pre poplatky objednávky (jediný zdroj pravdy — používa createOrder,
 * placeRepeatOrder aj staff updateOrder). Overí, že zvolené metódy sú enabled; ak kód chýba/je
 * neplatný, padne na prvú enabled metódu. Vráti poplatky netto + ich DPH.
 */
export async function resolveOrderCharges(input: { deliveryCode?: string | null; paymentCode?: string | null; itemsNet: number }): Promise<{
  delivery: { code: string; label: string; requiresAddress: boolean } | null;
  payment: { code: string; label: string } | null;
  shippingFee: number;
  paymentSurcharge: number;
  extrasVat: number;
}> {
  const [dels, pays] = await Promise.all([getEnabledDeliveryMethods(), getEnabledPaymentMethods()]);
  const del = dels.find((d) => d.code === input.deliveryCode) ?? dels[0] ?? null;
  const pay = pays.find((p) => p.code === input.paymentCode) ?? pays[0] ?? null;
  const shippingFee = del ? shippingFor(del, input.itemsNet) : 0;
  const paymentSurcharge = pay ? r2(pay.surcharge) : 0;
  const extrasVat = r2((shippingFee + paymentSurcharge) * (SHIPPING_VAT_RATE / 100));
  return {
    delivery: del ? { code: del.code, label: del.label, requiresAddress: del.requiresAddress } : null,
    payment: pay ? { code: pay.code, label: pay.label } : null,
    shippingFee, paymentSurcharge, extrasVat,
  };
}
