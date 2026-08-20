// Integračný test najkomplexnejšej logiky — createOrder (peniaze + číslovanie + snapshoty +
// anti-duplicita). Auth/email/audit/next-cache mockujeme; pricing beží reálne proti DB.
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/audit", () => ({
  writeAudit: vi.fn().mockResolvedValue(undefined),
  writeAuditRequired: vi.fn().mockResolvedValue(undefined),
  auditRequestContext: vi.fn().mockResolvedValue({ ipHash: null, userAgent: null }),
}));
vi.mock("@/lib/email", () => ({
  emailNewOrderToStaff: vi.fn().mockResolvedValue(undefined),
  emailOrderConfirmation: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createOrder } from "@/app/(portal)/kosik/actions";
import { requireUser } from "@/lib/auth";

const prisma = new PrismaClient();
const ICO = "ZZORDER1";
const TIER = "ZZORD";
const SKU = "ZZORD-PROD";
const SKU_BACK = "ZZORD-BACK"; // skladom, ale nedostatok → backorder
const SKU_REQ = "ZZORD-REQ";   // dotovaný → cena na vyžiadanie
let companyId = "";
let cartId = "";

async function cleanup() {
  await prisma.orderStatusEvent.deleteMany({ where: { order: { company: { ico: ICO } } } });
  await prisma.orderItem.deleteMany({ where: { order: { company: { ico: ICO } } } });
  await prisma.order.deleteMany({ where: { company: { ico: ICO } } });
  await prisma.cartItem.deleteMany({ where: { cart: { company: { ico: ICO } } } });
  await prisma.cart.deleteMany({ where: { company: { ico: ICO } } });
  await prisma.deliveryLocation.deleteMany({ where: { company: { ico: ICO } } });
  await prisma.user.deleteMany({ where: { authId: "zzorder-user" } });
  await prisma.company.deleteMany({ where: { ico: ICO } });
  await prisma.product.deleteMany({ where: { sku: { in: [SKU, SKU_BACK, SKU_REQ] } } });
  await prisma.priceTier.deleteMany({ where: { code: TIER } });
}

beforeAll(async () => {
  await cleanup();
  const tier = await prisma.priceTier.create({ data: { code: TIER, name: "OrdTest", discountPct: 0 } });
  const product = await prisma.product.create({ data: { sku: SKU, name: "Ord test produkt", vatRate: 23, basePrice: 10, isPublished: true, isStocked: true, stockCache: 100, stockSyncedAt: new Date() } });
  const company = await prisma.company.create({ data: { ico: ICO, name: "Ord Test sro", dic: "2020000001", address: "Testovacia 1", city: "Bratislava", zip: "811 01", priceTierId: tier.id } });
  companyId = company.id;
  const user = await prisma.user.create({ data: { authId: "zzorder-user", email: "zzorder@test.invalid", role: "CUSTOMER_ADMIN", companyId: company.id } });
  const cart = await prisma.cart.create({ data: { companyId: company.id, createdById: user.id } });
  cartId = cart.id;
  await prisma.cartItem.create({ data: { cartId: cart.id, productId: product.id, qty: 2 } });
  // produkt skladom ale s nedostatočnou zásobou (stockCache 1) → objednávka qty 2 = backorder
  await prisma.product.create({ data: { sku: SKU_BACK, name: "Ord backorder produkt", vatRate: 23, basePrice: 10, isPublished: true, isStocked: true, stockCache: 1, stockSyncedAt: new Date() } });
  // dotovaný produkt → resolveUnitPrice vráti ON_REQUEST (nedá sa objednať online)
  await prisma.product.create({ data: { sku: SKU_REQ, name: "Ord na vyžiadanie", vatRate: 23, basePrice: 10, isSubsidized: true, isPublished: true, isStocked: true, stockCache: 100, stockSyncedAt: new Date() } });

  vi.mocked(requireUser).mockResolvedValue({
    id: user.id, email: user.email, role: "CUSTOMER_ADMIN", companyId: company.id, active: true, canOrderDirectly: true,
    company: { name: company.name, ico: company.ico, dic: company.dic, icDph: company.icDph, address: company.address, city: company.city, zip: company.zip, splatDays: company.splatDays, priceTier: { code: TIER } },
  } as never);
});

afterAll(async () => { await cleanup(); await prisma.$disconnect(); });

describe("createOrder — objednávka z košíka", () => {
  it("vytvorí objednávku: číslo WEB-RRRR-NNNNN, správne sumy, snapshoty, vyprázdni košík", async () => {
    // osobný odber + faktúra → bez poplatku a bez adresy: sumy ostávajú položkové
    const res = await createOrder({ note: "test poznámka", deliveryCode: "odber", paymentCode: "faktura", termsAccepted: true });
    expect(res.ok).toBe(true);
    expect(res.number).toMatch(/^WEB-\d{4}-\d{5}$/);

    const order = await prisma.order.findFirst({ where: { companyId, number: res.number }, include: { items: true } });
    expect(order).not.toBeNull();
    expect(Number(order!.subtotal)).toBe(20);    // 10 × 2
    expect(Number(order!.vat)).toBe(4.6);         // (12.3 − 10) × 2
    expect(Number(order!.total)).toBe(24.6);
    expect(order!.status).toBe("PRIJATA");
    expect(order!.currency).toBe("EUR");
    expect(order!.termsAcknowledgedAt).not.toBeNull();
    expect(order!.termsSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(order!.buyerSnapshot).toMatchObject({ ico: ICO, address: "Testovacia 1" });
    expect(order!.items).toHaveLength(1);
    expect(order!.items[0].nameSnapshot).toBe("Ord test produkt");
    expect(Number(order!.items[0].qty)).toBe(2);
    expect(Number(order!.items[0].unitPriceSnapshot)).toBe(10);

    const remaining = await prisma.cartItem.count({ where: { cart: { companyId } } });
    expect(remaining).toBe(0); // delete-first guard vyprázdnil košík
  });

  it("druhé volanie s prázdnym košíkom → ok:false (žiadna duplicitná objednávka)", async () => {
    const res = await createOrder({ note: "x", termsAccepted: true });
    expect(res.ok).toBe(false);
    const count = await prisma.order.count({ where: { companyId } });
    expect(count).toBe(1); // stále len jedna objednávka
  });
});

describe("createOrder — vetvy dostupnosti a súbeh", () => {
  const resetCart = () => prisma.cartItem.deleteMany({ where: { cartId } });
  const bySku = (sku: string) => prisma.product.findUniqueOrThrow({ where: { sku } });

  it("backorder: nedostatok skladu → hasBackorder + fulfillment NA_OBJEDNAVKU", async () => {
    await resetCart();
    const p = await bySku(SKU_BACK); // stockCache 1
    await prisma.cartItem.create({ data: { cartId, productId: p.id, qty: 2 } }); // 2 > 1 → backorder
    const res = await createOrder({ deliveryCode: "odber", paymentCode: "faktura", termsAccepted: true });
    expect(res.ok).toBe(true);
    const order = await prisma.order.findFirst({ where: { companyId, number: res.number }, include: { items: true } });
    expect(order!.hasBackorder).toBe(true);
    expect(order!.items[0].fulfillment).toBe("NA_OBJEDNAVKU");
  });

  it("položka na vyžiadanie v košíku → ok:false a košík ostáva (nedá sa objednať online)", async () => {
    await resetCart();
    const p = await bySku(SKU_REQ); // dotovaný → ON_REQUEST
    await prisma.cartItem.create({ data: { cartId, productId: p.id, qty: 1 } });
    const res = await createOrder({ deliveryCode: "odber", paymentCode: "faktura", termsAccepted: true });
    expect(res.ok).toBe(false);
    const items = await prisma.cartItem.count({ where: { cartId } });
    expect(items).toBe(1); // objednávka nevznikla → košík sa nevyprázdnil
  });

  it("súbeh: dve paralelné createOrder na jednom košíku → práve jedna objednávka (delete-first guard)", async () => {
    await resetCart();
    const p = await bySku(SKU);
    await prisma.cartItem.create({ data: { cartId, productId: p.id, qty: 1 } });
    const before = await prisma.order.count({ where: { companyId } });
    const [a, b] = await Promise.all([
      createOrder({ deliveryCode: "odber", paymentCode: "faktura", termsAccepted: true }),
      createOrder({ deliveryCode: "odber", paymentCode: "faktura", termsAccepted: true }),
    ]);
    expect([a, b].filter((r) => r.ok).length).toBe(1); // len jedna prejde cez CAS deleteMany
    const after = await prisma.order.count({ where: { companyId } });
    expect(after).toBe(before + 1); // vznikla práve jedna nová objednávka
  });
});
