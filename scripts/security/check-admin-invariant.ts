import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const activeAdmins = await prisma.user.count({
    where: { role: "ADMIN", active: true, companyId: null },
  });
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
