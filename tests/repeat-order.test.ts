// Integračný test opakovania objednávky s doobjednaním (RepeatDraftItem staging, oddelený od košíka).
// Overuje: merge zdroj+draft, RE-pricing z aktuálnych cien (nie zo snapshotu), vyčistenie draftu,
// IZOLÁCIU košíka (zabudnutý tovar v košíku NEpretečie do opakovania), IDOR a per-user draft.
// Auth/audit/email/next-cache/next-navigation mockujeme; pricing + DB bežia reálne.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

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
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { placeRepeatOrder, removeRepeatDraftItem, startRepeat } from "@/app/(portal)/kosik/actions";
import { requireUser } from "@/lib/auth";

const prisma = new PrismaClient();
const ICO = "ZZREP1";
const TIER = "ZZREP";
const SKU1 = "ZZREP-P1", SKU2 = "ZZREP-P2", SKU3 = "ZZREP-P3";
let companyId = "", userAId = "", userBId = "", p1 = "", p2 = "", p3 = "", sourceOrderId = "", cartId = "";

async function cleanup() {
  await prisma.orderStatusEvent.deleteMany({ where: { order: { company: { ico: ICO } } } });
  await prisma.orderItem.deleteMany({ where: { order: { company: { ico: ICO } } } });
  await prisma.order.deleteMany({ where: { company: { ico: ICO } } });
  await prisma.repeatDraftItem.deleteMany({ where: { user: { company: { ico: ICO } } } });
  await prisma.cartItem.deleteMany({ where: { cart: { company: { ico: ICO } } } });
  await prisma.cart.deleteMany({ where: { company: { ico: ICO } } });
  await prisma.user.deleteMany({ where: { authId: { in: ["zzrep-userA", "zzrep-userB"] } } });
  await prisma.company.deleteMany({ where: { ico: ICO } });
  await prisma.product.deleteMany({ where: { sku: { in: [SKU1, SKU2, SKU3] } } });
  await prisma.priceTier.deleteMany({ where: { code: TIER } });
}

function asUserA() {
  vi.mocked(requireUser).mockResolvedValue({
    id: userAId, email: "zzrep-a@test.invalid", role: "CUSTOMER_ADMIN", companyId, active: true, canOrderDirectly: true,
    company: { name: "Rep Test sro", ico: ICO, dic: "2020000002", icDph: null, address: "Testovacia 2", city: "Bratislava", zip: "811 01", splatDays: 14, priceTier: { code: TIER } },
  } as never);
}

beforeAll(async () => {
  await cleanup();
  const tier = await prisma.priceTier.create({ data: { code: TIER, name: "RepTest", discountPct: 10 } });
  const pr1 = await prisma.product.create({ data: { sku: SKU1, name: "Rep P1", vatRate: 23, basePrice: 10, isPublished: true, isStocked: true, stockCache: 100, stockSyncedAt: new Date() } });
  const pr2 = await prisma.product.create({ data: { sku: SKU2, name: "Rep P2", vatRate: 23, basePrice: 20, isPublished: true } });
  const pr3 = await prisma.product.create({ data: { sku: SKU3, name: "Rep P3 (kosik)", vatRate: 23, basePrice: 5, isPublished: true } });
  p1 = pr1.id; p2 = pr2.id; p3 = pr3.id;
  const company = await prisma.company.create({ data: { ico: ICO, name: "Rep Test sro", dic: "2020000002", address: "Testovacia 2", city: "Bratislava", zip: "811 01", priceTierId: tier.id } });
  companyId = company.id;
  const ua = await prisma.user.create({ data: { authId: "zzrep-userA", email: "zzrep-a@test.invalid", role: "CUSTOMER_ADMIN", companyId } });
  const ub = await prisma.user.create({ data: { authId: "zzrep-userB", email: "zzrep-b@test.invalid", role: "CUSTOMER_USER", companyId } });
  userAId = ua.id; userBId = ub.id;

  // zdrojová objednávka: P1 ×2, ale s BOGUS unitPriceSnapshot 99 (na dôkaz re-pricingu)
  const src = await prisma.order.create({
    data: {
      number: "WEB-9999-90001", companyId, createdById: userAId, status: "PRIJATA", pohodaSync: "LOKALNA", priceTierCode: TIER,
      subtotal: 198, vat: 0, total: 198,
      items: { create: { productId: p1, skuSnapshot: SKU1, nameSnapshot: "Rep P1", unitPriceSnapshot: 99, qty: 2, lineTotal: 198, fulfillment: "SKLADOM" } },
    },
  });
  sourceOrderId = src.id;

  // "zabudnutý" tovar v bežnom košíku firmy: P3 ×5
  const cart = await prisma.cart.create({ data: { companyId, createdById: userAId } });
  cartId = cart.id;
  await prisma.cartItem.create({ data: { cartId: cart.id, productId: p3, qty: 5 } });
});

beforeEach(() => { asUserA(); });
afterAll(async () => { await cleanup(); await prisma.$disconnect(); });

describe("placeRepeatOrder — opakovanie s doobjednaním", () => {
  it("zlúči zdroj + draft, RE-prepočíta z aktuálnych cien, vyčistí draft a NEDOTKNE sa košíka", async () => {
    // doobjednané: P2 ×3 v drafte usera A
    await prisma.repeatDraftItem.create({ data: { userId: userAId, productId: p2, qty: 3 } });

    const res = await placeRepeatOrder(sourceOrderId, undefined, true);
    expect(res.ok).toBe(true);
    expect(res.number).toMatch(/^WEB-\d{4}-\d{5}$/);

    const order = await prisma.order.findFirst({ where: { id: res.id }, include: { items: true } });
    expect(order!.items).toHaveLength(2); // P1 (zdroj) + P2 (draft), žiadne P3 z košíka

    const i1 = order!.items.find((x) => x.productId === p1)!;
    const i2 = order!.items.find((x) => x.productId === p2)!;
    expect(order!.items.some((x) => x.productId === p3)).toBe(false); // košík NEpretiekol

    // re-pricing z aktuálnych cien (tier 10 %): P1 10→9 (NIE bogus 99), P2 20→18
    expect(Number(i1.unitPriceSnapshot)).toBe(9);
    expect(Number(i1.qty)).toBe(2);
    expect(Number(i2.unitPriceSnapshot)).toBe(18);
    expect(Number(i2.qty)).toBe(3);
    expect(Number(order!.subtotal)).toBe(72); // 9×2 + 18×3

    // draft usera A je prázdny (vyčistený v transakcii)
    expect(await prisma.repeatDraftItem.count({ where: { userId: userAId } })).toBe(0);

    // košík firmy ostal nedotknutý — P3 ×5 stále tam
    const cartItems = await prisma.cartItem.findMany({ where: { cartId } });
    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].productId).toBe(p3);
    expect(Number(cartItems[0].qty)).toBe(5);
  });

  it("removeRepeatDraftItem je IDOR-chránené (user A nevie odobrať draft usera B)", async () => {
    const bItem = await prisma.repeatDraftItem.create({ data: { userId: userBId, productId: p2, qty: 1 } });
    const res = await removeRepeatDraftItem(bItem.id); // requireUser = A
    expect(res.ok).toBe(false);
    expect(await prisma.repeatDraftItem.count({ where: { id: bItem.id } })).toBe(1); // stále existuje
    await prisma.repeatDraftItem.delete({ where: { id: bItem.id } });
  });

  it("startRepeat vyčistí len draft aktuálneho usera, draft iného usera ostane", async () => {
    await prisma.repeatDraftItem.create({ data: { userId: userAId, productId: p1, qty: 1 } });
    await prisma.repeatDraftItem.create({ data: { userId: userBId, productId: p1, qty: 1 } });

    await startRepeat(); // requireUser = A; redirect je mocknutý (no-op)

    expect(await prisma.repeatDraftItem.count({ where: { userId: userAId } })).toBe(0); // A vyčistený
    expect(await prisma.repeatDraftItem.count({ where: { userId: userBId } })).toBe(1); // B nedotknutý
    await prisma.repeatDraftItem.deleteMany({ where: { userId: userBId } });
  });

  it("IDEMPOTENCIA: dvojklik/súbeh — dve súčasné placeRepeatOrder s rovnakým kľúčom → LEN JEDNA objednávka", async () => {
    await prisma.repeatDraftItem.deleteMany({ where: { userId: userAId } }); // čistý štart
    const key = randomUUID();
    const [r1, r2] = await Promise.all([
      placeRepeatOrder(sourceOrderId, key, true),
      placeRepeatOrder(sourceOrderId, key, true),
    ]);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r1.id).toBe(r2.id); // obe volania vrátia tú istú objednávku (idempotentne)
    expect(r1.number).toBe(r2.number);
    expect(await prisma.order.count({ where: { idempotencyKey: key } })).toBe(1); // v DB len jedna
  });

  it("IDEMPOTENCIA: rôzne kľúče (nový render obrazovky) → legitímne dve samostatné objednávky", async () => {
    await prisma.repeatDraftItem.deleteMany({ where: { userId: userAId } });
    const r1 = await placeRepeatOrder(sourceOrderId, randomUUID(), true);
    const r2 = await placeRepeatOrder(sourceOrderId, randomUUID(), true);
    expect(r1.ok && r2.ok).toBe(true);
    expect(r1.id).not.toBe(r2.id); // zopakovať tú istú objednávku 2× je povolené (iný kľúč)
  });
});
