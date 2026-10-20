import { createPublicClient } from './supabase/public';
import { BlogPost, BlogCategory } from '@/types/blog';

export const BLOG_PAGE_SIZE = 6;

export class BlogDataError extends Error {
  constructor(public kind: 'config' | 'network') {
    super(kind === 'config' ? 'The journal is not configured.' : 'Could not load the journal. Please try again.');
    this.name = 'BlogDataError';
  }
}

function blogFailureKind(): 'config' | 'network' {
  return process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'network' : 'config';
}

export function formatBlogDate(value: string | null | undefined, includeTime = false): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  if (includeTime) {
    options.hour = 'numeric';
    options.minute = '2-digit';
    options.hour12 = true;
  }
  return new Intl.DateTimeFormat('en-IN', options).format(date);
}

export function formatRelativeTime(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60);
    return `${m} min${m === 1 ? '' : 's'} ago`;
  }
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600);
    return `${h} hour${h === 1 ? '' : 's'} ago`;
  }
  if (diffSec < 86400 * 30) {
    const d = Math.floor(diffSec / 86400);
    return `${d} day${d === 1 ? '' : 's'} ago`;
  }
  if (diffSec < 86400 * 365) {
    const mo = Math.floor(diffSec / (86400 * 30));
    return `${mo} month${mo === 1 ? '' : 's'} ago`;
  }
  const y = Math.floor(diffSec / (86400 * 365));
  return `${y} year${y === 1 ? '' : 's'} ago`;
}

export function isSignificantlyUpdated(pubDate: string | null | undefined, upDate: string | null | undefined): boolean {
  if (!pubDate || !upDate) return false;
  const p = new Date(pubDate).getTime();
  const u = new Date(upDate).getTime();
  if (Number.isNaN(p) || Number.isNaN(u)) return false;
  return (u - p) > (15 * 60 * 1000);
}

export function blogTimestampMeta(post: BlogPost | null | undefined) {
  if (!post) {
    return {
      pubDate: '',
      pubTime: '',
      isUpdated: false,
      upDate: '',
      upTime: '',
      upRelative: '',
      cardLabel: 'Recently published',
      cardTitle: ''
    };
  }

  const pubDate = formatBlogDate(post.published_at);
  const pubTime = formatBlogDate(post.published_at, true);
  const isUpdated = isSignificantlyUpdated(post.published_at, post.updated_at);
  const upDate = isUpdated ? formatBlogDate(post.updated_at) : '';
  const upTime = isUpdated ? formatBlogDate(post.updated_at, true) : '';
  const upRelative = isUpdated ? formatRelativeTime(post.updated_at) : '';
  const cardLabel = pubDate
    ? (isUpdated ? `${pubDate} (updated ${upRelative})` : pubDate)
    : (upDate ? `Updated ${upDate}` : 'Recently published');
  const cardTitle = pubTime
    ? `Published: ${pubTime}${isUpdated ? ' · Updated: ' + upTime : ''}`
    : '';

  return { pubDate, pubTime, isUpdated, upDate, upTime, upRelative, cardLabel, cardTitle };
}

export function safeBlogImage(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = String(url).trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
    return '';
  } catch {
    return trimmed.startsWith('/') ? trimmed : '';
  }
}

export async function getPublishedBlogPosts(options?: {
  limit?: number;
  offset?: number;
  categoryId?: string;
  search?: string;
}): Promise<{ posts: BlogPost[]; total: number; error?: 'config' | 'network' }> {
  try {
    const supabase = createPublicClient();
    const now = new Date().toISOString();

    let query = supabase
      .from('blog_posts')
      .select('*', { count: 'exact' })
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .lte('published_at', now)
      .order('published_at', { ascending: false });

    if (options?.categoryId && options.categoryId !== 'all') {
      query = query.eq('category_id', options.categoryId);
    }

    if (options?.search && options.search.trim()) {
      const term = options.search.trim();
      query = query.or(`title.ilike.%${term}%,excerpt.ilike.%${term}%`);
    }

    if (options?.limit) {
      const start = options.offset || 0;
      query = query.range(start, start + options.limit - 1);
    }

    const { data, count, error } = await query;
    if (error) {
      console.error('[Blog] Error fetching posts:', error);
      return { posts: [], total: 0, error: 'network' };
    }

    return {
      posts: (data as BlogPost[]) || [],
      total: count || 0
    };
  } catch (error) {
    console.error('[Blog] Server client error:', error);
    const configured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return { posts: [], total: 0, error: configured ? 'network' : 'config' };
  }
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const supabase = createPublicClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .lte('published_at', now)
      .maybeSingle();

    if (error) {
      console.error('[Blog] Error fetching post by slug:', error);
      throw new BlogDataError('network');
    }

    return (data as BlogPost) || null;
  } catch (error) {
    console.error('[Blog] Server client error fetching slug:', error);
    throw error instanceof BlogDataError ? error : new BlogDataError(blogFailureKind());
  }
}

export async function getRelatedBlogPosts(
  currentPostId: string,
  categoryId?: string | null,
  limit = 3
): Promise<BlogPost[]> {
  try {
    const supabase = createPublicClient();
    const now = new Date().toISOString();

    let query = supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .lte('published_at', now)
      .neq('id', currentPostId)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('[Blog] Error fetching related posts:', error);
      return [];
    }

    return (data as BlogPost[]) || [];
  } catch (error) {
    console.warn('[Blog] Error fetching related posts:', error);
    return [];
  }
}

export async function getBlogCategoriesResult(): Promise<{ categories: BlogCategory[]; error?: 'config' | 'network' }> {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from('blog_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('[Blog] Error fetching categories:', error);
      return { categories: [], error: 'network' };
    }

    return { categories: (data as BlogCategory[]) || [] };
  } catch (error) {
    console.warn('[Blog] Error fetching categories:', error);
    return { categories: [], error: blogFailureKind() };
  }
}


export async function getBlogCategories(): Promise<BlogCategory[]> {
  const result = await getBlogCategoriesResult();
  if (result.error) throw new BlogDataError(result.error);
  return result.categories;
}
