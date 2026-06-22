// Vytvorí/obnoví testovacie kontá (Supabase Auth + User záznam) na overenie portálu.
// Vyžaduje SUPABASE_SERVICE_ROLE_KEY. Spusti: npm run seed:auth
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PASSWORD = "Moonid2026!";

async function ensureAuthUser(email: string): Promise<string> {
  const { data } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (data?.user) return data.user.id;
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const found = list.data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!found) throw new Error("Nepodarilo sa vytvoriť ani nájsť usera: " + email);
  await admin.auth.admin.updateUserById(found.id, { password: PASSWORD, email_confirm: true });
  return found.id;
}

async function main() {
  const tier = (await prisma.priceTier.findFirst({ where: { code: "B1" } })) ?? (await prisma.priceTier.findFirst());
  if (!tier) throw new Error("Žiadny PriceTier — spusti najprv `npm run db:seed`.");

  const company = await prisma.company.upsert({
    where: { ico: "00000000" },
    update: {},
    create: { ico: "00000000", name: "Testovacia firma s.r.o.", city: "Nové Zámky", priceTierId: tier.id },
  });

  const staffId = await ensureAuthUser("staff@moonid.test");
  await prisma.user.upsert({
    where: { email: "staff@moonid.test" },
    update: { authId: staffId, role: "STAFF", active: true },
    create: { authId: staffId, email: "staff@moonid.test", name: "Staff Test", role: "STAFF" },
  });

  const custId = await ensureAuthUser("zakaznik@moonid.test");
  await prisma.user.upsert({
    where: { email: "zakaznik@moonid.test" },
    update: { authId: custId, role: "CUSTOMER_ADMIN", companyId: company.id, active: true },
    create: { authId: custId, email: "zakaznik@moonid.test", name: "Zákazník Test", role: "CUSTOMER_ADMIN", companyId: company.id },
  });

  console.log(`Hotovo. Testovacie kontá (heslo: ${PASSWORD}):`);
  console.log("  STAFF    : staff@moonid.test  → /staff/katalog aj /dashboard");
  console.log(`  ZÁKAZNÍK : zakaznik@moonid.test  → /dashboard (firma ${company.name}, tier ${tier.code})`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
