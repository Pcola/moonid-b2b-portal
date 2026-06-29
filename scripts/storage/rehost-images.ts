/**
 * Re-host obrázkov produktov z dodávateľa do vlastného Supabase Storage bucketu.
 * Spusti: npx tsx scripts/storage/rehost-images.ts
 * Resumovateľné — berie len ProductMedia, ktoré ešte ukazujú na 'humed'.
 */
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { rehostImage, PRODUCT_BUCKET } from "../../lib/rehost-image";

// načítaj .env
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Chýba NEXT_PUBLIC_SUPABASE_URL alebo SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const prisma = new PrismaClient();
const CONC = 8;

async function ensureBucket() {
  const { data } = await supabase.storage.getBucket(PRODUCT_BUCKET);
  if (data) { console.log(`Bucket '${PRODUCT_BUCKET}' existuje.`); return; }
  const { error } = await supabase.storage.createBucket(PRODUCT_BUCKET, { public: true });
  if (error && !/already exists/i.test(error.message)) throw error;
  console.log(`Bucket '${PRODUCT_BUCKET}' vytvorený (public).`);
}

async function main() {
  await ensureBucket();
  const todo = await prisma.productMedia.findMany({
    where: { storagePath: { contains: "humed" } },
    select: { id: true, storagePath: true },
  });
  console.log(`Na re-host: ${todo.length} obrázkov\n`);

  let ok = 0, fail = 0;
  const errors: string[] = [];
  for (let i = 0; i < todo.length; i += CONC) {
    const batch = todo.slice(i, i + CONC);
    await Promise.all(batch.map(async (m) => {
      const hosted = await rehostImage(supabase, m.storagePath, m.id);
      if (hosted) {
        await prisma.productMedia.update({ where: { id: m.id }, data: { storagePath: hosted } });
        ok++;
      } else {
        fail++;
        errors.push(m.id);
      }
    }));
    if (i % (CONC * 10) === 0) process.stdout.write(`  ${Math.min(i + CONC, todo.length)}/${todo.length} (ok ${ok}, fail ${fail})\n`);
  }

  console.log(`\nHotovo. OK ${ok}, FAIL ${fail}`);
  if (errors.length) console.log(`Zlyhané media id (prvých 15): ${errors.slice(0, 15).join(", ")}`);
}

main().catch((e) => { console.error("❌", e?.message ?? e); process.exit(1); }).finally(() => prisma.$disconnect());
