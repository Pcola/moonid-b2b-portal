import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { getOrCreateCart } from "@/lib/cart";

const prisma = new PrismaClient();
const ICO = "ZZCARTISO";
const AUTH_IDS = ["zzcart-user-a", "zzcart-user-b"];
let companyId = "";
let userA = "";
let userB = "";

async function cleanup() {
  await prisma.cartItem.deleteMany({ where: { cart: { company: { ico: ICO } } } });
  await prisma.cart.deleteMany({ where: { company: { ico: ICO } } });
  await prisma.user.deleteMany({ where: { authId: { in: AUTH_IDS } } });
  await prisma.company.deleteMany({ where: { ico: ICO } });
  await prisma.priceTier.deleteMany({ where: { code: "ZZCART" } });
}

beforeAll(async () => {
  await cleanup();
  const tier = await prisma.priceTier.create({ data: { code: "ZZCART", name: "Cart isolation", discountPct: 0 } });
  const company = await prisma.company.create({ data: { ico: ICO, name: "Cart Isolation s.r.o.", priceTierId: tier.id } });
  companyId = company.id;
  const [a, b] = await Promise.all([
    prisma.user.create({ data: { authId: AUTH_IDS[0], email: "zzcart-a@test.invalid", companyId, role: "CUSTOMER_USER" } }),
    prisma.user.create({ data: { authId: AUTH_IDS[1], email: "zzcart-b@test.invalid", companyId, role: "CUSTOMER_USER" } }),
  ]);
  userA = a.id;
  userB = b.id;
});

afterAll(async () => { await cleanup(); await prisma.$disconnect(); });

describe("košík v rámci jednej firmy", () => {
  it("dá dvom kolegom dva odlišné košíky a opakované volanie je idempotentné", async () => {
    const [cartA, cartB] = await Promise.all([
      getOrCreateCart(companyId, userA),
      getOrCreateCart(companyId, userB),
    ]);
    expect(cartA.id).not.toBe(cartB.id);
    expect((await getOrCreateCart(companyId, userA)).id).toBe(cartA.id);
    expect(await prisma.cart.count({ where: { companyId } })).toBe(2);
  });
});
