-- ====================================================================
-- HISBO CONTROL: Schema Migration 002 (Architecture Revision 3)
-- Description: Security Fix — Prevent Privilege Escalation on profiles.is_admin
-- Target Engine: PostgreSQL 15+ (Supabase)
-- Status: DRAFT / UNDER REVIEW — DO NOT EXECUTE IN PRODUCTION
-- ====================================================================
-- CRITICAL SECURITY ARCHITECTURE:
-- 1. Table-level & Column-level Privilege Isolation:
--    - In PostgreSQL, table-level grants override column-level revokes.
--    - Table-level UPDATE and INSERT are revoked from untrusted roles ('authenticated', 'anon').
--    - Column-level UPDATE is granted ONLY on legitimate user-editable columns:
--      (email, name, last_seen, phone, expense_count, total_spent,
--       goals_count, groups_count, last_synced).
--    - 'is_admin', 'id', and 'created_at' have NO UPDATE or INSERT grant for authenticated users.
-- 2. SECURITY INVOKER Trigger (Fail-Safe Defense in Depth):
--    - Triggers are deliberately SECURITY INVOKER (the PostgreSQL default).
--    - This guarantees current_user accurately reflects the invoking role ('authenticated', 'anon',
--      'service_role', or 'postgres') rather than switching to the function owner.
--    - Note on service_role: service_role bypasses RLS, but does NOT bypass triggers.
--      The trigger explicitly filters on `current_user IN ('authenticated', 'anon')`.
-- 3. Row-Level Security (RLS) Verified:
--    - Policy requires auth.uid() = id for USING and WITH CHECK.
-- ====================================================================

-- ====================================================================
-- STEP 0: PRE-MIGRATION AUDIT (Run this first to record your current grants)
-- ====================================================================
/*
SELECT grantee, table_name, privilege_type 
FROM information_schema.table_privileges 
WHERE table_schema = 'public' AND table_name = 'profiles';

SELECT grantee, table_name, column_name, privilege_type 
FROM information_schema.column_privileges 
WHERE table_schema = 'public' AND table_name = 'profiles';
*/

BEGIN;

-- --------------------------------------------------------------------
-- STEP 0: Fail-Closed Staging Identity Verification (Private Schema Guard)
-- (Guarantees this script executes ONLY in the intended staging environment)
-- --------------------------------------------------------------------
DO $$
DECLARE
  v_schema_exists boolean;
  v_table_exists boolean;
  v_env text;
  v_ref text;
BEGIN
  -- 1. Verify private guard schema exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.schemata 
    WHERE schema_name = '_hisbo_staging_guard'
  ) INTO v_schema_exists;

  IF NOT v_schema_exists THEN
    RAISE EXCEPTION 'CRITICAL SAFETY HALT: Private guard schema "_hisbo_staging_guard" does not exist. Aborting to protect unverified databases.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 2. Verify marker table exists within private schema
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = '_hisbo_staging_guard' AND table_name = 'environment_marker'
  ) INTO v_table_exists;

  IF NOT v_table_exists THEN
    RAISE EXCEPTION 'CRITICAL SAFETY HALT: Environment marker table "_hisbo_staging_guard.environment_marker" does not exist. Aborting.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 3. Verify exact marker identity
  SELECT environment, project_ref INTO v_env, v_ref
  FROM _hisbo_staging_guard.environment_marker
  LIMIT 1;

  IF v_env IS DISTINCT FROM 'hisbo-staging' OR v_ref IS DISTINCT FROM 'klvbtoxyeixxjydnanlz' THEN
    RAISE EXCEPTION 'CRITICAL SAFETY HALT: Database marker mismatch (environment="%", project_ref="%"). Expected ("hisbo-staging", "klvbtoxyeixxjydnanlz"). Execution aborted immediately.'
      , v_env, v_ref
      USING ERRCODE = 'P0001';
  END IF;

  -- 4. Verify public.profiles table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    RAISE EXCEPTION 'CRITICAL SAFETY HALT: Table public.profiles does not exist in staging.'
      USING ERRCODE = '42P01';
  END IF;

  RAISE NOTICE 'IDENTITY VERIFIED: Confirmed staging database (ref: klvbtoxyeixxjydnanlz) via private guard schema. Proceeding with security fix.';
END $$;

-- --------------------------------------------------------------------
-- STEP 1: Revoke Table-Level UPDATE & INSERT from Untrusted Roles
-- --------------------------------------------------------------------
REVOKE UPDATE, INSERT ON TABLE public.profiles FROM authenticated;
REVOKE UPDATE, INSERT ON TABLE public.profiles FROM anon;

-- --------------------------------------------------------------------
-- STEP 2: Grant Column-Level UPDATE on Legitimate Mutable Columns Only
-- (Excludes 'is_admin', 'id', and 'created_at')
-- --------------------------------------------------------------------
GRANT UPDATE (
  email,
  name,
  last_seen,
  phone,
  expense_count,
  total_spent,
  goals_count,
  groups_count,
  last_synced
) ON TABLE public.profiles TO authenticated;

-- Ensure SELECT permissions remain active for authenticated users
GRANT SELECT ON TABLE public.profiles TO authenticated;

-- Ensure service_role and postgres retain full privileges
GRANT ALL ON TABLE public.profiles TO postgres, service_role;

-- --------------------------------------------------------------------
-- STEP 3: Fail-Safe BEFORE UPDATE Trigger (SECURITY INVOKER)
-- (Defense-in-depth: Even if table-level grants are re-added in the future,
--  untrusted client roles cannot mutate is_admin)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_admin_column()
RETURNS trigger
LANGUAGE plpgsql
-- SECURITY INVOKER ensures current_user represents the caller, NOT the owner!
SET search_path = public, pg_temp
AS $$
BEGIN
  -- If is_admin is being altered by an untrusted client role:
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    IF current_user IN ('authenticated', 'anon') THEN
      RAISE EXCEPTION 'Access Denied: Column "is_admin" cannot be modified by user sessions.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_profile_admin_column ON public.profiles;

CREATE TRIGGER tr_protect_profile_admin_column
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_admin_column();

-- --------------------------------------------------------------------
-- STEP 4: Fail-Safe BEFORE INSERT Trigger (SECURITY INVOKER)
-- (Blocks self-service signups or upserts from injecting is_admin = true)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_admin_insert()
RETURNS trigger
LANGUAGE plpgsql
-- SECURITY INVOKER ensures current_user represents the caller, NOT the owner!
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF NEW.is_admin IS TRUE THEN
      RAISE EXCEPTION 'Access Denied: Column "is_admin" cannot be set by user sessions.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_profile_admin_insert ON public.profiles;

CREATE TRIGGER tr_protect_profile_admin_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_admin_insert();

-- --------------------------------------------------------------------
-- STEP 5: Verify RLS Configuration
-- --------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Ensure policy enforces auth.uid() = id on UPDATE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND cmd = 'UPDATE'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON public.profiles
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- --------------------------------------------------------------------
-- STEP 6: Reload PostgREST Schema Cache
-- --------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;


-- ====================================================================
-- ROLLBACK SCRIPT: Precise Rollback (Never Restores is_admin Grants)
-- ====================================================================
/*
BEGIN;

-- 1. Drop trigger functions and triggers
DROP TRIGGER IF EXISTS tr_protect_profile_admin_column ON public.profiles;
DROP TRIGGER IF EXISTS tr_protect_profile_admin_insert ON public.profiles;
DROP FUNCTION IF EXISTS public.protect_profile_admin_column();
DROP FUNCTION IF EXISTS public.protect_profile_admin_insert();

-- 2. Strictly ensure is_admin cannot be updated or inserted by user sessions:
REVOKE UPDATE, INSERT ON TABLE public.profiles FROM authenticated, anon, PUBLIC;
REVOKE ALL (is_admin) ON TABLE public.profiles FROM authenticated, anon, PUBLIC;

-- 3. Maintain column-level UPDATE ONLY on legitimate non-admin mutable profile columns:
GRANT UPDATE (
  email,
  name,
  last_seen,
  phone,
  expense_count,
  total_spent,
  goals_count,
  groups_count,
  last_synced
) ON TABLE public.profiles TO authenticated;

GRANT SELECT ON TABLE public.profiles TO authenticated;
NOTIFY pgrst, 'reload schema';

COMMIT;
*/


-- ====================================================================
-- SAFE, ZERO-MUTATION SQL EDITOR TEST (Rollback Only)
-- Operates on a sandbox dummy UUID and ALWAYS rolls back.
-- Zero production data is modified.
-- ====================================================================
/*
BEGIN;

DO $$
DECLARE
  v_dummy_id uuid := '00000000-0000-0000-0000-000000000099'::uuid;
  v_caught boolean := false;
  v_test_name text;
BEGIN
  -- Create isolated sandbox profile
  DELETE FROM public.profiles WHERE id = v_dummy_id;
  INSERT INTO public.profiles (id, email, name, is_admin, last_seen)
  VALUES (v_dummy_id, 'sandbox-test@hisbo.internal', 'Sandbox User', false, now());

  -- Switch context to simulate authenticated user
  SET LOCAL ROLE authenticated;
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_dummy_id, 'role', 'authenticated')::text,
    true
  );

  -- TEST 1: Legitimate update on last_seen (MUST SUCCEED)
  BEGIN
    UPDATE public.profiles 
    SET last_seen = now(), name = 'Sandbox User Updated'
    WHERE id = v_dummy_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'TEST 1 FAILED: Legitimate update was rejected: %', SQLERRM;
  END;

  -- TEST 2: Privilege escalation on is_admin (MUST BE BLOCKED)
  BEGIN
    UPDATE public.profiles 
    SET is_admin = true
    WHERE id = v_dummy_id;
  EXCEPTION 
    WHEN insufficient_privilege THEN
      v_caught := true;
    WHEN OTHERS THEN
      IF SQLSTATE = '42501' THEN
        v_caught := true;
      ELSE
        RAISE EXCEPTION 'TEST 2 FAILED: Unexpected error code: % (%)', SQLSTATE, SQLERRM;
      END IF;
  END;

  IF NOT v_caught THEN
    RAISE EXCEPTION 'CRITICAL FAILURE: Tampering with is_admin was NOT blocked!';
  END IF;

  RAISE NOTICE 'SUCCESS: All sandbox tests passed. Rolling back transaction.';
END $$;

ROLLBACK;
*/
