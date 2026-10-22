-- ====================================================================
-- HISBO STAGING: Dedicated Private Schema Marker Setup
-- Target Project Reference: klvbtoxyeixxjydnanlz
-- Target URL: https://klvbtoxyeixxjydnanlz.supabase.co
-- Status: STANDALONE ONE-TIME SETUP — EXECUTE ONLY IN HISBO-STAGING
-- ====================================================================
-- SAFETY ARCHITECTURE:
-- 1. Stored in a dedicated private schema (_hisbo_staging_guard), NOT public.
-- 2. Completely hidden from PostgREST API (not exposed via HTTP).
-- 3. Access strictly revoked from anon, authenticated, and service_role.
-- 4. Only postgres and supabase_admin can inspect or manage this table.
-- ====================================================================

BEGIN;

-- 1. Create dedicated private schema
CREATE SCHEMA IF NOT EXISTS _hisbo_staging_guard;

-- 2. Lock down schema permissions (Zero access for client roles or service_role)
REVOKE ALL ON SCHEMA _hisbo_staging_guard FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA _hisbo_staging_guard TO postgres, supabase_admin;

-- 3. Create private marker table
CREATE TABLE IF NOT EXISTS _hisbo_staging_guard.environment_marker (
  environment text PRIMARY KEY,
  project_ref text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Lock down table permissions (Zero access for client roles or service_role)
REVOKE ALL ON TABLE _hisbo_staging_guard.environment_marker FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON TABLE _hisbo_staging_guard.environment_marker TO postgres, supabase_admin;

-- 5. Insert verified staging identity marker
INSERT INTO _hisbo_staging_guard.environment_marker (environment, project_ref)
VALUES ('hisbo-staging', 'klvbtoxyeixxjydnanlz')
ON CONFLICT (environment) DO UPDATE 
  SET project_ref = EXCLUDED.project_ref;

COMMIT;

-- Verification check (Run in SQL Editor to confirm marker is active)
SELECT * FROM _hisbo_staging_guard.environment_marker;

