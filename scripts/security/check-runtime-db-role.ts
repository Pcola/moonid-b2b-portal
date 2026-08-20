import { prisma } from "../../lib/prisma";

type RoleCheck = {
  role_name: string;
  is_superuser: boolean;
  can_create_role: boolean;
  can_create_db: boolean;
  can_replicate: boolean;
  can_bypass_rls: boolean;
  owns_app_tables: boolean;
  can_create_in_public: boolean;
  can_create_in_database: boolean;
  can_update_audit: boolean;
  can_delete_status_events: boolean;
  missing_runtime_policies: number;
};

async function main(): Promise<void> {
  const [check] = await prisma.$queryRaw<RoleCheck[]>`
    SELECT
      current_user::text AS role_name,
      r.rolsuper AS is_superuser,
      r.rolcreaterole AS can_create_role,
      r.rolcreatedb AS can_create_db,
      r.rolreplication AS can_replicate,
      r.rolbypassrls AS can_bypass_rls,
      EXISTS (
        SELECT 1
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public'
           AND c.relkind IN ('r', 'p')
           AND pg_get_userbyid(c.relowner) = current_user
           AND c.relname <> '_prisma_migrations'
      ) AS owns_app_tables,
      has_schema_privilege(current_user, 'public', 'CREATE') AS can_create_in_public,
      has_database_privilege(current_user, current_database(), 'CREATE') AS can_create_in_database,
      has_table_privilege(current_user, 'public."AuditLog"', 'UPDATE') AS can_update_audit,
      has_table_privilege(current_user, 'public."OrderStatusEvent"', 'DELETE') AS can_delete_status_events,
      (
        SELECT count(*)::int
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public'
           AND c.relkind IN ('r', 'p')
           AND c.relrowsecurity
           AND c.relname <> '_prisma_migrations'
           AND NOT EXISTS (
             SELECT 1
               FROM pg_policy p
              WHERE p.polrelid = c.oid
                AND p.polname = 'moonid_runtime_access'
                AND EXISTS (
                  SELECT 1
                    FROM unnest(p.polroles) AS policy_role(role_oid)
                   WHERE pg_has_role(current_user, policy_role.role_oid, 'MEMBER')
                )
           )
      ) AS missing_runtime_policies
    FROM pg_roles r
    WHERE r.rolname = current_user
  `;

  if (!check) throw new Error("Aktuálnu databázovú rolu sa nepodarilo načítať.");

  const violations = [
    check.role_name === "postgres" && "runtime používa owner rolu postgres",
    check.is_superuser && "runtime je SUPERUSER",
    check.can_create_role && "runtime má CREATEROLE",
    check.can_create_db && "runtime má CREATEDB",
    check.can_replicate && "runtime má REPLICATION",
    check.can_bypass_rls && "runtime má BYPASSRLS",
    check.owns_app_tables && "runtime vlastní aplikačné tabuľky",
    check.can_create_in_public && "runtime môže vytvárať objekty v public schéme",
    check.can_create_in_database && "runtime môže vytvárať schémy v databáze",
    check.can_update_audit && "runtime môže meniť AuditLog",
    check.can_delete_status_events && "runtime môže mazať OrderStatusEvent",
    check.missing_runtime_policies > 0 && `${check.missing_runtime_policies} RLS tabuliek nemá runtime policy`,
  ].filter(Boolean);

  process.stdout.write(`${JSON.stringify({ ...check, ok: violations.length === 0, violations }, (_key, value) => typeof value === "bigint" ? Number(value) : value, 2)}\n`);
  if (violations.length > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
