-- ====================================================================
-- HISBO STAGING: Migration 002 — Profiles is_admin Security Fix Rollback
-- Target Environment: hisbo-staging (klvbtoxyeixxjydnanlz)
-- Status: PRECISE ROLLBACK SCRIPT (SAFE: NEVER RESTORES IS_ADMIN GRANTS)
-- ====================================================================

BEGIN;

-- 1. Drop trigger functions and triggers
DROP TRIGGER IF EXISTS tr_protect_profile_admin_column ON public.profiles;
DROP TRIGGER IF EXISTS tr_protect_profile_admin_insert ON public.profiles;
DROP FUNCTION IF EXISTS public.protect_profile_admin_column();
DROP FUNCTION IF EXISTS public.protect_profile_admin_insert();

-- 2. Strictly ensure is_admin CANNOT be modified or inserted by user sessions:
--    Explicitly revoke any table-level or column-level access to is_admin from untrusted roles
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

-- Ensure SELECT permissions remain active
GRANT SELECT ON TABLE public.profiles TO authenticated;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
