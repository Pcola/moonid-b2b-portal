// Integračný test najkomplexnejšej logiky — createOrder (peniaze + číslovanie + snapshoty +
// anti-duplicita). Auth/email/audit/next-cache mockujeme; pricing beží reálne proti DB.
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/audit", () => ({ writeAudit: vi.fn().mockResolvedValue(undefined) }));
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
let companyId = "";

async function cleanup() {
  await prisma.orderStatusEvent.deleteMany({ where: { order: { company: { ico: ICO } } } });
  await prisma.orderItem.deleteMany({ where: { order: { company: { ico: ICO } } } });
  await prisma.order.deleteMany({ where: { company: { ico: ICO } } });
  await prisma.cartItem.deleteMany({ where: { cart: { company: { ico: ICO } } } });
  await prisma.cart.deleteMany({ where: { company: { ico: ICO } } });
  await prisma.deliveryLocation.deleteMany({ where: { company: { ico: ICO } } });
  await prisma.user.deleteMany({ where: { authId: "zzorder-user" } });
  await prisma.company.deleteMany({ where: { ico: ICO } });
  await prisma.product.deleteMany({ where: { sku: SKU } });
  await prisma.priceTier.deleteMany({ where: { code: TIER } });
}

beforeAll(async () => {
  await cleanup();
  const tier = await prisma.priceTier.create({ data: { code: TIER, name: "OrdTest", discountPct: 0 } });
  const product = await prisma.product.create({ data: { sku: SKU, name: "Ord test produkt", vatRate: 23, basePrice: 10, isPublished: true, isStocked: true, stockCache: 100, stockSyncedAt: new Date() } });
  const company = await prisma.company.create({ data: { ico: ICO, name: "Ord Test sro", priceTierId: tier.id } });
  companyId = company.id;
  const user = await prisma.user.create({ data: { authId: "zzorder-user", email: "zzorder@test.invalid", role: "CUSTOMER_ADMIN", companyId: company.id } });
  const cart = await prisma.cart.create({ data: { companyId: company.id, createdById: user.id } });
  await prisma.cartItem.create({ data: { cartId: cart.id, productId: product.id, qty: 2 } });

  vi.mocked(requireUser).mockResolvedValue({
    id: user.id, email: user.email, role: "CUSTOMER_ADMIN", companyId: company.id, active: true,
    company: { name: company.name, priceTier: { code: TIER } },
  } as never);
});

afterAll(async () => { await cleanup(); await prisma.$disconnect(); });

describe("createOrder — objednávka z košíka", () => {
  it("vytvorí objednávku: číslo WEB-RRRR-NNNNN, správne sumy, snapshoty, vyprázdni košík", async () => {
    const res = await createOrder({ note: "test poznámka" });
    expect(res.ok).toBe(true);
    expect(res.number).toMatch(/^WEB-\d{4}-\d{5}$/);

    const order = await prisma.order.findFirst({ where: { companyId, number: res.number }, include: { items: true } });
    expect(order).not.toBeNull();
    expect(Number(order!.subtotal)).toBe(20);    // 10 × 2
    expect(Number(order!.vat)).toBe(4.6);         // (12.3 − 10) × 2
    expect(Number(order!.total)).toBe(24.6);
    expect(order!.status).toBe("PRIJATA");
    expect(order!.items).toHaveLength(1);
    expect(order!.items[0].nameSnapshot).toBe("Ord test produkt");
    expect(Number(order!.items[0].qty)).toBe(2);
    expect(Number(order!.items[0].unitPriceSnapshot)).toBe(10);

    const remaining = await prisma.cartItem.count({ where: { cart: { companyId } } });
    expect(remaining).toBe(0); // delete-first guard vyprázdnil košík
  });

  it("druhé volanie s prázdnym košíkom → ok:false (žiadna duplicitná objednávka)", async () => {
    const res = await createOrder({ note: "x" });
    expect(res.ok).toBe(false);
    const count = await prisma.order.count({ where: { companyId } });
    expect(count).toBe(1); // stále len jedna objednávka
  });
});
