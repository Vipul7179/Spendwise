-- ====================================================================
-- HISBO CONTROL: Migration 003 — Production Read-Only Reporting Setup
-- Target Environment: Spendwise Production Supabase (omnhxlqykmtzxdagppcl)
-- Status: DRAFT / AWAITING USER APPROVAL — DO NOT EXECUTE AUTOMATICALLY
-- ====================================================================
-- SECURITY ARCHITECTURE:
-- 1. Dedicated Schema: Encapsulates reporting routines inside 'reporting' schema.
-- 2. Zero Table Grants: Role 'hisbo_readonly_reporter' has NO direct SELECT,
--    INSERT, UPDATE, or DELETE grants on ANY table in public or auth.
-- 3. Public User Data Protected: public.user_data (financial ledgers) is 100%
--    isolated; the reporting role cannot query it.
-- 4. Minimal Column Exposure: Exposes strictly 6 non-financial attributes:
--    (id, email, name, created_at, last_seen, is_admin). Phone and counters omitted.
-- 5. Hardened SECURITY DEFINER: Owned by postgres, locked search_path = public, pg_temp.
-- 6. PUBLIC Revocation: All default execution privileges revoked from PUBLIC.
-- 7. Resource Constraints: 3-second statement timeout, max 5 connections, NOINHERIT, NOBYPASSRLS.
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- STEP 0: Safe Existence Pre-Check (Fail-Closed)
-- Halts if the reporting schema, role, or routines already exist.
-- --------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'reporting') THEN
    RAISE EXCEPTION 'CRITICAL SAFETY HALT: Schema "reporting" already exists. Halting to avoid overwriting existing objects.'
      USING ERRCODE = '55000';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hisbo_readonly_reporter') THEN
    RAISE EXCEPTION 'CRITICAL SAFETY HALT: Role "hisbo_readonly_reporter" already exists. Halting to avoid overwriting existing role.'
      USING ERRCODE = '55000';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON n.oid = p.pronamespace 
    WHERE n.nspname = 'reporting' AND p.proname IN ('get_user_directory', 'get_user_metrics')
  ) THEN
    RAISE EXCEPTION 'CRITICAL SAFETY HALT: Reporting routine(s) already exist. Halting to avoid overwriting existing objects.'
      USING ERRCODE = '55000';
  END IF;

  -- Verify expected production profiles table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    RAISE EXCEPTION 'CRITICAL SAFETY HALT: Expected table public.profiles does not exist in target database.'
      USING ERRCODE = '42P01';
  END IF;
END $$;

-- --------------------------------------------------------------------
-- STEP 1: Create Dedicated Reporting Schema
-- --------------------------------------------------------------------
CREATE SCHEMA reporting;

-- Revoke all default access to schema
REVOKE ALL ON SCHEMA reporting FROM PUBLIC, anon, authenticated;

-- Ensure future functions created in reporting schema do not grant EXECUTE to PUBLIC
ALTER DEFAULT PRIVILEGES IN SCHEMA reporting 
  REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- --------------------------------------------------------------------
-- STEP 2: Create Dedicated Least-Privilege Role
-- --------------------------------------------------------------------
CREATE ROLE hisbo_readonly_reporter WITH
  LOGIN
  PASSWORD '<USER_SUPPLIED_STRONG_RANDOM_PASSWORD>'
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT
  NOREPLICATION
  NOBYPASSRLS
  CONNECTION LIMIT 5;

-- Enforce strict query timeouts (3 seconds) to protect live production load
ALTER ROLE hisbo_readonly_reporter SET statement_timeout = '3000ms';
ALTER ROLE hisbo_readonly_reporter SET idle_in_transaction_session_timeout = '5000ms';

-- Revoke all access to public and auth schemas
REVOKE ALL ON SCHEMA public FROM hisbo_readonly_reporter;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM hisbo_readonly_reporter;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM hisbo_readonly_reporter;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM hisbo_readonly_reporter;
REVOKE ALL ON SCHEMA auth FROM hisbo_readonly_reporter;
REVOKE ALL ON TABLE public.user_data FROM hisbo_readonly_reporter;

-- Grant USAGE exclusively on the reporting schema
GRANT USAGE ON SCHEMA reporting TO hisbo_readonly_reporter;

-- --------------------------------------------------------------------
-- STEP 3: Create Parameterized Paginated Directory Routine
-- (Clamped strictly to max 50 records per request)
-- --------------------------------------------------------------------
CREATE FUNCTION reporting.get_user_directory(
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  created_at timestamptz,
  last_seen timestamptz,
  is_admin boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT 
    p.id,
    p.email,
    p.name,
    p.created_at,
    p.last_seen,
    p.is_admin
  FROM public.profiles p
  WHERE (
    p_search IS NULL 
    OR p_search = '' 
    OR p.email ILIKE '%' || p_search || '%' 
    OR p.name ILIKE '%' || p_search || '%'
  )
  ORDER BY p.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 50)
  OFFSET GREATEST(p_offset, 0);
$$;

ALTER FUNCTION reporting.get_user_directory(integer, integer, text) OWNER TO postgres;

-- --------------------------------------------------------------------
-- STEP 4: Create Real-Time Aggregate Metrics Routine
-- (Strictly computes read-only platform counts)
-- --------------------------------------------------------------------
CREATE FUNCTION reporting.get_user_metrics()
RETURNS TABLE (
  total_users bigint,
  active_users_30d bigint,
  admin_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT 
    COUNT(*)::bigint AS total_users,
    COUNT(*) FILTER (WHERE last_seen >= now() - interval '30 days')::bigint AS active_users_30d,
    COUNT(*) FILTER (WHERE is_admin = true)::bigint AS admin_count
  FROM public.profiles;
$$;

ALTER FUNCTION reporting.get_user_metrics() OWNER TO postgres;

-- --------------------------------------------------------------------
-- STEP 5: Explicit Privilege Lockdown
-- (Strictly revoke from PUBLIC, grant exclusively to reporting role)
-- --------------------------------------------------------------------
REVOKE ALL ON FUNCTION reporting.get_user_directory(integer, integer, text) 
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION reporting.get_user_metrics() 
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION reporting.get_user_directory(integer, integer, text) 
  TO hisbo_readonly_reporter;
GRANT EXECUTE ON FUNCTION reporting.get_user_metrics() 
  TO hisbo_readonly_reporter;

COMMIT;

