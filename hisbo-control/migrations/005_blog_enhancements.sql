-- ====================================================================
-- MIGRATION 005: Blog Management Enhancements
-- Application: hisbo-control & hisbo-next
-- Target: Spendwise PostgreSQL Database (Staging & Production)
--
-- Features:
-- 1. Adds author_position (designation/role, max 80 chars).
-- 2. Adds tags (text array for multi-tag categorization).
-- 3. Adds is_featured (boolean flag for homepage article highlighting).
-- 4. Creates GIN index on tags and partial index on is_featured.
-- 5. Preserves existing data, indexes, constraints, and RLS policies.
-- ====================================================================

DO $$
BEGIN
  -- Verify table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'blog_posts'
  ) THEN
    RAISE EXCEPTION 'CRITICAL: Table public.blog_posts does not exist.';
  END IF;

  -- 1. Author Position / Designation
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'blog_posts' AND column_name = 'author_position'
  ) THEN
    ALTER TABLE public.blog_posts ADD COLUMN author_position text;
    ALTER TABLE public.blog_posts ADD CONSTRAINT blog_posts_author_position_check
      CHECK (author_position IS NULL OR (char_length(author_position) >= 1 AND char_length(author_position) <= 80));
    RAISE NOTICE 'Added author_position column to public.blog_posts.';
  END IF;

  -- 2. Article Tags Array
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'blog_posts' AND column_name = 'tags'
  ) THEN
    ALTER TABLE public.blog_posts ADD COLUMN tags text[] DEFAULT '{}'::text[];
    CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON public.blog_posts USING gin (tags);
    RAISE NOTICE 'Added tags column and GIN index to public.blog_posts.';
  END IF;

  -- 3. Featured Article Toggle
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'blog_posts' AND column_name = 'is_featured'
  ) THEN
    ALTER TABLE public.blog_posts ADD COLUMN is_featured boolean DEFAULT false;
    CREATE INDEX IF NOT EXISTS idx_blog_posts_is_featured ON public.blog_posts (is_featured) WHERE is_featured = true;
    RAISE NOTICE 'Added is_featured column and partial index to public.blog_posts.';
  END IF;

  -- 4. Refresh permissions for hisbo_platform_operator if role exists
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hisbo_platform_operator') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.blog_posts TO hisbo_platform_operator;
    RAISE NOTICE 'Granted permissions on updated columns to hisbo_platform_operator.';
  END IF;

END $$;

