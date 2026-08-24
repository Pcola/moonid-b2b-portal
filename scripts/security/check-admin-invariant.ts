import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseAllowEmpty(args: string[]): boolean {
  if (args.length === 0) return false;
  if (args.length === 1 && args[0] === "--allow-empty") return true;
  throw new Error(`Unsupported admin invariant arguments: ${args.join(" ")}`);
}

async function main() {
  const allowEmpty = parseAllowEmpty(process.argv.slice(2));
  const [state] = await prisma.$queryRaw<{ totalUsers: bigint; activeAdmins: bigint }[]>`
    SELECT
      count(*) AS "totalUsers",
      count(*) FILTER (
        WHERE "role"::text = 'ADMIN'
          AND "active" = true
          AND "companyId" IS NULL
      ) AS "activeAdmins"
    FROM public."User"`;
  const totalUsers = Number(state?.totalUsers ?? 0);
  const activeAdmins = Number(state?.activeAdmins ?? 0);

  if (allowEmpty && totalUsers === 0) {
    console.log("Admin invariant deferred because the User table is empty.");
    return;
  }
  if (activeAdmins < 1) {
    throw new Error("Deployment blocked: at least one active internal ADMIN is required.");
  }
  console.log(`Admin invariant verified (${activeAdmins} active internal ADMIN account(s)).`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Admin invariant verification failed.");
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
