-- Supabase exposes the public schema through its Data API. Keep Prisma's migration metadata
-- owner-only and satisfy defense-in-depth checks even if a future grant is added accidentally.
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."_prisma_migrations" FROM PUBLIC;

-- Supabase can assign explicit EXECUTE grants to API roles, so revoking only PUBLIC is not
-- sufficient. These SECURITY DEFINER RPCs are an intentionally narrow Pohoda-agent boundary.
REVOKE EXECUTE ON FUNCTION public.pohoda_heartbeat(text, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pohoda_get_cursors() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pohoda_ingest_stock(jsonb, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pohoda_ingest_invoices(jsonb, timestamptz) FROM PUBLIC;

-- Plain PostgreSQL test/dev databases do not contain Supabase API roles, and moonid_runtime is
-- provisioned after Prisma on a brand-new environment. Revoke from each role only when present.
DO $revoke_api_roles$
DECLARE target_role text;
BEGIN
  FOREACH target_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role', 'moonid_runtime']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = target_role) THEN
      EXECUTE format('REVOKE ALL ON TABLE public."_prisma_migrations" FROM %I', target_role);
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION public.pohoda_heartbeat(text, boolean) FROM %I',
        target_role
      );
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION public.pohoda_get_cursors() FROM %I',
        target_role
      );
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION public.pohoda_ingest_stock(jsonb, timestamptz) FROM %I',
        target_role
      );
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION public.pohoda_ingest_invoices(jsonb, timestamptz) FROM %I',
        target_role
      );
    END IF;
  END LOOP;
END
$revoke_api_roles$;

GRANT EXECUTE ON FUNCTION public.pohoda_heartbeat(text, boolean) TO pohoda_agent;
GRANT EXECUTE ON FUNCTION public.pohoda_get_cursors() TO pohoda_agent;
GRANT EXECUTE ON FUNCTION public.pohoda_ingest_stock(jsonb, timestamptz) TO pohoda_agent;
GRANT EXECUTE ON FUNCTION public.pohoda_ingest_invoices(jsonb, timestamptz) TO pohoda_agent;
