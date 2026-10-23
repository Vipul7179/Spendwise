import { Pool } from 'pg';
import { parseProductionPoolConfig } from './ssl-certs';
import { BlogPost, BlogCategory } from '@/types/blog';
import { BannerItem, CreateBannerPayload, UpdateBannerPayload } from '@/types/banner';
import { PlatformSetting } from '@/types/settings';
import { validateBlogSlug, slugifyBlogTitle } from '@/lib/blog/slug-utils';

/**
 * Extra metadata container for blog posts when optional database columns
 * (author_position, tags, is_featured) are in transition or not yet migrated.
 */
interface BlogExtraMeta {
  author_position?: string | null;
  tags?: string[];
  is_featured?: boolean;
}

function extractBlogMetadata(content: string | null | undefined): {
  cleanContent: string;
  meta: BlogExtraMeta;
} {
  if (!content) return { cleanContent: '', meta: {} };
  const match = content.match(/<!--hisbo-meta:(\{.*?\})-->/);
  if (!match) return { cleanContent: content, meta: {} };

  try {
    const meta = JSON.parse(match[1]);
    const cleanContent = content.replace(/<!--hisbo-meta:\{.*?\}-->\n?/, '');
    return { cleanContent, meta };
  } catch {
    return { cleanContent: content, meta: {} };
  }
}

function embedBlogMetadata(content: string, meta: BlogExtraMeta): string {
  const cleaned = content.replace(/<!--hisbo-meta:\{.*?\}-->\n?/, '');
  const hasMeta = Boolean(
    (meta.author_position && meta.author_position.trim().length > 0) ||
    (meta.tags && meta.tags.length > 0) ||
    meta.is_featured
  );
  if (!hasMeta) return cleaned;
  return `<!--hisbo-meta:${JSON.stringify(meta)}-->\n${cleaned}`;
}

let cachedBlogColumns: Set<string> | null = null;
async function getBlogColumns(pool: Pool): Promise<Set<string>> {
  if (cachedBlogColumns) return cachedBlogColumns;
  try {
    const res = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'blog_posts';
    `);
    cachedBlogColumns = new Set(res.rows.map((r: { column_name: string }) => r.column_name));
    return cachedBlogColumns;
  } catch {
    return new Set([
      'id', 'slug', 'title', 'content', 'excerpt', 'category_id', 'status',
      'published_at', 'author_name', 'cover_image_url', 'seo_title', 'seo_description',
      'reading_minutes', 'created_at', 'updated_at',
    ]);
  }
}

function mapRowToBlogPost(r: Record<string, unknown>): BlogPost {
  const rawContent = typeof r.content === 'string' ? r.content : '';
  const { cleanContent, meta } = extractBlogMetadata(rawContent);

  // Tags resolution
  let tags: string[] = [];
  if (Array.isArray(r.tags)) {
    tags = r.tags.map((t) => String(t).trim()).filter(Boolean);
  } else if (meta.tags && Array.isArray(meta.tags)) {
    tags = meta.tags;
  }

  // Author position resolution
  const authorPosition =
    (typeof r.author_position === 'string' && r.author_position.trim()) ||
    meta.author_position ||
    null;

  // Featured toggle resolution
  const isFeatured =
    r.is_featured !== undefined && r.is_featured !== null
      ? Boolean(r.is_featured)
      : Boolean(meta.is_featured);

  const publishedAtStr = r.published_at ? new Date(r.published_at as string).toISOString() : null;

  return {
    id: String(r.id),
    title: String(r.title),
    slug: String(r.slug),
    excerpt: (r.excerpt as string) || null,
    content: cleanContent,
    category_id: (r.category_id as string) || null,
    category: (r.category_name as string) || 'General',
    status: (r.status as 'draft' | 'published') || 'draft',
    published_at: publishedAtStr,
    publishedAt: publishedAtStr,
    created_at: r.created_at ? new Date(r.created_at as string).toISOString() : undefined,
    updated_at: r.updated_at ? new Date(r.updated_at as string).toISOString() : undefined,
    author_name: (r.author_name as string) || 'Hisbo Team',
    author: (r.author_name as string) || 'Hisbo Team',
    author_position: authorPosition,
    tags,
    is_featured: isFeatured,
    is_scheduled: r.status === 'published' && Boolean(r.published_at && new Date(r.published_at as string).getTime() > Date.now()),
    readTimeMinutes: Number(r.reading_minutes) || 1,
    reading_minutes: Number(r.reading_minutes) || 1,
    cover_image_url: (r.cover_image_url as string) || null,
    cover_image_path: (r.cover_image_path as string) || null,
    cover_alt: (r.cover_alt as string) || null,
    seo_title: (r.seo_title as string) || null,
    seo_description: (r.seo_description as string) || null,
    og_image_url: (r.og_image_url as string) || null,
    noindex: Boolean(r.noindex),
  };
}

/**
 * ====================================================================
 * HISBO CONTROL: Production Platform Operator Client
 * ====================================================================
 *
 * Mandatory Security & Isolation Architecture:
 * 1. LEAST-PRIVILEGE ROLE: Designed for 'hisbo_platform_operator'.
 * 2. STRICT FINANCIAL DATA ISOLATION:
 *    - Has ZERO grants on public.user_data (financial ledgers).
 *    - Has ZERO direct grants on public.profiles or auth.users.
 * 3. EXPLICIT SCOPE:
 *    - Blogs: public.blog_posts, public.blog_categories
 *    - Banners: public.banners
 *    - Settings: public.platform_settings
 *    - Reporting: reporting schema routines
 * 4. CREDENTIAL SANITIZATION: Passwords are redacted from all exception outputs.
 * 5. RESOURCE CLAMPING: 5-second statement timeout, max 3 pool connections.
 * ====================================================================
 */

let operatorPoolInstance: Pool | null = null;

export function getProductionOperatorStatus(): { enabled: boolean; configured: boolean; message: string } {
  const isEnabled = process.env.PROD_OPERATOR_ENABLED === 'true';
  const connectionUrl = process.env.PROD_OPERATOR_DATABASE_URL?.trim();

  if (!isEnabled) {
    return {
      enabled: false,
      configured: Boolean(connectionUrl),
      message: 'Production content operator is disabled by default. Set PROD_OPERATOR_ENABLED=true in .env.local to enable.',
    };
  }

  if (!connectionUrl) {
    return {
      enabled: true,
      configured: false,
      message: 'Production content operator is enabled, but PROD_OPERATOR_DATABASE_URL is not configured in .env.local.',
    };
  }

  return {
    enabled: true,
    configured: true,
    message: 'Production content operator client is active and configured.',
  };
}

export function resetOperatorPool(): void {
  if (operatorPoolInstance) {
    operatorPoolInstance.end().catch(() => {});
    operatorPoolInstance = null;
  }
}

export function maskConnectionString(url: string): string {
  return url.replace(/:([^:@/]+)@/, ':***@');
}

function sanitizeErrorMessage(msg: string): string {
  return maskConnectionString(msg);
}

function getOperatorPool(): Pool {
  const status = getProductionOperatorStatus();
  if (!status.enabled || !status.configured) {
    throw new Error(status.message);
  }

  if (!operatorPoolInstance) {
    const connectionString = process.env.PROD_OPERATOR_DATABASE_URL!.trim();

    const config = parseProductionPoolConfig(connectionString, {
      max: 3,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 15000,
    });

    operatorPoolInstance = new Pool(config);

    operatorPoolInstance.on('connect', (client) => {
      client.query('SET statement_timeout = 5000;').catch(() => {
        // Safe catch: some transaction poolers restrict session-level SET statements.
        // Role-level statement_timeout is already enforced by PostgreSQL.
      });
    });

    operatorPoolInstance.on('error', (err) => {
      console.error('[PROD_OPERATOR_POOL_ERROR]', sanitizeErrorMessage(err.message));
    });
  }

  return operatorPoolInstance;
}

// --------------------------------------------------------------------
// 1. BLOGS & CONTENT
// --------------------------------------------------------------------

export async function fetchProductionBlogs(options?: {
  categoryId?: string;
  status?: 'published' | 'draft' | 'all';
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ posts: BlogPost[]; count: number; error?: string }> {
  const status = getProductionOperatorStatus();
  if (!status.enabled || !status.configured) {
    return { posts: [], count: 0, error: status.message };
  }

  try {
    const pool = getOperatorPool();
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (options?.categoryId && options.categoryId !== 'all') {
      conditions.push(`category_id = $${idx++}`);
      values.push(options.categoryId);
    }

    if (options?.status && options.status !== 'all') {
      conditions.push(`status = $${idx++}`);
      values.push(options.status);
    }

    if (options?.search && options.search.trim()) {
      conditions.push(`(title ILIKE $${idx} OR slug ILIKE $${idx} OR excerpt ILIKE $${idx})`);
      values.push(`%${options.search.trim()}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = Math.max(1, Math.min(options?.limit || 50, 100));
    const offset = Math.max(0, options?.offset || 0);

    const countRes = await pool.query(`SELECT COUNT(*)::int as count FROM public.blog_posts ${whereClause};`, values);
    const count = countRes.rows[0]?.count || 0;

    const dataQuery = `
      SELECT p.*, c.name as category_name
      FROM public.blog_posts p
      LEFT JOIN public.blog_categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++};
    `;
    const dataRes = await pool.query(dataQuery, [...values, limit, offset]);

    const posts: BlogPost[] = dataRes.rows.map((r) => mapRowToBlogPost(r as Record<string, unknown>));

    return { posts, count };
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : 'Unknown blog fetch error';
    return { posts: [], count: 0, error: sanitizeErrorMessage(rawMsg) };
  }
}

export async function fetchProductionBlogCategories(): Promise<{ categories: BlogCategory[]; error?: string }> {
  const status = getProductionOperatorStatus();
  if (!status.enabled || !status.configured) {
    return { categories: [], error: status.message };
  }

  try {
    const pool = getOperatorPool();
    const res = await pool.query(`
      SELECT id, name, slug, sort_order, created_at
      FROM public.blog_categories
      ORDER BY sort_order ASC, name ASC;
    `);

    const categories: BlogCategory[] = res.rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      slug: String(r.slug),
      description: null,
      sort_order: Number(r.sort_order) || 0,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : undefined,
    }));

    return { categories };
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : 'Unknown categories fetch error';
    return { categories: [], error: sanitizeErrorMessage(rawMsg) };
  }
}

export async function createProductionBlogCategory(payload: {
  name: string;
  slug?: string;
  sort_order?: number;
}): Promise<{ category: BlogCategory | null; error?: string }> {
  const status = getProductionOperatorStatus();
  if (!status.enabled || !status.configured) {
    return { category: null, error: status.message };
  }

  const trimmedName = payload.name?.trim();
  if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 40) {
    return { category: null, error: 'Category name must be between 2 and 40 characters.' };
  }

  let slug = payload.slug ? slugifyBlogTitle(payload.slug) : slugifyBlogTitle(trimmedName);
  slug = slug.slice(0, 50).replace(/-+$/, '');

  const slugValidation = validateBlogSlug(slug);
  if (!slugValidation.valid) {
    return { category: null, error: `Invalid category slug: ${slugValidation.error}` };
  }

  try {
    const pool = getOperatorPool();
    const res = await pool.query(
      `
      INSERT INTO public.blog_categories (name, slug, sort_order, created_at)
      VALUES ($1, $2, $3, now())
      RETURNING *;
      `,
      [trimmedName, slug, payload.sort_order || 0]
    );

    const r = res.rows[0];
    return {
      category: {
        id: String(r.id),
        name: String(r.name),
        slug: String(r.slug),
        description: null,
        sort_order: Number(r.sort_order) || 0,
        created_at: r.created_at ? new Date(r.created_at).toISOString() : undefined,
      },
    };
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : 'Unknown category creation error';
    if (rawMsg.includes('duplicate key') || rawMsg.includes('blog_categories_slug_key')) {
      return { category: null, error: `A category with slug "${slug}" already exists.` };
    }
    return { category: null, error: sanitizeErrorMessage(rawMsg) };
  }
}

export async function createProductionBlogPost(payload: {
  title: string;
  slug: string;
  content: string;
  excerpt?: string | null;
  category_id?: string | null;
  status: 'draft' | 'published';
  author_name?: string | null;
  author_position?: string | null;
  tags?: string[];
  is_featured?: boolean;
  cover_image_url?: string | null;
  cover_alt?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  published_at?: string | null;
}): Promise<{ post: BlogPost | null; error?: string }> {
  const status = getProductionOperatorStatus();
  if (!status.enabled || !status.configured) {
    return { post: null, error: status.message };
  }

  // 1. Title validation (3 to 120 chars)
  const trimmedTitle = payload.title?.trim();
  if (!trimmedTitle || trimmedTitle.length < 3 || trimmedTitle.length > 120) {
    return { post: null, error: 'Title must be between 3 and 120 characters.' };
  }

  // 2. Slug validation strictly complying with database constraint
  const trimmedSlug = payload.slug?.trim();
  const slugValidation = validateBlogSlug(trimmedSlug);
  if (!slugValidation.valid) {
    return { post: null, error: `Slug error: ${slugValidation.error}` };
  }

  // 3. Excerpt validation (max 300 chars)
  const trimmedExcerpt = payload.excerpt?.trim() || null;
  if (trimmedExcerpt && trimmedExcerpt.length > 300) {
    return { post: null, error: 'Meta excerpt cannot exceed 300 characters.' };
  }

  // 4. Author Name validation (1 to 80 chars)
  const authorName = (payload.author_name?.trim() || 'Hisbo Team').slice(0, 80);

  // 5. SEO fields validation
  const seoTitle = payload.seo_title?.trim() || null;
  if (seoTitle && seoTitle.length > 70) {
    return { post: null, error: 'SEO Title cannot exceed 70 characters.' };
  }

  const seoDescription = payload.seo_description?.trim() || null;
  if (seoDescription && seoDescription.length > 170) {
    return { post: null, error: 'SEO Description cannot exceed 170 characters.' };
  }

  // 6. Published requirements (cover image & readable content)
  const coverImageUrl = payload.cover_image_url?.trim() || null;
  if (payload.status === 'published') {
    if (!coverImageUrl) {
      return { post: null, error: 'Cover image is required when publishing an article.' };
    }
    const plainText = payload.content.replace(/<[^>]*>/g, ' ').trim();
    if (!plainText) {
      return { post: null, error: 'Published article must contain readable body content.' };
    }
  }

  // 7. Reading time estimate
  const words = payload.content.split(/\s+/).filter(Boolean).length;
  const readingMinutes = Math.max(1, Math.ceil(words / 200));

  // 8. Published at timestamp calculation
  let publishedAt: string | null = null;
  if (payload.status === 'published') {
    if (payload.published_at) {
      publishedAt = new Date(payload.published_at).toISOString();
    } else {
      publishedAt = new Date().toISOString();
    }
  } else if (payload.published_at) {
    // Scheduled publication or preserved date
    publishedAt = new Date(payload.published_at).toISOString();
  }

  try {
    const pool = getOperatorPool();
    const columns = await getBlogColumns(pool);

    const cols: string[] = [
      'title',
      'slug',
      'content',
      'excerpt',
      'category_id',
      'status',
      'author_name',
      'cover_image_url',
      'cover_alt',
      'seo_title',
      'seo_description',
      'reading_minutes',
      'published_at',
      'created_at',
      'updated_at',
    ];

    // Embed metadata into content if columns are not yet in the DB schema
    const metaToEmbed: BlogExtraMeta = {};
    if (!columns.has('author_position') && payload.author_position) {
      metaToEmbed.author_position = payload.author_position.trim();
    }
    if (!columns.has('tags') && payload.tags && payload.tags.length > 0) {
      metaToEmbed.tags = payload.tags;
    }
    if (!columns.has('is_featured') && payload.is_featured) {
      metaToEmbed.is_featured = true;
    }

    const finalContent = embedBlogMetadata(payload.content, metaToEmbed);

    const vals: unknown[] = [
      trimmedTitle,
      trimmedSlug,
      finalContent,
      trimmedExcerpt,
      payload.category_id || null,
      payload.status,
      authorName,
      coverImageUrl,
      payload.cover_alt?.trim() || null,
      seoTitle,
      seoDescription,
      readingMinutes,
      publishedAt,
    ];

    if (columns.has('author_position')) {
      cols.push('author_position');
      vals.push(payload.author_position?.trim() || null);
    }

    if (columns.has('tags')) {
      cols.push('tags');
      vals.push(payload.tags || []);
    }

    if (columns.has('is_featured')) {
      cols.push('is_featured');
      vals.push(Boolean(payload.is_featured));
    }

    const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
    const query = `
      INSERT INTO public.blog_posts (${cols.join(', ')})
      VALUES (${placeholders}, now(), now())
      RETURNING *;
    `;

    const res = await pool.query(query, vals);
    const r = res.rows[0];
    return { post: mapRowToBlogPost(r as Record<string, unknown>) };
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : 'Unknown blog creation error';
    if (rawMsg.includes('duplicate key') || rawMsg.includes('blog_posts_slug_key')) {
      return { post: null, error: `An article with slug "${trimmedSlug}" already exists.` };
    }
    return { post: null, error: sanitizeErrorMessage(rawMsg) };
  }
}

export async function updateProductionBlogPost(
  id: string,
  payload: Partial<BlogPost>
): Promise<{ post: BlogPost | null; error?: string }> {
  const status = getProductionOperatorStatus();
  if (!status.enabled || !status.configured) {
    return { post: null, error: status.message };
  }

  try {
    const pool = getOperatorPool();
    const columns = await getBlogColumns(pool);

    const updates: string[] = ['updated_at = now()'];
    const values: unknown[] = [id];
    let idx = 2;

    if (payload.title !== undefined) {
      const trimmed = payload.title.trim();
      if (trimmed.length < 3 || trimmed.length > 120) {
        return { post: null, error: 'Title must be between 3 and 120 characters.' };
      }
      updates.push(`title = $${idx++}`);
      values.push(trimmed);
    }

    if (payload.slug !== undefined) {
      const trimmedSlug = payload.slug.trim();
      const slugValidation = validateBlogSlug(trimmedSlug);
      if (!slugValidation.valid) {
        return { post: null, error: `Slug error: ${slugValidation.error}` };
      }
      updates.push(`slug = $${idx++}`);
      values.push(trimmedSlug);
    }

    // Prepare content with embedded metadata if needed
    let contentToUpdate = payload.content;
    const metaToEmbed: BlogExtraMeta = {};
    if (!columns.has('author_position') && payload.author_position !== undefined) {
      metaToEmbed.author_position = payload.author_position;
    }
    if (!columns.has('tags') && payload.tags !== undefined) {
      metaToEmbed.tags = payload.tags;
    }
    if (!columns.has('is_featured') && payload.is_featured !== undefined) {
      metaToEmbed.is_featured = payload.is_featured;
    }

    if (contentToUpdate !== undefined && contentToUpdate !== null) {
      const safeContent = embedBlogMetadata(contentToUpdate, metaToEmbed);
      updates.push(`content = $${idx++}`);
      values.push(safeContent);

      // Recalculate reading minutes
      const words = safeContent.split(/\s+/).filter(Boolean).length;
      const readingMinutes = Math.max(1, Math.ceil(words / 200));
      updates.push(`reading_minutes = $${idx++}`);
      values.push(readingMinutes);
    }

    if (payload.excerpt !== undefined) {
      const trimmedExcerpt = payload.excerpt ? payload.excerpt.trim() : null;
      if (trimmedExcerpt && trimmedExcerpt.length > 300) {
        return { post: null, error: 'Meta excerpt cannot exceed 300 characters.' };
      }
      updates.push(`excerpt = $${idx++}`);
      values.push(trimmedExcerpt);
    }

    if (payload.category_id !== undefined) {
      updates.push(`category_id = $${idx++}`);
      values.push(payload.category_id || null);
    }

    if (payload.author_name !== undefined) {
      const trimmedAuthor = (payload.author_name?.trim() || 'Hisbo Team').slice(0, 80);
      updates.push(`author_name = $${idx++}`);
      values.push(trimmedAuthor);
    }

    if (payload.cover_image_url !== undefined) {
      updates.push(`cover_image_url = $${idx++}`);
      values.push(payload.cover_image_url ? payload.cover_image_url.trim() : null);
    }

    if (payload.cover_alt !== undefined) {
      updates.push(`cover_alt = $${idx++}`);
      values.push(payload.cover_alt ? payload.cover_alt.trim().slice(0, 160) : null);
    }

    if (payload.seo_title !== undefined) {
      const trimmedSeoTitle = payload.seo_title ? payload.seo_title.trim().slice(0, 70) : null;
      updates.push(`seo_title = $${idx++}`);
      values.push(trimmedSeoTitle);
    }

    if (payload.seo_description !== undefined) {
      const trimmedSeoDesc = payload.seo_description ? payload.seo_description.trim().slice(0, 170) : null;
      updates.push(`seo_description = $${idx++}`);
      values.push(trimmedSeoDesc);
    }

    if (payload.status !== undefined) {
      updates.push(`status = $${idx++}`);
      values.push(payload.status);

      if (payload.status === 'published') {
        if (payload.published_at) {
          updates.push(`published_at = $${idx++}`);
          values.push(new Date(payload.published_at).toISOString());
        } else {
          updates.push(`published_at = COALESCE(published_at, now())`);
        }
      } else if (payload.published_at !== undefined) {
        // Can set scheduled date or null for draft
        updates.push(`published_at = $${idx++}`);
        values.push(payload.published_at ? new Date(payload.published_at).toISOString() : null);
      }
    } else if (payload.published_at !== undefined) {
      updates.push(`published_at = $${idx++}`);
      values.push(payload.published_at ? new Date(payload.published_at).toISOString() : null);
    }

    // Direct column updates if schema has them
    if (columns.has('author_position') && payload.author_position !== undefined) {
      updates.push(`author_position = $${idx++}`);
      values.push(payload.author_position ? payload.author_position.trim() : null);
    }

    if (columns.has('tags') && payload.tags !== undefined) {
      updates.push(`tags = $${idx++}`);
      values.push(payload.tags);
    }

    if (columns.has('is_featured') && payload.is_featured !== undefined) {
      updates.push(`is_featured = $${idx++}`);
      values.push(Boolean(payload.is_featured));
    }

    const query = `UPDATE public.blog_posts SET ${updates.join(', ')} WHERE id = $1 RETURNING *;`;
    const res = await pool.query(query, values);

    if (res.rows.length === 0) {
      return { post: null, error: 'Article not found.' };
    }

    const r = res.rows[0];
    return { post: mapRowToBlogPost(r as Record<string, unknown>) };
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : 'Unknown blog update error';
    if (rawMsg.includes('duplicate key') || rawMsg.includes('blog_posts_slug_key')) {
      return { post: null, error: `An article with this slug already exists.` };
    }
    return { post: null, error: sanitizeErrorMessage(rawMsg) };
  }
}

export async function deleteProductionBlogPost(id: string): Promise<{ success: boolean; error?: string }> {
  const status = getProductionOperatorStatus();
  if (!status.enabled || !status.configured) {
    return { success: false, error: status.message };
  }

  try {
    const pool = getOperatorPool();
    const res = await pool.query('DELETE FROM public.blog_posts WHERE id = $1 RETURNING id;', [id]);
    return { success: res.rows.length > 0 };
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : 'Unknown delete error';
    return { success: false, error: sanitizeErrorMessage(rawMsg) };
  }
}

// --------------------------------------------------------------------
// 2. HOMEPAGE BANNERS
// --------------------------------------------------------------------

export async function fetchProductionBanners(): Promise<{ banners: BannerItem[]; error?: string }> {
  const status = getProductionOperatorStatus();
  if (!status.enabled || !status.configured) {
    return { banners: [], error: status.message };
  }

  try {
    const pool = getOperatorPool();
    const res = await pool.query(`
      SELECT id, title, description, link_url, image_url, image_path, sort_order, is_active, created_at
      FROM public.banners
      ORDER BY sort_order ASC, created_at DESC;
    `);

    const banners: BannerItem[] = res.rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      link_url: r.link_url,
      image_url: r.image_url,
      image_path: r.image_path,
      sort_order: Number(r.sort_order || 0),
      is_active: Boolean(r.is_active),
      created_at: r.created_at,
    }));

    return { banners };
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : 'Unknown banner fetch error';
    return { banners: [], error: sanitizeErrorMessage(rawMsg) };
  }
}

export async function createProductionBanner(payload: CreateBannerPayload): Promise<{ banner: BannerItem | null; error?: string }> {
  const status = getProductionOperatorStatus();
  if (!status.enabled || !status.configured) {
    return { banner: null, error: status.message };
  }

  try {
    const pool = getOperatorPool();
    const res = await pool.query(
      `
      INSERT INTO public.banners (
        title, description, link_url, image_url, image_path, sort_order, is_active, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, now())
      RETURNING *;
      `,
      [
        payload.title || null,
        payload.description || null,
        payload.link_url || null,
        payload.image_url,
        payload.image_path || null,
        payload.sort_order ?? 0,
        payload.is_active ?? true,
      ]
    );

    const r = res.rows[0];
    return {
      banner: {
        id: r.id,
        title: r.title,
        description: r.description,
        link_url: r.link_url,
        image_url: r.image_url,
        image_path: r.image_path,
        sort_order: Number(r.sort_order),
        is_active: Boolean(r.is_active),
        created_at: r.created_at,
      },
    };
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : 'Unknown banner creation error';
    return { banner: null, error: sanitizeErrorMessage(rawMsg) };
  }
}

export async function updateProductionBanner(
  id: string,
  payload: UpdateBannerPayload
): Promise<{ banner: BannerItem | null; error?: string }> {
  const status = getProductionOperatorStatus();
  if (!status.enabled || !status.configured) {
    return { banner: null, error: status.message };
  }

  try {
    const pool = getOperatorPool();
    const updates: string[] = [];
    const values: unknown[] = [id];
    let idx = 2;

    if (payload.title !== undefined) {
      updates.push(`title = $${idx++}`);
      values.push(payload.title);
    }
    if (payload.description !== undefined) {
      updates.push(`description = $${idx++}`);
      values.push(payload.description);
    }
    if (payload.link_url !== undefined) {
      updates.push(`link_url = $${idx++}`);
      values.push(payload.link_url);
    }
    if (payload.image_url !== undefined) {
      updates.push(`image_url = $${idx++}`);
      values.push(payload.image_url);
    }
    if (payload.image_path !== undefined) {
      updates.push(`image_path = $${idx++}`);
      values.push(payload.image_path);
    }
    if (payload.sort_order !== undefined) {
      updates.push(`sort_order = $${idx++}`);
      values.push(payload.sort_order);
    }
    if (payload.is_active !== undefined) {
      updates.push(`is_active = $${idx++}`);
      values.push(payload.is_active);
    }

    if (updates.length === 0) {
      return { banner: null, error: 'No fields provided for update.' };
    }

    const query = `UPDATE public.banners SET ${updates.join(', ')} WHERE id = $1 RETURNING *;`;
    const res = await pool.query(query, values);

    if (res.rows.length === 0) {
      return { banner: null, error: 'Banner not found.' };
    }

    const r = res.rows[0];
    return {
      banner: {
        id: r.id,
        title: r.title,
        description: r.description,
        link_url: r.link_url,
        image_url: r.image_url,
        image_path: r.image_path,
        sort_order: Number(r.sort_order),
        is_active: Boolean(r.is_active),
        created_at: r.created_at,
      },
    };
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : 'Unknown banner update error';
    return { banner: null, error: sanitizeErrorMessage(rawMsg) };
  }
}

export async function deleteProductionBanner(id: string): Promise<{ success: boolean; error?: string }> {
  const status = getProductionOperatorStatus();
  if (!status.enabled || !status.configured) {
    return { success: false, error: status.message };
  }

  try {
    const pool = getOperatorPool();
    const res = await pool.query('DELETE FROM public.banners WHERE id = $1 RETURNING id;', [id]);
    return { success: res.rows.length > 0 };
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : 'Unknown banner delete error';
    return { success: false, error: sanitizeErrorMessage(rawMsg) };
  }
}

export async function reorderProductionBanners(orderedIds: string[]): Promise<{ success: boolean; error?: string }> {
  const status = getProductionOperatorStatus();
  if (!status.enabled || !status.configured) {
    return { success: false, error: status.message };
  }

  try {
    const pool = getOperatorPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < orderedIds.length; i++) {
        await client.query('UPDATE public.banners SET sort_order = $1 WHERE id = $2;', [i + 1, orderedIds[i]]);
      }
      await client.query('COMMIT');
      return { success: true };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : 'Unknown banner reorder error';
    return { success: false, error: sanitizeErrorMessage(rawMsg) };
  }
}

// --------------------------------------------------------------------
// 3. PLATFORM SETTINGS
// --------------------------------------------------------------------

export async function fetchProductionSettings(): Promise<{ settings: Record<string, PlatformSetting>; error?: string }> {
  const status = getProductionOperatorStatus();
  if (!status.enabled || !status.configured) {
    return { settings: {}, error: status.message };
  }

  try {
    const pool = getOperatorPool();
    const res = await pool.query('SELECT key, value, description, updated_at, updated_by FROM public.platform_settings;');

    const settings: Record<string, PlatformSetting> = {};
    for (const r of res.rows) {
      settings[r.key] = {
        key: r.key,
        value: r.value,
        description: r.description,
        updated_at: r.updated_at,
        updated_by: r.updated_by,
      };
    }

    return { settings };
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : 'Unknown settings fetch error';
    return { settings: {}, error: sanitizeErrorMessage(rawMsg) };
  }
}

export async function updateProductionSetting(
  key: string,
  value: Record<string, unknown>,
  updatedBy = 'admin'
): Promise<{ success: boolean; error?: string }> {
  const status = getProductionOperatorStatus();
  if (!status.enabled || !status.configured) {
    return { success: false, error: status.message };
  }

  try {
    const pool = getOperatorPool();
    await pool.query(
      `
      INSERT INTO public.platform_settings (key, value, updated_at, updated_by)
      VALUES ($1, $2, now(), $3)
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = now(), updated_by = EXCLUDED.updated_by;
      `,
      [key, JSON.stringify(value), updatedBy]
    );

    return { success: true };
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : 'Unknown setting update error';
    return { success: false, error: sanitizeErrorMessage(rawMsg) };
  }
}
