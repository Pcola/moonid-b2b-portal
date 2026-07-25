/**
 * Purge testovacích dát z databázy pred spustením do prevádzky.
 * Riešený blocker: docs/GO_LIVE_AUDIT_2026-07-25.md → B8 (testovacie firmy/kontá/objednávky
 * v produkčnej DB skresľujú staff dashboard a KPI, a číslovanie objednávok je na ~322).
 *
 * BEZPEČNOSTNÉ ZÁSADY:
 *   • default je DRY-RUN — bez `--confirm` sa NIČ nezmaže, len sa vypíše, čo by sa zmazalo
 *   • maže sa VÝLUČNE podľa explicitného zoznamu identifikátorov nižšie (žiadne „maž všetko")
 *   • maže sa v poradí FK závislostí
 *   • AuditLog sa NEMAŽE (append-only trigger to neumožní a je to GDPR accountability)
 *   • kontá v Supabase Auth (auth.users) tento skript NEMAŽE — treba ich zmazať v Supabase konzole
 *
 * SPUSTENIE:
 *   npx tsx scripts/maintenance/purge-test-data.ts             # dry-run (odporúčané prvé)
 *   npx tsx scripts/maintenance/purge-test-data.ts --confirm   # reálne zmazanie
 *   npx tsx scripts/maintenance/purge-test-data.ts --confirm --reset-counter=0
 *
 * PRED SPUSTENÍM: mať zálohu DB (audit blocker B10 — na Free tieri zálohy nie sú automatické).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Čo považujeme za testovacie (explicitný zoznam, nie heuristika) ───────────
const TEST_COMPANY_ICOS = ["00000000", "47114477", "36000111"];
const TEST_USER_EMAIL_PATTERNS = ["@moonid.test", "@test.invalid"];
const TEST_PRODUCT_SKU_PREFIX = "ZZ";        // SKU z integračných testov (ZZORD-*, ZZQUOTE-*…)
const TEST_PRICE_TIER_PREFIX = "ZZ";
const TEST_INVOICE_NUMBERS = ["FA-2026-0001", "FA-2026-0002"];
const TEST_CART_IDS = ["cart_test_repeat"];

const args = process.argv.slice(2);
const CONFIRM = args.includes("--confirm");
const resetArg = args.find((a) => a.startsWith("--reset-counter="));
const RESET_COUNTER = resetArg ? Number(resetArg.split("=")[1]) : null;

function log(label: string, n: number) {
  console.log(`  ${n > 0 ? "•" : " "} ${label.padEnd(38)} ${String(n).padStart(5)}`);
}

async function main() {
  console.log(`\n=== Purge testovacích dát — ${CONFIRM ? "REÁLNE MAZANIE" : "DRY-RUN (nič sa nemení)"} ===\n`);
  console.log(`DB host: ${(process.env.DATABASE_URL ?? "").replace(/:\/\/[^@]*@/, "://***@").slice(0, 90)}\n`);

  const companies = await prisma.company.findMany({
    where: { ico: { in: TEST_COMPANY_ICOS } },
    select: { id: true, ico: true, name: true },
  });
  const companyIds = companies.map((c) => c.id);
  const users = await prisma.user.findMany({
    where: { OR: TEST_USER_EMAIL_PATTERNS.map((p) => ({ email: { contains: p } })) },
    select: { id: true, email: true, authId: true },
  });
  const userIds = users.map((u) => u.id);

  console.log("Nájdené testovacie entity:");
  companies.forEach((c) => console.log(`  • firma  ${c.ico}  ${c.name}`));
  users.forEach((u) => console.log(`  • konto  ${u.email}  (authId ${u.authId})`));

  const orderWhere = { OR: [{ companyId: { in: companyIds } }, { createdById: { in: userIds } }] };
  const counts = {
    orderStatusEvents: await prisma.orderStatusEvent.count({ where: { order: orderWhere } }),
    orderItems: await prisma.orderItem.count({ where: { order: orderWhere } }),
    orders: await prisma.order.count({ where: orderWhere }),
    invoices: await prisma.invoice.count({ where: { OR: [{ companyId: { in: companyIds } }, { pohodaNumber: { in: TEST_INVOICE_NUMBERS } }] } }),
    cartItems: await prisma.cartItem.count({ where: { OR: [{ cart: { companyId: { in: companyIds } } }, { cartId: { in: TEST_CART_IDS } }] } }),
    carts: await prisma.cart.count({ where: { OR: [{ companyId: { in: companyIds } }, { id: { in: TEST_CART_IDS } }] } }),
    repeatDrafts: await prisma.repeatDraftItem.count({ where: { userId: { in: userIds } } }),
    favorites: await prisma.favorite.count({ where: { companyId: { in: companyIds } } }),
    deliveryLocations: await prisma.deliveryLocation.count({ where: { companyId: { in: companyIds } } }),
    accessRequests: await prisma.accessRequest.count({ where: { OR: [{ companyId: { in: companyIds } }, ...TEST_USER_EMAIL_PATTERNS.map((p) => ({ email: { contains: p } }))] } }),
    inquiries: await prisma.inquiry.count({ where: { OR: TEST_USER_EMAIL_PATTERNS.map((p) => ({ email: { contains: p } })) } }),
    users: users.length,
    companies: companies.length,
    testProducts: await prisma.product.count({ where: { sku: { startsWith: TEST_PRODUCT_SKU_PREFIX } } }),
    testTiers: await prisma.priceTier.count({ where: { code: { startsWith: TEST_PRICE_TIER_PREFIX } } }),
  };

  console.log("\nPočty na zmazanie:");
  Object.entries(counts).forEach(([k, v]) => log(k, v));

  const counter = await prisma.orderCounter.findFirst({ orderBy: { year: "desc" }, select: { year: true, lastSeq: true } });
  console.log(`\nOrderCounter: rok ${counter?.year ?? "—"}, lastSeq = ${counter?.lastSeq ?? "—"}` +
    (RESET_COUNTER != null ? ` → nastaví sa na ${RESET_COUNTER}` : "  (nemení sa; použi --reset-counter=N)"));

  if (!CONFIRM) {
    console.log("\nDRY-RUN — nič sa nezmenilo. Pre reálne zmazanie spusti s `--confirm`.");
    console.log("POZOR: pred `--confirm` mať zálohu DB. Kontá v Supabase Auth zmaž ručne v konzole.\n");
    return;
  }

  console.log("\nMažem (v poradí FK závislostí)…");
  await prisma.$transaction(async (tx) => {
    await tx.orderStatusEvent.deleteMany({ where: { order: orderWhere } });
    await tx.orderItem.deleteMany({ where: { order: orderWhere } });
    // faktúry ukazujú na objednávky → najprv faktúry (vrátane dedup záznamov)
    const invs = await tx.invoice.findMany({ where: { OR: [{ companyId: { in: companyIds } }, { pohodaNumber: { in: TEST_INVOICE_NUMBERS } }] }, select: { pohodaNumber: true } });
    await tx.invoice.deleteMany({ where: { OR: [{ companyId: { in: companyIds } }, { pohodaNumber: { in: TEST_INVOICE_NUMBERS } }] } });
    if (invs.length) await tx.docDedup.deleteMany({ where: { docNumber: { in: invs.map((i) => i.pohodaNumber) } } }).catch(() => {});
    await tx.order.deleteMany({ where: orderWhere });
    await tx.cartItem.deleteMany({ where: { OR: [{ cart: { companyId: { in: companyIds } } }, { cartId: { in: TEST_CART_IDS } }] } });
    await tx.cart.deleteMany({ where: { OR: [{ companyId: { in: companyIds } }, { id: { in: TEST_CART_IDS } }] } });
    await tx.repeatDraftItem.deleteMany({ where: { userId: { in: userIds } } });
    await tx.favorite.deleteMany({ where: { companyId: { in: companyIds } } });
    await tx.deliveryLocation.deleteMany({ where: { companyId: { in: companyIds } } });
    await tx.accessRequest.deleteMany({ where: { OR: [{ companyId: { in: companyIds } }, ...TEST_USER_EMAIL_PATTERNS.map((p) => ({ email: { contains: p } }))] } });
    await tx.inquiry.deleteMany({ where: { OR: TEST_USER_EMAIL_PATTERNS.map((p) => ({ email: { contains: p } })) } });
    await tx.user.deleteMany({ where: { id: { in: userIds } } });
    await tx.company.deleteMany({ where: { id: { in: companyIds } } });
    await tx.product.deleteMany({ where: { sku: { startsWith: TEST_PRODUCT_SKU_PREFIX } } });
    await tx.priceTier.deleteMany({ where: { code: { startsWith: TEST_PRICE_TIER_PREFIX } } });
    if (RESET_COUNTER != null && counter) {
      await tx.orderCounter.update({ where: { year: counter.year }, data: { lastSeq: RESET_COUNTER } });
    }
  });

  // hraničný záznam do auditu (staré testovacie záznamy sa mazať nedajú — append-only)
  await prisma.auditLog.create({
    data: { action: "LAUNCH_PURGE", entity: "System", meta: { purged: counts, resetCounter: RESET_COUNTER } },
  }).catch((e) => console.warn("  (audit záznam sa nezapísal:", (e as Error).message, ")"));

  console.log("\n✓ Hotovo. Ručne dokonči: zmazať kontá v Supabase Auth (auth.users) a overiť /staff badge = 0.\n");
}

main()
  .catch((e) => { console.error("\n✗ Chyba:", e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
