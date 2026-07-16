// Integračné testy najrizikovejšej peňažnej + schvaľovacej logiky objednávok:
// staff updateOrder (prepočet súm), approveOrder/rejectOrder (oprávnenia + CAS), cancelOwnOrder (CAS okno).
// Auth/audit/email/next-cache mockujeme; prepočty a stavové prechody bežia reálne proti DB.
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

vi.mock("@/lib/auth", () => ({ requireStaff: vi.fn(), requireUser: vi.fn() }));
vi.mock("@/lib/audit", () => ({ writeAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/email", () => ({
  emailOrderStatus: vi.fn().mockResolvedValue(undefined),
  emailNewOrderToStaff: vi.fn().mockResolvedValue(undefined),
  emailOrderDecision: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { updateOrder } from "@/app/staff/objednavky/actions";
import { approveOrder, rejectOrder, cancelOwnOrder } from "@/app/(portal)/objednavky/actions";
import { requireStaff, requireUser } from "@/lib/auth";

const prisma = new PrismaClient();
const ICO = "ZZOACT1";
const TIER = "ZZOACT";
const SKU = "ZZOACT-PROD";

let companyId = "", adminId = "", memberId = "", staffId = "", productId = "";

async function cleanup() {
  await prisma.orderStatusEvent.deleteMany({ where: { order: { company: { ico: ICO } } } });
  await prisma.orderItem.deleteMany({ where: { order: { company: { ico: ICO } } } });
  await prisma.order.deleteMany({ where: { company: { ico: ICO } } });
  await prisma.user.deleteMany({ where: { authId: { in: ["zzoact-admin", "zzoact-member", "zzoact-staff"] } } });
  await prisma.company.deleteMany({ where: { ico: ICO } });
  await prisma.product.deleteMany({ where: { sku: SKU } });
  await prisma.priceTier.deleteMany({ where: { code: TIER } });
}

beforeAll(async () => {
  await cleanup();
  const tier = await prisma.priceTier.create({ data: { code: TIER, name: "OActTest", discountPct: 0 } });
  const company = await prisma.company.create({ data: { ico: ICO, name: "OAct sro", priceTierId: tier.id } });
  companyId = company.id;
  const product = await prisma.product.create({ data: { sku: SKU, name: "OAct produkt", vatRate: 23, basePrice: 10, isPublished: true } });
  productId = product.id;
  const admin = await prisma.user.create({ data: { authId: "zzoact-admin", email: "zzoact-admin@test.invalid", role: "CUSTOMER_ADMIN", companyId } });
  adminId = admin.id;
  const member = await prisma.user.create({ data: { authId: "zzoact-member", email: "zzoact-member@test.invalid", role: "CUSTOMER_USER", companyId, approverId: admin.id, canOrderDirectly: false } });
  memberId = member.id;
  const staff = await prisma.user.create({ data: { authId: "zzoact-staff", email: "zzoact-staff@test.invalid", role: "STAFF" } });
  staffId = staff.id;
});

afterAll(async () => { await cleanup(); await prisma.$disconnect(); });

let seq = 0;
type NewItem = { unit: number; qty: number };
async function makeOrder(status: string, createdById: string, items: NewItem[]) {
  seq++;
  const number = `WEB-9999-${String(seq).padStart(5, "0")}`;
  const subtotal = items.reduce((s, it) => s + it.unit * it.qty, 0);
  return prisma.order.create({
    data: {
      number, companyId, createdById, status: status as never, pohodaSync: "LOKALNA", priceTierCode: TIER,
      subtotal, vat: 0, total: subtotal, shippingFee: 0, paymentSurcharge: 0,
      items: { create: items.map((it) => ({ productId, skuSnapshot: SKU, nameSnapshot: "OAct produkt", unitPriceSnapshot: it.unit, qty: it.qty, lineTotal: it.unit * it.qty, fulfillment: "SKLADOM" as const })) },
    },
    select: { id: true, number: true, items: { select: { id: true, unitPriceSnapshot: true } } },
  });
}
const statusOf = async (id: string) => (await prisma.order.findUnique({ where: { id }, select: { status: true } }))!.status;

describe("updateOrder (staff) — prepočet súm a odobranie položiek", () => {
  it("zmena množstva + odobratie položky prepočíta subtotal/DPH/total", async () => {
    vi.mocked(requireStaff).mockResolvedValue({ id: staffId, role: "STAFF" } as never);
    const o = await makeOrder("PRIJATA", memberId, [{ unit: 10, qty: 2 }, { unit: 5, qty: 1 }]);
    const i1 = o.items.find((x) => Number(x.unitPriceSnapshot) === 10)!;
    const i2 = o.items.find((x) => Number(x.unitPriceSnapshot) === 5)!;
    const r = await updateOrder(o.id, { items: [{ itemId: i1.id, qty: 3 }, { itemId: i2.id, qty: 0 }] });
    expect(r.ok).toBe(true);
    const upd = await prisma.order.findUnique({ where: { id: o.id }, include: { items: true } });
    expect(upd!.items).toHaveLength(1);            // položka s qty 0 odobratá
    expect(Number(upd!.items[0].qty)).toBe(3);
    expect(Number(upd!.subtotal)).toBe(30);        // 10 × 3
    expect(Number(upd!.vat)).toBe(6.9);            // (12,30 − 10) × 3
    expect(Number(upd!.total)).toBe(36.9);         // subtotal + DPH (doprava/príplatok 0)
  });

  it("odobranie všetkých položiek je odmietnuté", async () => {
    vi.mocked(requireStaff).mockResolvedValue({ id: staffId, role: "STAFF" } as never);
    const o = await makeOrder("PRIJATA", memberId, [{ unit: 10, qty: 1 }]);
    const r = await updateOrder(o.id, { items: [{ itemId: o.items[0].id, qty: 0 }] });
    expect(r.ok).toBe(false);
    expect((await prisma.orderItem.count({ where: { orderId: o.id } }))).toBe(1); // nič sa nezmazalo
  });

  it("objednávku v neskorom stave (NA_CESTE) už nemožno upraviť", async () => {
    vi.mocked(requireStaff).mockResolvedValue({ id: staffId, role: "STAFF" } as never);
    const o = await makeOrder("NA_CESTE", memberId, [{ unit: 10, qty: 1 }]);
    const r = await updateOrder(o.id, { items: [{ itemId: o.items[0].id, qty: 5 }] });
    expect(r.ok).toBe(false);
  });
});

describe("approveOrder / rejectOrder — oprávnenia a stavové prechody", () => {
  it("správca firmy schváli CAKA_SCHVALENIE → PRIJATA", async () => {
    vi.mocked(requireUser).mockResolvedValue({ id: adminId, role: "CUSTOMER_ADMIN", companyId } as never);
    const o = await makeOrder("CAKA_SCHVALENIE", memberId, [{ unit: 10, qty: 1 }]);
    const r = await approveOrder(o.id);
    expect(r.ok).toBe(true);
    expect(await statusOf(o.id)).toBe("PRIJATA");
  });

  it("bežný člen (nie schvaľovateľ) nesmie schváliť — stav ostáva", async () => {
    vi.mocked(requireUser).mockResolvedValue({ id: memberId, role: "CUSTOMER_USER", companyId } as never);
    const o = await makeOrder("CAKA_SCHVALENIE", memberId, [{ unit: 10, qty: 1 }]);
    const r = await approveOrder(o.id);
    expect(r.ok).toBe(false);
    expect(await statusOf(o.id)).toBe("CAKA_SCHVALENIE");
  });

  it("schvaľovateľ zamietne → STORNO", async () => {
    vi.mocked(requireUser).mockResolvedValue({ id: adminId, role: "CUSTOMER_ADMIN", companyId } as never);
    const o = await makeOrder("CAKA_SCHVALENIE", memberId, [{ unit: 10, qty: 1 }]);
    const r = await rejectOrder(o.id, "duplicitná objednávka");
    expect(r.ok).toBe(true);
    expect(await statusOf(o.id)).toBe("STORNO");
  });
});

describe("cancelOwnOrder — CAS okno zákazníka", () => {
  it("tvorca zruší PRIJATA → STORNO", async () => {
    vi.mocked(requireUser).mockResolvedValue({ id: memberId, role: "CUSTOMER_USER", companyId } as never);
    const o = await makeOrder("PRIJATA", memberId, [{ unit: 10, qty: 1 }]);
    const r = await cancelOwnOrder(o.id);
    expect(r.ok).toBe(true);
    expect(await statusOf(o.id)).toBe("STORNO");
  });

  it("POTVRDENA sa už in-app zrušiť nedá", async () => {
    vi.mocked(requireUser).mockResolvedValue({ id: memberId, role: "CUSTOMER_USER", companyId } as never);
    const o = await makeOrder("POTVRDENA", memberId, [{ unit: 10, qty: 1 }]);
    const r = await cancelOwnOrder(o.id);
    expect(r.ok).toBe(false);
    expect(await statusOf(o.id)).toBe("POTVRDENA");
  });
});
