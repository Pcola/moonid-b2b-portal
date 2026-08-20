-- Moonid web runtime: object privileges without ownership, DDL or role-management rights.
-- Run as the schema owner AFTER every `prisma migrate deploy` and BEFORE rotating DATABASE_URL.
-- The actual LOGIN role/password is deliberately provisioned separately (see runbook); secrets
-- must never be committed to this repository.
--
-- IMPORTANT: moonid_runtime_access is currently an application-wide policy. It removes the
-- dangerous BYPASSRLS/owner dependency and keeps anon/authenticated default-deny, but tenant
-- isolation still depends on server-side companyId filters. Per-tenant DB policies require a
-- transaction-local trusted tenant context and are tracked as phase 2 in the runbook.

DO $role$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'moonid_runtime') THEN
    CREATE ROLE moonid_runtime
      NOLOGIN NOCREATEDB NOCREATEROLE INHERIT;
  END IF;
END
$role$;

-- Supabase's managed postgres role is intentionally not a true superuser. PostgreSQL therefore
-- rejects even explicit NOSUPERUSER/NOREPLICATION/NOBYPASSRLS clauses in ALTER ROLE. New roles
-- already default to those safe values; fail closed if they ever differ instead of attempting a
-- privilege change the managed owner is not allowed to make.
DO $privileged_attributes$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM pg_roles
     WHERE rolname = 'moonid_runtime'
       AND (rolsuper OR rolreplication OR rolbypassrls)
  ) THEN
    RAISE EXCEPTION 'moonid_runtime has a forbidden privileged role attribute';
  END IF;
END
$privileged_attributes$;

-- Re-running the script repairs all attributes manageable by Supabase's postgres owner.
ALTER ROLE moonid_runtime
  NOLOGIN NOCREATEDB NOCREATEROLE INHERIT;

REVOKE ALL ON DATABASE postgres FROM moonid_runtime;
GRANT CONNECT ON DATABASE postgres TO moonid_runtime;
REVOKE ALL ON SCHEMA public FROM moonid_runtime;
GRANT USAGE ON SCHEMA public TO moonid_runtime;

DO $tables$
DECLARE
  target record;
BEGIN
  FOR target IN
    SELECT n.nspname AS schema_name, c.relname AS table_name, c.relrowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind IN ('r', 'p')
       AND c.relname <> '_prisma_migrations'
  LOOP
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I.%I TO moonid_runtime',
      target.schema_name,
      target.table_name
    );

    IF target.relrowsecurity AND NOT EXISTS (
      SELECT 1
        FROM pg_policy p
        JOIN pg_class pc ON pc.oid = p.polrelid
        JOIN pg_namespace pn ON pn.oid = pc.relnamespace
       WHERE pn.nspname = target.schema_name
         AND pc.relname = target.table_name
         AND p.polname = 'moonid_runtime_access'
    ) THEN
      EXECUTE format(
        'CREATE POLICY moonid_runtime_access ON %I.%I AS PERMISSIVE FOR ALL TO moonid_runtime USING (true) WITH CHECK (true)',
        target.schema_name,
        target.table_name
      );
    END IF;
  END LOOP;
END
$tables$;

-- CUID keys normally avoid sequences, but this keeps future sequence-backed columns functional.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO moonid_runtime;

-- Immutable/history-bearing records get narrower rights than ordinary operational tables.
REVOKE UPDATE ON TABLE "AuditLog" FROM moonid_runtime;
REVOKE UPDATE, DELETE ON TABLE "OrderStatusEvent" FROM moonid_runtime;
REVOKE DELETE ON TABLE
  "AccessRequest", "Company", "DocDedup", "Invoice", "Order", "PohodaSyncJob",
  "Product", "SyncCursor", "SyncState", "User"
FROM moonid_runtime;

-- Migration metadata belongs exclusively to the migrator/owner identity.
REVOKE ALL ON TABLE "_prisma_migrations" FROM moonid_runtime;

-- No function is granted directly to runtime. PostgreSQL functions that still grant EXECUTE to
-- PUBLIC remain callable; security-sensitive SECURITY DEFINER functions must revoke PUBLIC in
-- their own versioned definition (ako Pohoda RPC v migrácii security_objects).
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM moonid_runtime;
