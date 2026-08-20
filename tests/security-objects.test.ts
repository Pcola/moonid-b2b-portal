import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
afterAll(async () => prisma.$disconnect());

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
        has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
        has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute,
        has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_execute,
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
});
