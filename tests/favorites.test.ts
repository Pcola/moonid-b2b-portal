// Integračný test obľúbených (nová Favorite tabuľka). Auth/next-cache mockujeme, DB reálne.
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { toggleFavorite } from "@/app/(portal)/oblubene/actions";
import { requireUser } from "@/lib/auth";

const prisma = new PrismaClient();
const ICO = "ZZFAV1";
const TIER = "ZZFAV";
const SKU = "ZZFAV-PROD";
let companyId = "", productId = "";

async function cleanup() {
  await prisma.favorite.deleteMany({ where: { company: { ico: ICO } } });
  await prisma.user.deleteMany({ where: { authId: "zzfav-user" } });
  await prisma.company.deleteMany({ where: { ico: ICO } });
  await prisma.product.deleteMany({ where: { sku: SKU } });
  await prisma.priceTier.deleteMany({ where: { code: TIER } });
}

beforeAll(async () => {
  await cleanup();
  const tier = await prisma.priceTier.create({ data: { code: TIER, name: "FavTest", discountPct: 0 } });
  const product = await prisma.product.create({ data: { sku: SKU, name: "Fav produkt", vatRate: 23, isPublished: true } });
  productId = product.id;
  const company = await prisma.company.create({ data: { ico: ICO, name: "Fav sro", priceTierId: tier.id } });
  companyId = company.id;
  const usr = await prisma.user.create({ data: { authId: "zzfav-user", email: "zzfav@test.invalid", role: "CUSTOMER_ADMIN", companyId: company.id } });
  vi.mocked(requireUser).mockResolvedValue({ id: usr.id, email: usr.email, role: "CUSTOMER_ADMIN", companyId: company.id, active: true, company: { name: company.name, priceTier: { code: TIER } } } as never);
});

afterAll(async () => { await cleanup(); await prisma.$disconnect(); });

describe("toggleFavorite — obľúbené firmy", () => {
  it("prvý toggle pridá, druhý odoberie (idempotentne)", async () => {
    const r1 = await toggleFavorite(productId);
    expect(r1).toMatchObject({ ok: true, favorited: true });
    expect(await prisma.favorite.count({ where: { companyId, productId } })).toBe(1);

    const r2 = await toggleFavorite(productId);
    expect(r2).toMatchObject({ ok: true, favorited: false });
    expect(await prisma.favorite.count({ where: { companyId, productId } })).toBe(0);
  });

  it("neexistujúci/nepublikovaný produkt sa nepridá", async () => {
    const r = await toggleFavorite("neexistuje-xyz");
    expect(r.ok).toBe(false);
  });
});
