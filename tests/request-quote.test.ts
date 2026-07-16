// Integračný test RFQ: requestQuote (cenový dopyt na „na vyžiadanie" produkt z portálu).
// Auth/audit mockujeme; Inquiry zápis beží reálne proti DB.
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/audit", () => ({ writeAudit: vi.fn().mockResolvedValue(undefined) }));

import { requestQuote } from "@/app/(portal)/katalog/actions";
import { requireUser } from "@/lib/auth";

const prisma = new PrismaClient();
const ICO = "ZZQUOTE1";
const TIER = "ZZQUOTE";
const SKU = "ZZQUOTE-PROD";
const EMAIL = "zzquote@test.invalid";
let productId = "";

async function cleanup() {
  await prisma.inquiry.deleteMany({ where: { email: EMAIL } });
  await prisma.user.deleteMany({ where: { authId: "zzquote-user" } });
  await prisma.company.deleteMany({ where: { ico: ICO } });
  await prisma.product.deleteMany({ where: { sku: SKU } });
  await prisma.priceTier.deleteMany({ where: { code: TIER } });
}

beforeAll(async () => {
  await cleanup();
  const tier = await prisma.priceTier.create({ data: { code: TIER, name: "QuoteTest", discountPct: 0 } });
  const product = await prisma.product.create({ data: { sku: SKU, name: "Quote test produkt", nameDisplay: "Quote test produkt", vatRate: 23, basePrice: 10, isSubsidized: true, isPublished: true } });
  productId = product.id;
  const company = await prisma.company.create({ data: { ico: ICO, name: "Quote Test sro", priceTierId: tier.id } });
  const user = await prisma.user.create({ data: { authId: "zzquote-user", email: EMAIL, name: "Quote Tester", role: "CUSTOMER_ADMIN", companyId: company.id } });
  vi.mocked(requireUser).mockResolvedValue({
    id: user.id, email: user.email, name: user.name, role: "CUSTOMER_ADMIN", companyId: company.id, active: true, canOrderDirectly: true,
    company: { name: company.name },
  } as never);
});

afterAll(async () => { await cleanup(); await prisma.$disconnect(); });

describe("requestQuote — cenový dopyt z portálu", () => {
  it("vytvorí Inquiry so SKU produktu a údajmi prihláseného zákazníka", async () => {
    const r = await requestQuote(productId);
    expect(r.ok).toBe(true);
    const inq = await prisma.inquiry.findFirst({ where: { email: EMAIL } });
    expect(inq).not.toBeNull();
    expect(inq!.name).toBe("Quote Tester");
    expect(inq!.company).toBe("Quote Test sro");
    expect(inq!.type).toContain("Cenový dopyt");
    expect(inq!.message).toContain(SKU); // SKU produktu v texte dopytu
    expect(inq!.handledAt).toBeNull(); // nový lead pre staff
  });

  it("neplatné productId → ok:false a žiadny dopyt navyše", async () => {
    const before = await prisma.inquiry.count({ where: { email: EMAIL } });
    const r = await requestQuote("");
    expect(r.ok).toBe(false);
    const after = await prisma.inquiry.count({ where: { email: EMAIL } });
    expect(after).toBe(before);
  });

  it("nepublikovaný/neexistujúci produkt → ok:false", async () => {
    const r = await requestQuote("neexistujuce-id-xyz");
    expect(r.ok).toBe(false);
  });
});
