-- ====================================================================
-- HISBO CONTROL: Schema Migration 001 (Architecture Revision 2)
-- Description: Admin Roles, Permissions & Tamper-Proof Audit Logging
-- Target Database: hisbo-staging (klvbtoxyeixxjydnanlz) ONLY
-- Status: READY FOR MANUAL EXECUTION
-- ====================================================================
-- PREREQUISITES:
-- 1. Migration 000 (Staging guard & profiles) is present.
-- 2. Migration 002 (is_admin privilege escalation fix) has already run.
-- ====================================================================
-- SECURITY & DATA INTEGRITY GUARANTEES:
-- 1. Transactional: Runs entirely within a single BEGIN/COMMIT block.
-- 2. Fail-Closed: Halts execution if staging marker is missing or mismatched.
-- 3. Incompatible Object Safety: Halts safely if incompatible objects exist.
-- 4. Account Preservation: Existing profile records and admin accounts are
--    preserved. Existing admins (is_admin = true) receive role = 'admin'.
-- 5. Migration 002 Preservation: Preserves tr_protect_profile_admin_column
--    and tr_protect_profile_admin_insert without modification.
-- 6. Role Escalation Prevention: Revokes UPDATE (role) from client roles and
--    installs defense-in-depth triggers (protect_profile_role_column / insert).
-- 7. Audit Log Tamper-Proofing: Revokes INSERT, UPDATE, DELETE from client
--    roles. Client sessions cannot forge, modify, or delete audit logs.
--    Only trusted server-side operations (service_role) can append records.
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- STEP 0: Fail-Closed Staging Identity & Object Compatibility Verification
-- --------------------------------------------------------------------
DO $$
DECLARE
  v_schema_exists boolean;
  v_table_exists boolean;
  v_env text;
  v_ref text;
  v_col_type text;
  v_obj_type text;
BEGIN
  -- 1. Verify private guard schema exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.schemata 
    WHERE schema_name = '_hisbo_staging_guard'
  ) INTO v_schema_exists;

  IF NOT v_schema_exists THEN
    RAISE EXCEPTION 'CRITICAL SAFETY HALT: Private guard schema "_hisbo_staging_guard" does not exist. Migration 001 cannot execute on unverified databases.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 2. Verify environment marker table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = '_hisbo_staging_guard' AND table_name = 'environment_marker'
  ) INTO v_table_exists;

  IF NOT v_table_exists THEN
    RAISE EXCEPTION 'CRITICAL SAFETY HALT: Environment marker table "_hisbo_staging_guard.environment_marker" does not exist.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 3. Verify exact staging marker identity
  SELECT environment, project_ref INTO v_env, v_ref
  FROM _hisbo_staging_guard.environment_marker
  LIMIT 1;

  IF v_env IS DISTINCT FROM 'hisbo-staging' OR v_ref IS DISTINCT FROM 'klvbtoxyeixxjydnanlz' THEN
    RAISE EXCEPTION 'CRITICAL SAFETY HALT: Database marker mismatch (environment="%", project_ref="%"). Expected ("hisbo-staging", "klvbtoxyeixxjydnanlz"). Execution aborted immediately.'
      , v_env, v_ref
      USING ERRCODE = 'P0001';
  END IF;

  -- 4. Verify public.profiles table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    RAISE EXCEPTION 'CRITICAL SAFETY HALT: Table public.profiles does not exist in staging database.'
      USING ERRCODE = '42P01';
  END IF;

  -- 5. Incompatible object check: If 'role' column already exists, verify its data type
  SELECT data_type INTO v_col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role';

  IF v_col_type IS NOT NULL AND v_col_type NOT IN ('text', 'character varying') THEN
    RAISE EXCEPTION 'CRITICAL SAFETY HALT: Column public.profiles.role exists with incompatible data type: %.'
      , v_col_type
      USING ERRCODE = '55000';
  END IF;

  -- 6. Incompatible object check: If 'admin_audit_logs' exists, verify it is a base table
  SELECT table_type INTO v_obj_type
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'admin_audit_logs';

  IF v_obj_type IS NOT NULL AND v_obj_type <> 'BASE TABLE' THEN
    RAISE EXCEPTION 'CRITICAL SAFETY HALT: Object public.admin_audit_logs exists but is not a regular table (type: %).'
      , v_obj_type
      USING ERRCODE = '55000';
  END IF;

  RAISE NOTICE 'IDENTITY & COMPATIBILITY VERIFIED: Safe to proceed with Migration 001 on hisbo-staging.';
END $$;

-- --------------------------------------------------------------------
-- STEP 1: Add 'role' Column to public.profiles & Preserve Existing Accounts
-- --------------------------------------------------------------------
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles 
      ADD COLUMN role text DEFAULT 'user' 
      CHECK (role IN ('super_admin', 'admin', 'viewer', 'user'));
  ELSE
    -- Safely refresh the check constraint if column already exists
    ALTER TABLE public.profiles 
      DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles 
      ADD CONSTRAINT profiles_role_check 
      CHECK (role IN ('super_admin', 'admin', 'viewer', 'user'));
  END IF;
END $$;

-- Backfill existing verified administrators to have 'admin' role if currently null or 'user'
-- Preserves accounts that already have 'super_admin' or 'viewer'
UPDATE public.profiles 
SET role = 'admin' 
WHERE is_admin = true 
  AND (role IS NULL OR role = 'user');

-- Backfill existing standard users to have 'user' role if currently null
UPDATE public.profiles
SET role = 'user'
WHERE (is_admin IS FALSE OR is_admin IS NULL)
  AND role IS NULL;

-- --------------------------------------------------------------------
-- STEP 2: Privilege Hardening on public.profiles.role
-- --------------------------------------------------------------------
-- Clean up obsolete/redundant privilege escalation function and trigger from earlier drafts.
-- Note: Migration 002's tr_protect_profile_admin_column and tr_protect_profile_admin_insert
-- are PRESERVED 100% intact and untouched.
DROP TRIGGER IF EXISTS tr_protect_admin_privileges ON public.profiles;
DROP FUNCTION IF EXISTS public.protect_admin_privilege_escalation();

-- Revoke all table-level and column-level modification rights on 'role' from untrusted roles
REVOKE UPDATE, INSERT ON TABLE public.profiles FROM authenticated, anon, PUBLIC;
REVOKE ALL (role) ON TABLE public.profiles FROM authenticated, anon, PUBLIC;

-- Re-affirm and preserve Migration 002 column-level UPDATE permissions:
-- Authenticated users retain UPDATE ONLY on legitimate mutable user columns (excludes is_admin and role)
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

-- Allow authenticated users to view their profile and assigned role
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT SELECT (role) ON TABLE public.profiles TO authenticated;

-- Fail-safe defense-in-depth trigger on 'role' UPDATE (SECURITY INVOKER)
-- Guarantees that untrusted client sessions cannot alter roles even if table-level
-- UPDATE privileges are accidentally granted in the future.
CREATE OR REPLACE FUNCTION public.protect_profile_role_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF current_user IN ('authenticated', 'anon') THEN
      RAISE EXCEPTION 'Access Denied: Column "role" cannot be modified by user sessions.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_profile_role_column ON public.profiles;
CREATE TRIGGER tr_protect_profile_role_column
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role_column();

-- Fail-safe defense-in-depth trigger on 'role' INSERT (SECURITY INVOKER)
-- Prevents self-service signups or client INSERTs from assigning administrative roles.
CREATE OR REPLACE FUNCTION public.protect_profile_role_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF NEW.role IS NOT NULL AND NEW.role <> 'user' THEN
      RAISE EXCEPTION 'Access Denied: Administrative role cannot be assigned by user sessions.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_profile_role_insert ON public.profiles;
CREATE TRIGGER tr_protect_profile_role_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role_insert();

-- --------------------------------------------------------------------
-- STEP 3: Create / Update public.admin_audit_logs Table
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz NOT NULL DEFAULT now(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email text NOT NULL,
  action text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'auth', 'users', 'admins', 'roles', 'blogs', 'banners', 'monitoring', 'settings', 'security'
  )),
  details text,
  ip_hash text,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'denied')),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_timestamp ON public.admin_audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON public.admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_category ON public.admin_audit_logs(category);

-- If the table already existed, ensure check constraints include all current categories & statuses
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'admin_audit_logs'
  ) THEN
    ALTER TABLE public.admin_audit_logs 
      DROP CONSTRAINT IF EXISTS admin_audit_logs_category_check;
    
    ALTER TABLE public.admin_audit_logs 
      ADD CONSTRAINT admin_audit_logs_category_check 
      CHECK (category IN (
        'auth', 'users', 'admins', 'roles', 'blogs', 'banners', 'monitoring', 'settings', 'security'
      ));

    ALTER TABLE public.admin_audit_logs 
      DROP CONSTRAINT IF EXISTS admin_audit_logs_status_check;
    
    ALTER TABLE public.admin_audit_logs 
      ADD CONSTRAINT admin_audit_logs_status_check 
      CHECK (status IN ('success', 'failed', 'denied'));
  END IF;
END $$;

-- --------------------------------------------------------------------
-- STEP 4: Configure Row-Level Security & Privilege Hardening on Audit Logs
-- (Restricts INSERT exclusively to trusted server-side service_role)
-- --------------------------------------------------------------------
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Remove any legacy policies that might allow client-side INSERT
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Server can insert audit logs" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.admin_audit_logs;

-- Policy: Only verified administrators can SELECT audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );

-- STRICT TAMPER PROOFING:
-- No INSERT, UPDATE, or DELETE policies are granted to authenticated or anon.
-- Revoke all table-level mutation privileges from client roles:
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.admin_audit_logs FROM authenticated, anon, PUBLIC;

-- Grant SELECT only to authenticated users (governed by RLS above)
GRANT SELECT ON TABLE public.admin_audit_logs TO authenticated;

-- Service role and postgres retain full access for trusted server-side logging
GRANT ALL ON TABLE public.admin_audit_logs TO postgres, service_role;

-- --------------------------------------------------------------------
-- STEP 5: Reload PostgREST Schema Cache
-- --------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ====================================================================
-- READ-ONLY POST-MIGRATION VERIFICATION QUERIES
-- (Run separately in Supabase SQL Editor after executing the migration above)
-- ====================================================================
-- 1. Verify 'role' column on public.profiles:
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role';
--
-- 2. Verify admin accounts have valid roles assigned:
-- SELECT id, email, is_admin, role 
-- FROM public.profiles 
-- WHERE is_admin = true;
--
-- 3. Verify public.admin_audit_logs columns:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'admin_audit_logs'
-- ORDER BY ordinal_position;
--
-- 4. Verify category check constraint:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'public.admin_audit_logs'::regclass;
--
-- 5. Verify privileges on admin_audit_logs (MUST show only SELECT for authenticated, NO INSERT/UPDATE/DELETE):
-- SELECT grantee, privilege_type
-- FROM information_schema.table_privileges
-- WHERE table_schema = 'public' AND table_name = 'admin_audit_logs';
--
-- 6. Verify triggers on public.profiles (tr_protect_profile_admin_* and tr_protect_profile_role_* must be present):
-- SELECT trigger_name, event_manipulation, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_schema = 'public' AND event_object_table = 'profiles';
