-- Reproducible database security objects. A restore/new environment that only runs
-- `prisma migrate deploy` must receive the same append-only audit and Pohoda RPC boundary.

-- ---------- AuditLog append-only + time-bounded retention delete ----------
CREATE OR REPLACE FUNCTION public.audit_log_no_mutate() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog je append-only — operácia % nie je povolená', TG_OP;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_log_delete_retention_only() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $$
BEGIN
  IF OLD."createdAt" < now() - interval '24 months' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'AuditLog je append-only — DELETE je povolený len pre záznamy staršie ako 24 mesiacov';
END;
$$;

DROP TRIGGER IF EXISTS audit_log_no_update ON public."AuditLog";
DROP TRIGGER IF EXISTS audit_log_no_delete ON public."AuditLog";
DROP TRIGGER IF EXISTS audit_log_no_truncate ON public."AuditLog";
CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON public."AuditLog"
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_no_mutate();
CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON public."AuditLog"
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_delete_retention_only();
CREATE TRIGGER audit_log_no_truncate BEFORE TRUNCATE ON public."AuditLog"
  FOR EACH STATEMENT EXECUTE FUNCTION public.audit_log_no_mutate();

-- ---------- Pohoda agent: LOGIN can execute four SECURITY DEFINER RPCs only ----------
-- Supabase's managed `postgres` role is intentionally not a real superuser. Statements
-- containing SUPERUSER, REPLICATION or BYPASSRLS role attributes are therefore rejected
-- even when they only request the safe `NO*` value. PostgreSQL defaults new roles to all
-- three attributes disabled; for an existing role we fail closed if any is unexpectedly on.
DO $role$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pohoda_agent') THEN
    CREATE ROLE pohoda_agent LOGIN NOCREATEDB NOCREATEROLE;
  ELSIF EXISTS (
    SELECT 1
      FROM pg_roles
     WHERE rolname = 'pohoda_agent'
       AND (rolsuper OR rolreplication OR rolbypassrls)
  ) THEN
    RAISE EXCEPTION 'pohoda_agent has an unsafe elevated role attribute';
  END IF;
END
$role$;
ALTER ROLE pohoda_agent LOGIN NOCREATEDB NOCREATEROLE;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM pohoda_agent;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM pohoda_agent;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM pohoda_agent;
GRANT USAGE ON SCHEMA public TO pohoda_agent;

CREATE OR REPLACE FUNCTION public.pohoda_heartbeat(p_agent_version text, p_mserver_ok boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  INSERT INTO public."SyncState"(id, "lastHeartbeatAt", "agentVersion", "updatedAt")
  VALUES ('singleton', now(), p_agent_version, now())
  ON CONFLICT (id) DO UPDATE SET
    "lastHeartbeatAt" = now(), "agentVersion" = p_agent_version, "updatedAt" = now();
END
$$;

CREATE OR REPLACE FUNCTION public.pohoda_get_cursors()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE result jsonb;
BEGIN
  INSERT INTO public."SyncCursor"(id, "updatedAt") VALUES ('singleton', now())
  ON CONFLICT (id) DO NOTHING;
  SELECT to_jsonb(cursor_row) INTO result
    FROM public."SyncCursor" cursor_row WHERE id = 'singleton';
  RETURN result;
END
$$;

CREATE OR REPLACE FUNCTION public.pohoda_ingest_stock(p_items jsonb, p_cursor timestamptz)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE affected integer;
BEGIN
  UPDATE public."Product" product
     SET "stockCache" = (item.elem->>'stock')::numeric, "stockSyncedAt" = now()
    FROM jsonb_array_elements(p_items) AS item(elem)
    JOIN public."ProductLink" link
      ON link."pohodaSku" = (item.elem->>'sku') AND link."linkStatus" = 'ACTIVE'
   WHERE product.id = link."productId" AND (item.elem->>'stock') IS NOT NULL;
  GET DIAGNOSTICS affected = ROW_COUNT;

  INSERT INTO public."SyncCursor"(id, skz, "updatedAt") VALUES ('singleton', p_cursor, now())
  ON CONFLICT (id) DO UPDATE SET skz = p_cursor, "updatedAt" = now();
  INSERT INTO public."SyncState"(id, "lastStockSyncAt", "lastInboundAt", "updatedAt")
  VALUES ('singleton', now(), now(), now())
  ON CONFLICT (id) DO UPDATE SET
    "lastStockSyncAt" = now(), "lastInboundAt" = now(), "updatedAt" = now();
  RETURN affected;
END
$$;

CREATE OR REPLACE FUNCTION public.pohoda_ingest_invoices(p_items jsonb, p_cursor timestamptz)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  affected integer := 0;
  item jsonb;
  company_id text;
  paid_at timestamptz;
  due_at timestamptz;
  invoice_status public."InvoiceStatus";
BEGIN
  FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    SELECT id INTO company_id FROM public."Company" WHERE ico = (item->>'ico');
    IF company_id IS NULL THEN CONTINUE; END IF;

    paid_at := NULLIF(item->>'paidAt', '')::timestamptz;
    due_at := (item->>'dueAt')::timestamptz;
    invoice_status := CASE
      WHEN paid_at IS NOT NULL THEN 'PAID'::public."InvoiceStatus"
      WHEN due_at < now() THEN 'OVERDUE'::public."InvoiceStatus"
      ELSE 'PENDING'::public."InvoiceStatus"
    END;

    INSERT INTO public."Invoice"(
      id, "pohodaNumber", "companyId", status, "issuedAt", "dueAt", "paidAt",
      subtotal, vat, total, "sourceDbYear", "syncedAt", "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid()::text, item->>'pohodaNumber', company_id, invoice_status,
      (item->>'issuedAt')::timestamptz, due_at, paid_at,
      (item->>'subtotal')::numeric, (item->>'vat')::numeric, (item->>'total')::numeric,
      NULLIF(item->>'sourceDbYear', '')::int, now(), now(), now()
    )
    ON CONFLICT ("pohodaNumber") DO UPDATE SET
      status = EXCLUDED.status, "dueAt" = EXCLUDED."dueAt", "paidAt" = EXCLUDED."paidAt",
      subtotal = EXCLUDED.subtotal, vat = EXCLUDED.vat, total = EXCLUDED.total,
      "companyId" = EXCLUDED."companyId", "syncedAt" = now(), "updatedAt" = now();

    INSERT INTO public."DocDedup"(id, "docType", "docNumber", "docDate", "createdAt")
    VALUES (gen_random_uuid()::text, 'FA', item->>'pohodaNumber', (item->>'issuedAt')::timestamptz, now())
    ON CONFLICT ("docType", "docNumber", "docDate") DO NOTHING;
    affected := affected + 1;
  END LOOP;

  INSERT INTO public."SyncCursor"(id, fa, "updatedAt") VALUES ('singleton', p_cursor, now())
  ON CONFLICT (id) DO UPDATE SET fa = p_cursor, "updatedAt" = now();
  INSERT INTO public."SyncState"(id, "lastInboundAt", "updatedAt") VALUES ('singleton', now(), now())
  ON CONFLICT (id) DO UPDATE SET "lastInboundAt" = now(), "updatedAt" = now();
  RETURN affected;
END
$$;

-- CREATE FUNCTION grants EXECUTE to PUBLIC by default. Remove it before the agent grant.
REVOKE EXECUTE ON FUNCTION public.pohoda_heartbeat(text, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pohoda_get_cursors() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pohoda_ingest_stock(jsonb, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pohoda_ingest_invoices(jsonb, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pohoda_heartbeat(text, boolean) TO pohoda_agent;
GRANT EXECUTE ON FUNCTION public.pohoda_get_cursors() TO pohoda_agent;
GRANT EXECUTE ON FUNCTION public.pohoda_ingest_stock(jsonb, timestamptz) TO pohoda_agent;
GRANT EXECUTE ON FUNCTION public.pohoda_ingest_invoices(jsonb, timestamptz) TO pohoda_agent;
