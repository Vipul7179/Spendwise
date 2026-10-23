-- ====================================================================
-- ROLLBACK 005: Revert Blog Management Enhancements
-- Application: hisbo-control & hisbo-next
-- ====================================================================

DO $$
BEGIN
  -- Drop indexes
  DROP INDEX IF EXISTS public.idx_blog_posts_tags;
  DROP INDEX IF EXISTS public.idx_blog_posts_is_featured;

  -- Drop check constraints
  ALTER TABLE public.blog_posts DROP CONSTRAINT IF EXISTS blog_posts_author_position_check;

  -- Drop columns safely
  ALTER TABLE public.blog_posts DROP COLUMN IF EXISTS author_position;
  ALTER TABLE public.blog_posts DROP COLUMN IF EXISTS tags;
  ALTER TABLE public.blog_posts DROP COLUMN IF EXISTS is_featured;

  RAISE NOTICE 'Rollback of migration 005 completed successfully.';
END $$;

