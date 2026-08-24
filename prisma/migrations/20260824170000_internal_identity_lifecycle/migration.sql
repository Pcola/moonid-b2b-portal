BEGIN;

LOCK TABLE public."User" IN ACCESS EXCLUSIVE MODE;

-- Fail-fast pred DDL: migrácia nesmie potichu uzamknúť nekonzistentné legacy dáta.
DO $preflight$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public."User"
     WHERE "role"::text IN ('STAFF', 'ADMIN') AND "companyId" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Preflight failed: internal User rows linked to a Company must be remediated first';
  END IF;

  IF EXISTS (
    SELECT lower("email")
      FROM public."User"
     GROUP BY lower("email")
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Preflight failed: case-insensitive duplicate User emails must be remediated first';
  END IF;
END;
$preflight$;

-- Durable synchronizácia User.active <-> Supabase Auth ban/unban.
ALTER TABLE "User"
  ADD COLUMN "authSyncPending" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "authDesiredActive" BOOLEAN,
  ADD COLUMN "authManagedBan" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "authSyncedAt" TIMESTAMP(3);

ALTER TABLE "User"
  ADD CONSTRAINT "User_auth_sync_state_check"
  CHECK (
    ("authSyncPending" = true AND "authDesiredActive" IS NOT NULL)
    OR
    ("authSyncPending" = false AND "authDesiredActive" IS NULL)
  );

-- Interná identita nikdy nesmie patriť firme. Zákaznícke konto môže byť dočasne bez
-- firmy počas onboardingu, ale prechod medzi customer/internal triedou je samostatná,
-- výslovná bezpečnostná migrácia — nie obyčajný app update/upsert.
ALTER TABLE "User"
  ADD CONSTRAINT "User_internal_company_check"
  CHECK ("role"::text NOT IN ('STAFF', 'ADMIN') OR "companyId" IS NULL);

-- Supabase Auth normalizuje e-mail case-insensitive; rovnakú invariantnú unikátnosť
-- musí mať aj app DB, inak by vznikli dve identity líšiace sa iba veľkosťou písmen.
CREATE UNIQUE INDEX "User_email_lower_key" ON "User" (lower("email"));

CREATE OR REPLACE FUNCTION public.enforce_user_identity_class()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  old_internal boolean := OLD."role"::text IN ('STAFF', 'ADMIN');
  new_internal boolean := NEW."role"::text IN ('STAFF', 'ADMIN');
BEGIN
  IF old_internal <> new_internal THEN
    RAISE EXCEPTION 'User identity class cannot be changed between internal and customer'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_identity_class_immutable ON public."User";
CREATE TRIGGER user_identity_class_immutable
BEFORE UPDATE OF "role", "companyId" ON public."User"
FOR EACH ROW EXECUTE FUNCTION public.enforce_user_identity_class();

COMMENT ON FUNCTION public.enforce_user_identity_class() IS
  'Prevents accidental or malicious CUSTOMER_* <-> STAFF/ADMIN conversion via generic upsert.';

CREATE OR REPLACE FUNCTION public.enforce_user_auth_id_immutable()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SET search_path = ''
AS $$
BEGIN
  IF OLD."authId" <> NEW."authId" THEN
    RAISE EXCEPTION 'User authId cannot be rebound automatically'
      USING
        ERRCODE = '23514',
        CONSTRAINT = 'User_auth_id_immutable_guard',
        SCHEMA = 'public',
        TABLE = 'User';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_auth_id_immutable ON public."User";
CREATE TRIGGER user_auth_id_immutable
BEFORE UPDATE OF "authId" ON public."User"
FOR EACH ROW EXECUTE FUNCTION public.enforce_user_auth_id_immutable();

-- Každý SQL príkaz meniaci identity získava lock ešte na statement úrovni, teda pred
-- row lockmi. App vrstva používa rovnaký kľúč; jednotné poradie predchádza deadlocku.
CREATE OR REPLACE FUNCTION public.acquire_user_identity_lifecycle_lock()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SET search_path = ''
AS $$
BEGIN
  IF pg_catalog.current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'User lifecycle mutations require READ COMMITTED isolation'
      USING ERRCODE = '25000';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('moonid:user-identity-lifecycle:v1', 0)
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS user_identity_lifecycle_lock ON public."User";
CREATE TRIGGER user_identity_lifecycle_lock
BEFORE UPDATE OF "role", "active", "companyId" OR DELETE ON public."User"
FOR EACH STATEMENT EXECUTE FUNCTION public.acquire_user_identity_lifecycle_lock();

-- Posledný platný aktívny ADMIN je databázová invarianta, nie iba UI pravidlo.
-- Row trigger chráni aj manuálny SQL/import a po statement locku bezpečne vyhodnotí
-- dve súbežné transakcie, ktoré by sa pokúsili odstrániť dvoch adminov.
CREATE OR REPLACE FUNCTION public.enforce_last_active_internal_admin()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  old_is_admin boolean := OLD."role"::text = 'ADMIN' AND OLD."active" AND OLD."companyId" IS NULL;
  new_is_admin boolean := false;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    new_is_admin := NEW."role"::text = 'ADMIN' AND NEW."active" AND NEW."companyId" IS NULL;
  END IF;

  IF old_is_admin AND NOT new_is_admin AND NOT EXISTS (
    SELECT 1
      FROM public."User" AS candidate
     WHERE candidate."id" <> OLD."id"
       AND candidate."role"::text = 'ADMIN'
       AND candidate."active" = true
       AND candidate."companyId" IS NULL
  ) THEN
    RAISE EXCEPTION 'At least one active internal ADMIN must remain'
      USING
        ERRCODE = '23514',
        CONSTRAINT = 'User_last_active_admin_guard',
        SCHEMA = 'public',
        TABLE = 'User';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_last_active_admin ON public."User";
CREATE TRIGGER user_last_active_admin
BEFORE UPDATE OF "role", "active", "companyId" OR DELETE ON public."User"
FOR EACH ROW EXECUTE FUNCTION public.enforce_last_active_internal_admin();

COMMENT ON FUNCTION public.enforce_last_active_internal_admin() IS
  'Serializes User lifecycle changes and prevents removal of the last valid active internal ADMIN.';

COMMENT ON FUNCTION public.acquire_user_identity_lifecycle_lock() IS
  'Acquires the shared transaction advisory lock before User identity row locks are taken.';

-- Rovnaká DB ochrana pre každý tenant: aktívna firma nesmie súbežnými zmenami
-- prísť o posledného aktívneho CUSTOMER_ADMIN.
CREATE OR REPLACE FUNCTION public.enforce_last_active_customer_admin()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SET search_path = ''
AS $$
DECLARE
  old_is_admin boolean := OLD."role"::text = 'CUSTOMER_ADMIN' AND OLD."active" AND OLD."companyId" IS NOT NULL;
  new_is_same_company_admin boolean := false;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    new_is_same_company_admin := NEW."role"::text = 'CUSTOMER_ADMIN'
      AND NEW."active"
      AND NEW."companyId" = OLD."companyId";
  END IF;

  IF old_is_admin
    AND NOT new_is_same_company_admin
    AND EXISTS (
      SELECT 1 FROM public."Company" AS company
       WHERE company."id" = OLD."companyId" AND company."active" = true
    )
    AND NOT EXISTS (
      SELECT 1
        FROM public."User" AS candidate
       WHERE candidate."id" <> OLD."id"
         AND candidate."companyId" = OLD."companyId"
         AND candidate."role"::text = 'CUSTOMER_ADMIN'
         AND candidate."active" = true
    )
  THEN
    RAISE EXCEPTION 'At least one active CUSTOMER_ADMIN must remain for an active Company'
      USING
        ERRCODE = '23514',
        CONSTRAINT = 'User_last_active_customer_admin_guard',
        SCHEMA = 'public',
        TABLE = 'User';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_last_active_customer_admin ON public."User";
CREATE TRIGGER user_last_active_customer_admin
BEFORE UPDATE OF "role", "active", "companyId" OR DELETE ON public."User"
FOR EACH ROW EXECUTE FUNCTION public.enforce_last_active_customer_admin();

COMMENT ON FUNCTION public.enforce_last_active_customer_admin() IS
  'Prevents an active tenant from losing its last active CUSTOMER_ADMIN.';

-- TRUNCATE obchádza row triggery. User je bezpečnostná identitná tabuľka, preto ho
-- blokujeme bez výnimky; reset prostredia sa robí drop/recreate schémy, nie runtime SQL.
CREATE OR REPLACE FUNCTION public.prevent_user_truncate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'User identity table cannot be truncated'
    USING ERRCODE = '23514';
END;
$$;

DROP TRIGGER IF EXISTS user_no_truncate ON public."User";
CREATE TRIGGER user_no_truncate
BEFORE TRUNCATE ON public."User"
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_user_truncate();

COMMENT ON FUNCTION public.prevent_user_truncate() IS
  'Prevents TRUNCATE from bypassing identity-class and last-admin row invariants.';

REVOKE EXECUTE ON FUNCTION public.enforce_user_identity_class() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_user_auth_id_immutable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.acquire_user_identity_lifecycle_lock() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_last_active_internal_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_last_active_customer_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_user_truncate() FROM PUBLIC;

COMMIT;
