// Tenant-izolačné testy (tvrdá podmienka pilotu, sekcia 4 triáže):
// firma A sa NESMIE dostať k dátam firmy B. Overujeme presne tie scoped query vzory,
// ktoré používajú stránky/akcie (companyId scoping + IDOR ownership).
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// jedinečné testovacie kľúče — nech sa nepletú s reálnymi dátami
const ICO_A = "ZZTESTA";
const ICO_B = "ZZTESTB";
const SKU = "ZZTEST-PROD";

let companyA = "", companyB = "";
let orderB = "", invoiceB = "", locB = "", cartItemB = "";

async function cleanup() {
  await prisma.orderStatusEvent.deleteMany({ where: { order: { company: { ico: { in: [ICO_A, ICO_B] } } } } });
  await prisma.orderItem.deleteMany({ where: { order: { company: { ico: { in: [ICO_A, ICO_B] } } } } });
  await prisma.order.deleteMany({ where: { company: { ico: { in: [ICO_A, ICO_B] } } } });
  await prisma.cartItem.deleteMany({ where: { cart: { company: { ico: { in: [ICO_A, ICO_B] } } } } });
  await prisma.cart.deleteMany({ where: { company: { ico: { in: [ICO_A, ICO_B] } } } });
  await prisma.invoice.deleteMany({ where: { company: { ico: { in: [ICO_A, ICO_B] } } } });
  await prisma.deliveryLocation.deleteMany({ where: { company: { ico: { in: [ICO_A, ICO_B] } } } });
  await prisma.user.deleteMany({ where: { authId: { in: ["zztest-userb"] } } });
  await prisma.company.deleteMany({ where: { ico: { in: [ICO_A, ICO_B] } } });
  await prisma.product.deleteMany({ where: { sku: SKU } });
}

beforeAll(async () => {
  await cleanup();
  const tier = (await prisma.priceTier.findFirst()) ?? (await prisma.priceTier.create({ data: { code: "ZZT", name: "Test", discountPct: 0 } }));
  const product = await prisma.product.create({ data: { sku: SKU, name: "Test produkt", vatRate: 23 } });
  const a = await prisma.company.create({ data: { ico: ICO_A, name: "Firma A", priceTierId: tier.id } });
  const b = await prisma.company.create({ data: { ico: ICO_B, name: "Firma B", priceTierId: tier.id } });
  companyA = a.id; companyB = b.id;
  const userBrec = await prisma.user.create({ data: { authId: "zztest-userb", email: "zztest-b@test.invalid", role: "CUSTOMER_ADMIN", companyId: b.id } });

  const o = await prisma.order.create({ data: { number: "ZZTEST-ORD-B", companyId: b.id, createdById: userBrec.id, status: "PRIJATA", priceTierCode: "ZZT", subtotal: 10, vat: 2.3, total: 12.3 } });
  orderB = o.id;
  const cart = await prisma.cart.create({ data: { companyId: b.id, createdById: userBrec.id } });
  const ci = await prisma.cartItem.create({ data: { cartId: cart.id, productId: product.id, qty: 1 } });
  cartItemB = ci.id;
  const inv = await prisma.invoice.create({ data: { pohodaNumber: "ZZTEST-FA-B", companyId: b.id, issuedAt: new Date(), dueAt: new Date(), subtotal: 10, vat: 2.3, total: 12.3 } });
  invoiceB = inv.id;
  const loc = await prisma.deliveryLocation.create({ data: { companyId: b.id, label: "Sklad B", street: "Ulica 1", city: "Mesto", zip: "94101" } });
  locB = loc.id;
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("Tenant izolácia: firma A nesmie pristúpiť k dátam firmy B", () => {
  it("objednávka B nie je dostupná pod companyId A (vzor z objednavky/[id])", async () => {
    const asA = await prisma.order.findFirst({ where: { id: orderB, companyId: companyA } });
    const asB = await prisma.order.findFirst({ where: { id: orderB, companyId: companyB } });
    expect(asA).toBeNull();          // cross-tenant = 404
    expect(asB?.id).toBe(orderB);    // vlastník vidí (sanity)
  });

  it("faktúry scoped na companyId A neobsahujú faktúru firmy B", async () => {
    const aInvoices = await prisma.invoice.findMany({ where: { companyId: companyA } });
    expect(aInvoices.find((i) => i.id === invoiceB)).toBeUndefined();
    const bInvoices = await prisma.invoice.findMany({ where: { companyId: companyB } });
    expect(bInvoices.find((i) => i.id === invoiceB)).toBeDefined();
  });

  it("dodacia adresa B nie je dostupná pod companyId A (vzor z createOrder)", async () => {
    const asA = await prisma.deliveryLocation.findFirst({ where: { id: locB, companyId: companyA } });
    expect(asA).toBeNull();
  });

  it("cart item B patrí firme B, nie A (vzor ownItemOrNull)", async () => {
    const item = await prisma.cartItem.findUnique({ where: { id: cartItemB }, select: { cart: { select: { companyId: true } } } });
    expect(item?.cart.companyId).toBe(companyB);
    expect(item?.cart.companyId).not.toBe(companyA);
  });
});
