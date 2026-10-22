-- ====================================================================
-- HISBO CONTROL: Migration 004 — Production Content & Platform Management Setup
-- Target Environment: Spendwise Production Supabase (omnhxlqykmtzxdagppcl)
-- Status: DRAFT / AWAITING USER APPROVAL — DO NOT EXECUTE AUTOMATICALLY
-- ====================================================================
-- SECURITY & ISOLATION ARCHITECTURE:
-- 1. Dedicated Least-Privilege Role: 'hisbo_platform_operator'
--    - Scoped strictly to manage content (blogs, banners, platform settings).
--    - Granted execute access to reporting schema routines (user directory & metrics).
-- 2. FINANCIAL DATA 100% ISOLATED & INACCESSIBLE:
--    - Zero access to public.user_data (customer transaction ledgers).
--    - Zero direct access to public.profiles (access only via hardened reporting routines).
--    - Zero access to auth.users.
-- 3. Dedicated Platform Settings Table:
--    - Creates public.platform_settings for managing live site configuration.
-- 4. Resource & Session Limits:
--    - 5-second statement timeout, max 5 connections, NOINHERIT, NOBYPASSRLS.
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- STEP 0: Dependency & Existing Schema Pre-Check (Fail-Closed)
-- --------------------------------------------------------------------
DO $$
BEGIN
  -- 1. Verify Migration 003 reporting schema exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'reporting') THEN
    RAISE EXCEPTION 'CRITICAL SAFETY HALT: Dependency missing: schema "reporting" does not exist. Apply migration 003_production_reporting_setup.sql first.'
      USING ERRCODE = '3F000';
  END IF;

  -- 2. Prevent overwriting existing operator role
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hisbo_platform_operator') THEN
    RAISE EXCEPTION 'CRITICAL SAFETY HALT: Role "hisbo_platform_operator" already exists. Halting to avoid overwriting existing credentials or configuration.'
      USING ERRCODE = '55000';
  END IF;

  -- 3. Verify target production content tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blog_posts') THEN
    RAISE EXCEPTION 'CRITICAL SAFETY HALT: Expected table public.blog_posts does not exist in target database.'
      USING ERRCODE = '42P01';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blog_categories') THEN
    RAISE EXCEPTION 'CRITICAL SAFETY HALT: Expected table public.blog_categories does not exist in target database.'
      USING ERRCODE = '42P01';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'banners') THEN
    RAISE EXCEPTION 'CRITICAL SAFETY HALT: Expected table public.banners does not exist in target database.'
      USING ERRCODE = '42P01';
  END IF;

  -- 4. Verify target customer financial tables exist (so they are guaranteed to be protected)
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_data') THEN
    RAISE EXCEPTION 'CRITICAL SAFETY HALT: Expected table public.user_data does not exist in target database.'
      USING ERRCODE = '42P01';
  END IF;
END $$;

-- --------------------------------------------------------------------
-- STEP 1: Create Platform Settings Table
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);

-- Seed baseline configuration defaults (without placeholder phone numbers)
INSERT INTO public.platform_settings (key, value, description)
VALUES 
  ('maintenance_mode', '{"enabled": false, "message": "Hisbo is currently undergoing scheduled platform maintenance. Please check back shortly."}'::jsonb, 'Global maintenance mode toggle and customer notice banner'),
  ('allow_signups', '{"enabled": true}'::jsonb, 'Control customer registration availability'),
  ('announcement_bar', '{"enabled": false, "message": "", "link": ""}'::jsonb, 'Top promotional announcement bar across web endpoints'),
  ('support_contact', '{"email": "support@hisbo.in", "phone": ""}'::jsonb, 'Official contact metadata displayed in platform footers')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS on platform_settings
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access strictly to user-facing platform settings
DROP POLICY IF EXISTS "Public can view platform settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Public can view public platform settings" ON public.platform_settings;
CREATE POLICY "Public can view public platform settings"
  ON public.platform_settings FOR SELECT
  TO anon, authenticated
  USING (key IN ('maintenance_mode', 'allow_signups', 'announcement_bar', 'support_contact'));

-- --------------------------------------------------------------------
-- STEP 2: Create Dedicated Platform Operator Role
-- --------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hisbo_platform_operator') THEN
    CREATE ROLE hisbo_platform_operator WITH
      LOGIN
      PASSWORD '<USER_SUPPLIED_STRONG_RANDOM_PASSWORD>'
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOINHERIT
      NOREPLICATION
      NOBYPASSRLS
      CONNECTION LIMIT 5;
  END IF;
END $$;

-- Enforce strict statement timeouts
ALTER ROLE hisbo_platform_operator SET statement_timeout = '5000ms';
ALTER ROLE hisbo_platform_operator SET idle_in_transaction_session_timeout = '5000ms';

-- Revoke all default privileges
REVOKE ALL ON SCHEMA public FROM hisbo_platform_operator;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM hisbo_platform_operator;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM hisbo_platform_operator;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM hisbo_platform_operator;
REVOKE ALL ON SCHEMA auth FROM hisbo_platform_operator;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO hisbo_platform_operator;
GRANT USAGE ON SCHEMA reporting TO hisbo_platform_operator;

-- --------------------------------------------------------------------
-- STEP 3: Grant Scoped Table Permissions
-- --------------------------------------------------------------------

-- 1. Blog Management (Posts & Categories)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.blog_posts TO hisbo_platform_operator;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.blog_categories TO hisbo_platform_operator;

-- 2. Banner Management
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.banners TO hisbo_platform_operator;

-- 3. Platform Settings
GRANT SELECT, INSERT, UPDATE ON TABLE public.platform_settings TO hisbo_platform_operator;

-- 4. Reporting Schema Execution (Read-Only Customer Directory & Metrics)
GRANT EXECUTE ON FUNCTION reporting.get_user_directory(integer, integer, text) TO hisbo_platform_operator;
GRANT EXECUTE ON FUNCTION reporting.get_user_metrics() TO hisbo_platform_operator;

-- --------------------------------------------------------------------
-- STEP 4: Configure Explicit Row-Level Security Policies for Operator Role
-- (Enables hisbo_platform_operator with NOBYPASSRLS to manage content safely)
-- --------------------------------------------------------------------

-- 1. Blog Posts RLS
DROP POLICY IF EXISTS "Operator manage blog posts" ON public.blog_posts;
CREATE POLICY "Operator manage blog posts"
  ON public.blog_posts FOR ALL
  TO hisbo_platform_operator
  USING (true)
  WITH CHECK (true);

-- 2. Blog Categories RLS
DROP POLICY IF EXISTS "Operator manage blog categories" ON public.blog_categories;
CREATE POLICY "Operator manage blog categories"
  ON public.blog_categories FOR ALL
  TO hisbo_platform_operator
  USING (true)
  WITH CHECK (true);

-- 3. Banners RLS
DROP POLICY IF EXISTS "Operator manage banners" ON public.banners;
CREATE POLICY "Operator manage banners"
  ON public.banners FOR ALL
  TO hisbo_platform_operator
  USING (true)
  WITH CHECK (true);

-- 4. Platform Settings RLS
DROP POLICY IF EXISTS "Operator manage platform settings" ON public.platform_settings;
CREATE POLICY "Operator manage platform settings"
  ON public.platform_settings FOR ALL
  TO hisbo_platform_operator
  USING (true)
  WITH CHECK (true);

-- --------------------------------------------------------------------
-- STEP 5: CRITICAL SAFETY CHECK — ISOLATE FINANCIAL DATA
-- --------------------------------------------------------------------
REVOKE ALL ON TABLE public.user_data FROM hisbo_platform_operator;
REVOKE ALL ON TABLE public.profiles FROM hisbo_platform_operator;
REVOKE ALL ON SCHEMA auth FROM hisbo_platform_operator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM hisbo_platform_operator;

COMMIT;

