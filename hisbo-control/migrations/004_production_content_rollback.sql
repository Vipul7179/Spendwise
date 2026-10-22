-- ====================================================================
-- HISBO CONTROL: Migration 004 — Production Content Setup Rollback
-- Target Environment: Spendwise Production Supabase (omnhxlqykmtzxdagppcl)
-- Status: PRECISE ROLLBACK SCRIPT (Removes ONLY Migration 004 additions)
-- ====================================================================
-- SAFETY GUARANTEES:
-- 1. Does not drop blog_posts, blog_categories, banners, or customer tables.
-- 2. Disconnects any active operator sessions before dropping role.
-- 3. Drops only platform_settings table and hisbo_platform_operator role.
-- ====================================================================

-- Step 1: Disconnect any active hisbo_platform_operator sessions
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE usename = 'hisbo_platform_operator'
  AND pid <> pg_backend_pid();

BEGIN;

-- Step 2: Drop RLS policies depending on operator role
DROP POLICY IF EXISTS "Operator manage blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Operator manage blog categories" ON public.blog_categories;
DROP POLICY IF EXISTS "Operator manage banners" ON public.banners;
DROP POLICY IF EXISTS "Operator manage platform settings" ON public.platform_settings;

-- Step 3: Revoke table and routine permissions
REVOKE ALL ON TABLE public.blog_posts FROM hisbo_platform_operator;
REVOKE ALL ON TABLE public.blog_categories FROM hisbo_platform_operator;
REVOKE ALL ON TABLE public.banners FROM hisbo_platform_operator;
REVOKE ALL ON TABLE public.platform_settings FROM hisbo_platform_operator;
REVOKE EXECUTE ON FUNCTION reporting.get_user_directory(integer, integer, text) FROM hisbo_platform_operator;
REVOKE EXECUTE ON FUNCTION reporting.get_user_metrics() FROM hisbo_platform_operator;

-- Step 4: Preserve platform_settings table and records by default
-- Table is retained so existing configuration data is NOT lost during rollback.
-- Only operator role privileges and policies were revoked above.
-- (If you explicitly wish to drop the settings table, run manually: DROP TABLE IF EXISTS public.platform_settings;)

-- Step 5: Drop dedicated role
DROP ROLE IF EXISTS hisbo_platform_operator;

COMMIT;

