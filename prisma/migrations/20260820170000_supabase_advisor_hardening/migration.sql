-- Supabase exposes the public schema through its Data API. Keep Prisma's migration metadata
-- owner-only and satisfy defense-in-depth checks even if a future grant is added accidentally.
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."_prisma_migrations" FROM PUBLIC, anon, authenticated, service_role;

-- Supabase can assign explicit EXECUTE grants to API roles, so revoking only PUBLIC is not
-- sufficient. These SECURITY DEFINER RPCs are an intentionally narrow Pohoda-agent boundary.
REVOKE EXECUTE ON FUNCTION public.pohoda_heartbeat(text, boolean)
  FROM PUBLIC, anon, authenticated, service_role, moonid_runtime;
REVOKE EXECUTE ON FUNCTION public.pohoda_get_cursors()
  FROM PUBLIC, anon, authenticated, service_role, moonid_runtime;
REVOKE EXECUTE ON FUNCTION public.pohoda_ingest_stock(jsonb, timestamptz)
  FROM PUBLIC, anon, authenticated, service_role, moonid_runtime;
REVOKE EXECUTE ON FUNCTION public.pohoda_ingest_invoices(jsonb, timestamptz)
  FROM PUBLIC, anon, authenticated, service_role, moonid_runtime;

GRANT EXECUTE ON FUNCTION public.pohoda_heartbeat(text, boolean) TO pohoda_agent;
GRANT EXECUTE ON FUNCTION public.pohoda_get_cursors() TO pohoda_agent;
GRANT EXECUTE ON FUNCTION public.pohoda_ingest_stock(jsonb, timestamptz) TO pohoda_agent;
GRANT EXECUTE ON FUNCTION public.pohoda_ingest_invoices(jsonb, timestamptz) TO pohoda_agent;
