-- ====================================================================
-- Supabase Migration: Dynamic Blog Published & Updated Timestamps
-- ====================================================================
-- This migration ensures that public.blog_posts:
-- 1. Automatically sets `published_at` when a post is first published.
-- 2. Preserves the original `published_at` timestamp when posts are edited.
-- 3. Automatically maintains `updated_at = now()` on every edit.
-- 4. Protects draft posts from being visible publicly.
-- ====================================================================

-- 1. Ensure timestamp and status columns exist safely without recreating tables
alter table if exists public.blog_posts
  add column if not exists published_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists status text not null default 'draft';

-- 2. Backfill published_at for existing published posts if null
update public.blog_posts
set published_at = coalesce(published_at, created_at, now())
where status = 'published' and published_at is null;

-- 3. Trigger function to handle publication and modification timestamps
create or replace function public.handle_blog_post_timestamps()
returns trigger as $$
begin
  -- Automatically update updated_at on every modification
  new.updated_at := now();

  -- If status is 'published' and published_at is null, set or preserve it:
  if new.status = 'published' and new.published_at is null then
    if tg_op = 'UPDATE' and old.published_at is not null then
      new.published_at := old.published_at;
    else
      new.published_at := now();
    end if;
  end if;

  -- On update: never unintentionally overwrite existing published_at with null or future timestamp
  if tg_op = 'UPDATE' and old.published_at is not null and new.published_at is null then
    new.published_at := old.published_at;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- 4. Attach trigger to public.blog_posts
drop trigger if exists trg_blog_posts_timestamps on public.blog_posts;
create trigger trg_blog_posts_timestamps
before insert or update on public.blog_posts
for each row execute function public.handle_blog_post_timestamps();

-- 5. RLS Policy: Draft visibility protection
-- Ensures only published posts with a past or current published_at timestamp can be read publicly
drop policy if exists "Published articles are publicly readable" on public.blog_posts;
create policy "Published articles are publicly readable"
  on public.blog_posts for select
  using (status = 'published' and published_at is not null and published_at <= now());

