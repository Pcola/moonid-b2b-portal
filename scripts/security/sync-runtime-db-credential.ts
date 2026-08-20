import { PrismaClient } from "@prisma/client";

import { parseStagingRuntimeCredential } from "./runtime-db-credential";

const runtimeUrl = process.env.RUNTIME_DATABASE_URL ?? "";
const migratorUrl = process.env.MIGRATOR_DATABASE_URL ?? process.env.DATABASE_URL ?? "";

if (!migratorUrl) throw new Error("MIGRATOR_DATABASE_URL is required.");
if (!runtimeUrl) throw new Error("RUNTIME_DATABASE_URL is required.");
if (migratorUrl === runtimeUrl) throw new Error("Migrator and runtime credentials must be different.");

const credential = parseStagingRuntimeCredential(runtimeUrl);
const prisma = new PrismaClient({ datasources: { db: { url: migratorUrl } } });

async function main(): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`
      CREATE FUNCTION pg_temp.set_moonid_app_staging_password(p_password text)
      RETURNS void
      LANGUAGE plpgsql
      SET search_path = pg_catalog
      AS $function$
      BEGIN
        EXECUTE format('ALTER ROLE moonid_app_staging LOGIN PASSWORD %L', p_password);
      END
      $function$
    `);

    await tx.$queryRaw`
      SELECT pg_temp.set_moonid_app_staging_password(${credential.password}::text)
    `;

    await tx.$executeRawUnsafe(
      "DROP FUNCTION pg_temp.set_moonid_app_staging_password(text)",
    );
  });

  process.stdout.write(`Runtime credential synchronized for ${credential.role}.\n`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Runtime credential synchronization failed.");
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
