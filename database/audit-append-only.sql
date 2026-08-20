-- AuditLog je APPEND-ONLY: žiadny UPDATE ani TRUNCATE; DELETE je povolený VÝLUČNE
-- pre záznamy staršie ako 24 mesiacov (retenčný purge — GDPR čl. 5(1)(e), lib/retention.ts).
-- Trigger platí pre VŠETKÝCH (vrátane vlastníka tabuľky a app role cez pooler),
-- na rozdiel od REVOKE, ktoré vlastník tabuľky obíde.
-- Legacy break-glass mirror. Kanonická definícia je vo verzovanej Prisma migrácii
-- 20260820150000_security_objects a nasadzuje sa cez `prisma migrate deploy`.
-- (DDL ako ALTER TABLE nie je riadkový UPDATE/DELETE, takže migrácie schémy trigger neblokuje.)

CREATE OR REPLACE FUNCTION audit_log_no_mutate() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog je append-only — operácia % nie je povolená', TG_OP;
END;
$$;

-- DELETE variant s retenčnou výnimkou (migrácia 20260705120000_audit_retention_delete)
CREATE OR REPLACE FUNCTION audit_log_delete_retention_only() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $$
BEGIN
  IF OLD."createdAt" < now() - interval '24 months' THEN
    RETURN OLD; -- povolené: retenčné mazanie po uplynutí lehoty
  END IF;
  RAISE EXCEPTION 'AuditLog je append-only — DELETE je povolený len pre záznamy staršie ako 24 mesiacov';
END;
$$;

DROP TRIGGER IF EXISTS audit_log_no_update ON "AuditLog";
DROP TRIGGER IF EXISTS audit_log_no_delete ON "AuditLog";

CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_no_mutate();
CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_delete_retention_only();

-- TRUNCATE NIE je riadkový UPDATE/DELETE → riadkové triggery ho nepokryjú a audit log
-- by sa dal vyprázdniť (SECURITY_AUDIT_2026-06-29.md — L-2). Statement-level BEFORE
-- TRUNCATE trigger platí pre VŠETKÝCH vrátane vlastníka tabuľky (na rozdiel od REVOKE).
DROP TRIGGER IF EXISTS audit_log_no_truncate ON "AuditLog";
CREATE TRIGGER audit_log_no_truncate BEFORE TRUNCATE ON "AuditLog"
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_no_mutate();
