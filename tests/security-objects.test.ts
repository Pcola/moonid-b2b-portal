import { afterAll, describe, expect, it } from "vitest";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
afterAll(async () => prisma.$disconnect());

function usesDisposableCiDatabase(): boolean {
  if (process.env.CI !== "true") return false;
  try {
    return ["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL ?? "").hostname);
  } catch {
    return false;
  }
}

const invariantIt = usesDisposableCiDatabase() ? it : it.skip;

describe("reprodukovateľné DB bezpečnostné objekty", () => {
  it("AuditLog má UPDATE, DELETE aj TRUNCATE ochranný trigger", async () => {
    const rows = await prisma.$queryRaw<{ trigger_name: string }[]>`
      SELECT tgname::text AS trigger_name
        FROM pg_trigger
       WHERE tgrelid = 'public."AuditLog"'::regclass
         AND NOT tgisinternal
       ORDER BY tgname`;
    expect(rows.map((row) => row.trigger_name)).toEqual([
      "audit_log_no_delete",
      "audit_log_no_truncate",
      "audit_log_no_update",
    ]);
  });

  it("Pohoda RPC sú SECURITY DEFINER dostupné iba agentovi a agent nie je elevated", async () => {
    const functions = await prisma.$queryRaw<{
      name: string;
      security_definer: boolean;
      public_execute: boolean;
      anon_execute: boolean;
      authenticated_execute: boolean;
      service_role_execute: boolean;
      agent_execute: boolean;
    }[]>`
      SELECT
        p.proname::text AS name,
        p.prosecdef AS security_definer,
        EXISTS (
          SELECT 1 FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) acl
           WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
        ) AS public_execute,
        COALESCE((
          SELECT has_function_privilege(r.oid, p.oid, 'EXECUTE')
          FROM pg_roles r WHERE r.rolname = 'anon'
        ), false) AS anon_execute,
        COALESCE((
          SELECT has_function_privilege(r.oid, p.oid, 'EXECUTE')
          FROM pg_roles r WHERE r.rolname = 'authenticated'
        ), false) AS authenticated_execute,
        COALESCE((
          SELECT has_function_privilege(r.oid, p.oid, 'EXECUTE')
          FROM pg_roles r WHERE r.rolname = 'service_role'
        ), false) AS service_role_execute,
        has_function_privilege('pohoda_agent', p.oid, 'EXECUTE') AS agent_execute
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname IN ('pohoda_heartbeat', 'pohoda_get_cursors', 'pohoda_ingest_stock', 'pohoda_ingest_invoices')
      ORDER BY p.proname`;
    expect(functions).toHaveLength(4);
    expect(functions.every((fn) =>
      fn.security_definer
      && !fn.public_execute
      && !fn.anon_execute
      && !fn.authenticated_execute
      && !fn.service_role_execute
      && fn.agent_execute
    )).toBe(true);

    const [agent] = await prisma.$queryRaw<{ elevated: boolean }[]>`
      SELECT (rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR rolbypassrls) AS elevated
        FROM pg_roles WHERE rolname = 'pohoda_agent'`;
    expect(agent?.elevated).toBe(false);
  });

  it("User identity lifecycle má DB constraints a ochranné triggery", async () => {
    const triggers = await prisma.$queryRaw<{ trigger_name: string }[]>`
      SELECT tgname::text AS trigger_name
        FROM pg_trigger
       WHERE tgrelid = 'public."User"'::regclass
         AND NOT tgisinternal
         AND tgname IN (
           'user_identity_class_immutable',
           'user_identity_lifecycle_lock',
           'user_last_active_admin',
           'user_last_active_customer_admin',
           'user_auth_id_immutable',
           'user_no_truncate'
         )
       ORDER BY tgname`;
    expect(triggers.map((row) => row.trigger_name)).toEqual([
      "user_auth_id_immutable",
      "user_identity_class_immutable",
      "user_identity_lifecycle_lock",
      "user_last_active_admin",
      "user_last_active_customer_admin",
      "user_no_truncate",
    ]);

    const constraints = await prisma.$queryRaw<{ constraint_name: string }[]>`
      SELECT conname::text AS constraint_name
        FROM pg_constraint
       WHERE conrelid = 'public."User"'::regclass
         AND conname IN ('User_auth_sync_state_check', 'User_internal_company_check')
       ORDER BY conname`;
    expect(constraints.map((row) => row.constraint_name)).toEqual([
      "User_auth_sync_state_check",
      "User_internal_company_check",
    ]);
  });

  invariantIt("DB odmietne prechod medzi internou a zákazníckou identitou", async () => {
    const authId = "zz-security-internal-class";
    await expect(prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { authId, email: "zz-security-internal-class@test.invalid", role: "STAFF" },
      });
      await tx.user.update({
        where: { id: user.id },
        data: { role: "CUSTOMER_USER" },
      });
    })).rejects.toThrow();
    expect(await prisma.user.findUnique({ where: { authId } })).toBeNull();
  });

  invariantIt("DB odmietne automatické prepojenie User na iné Supabase authId", async () => {
    const authId = "zz-security-auth-binding";
    await expect(prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { authId, email: "zz-security-auth-binding@test.invalid", role: "STAFF" },
      });
      await tx.user.update({ where: { id: user.id }, data: { authId: `${authId}-other` } });
    })).rejects.toThrow();
    expect(await prisma.user.findUnique({ where: { authId } })).toBeNull();
  });

  invariantIt("DB nedovolí deaktivovať posledného platného interného admina", async () => {
    const authIds = ["zz-security-admin-a", "zz-security-admin-b"];
    await expect(prisma.$transaction(async (tx) => {
      const first = await tx.user.create({
        data: { authId: authIds[0], email: "zz-security-admin-a@test.invalid", role: "ADMIN" },
      });
      const second = await tx.user.create({
        data: { authId: authIds[1], email: "zz-security-admin-b@test.invalid", role: "ADMIN" },
      });
      await tx.user.update({ where: { id: first.id }, data: { role: "STAFF" } });
      await tx.user.update({ where: { id: second.id }, data: { active: false } });
    })).rejects.toThrow();
    expect(await prisma.user.count({ where: { authId: { in: authIds } } })).toBe(0);
  });

  invariantIt("dve súbežné deaktivácie ponechajú presne jedného interného admina", async () => {
    const authIds = ["zz-security-admin-race-a", "zz-security-admin-race-b"];
    expect(await prisma.user.count({ where: { role: "ADMIN", active: true, companyId: null } })).toBe(0);
    await prisma.user.createMany({
      data: [
        { authId: authIds[0], email: "zz-security-admin-race-a@test.invalid", role: "ADMIN" },
        { authId: authIds[1], email: "zz-security-admin-race-b@test.invalid", role: "ADMIN" },
      ],
    });

    try {
      const deactivate = (authId: string) => prisma.$transaction(
        (tx) => tx.user.update({ where: { authId }, data: { active: false } }),
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );
      const outcomes = await Promise.allSettled(authIds.map(deactivate));

      expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
      expect(outcomes.filter((outcome) => outcome.status === "rejected")).toHaveLength(1);
      expect(await prisma.user.count({
        where: { authId: { in: authIds }, role: "ADMIN", active: true, companyId: null },
      })).toBe(1);
    } finally {
      // Výhradne efemérny CI Postgres: upratanie zámerne obíde preserve-only trigger.
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SET LOCAL session_replication_role = replica");
        await tx.user.deleteMany({ where: { authId: { in: authIds } } });
      });
    }
  });

  invariantIt("lifecycle mutáciu mimo READ COMMITTED odmietne fail-closed", async () => {
    const authId = "zz-security-isolation";
    await expect(prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { authId, email: "zz-security-isolation@test.invalid", role: "STAFF" },
      });
      await tx.user.update({ where: { id: user.id }, data: { active: false } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })).rejects.toThrow();
    expect(await prisma.user.findUnique({ where: { authId } })).toBeNull();
  });

  invariantIt("DB e-mail unikátnosť je case-insensitive rovnako ako Supabase Auth", async () => {
    const authIds = ["zz-security-email-a", "zz-security-email-b"];
    await expect(prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: { authId: authIds[0], email: "Case-Sensitive@Test.Invalid", role: "STAFF" },
      });
      await tx.user.create({
        data: { authId: authIds[1], email: "case-sensitive@test.invalid", role: "STAFF" },
      });
    })).rejects.toThrow();
    expect(await prisma.user.count({ where: { authId: { in: authIds } } })).toBe(0);
  });

  invariantIt("DB nedovolí aktívnej firme stratiť posledného CUSTOMER_ADMIN", async () => {
    const authIds = ["zz-security-customer-admin-a", "zz-security-customer-admin-b"];
    await expect(prisma.$transaction(async (tx) => {
      const tier = await tx.priceTier.create({
        data: { code: "ZZSECADM", name: "Security admin invariant", discountPct: 0 },
      });
      const company = await tx.company.create({
        data: { ico: "99009908", name: "Security invariant company", priceTierId: tier.id },
      });
      const first = await tx.user.create({
        data: { authId: authIds[0], email: "zz-security-customer-admin-a@test.invalid", role: "CUSTOMER_ADMIN", companyId: company.id },
      });
      const second = await tx.user.create({
        data: { authId: authIds[1], email: "zz-security-customer-admin-b@test.invalid", role: "CUSTOMER_ADMIN", companyId: company.id },
      });
      await tx.user.update({ where: { id: first.id }, data: { role: "CUSTOMER_USER" } });
      await tx.user.update({ where: { id: second.id }, data: { active: false } });
    })).rejects.toThrow();
    expect(await prisma.user.count({ where: { authId: { in: authIds } } })).toBe(0);
  });
});
