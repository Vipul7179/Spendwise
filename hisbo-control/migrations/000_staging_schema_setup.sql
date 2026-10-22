-- ====================================================================
-- HISBO STAGING SETUP SCRIPT: Isolated Test Environment
-- Target Project Reference: klvbtoxyeixxjydnanlz
-- Target URL: https://klvbtoxyeixxjydnanlz.supabase.co
-- Status: DRAFT / AWAITING USER APPROVAL — DO NOT EXECUTE AUTOMATICALLY
-- ====================================================================
-- FAIL-CLOSED SAFETY MECHANISM:
-- This script CANNOT execute unless the database has been initialized with
-- the private staging environment marker: _hisbo_staging_guard.environment_marker.
-- If executed against production, it fails immediately and aborts.
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- STEP 0: Fail-Closed Database Identity Check (Private Schema Guard)
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
    RAISE EXCEPTION 'CRITICAL SAFETY HALT: Private guard schema "_hisbo_staging_guard" does not exist. This script is strictly forbidden from executing on unverified databases. Halting immediately.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 2. Verify marker table exists within private schema
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = '_hisbo_staging_guard' AND table_name = 'environment_marker'
  ) INTO v_table_exists;

  IF NOT v_table_exists THEN
    RAISE EXCEPTION 'CRITICAL SAFETY HALT: Environment marker table "_hisbo_staging_guard.environment_marker" does not exist. Halting immediately.'
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

  RAISE NOTICE 'IDENTITY VERIFIED: Confirmed staging database (ref: klvbtoxyeixxjydnanlz) via private guard schema. Proceeding with staging setup.';
END $$;

-- --------------------------------------------------------------------
-- STEP 1: Enable Schema Usage & API Exposure
-- (Accounts for disabled automatic table exposure during staging setup)
-- --------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;

-- --------------------------------------------------------------------
-- STEP 2: Create public.profiles Table
-- (Mirrors the exact 12-column structure of Hisbo production)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  is_admin boolean NOT NULL DEFAULT false,
  phone text,
  expense_count integer NOT NULL DEFAULT 0,
  total_spent numeric NOT NULL DEFAULT 0,
  goals_count integer NOT NULL DEFAULT 0,
  groups_count integer NOT NULL DEFAULT 0,
  last_synced timestamptz
);

CREATE INDEX IF NOT EXISTS idx_staging_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_staging_profiles_is_admin ON public.profiles(is_admin);

-- --------------------------------------------------------------------
-- STEP 3: Configure Row-Level Security (RLS) & Column Privilege Hardening
-- (Fixes profiles.is_admin privilege escalation vulnerability by default)
-- --------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  TO authenticated 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Restrict UPDATE to legitimate mutable columns only (excludes is_admin, id, created_at)
REVOKE ALL ON TABLE public.profiles FROM authenticated, anon;
GRANT SELECT ON TABLE public.profiles TO authenticated;
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
GRANT ALL ON TABLE public.profiles TO postgres, service_role;

-- Fail-safe defense-in-depth triggers (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.protect_profile_admin_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
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

CREATE OR REPLACE FUNCTION public.protect_profile_admin_insert()
RETURNS trigger
LANGUAGE plpgsql
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
-- STEP 4: Configure Automatic Profile Creation on User Signup
-- (Exact reproduction of production public.handle_new_user definition)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, supabase_admin;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- --------------------------------------------------------------------
-- STEP 5: Reload PostgREST Schema Cache
-- --------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;
