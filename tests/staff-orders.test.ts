// Integračný test staff akcií nad objednávkou — advanceOrder / cancelOrder.
// transition.test.ts pokrýva ČISTÚ logiku; tu testujeme action wrappery: optimistic-lock guard,
// zápis OrderStatusEvent (auditná stopa) a finálne/cancel guardy. Auth/audit/email/cache mockujeme.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

vi.mock("@/lib/auth", () => ({ requireStaff: vi.fn() }));
vi.mock("@/lib/audit", () => ({
  writeAudit: vi.fn().mockResolvedValue(undefined),
  writeAuditRequired: vi.fn().mockResolvedValue(undefined),
  auditRequestContext: vi.fn().mockResolvedValue({ ipHash: null, userAgent: null }),
}));
vi.mock("@/lib/email", () => ({ emailOrderStatus: vi.fn().mockResolvedValue({ ok: true }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { advanceOrder, cancelOrder } from "@/app/staff/objednavky/actions";
import { requireStaff } from "@/lib/auth";

const prisma = new PrismaClient();
const ICO = "ZZSTAFF1";
const TIER = "ZZSTAFF";
let companyId = "", staffId = "", customerId = "";
let seq = 0;

async function cleanup() {
  await prisma.orderStatusEvent.deleteMany({ where: { order: { company: { ico: ICO } } } });
  await prisma.orderItem.deleteMany({ where: { order: { company: { ico: ICO } } } });
  await prisma.order.deleteMany({ where: { company: { ico: ICO } } });
  await prisma.user.deleteMany({ where: { authId: { in: ["zzstaff-staff", "zzstaff-cust"] } } });
  await prisma.company.deleteMany({ where: { ico: ICO } });
  await prisma.priceTier.deleteMany({ where: { code: TIER } });
}

async function makeOrder(status: string) {
  return prisma.order.create({
    data: {
      number: `WEB-TST-${String(++seq).padStart(5, "0")}`, companyId, createdById: customerId,
      status: status as never, pohodaSync: "LOKALNA", priceTierCode: "—",
      subtotal: 10, vat: 2, total: 12,
    },
    select: { id: true },
  });
}

beforeAll(async () => {
  await cleanup();
  const tier = await prisma.priceTier.create({ data: { code: TIER, name: "StaffTest", discountPct: 0 } });
  const company = await prisma.company.create({ data: { ico: ICO, name: "Staff Test sro", priceTierId: tier.id } });
  companyId = company.id;
  const staff = await prisma.user.create({ data: { authId: "zzstaff-staff", email: "zzstaff@test.invalid", role: "STAFF" } });
  const cust = await prisma.user.create({ data: { authId: "zzstaff-cust", email: "zzcust@test.invalid", role: "CUSTOMER_ADMIN", companyId } });
  staffId = staff.id; customerId = cust.id;
});

beforeEach(() => {
  vi.mocked(requireStaff).mockResolvedValue({ id: staffId, email: "zzstaff@test.invalid", role: "STAFF", companyId: null, active: true, company: null } as never);
});

afterAll(async () => { await cleanup(); await prisma.$disconnect(); });

describe("advanceOrder — posun stavu objednávky", () => {
  it("PRIJATA → POTVRDENA: nastaví confirmedAt a zapíše OrderStatusEvent (auditná stopa)", async () => {
    const o = await makeOrder("PRIJATA");
    const res = await advanceOrder(o.id);
    expect(res).toMatchObject({ ok: true, status: "POTVRDENA" });

    const order = await prisma.order.findUnique({ where: { id: o.id }, select: { status: true, confirmedAt: true } });
    expect(order!.status).toBe("POTVRDENA");
    expect(order!.confirmedAt).not.toBeNull();

    const events = await prisma.orderStatusEvent.findMany({ where: { orderId: o.id } });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ status: "POTVRDENA", changedById: staffId });
  });

  it("dopredný tok skončí v DORUCENA; ďalší posun už nie je možný", async () => {
    const o = await makeOrder("PRIJATA");
    for (let i = 0; i < 4; i++) expect((await advanceOrder(o.id)).ok).toBe(true);
    const order = await prisma.order.findUnique({ where: { id: o.id }, select: { status: true } });
    expect(order!.status).toBe("DORUCENA");

    const res = await advanceOrder(o.id);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/finálnom stave/i);
    expect(await prisma.orderStatusEvent.count({ where: { orderId: o.id } })).toBe(4); // žiadny 5. event
  });

  it("neexistujúca objednávka → ok:false", async () => {
    const res = await advanceOrder("neexistuje-xyz");
    expect(res.ok).toBe(false);
  });
});

describe("cancelOrder — storno objednávky", () => {
  it("PRIJATA → STORNO so zápisom dôvodu do eventu", async () => {
    const o = await makeOrder("PRIJATA");
    const res = await cancelOrder(o.id, "  zákazník zrušil  ");
    expect(res.ok).toBe(true);

    const order = await prisma.order.findUnique({ where: { id: o.id }, select: { status: true } });
    expect(order!.status).toBe("STORNO");
    const ev = await prisma.orderStatusEvent.findFirst({ where: { orderId: o.id, status: "STORNO" } });
    expect(ev).not.toBeNull();
    expect(ev!.note).toBe("zákazník zrušil"); // orezané
  });

  it("NA_CESTE už nemožno stornovať (guard)", async () => {
    const o = await makeOrder("NA_CESTE");
    const res = await cancelOrder(o.id);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/nemožno stornovať/i);
    const order = await prisma.order.findUnique({ where: { id: o.id }, select: { status: true } });
    expect(order!.status).toBe("NA_CESTE"); // nezmenené
  });
});
