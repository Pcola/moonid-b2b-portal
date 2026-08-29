-- Supabase may apply explicit default table grants to its Data API roles. RLS is
-- already enabled, but password-reset state gets a second independent deny layer.
DO $revoke_api_roles$
DECLARE target_role text;
BEGIN
  FOREACH target_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = target_role) THEN
      EXECUTE format(
        'REVOKE ALL ON TABLE public."PasswordSetupGrant" FROM %I',
        target_role
      );
    END IF;
  END LOOP;
END
$revoke_api_roles$;

CREATE INDEX "PasswordSetupGrant_userId_idx" ON "PasswordSetupGrant"("userId");
