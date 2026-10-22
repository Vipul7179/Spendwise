-- ====================================================================
-- HISBO CONTROL: Schema Migration 001 Rollback Script (Non-Destructive)
-- Target Database: hisbo-staging (klvbtoxyeixxjydnanlz) ONLY
-- Status: MANUAL REVIEW ONLY — DO NOT EXECUTE AUTOMATICALLY
-- ====================================================================
-- SAFETY & DATA RETENTION GUARANTEES:
-- 1. PRESERVES AUDIT LOGS BY DEFAULT: Does NOT drop public.admin_audit_logs.
--    Historical audit trail records remain fully preserved and intact.
-- 2. PRESERVES ROLES BY DEFAULT: Does NOT drop the public.profiles.role column.
--    Existing admin and user role assignments remain fully intact.
-- 3. PRESERVES MIGRATION 002 PROTECTIONS:
--    - tr_protect_profile_admin_column and tr_protect_profile_admin_insert remain active.
--    - Column-level UPDATE remains granted ONLY on legitimate user fields.
--    - Table-level UPDATE/INSERT and is_admin/role updates remain strictly revoked from client roles.
-- 4. Fail-Closed: Verifies staging environment marker before execution.
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- STEP 0: Fail-Closed Staging Identity Verification
-- --------------------------------------------------------------------
DO $$
DECLARE
  v_env text;
  v_ref text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = '_hisbo_staging_guard' AND table_name = 'environment_marker'
  ) THEN
    RAISE EXCEPTION 'CRITICAL SAFETY HALT: Environment marker missing. Aborting rollback.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT environment, project_ref INTO v_env, v_ref
  FROM _hisbo_staging_guard.environment_marker
  LIMIT 1;

  IF v_env IS DISTINCT FROM 'hisbo-staging' OR v_ref IS DISTINCT FROM 'klvbtoxyeixxjydnanlz' THEN
    RAISE EXCEPTION 'CRITICAL SAFETY HALT: Database marker mismatch ("%", "%"). Aborting rollback.'
      , v_env, v_ref
      USING ERRCODE = 'P0001';
  END IF;
END $$;

-- --------------------------------------------------------------------
-- STEP 1: Revert Role-Protection Triggers & Functions (Reverts to Pre-001)
-- --------------------------------------------------------------------
DROP TRIGGER IF EXISTS tr_protect_profile_role_column ON public.profiles;
DROP TRIGGER IF EXISTS tr_protect_profile_role_insert ON public.profiles;
DROP FUNCTION IF EXISTS public.protect_profile_role_column();
DROP FUNCTION IF EXISTS public.protect_profile_role_insert();

-- --------------------------------------------------------------------
-- STEP 2: Secure & Preserve public.admin_audit_logs Records by Default
-- (Historical audit trail is NOT deleted; client tamper-proofing is maintained)
-- --------------------------------------------------------------------
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.admin_audit_logs FROM authenticated, anon, PUBLIC;
GRANT SELECT ON TABLE public.admin_audit_logs TO authenticated;
GRANT ALL ON TABLE public.admin_audit_logs TO postgres, service_role;

-- --------------------------------------------------------------------
-- STEP 3: Secure & Preserve public.profiles.role Column by Default
-- (Existing role assignments are NOT deleted; client mutation is blocked)
-- --------------------------------------------------------------------
REVOKE ALL (role) ON TABLE public.profiles FROM authenticated, anon, PUBLIC;
GRANT SELECT (role) ON TABLE public.profiles TO authenticated;

-- --------------------------------------------------------------------
-- STEP 4: Confirm Migration 002 Protections & Safe Column Grants Remain Active
-- --------------------------------------------------------------------
REVOKE UPDATE, INSERT ON TABLE public.profiles FROM authenticated, anon, PUBLIC;
REVOKE ALL (is_admin) ON TABLE public.profiles FROM authenticated, anon, PUBLIC;

-- Re-affirm legitimate column-level update permissions from Migration 002:
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

-- --------------------------------------------------------------------
-- STEP 5: Reload PostgREST Schema Cache
-- --------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ====================================================================
-- OPTIONAL DESTRUCTIVE PURGE (COMMENTED OUT — NOT EXECUTED BY DEFAULT)
-- Only run if you explicitly need to completely destroy audit logs & roles:
-- ====================================================================
-- DROP TABLE IF EXISTS public.admin_audit_logs CASCADE;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;
