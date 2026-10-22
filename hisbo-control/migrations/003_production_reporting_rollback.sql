-- ====================================================================
-- HISBO CONTROL: Migration 003 — Production Reporting Rollback
-- Target Environment: Spendwise Production Supabase (omnhxlqykmtzxdagppcl)
-- Status: PRECISE ROLLBACK SCRIPT (Removes ONLY Migration 003 objects)
-- ====================================================================
-- SAFETY GUARANTEES:
-- 1. Does not drop or alter any public tables, auth tables, or financial data.
-- 2. Terminates active reporting connections cleanly before role deletion.
-- 3. Drops only reporting schema routines and the dedicated reporting role.
-- ====================================================================

-- Step 1: Disconnect any active hisbo_readonly_reporter sessions
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE usename = 'hisbo_readonly_reporter'
  AND pid <> pg_backend_pid();

BEGIN;

-- Step 2: Revoke function execution privileges
REVOKE ALL ON FUNCTION reporting.get_user_directory(integer, integer, text) FROM hisbo_readonly_reporter;
REVOKE ALL ON FUNCTION reporting.get_user_metrics() FROM hisbo_readonly_reporter;

-- Step 3: Drop routines created in Migration 003
DROP FUNCTION IF EXISTS reporting.get_user_directory(integer, integer, text);
DROP FUNCTION IF EXISTS reporting.get_user_metrics();

-- Step 4: Revoke schema privileges and drop the reporting schema
REVOKE USAGE ON SCHEMA reporting FROM hisbo_readonly_reporter;
DROP SCHEMA IF EXISTS reporting CASCADE;

-- Step 5: Drop the dedicated reporting role
DROP ROLE IF EXISTS hisbo_readonly_reporter;

COMMIT;

