/**
 * Vytvorí (alebo obnoví) STAFF/ADMIN konto cez Supabase service-role + dorobí User riadok.
 * Použitie: npx tsx scripts/auth/create-admin.ts <email> [ADMIN|STAFF]
 * Vytlačí dočasné heslo — používateľ si ho po prvom prihlásení zmení.
 */
import { readFileSync } from "fs";
import { randomBytes } from "crypto";
import { PrismaClient, Role } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

// načítaj .env do process.env (service-role key + DATABASE_URL)
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const email = process.argv[2];
const role = (process.argv[3] || "ADMIN").toUpperCase();
if (!email) { console.error("Použitie: tsx scripts/auth/create-admin.ts <email> [ADMIN|STAFF]"); process.exit(1); }
if (role !== "ADMIN" && role !== "STAFF") { console.error("Rola musí byť ADMIN alebo STAFF"); process.exit(1); }

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) { console.error("Chýba NEXT_PUBLIC_SUPABASE_URL alebo SUPABASE_SERVICE_ROLE_KEY v .env"); process.exit(1); }

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const prisma = new PrismaClient();

async function main() {
  const tempPass = randomBytes(15).toString("base64url"); // ~20 znakov, silné
  let authId: string;

  const { data, error } = await supabase.auth.admin.createUser({ email, password: tempPass, email_confirm: true });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) {
      const { data: list } = await supabase.auth.admin.listUsers();
      const found = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (!found) throw new Error("Auth user existuje, ale nenašiel som ho: " + error.message);
      authId = found.id;
      await supabase.auth.admin.updateUserById(authId, { password: tempPass });
      console.log("ℹ️  Auth user už existoval — nastavil som nové dočasné heslo.");
    } else {
      throw error;
    }
  } else {
    authId = data.user!.id;
  }

  await prisma.user.upsert({
    where: { authId },
    update: { email, role: role as Role, active: true },
    create: { authId, email, role: role as Role, active: true, name: "Moonid" },
  });

  console.log("\n✅ Konto pripravené:");
  console.log("   E-mail:        ", email);
  console.log("   Rola:          ", role);
  console.log("   Dočasné heslo: ", tempPass);
}

main().catch((e) => { console.error("❌", e?.message ?? e); process.exit(1); }).finally(() => prisma.$disconnect());
