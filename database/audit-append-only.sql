-- AuditLog je APPEND-ONLY: žiadny UPDATE ani DELETE riadku po zápise (štandard §7.1).
-- Trigger platí pre VŠETKÝCH (vrátane vlastníka tabuľky a app role cez pooler),
-- na rozdiel od REVOKE, ktoré vlastník tabuľky obíde.
-- Idempotentné — bezpečné spustiť opakovane. Spusti: npm run audit:lock
-- (DDL ako ALTER TABLE nie je riadkový UPDATE/DELETE, takže migrácie schémy trigger neblokuje.)

CREATE OR REPLACE FUNCTION audit_log_no_mutate() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog je append-only — operácia % nie je povolená', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS audit_log_no_update ON "AuditLog";
DROP TRIGGER IF EXISTS audit_log_no_delete ON "AuditLog";

CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_no_mutate();
CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_no_mutate();

-- TRUNCATE NIE je riadkový UPDATE/DELETE → riadkové triggery ho nepokryjú a audit log
-- by sa dal vyprázdniť (SECURITY_AUDIT_2026-06-29.md — L-2). Statement-level BEFORE
-- TRUNCATE trigger platí pre VŠETKÝCH vrátane vlastníka tabuľky (na rozdiel od REVOKE).
DROP TRIGGER IF EXISTS audit_log_no_truncate ON "AuditLog";
CREATE TRIGGER audit_log_no_truncate BEFORE TRUNCATE ON "AuditLog"
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_no_mutate();
