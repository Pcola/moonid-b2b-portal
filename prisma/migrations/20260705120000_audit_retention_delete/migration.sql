-- Retencia AuditLogu (GDPR čl. 5(1)(e) — minimalizácia uchovávania):
-- append-only DELETE trigger po novom povolí zmazať IBA záznamy staršie ako 24 mesiacov
-- (retenčný purge v lib/retention.ts). UPDATE a TRUNCATE ostávajú plne zakázané.
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

DROP TRIGGER IF EXISTS audit_log_no_delete ON "AuditLog";
CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_delete_retention_only();
