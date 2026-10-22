import { Pool } from 'pg';
import { parseProductionPoolConfig } from './ssl-certs';
import { BlogPost, BlogCategory } from '@/types/blog';
import { BannerItem, CreateBannerPayload, UpdateBannerPayload } from '@/types/banner';
import { PlatformSetting } from '@/types/settings';

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

    const posts: BlogPost[] = dataRes.rows.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      excerpt: r.excerpt,
      content: r.content,
      category_id: r.category_id,
      category: r.category_name || 'General',
      status: r.status,
      published_at: r.published_at,
      publishedAt: r.published_at,
      created_at: r.created_at,
      updated_at: r.updated_at,
      author_name: r.author_name || 'Hisbo Editorial',
      author: r.author_name || 'Hisbo Editorial',
      readTimeMinutes: r.reading_minutes || 5,
      cover_image_url: r.cover_image_url,
      cover_alt: r.cover_alt,
      seo_title: r.seo_title,
      seo_description: r.seo_description,
      og_image_url: r.og_image_url,
      noindex: Boolean(r.noindex),
    }));

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
      SELECT id, name, sort_order, created_at
      FROM public.blog_categories
      ORDER BY sort_order ASC, name ASC;
    `);

    const categories: BlogCategory[] = res.rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.name.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
      description: null,
      sort_order: r.sort_order,
      created_at: r.created_at,
    }));

    return { categories };
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : 'Unknown categories fetch error';
    return { categories: [], error: sanitizeErrorMessage(rawMsg) };
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
  cover_image_url?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
}): Promise<{ post: BlogPost | null; error?: string }> {
  const status = getProductionOperatorStatus();
  if (!status.enabled || !status.configured) {
    return { post: null, error: status.message };
  }

  try {
    const pool = getOperatorPool();
    const now = new Date().toISOString();
    const publishedAt = payload.status === 'published' ? now : null;

    const res = await pool.query(
      `
      INSERT INTO public.blog_posts (
        title, slug, content, excerpt, category_id, status,
        author_name, cover_image_url, seo_title, seo_description,
        published_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now(), now())
      RETURNING *;
      `,
      [
        payload.title,
        payload.slug,
        payload.content,
        payload.excerpt || null,
        payload.category_id || null,
        payload.status,
        payload.author_name || 'Hisbo Editorial',
        payload.cover_image_url || null,
        payload.seo_title || null,
        payload.seo_description || null,
        publishedAt,
      ]
    );

    const r = res.rows[0];
    return {
      post: {
        id: r.id,
        title: r.title,
        slug: r.slug,
        excerpt: r.excerpt,
        content: r.content,
        status: r.status,
        published_at: r.published_at,
        created_at: r.created_at,
        updated_at: r.updated_at,
        author_name: r.author_name,
      },
    };
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : 'Unknown blog creation error';
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
    const updates: string[] = ['updated_at = now()'];
    const values: unknown[] = [id];
    let idx = 2;

    if (payload.title !== undefined) {
      updates.push(`title = $${idx++}`);
      values.push(payload.title);
    }
    if (payload.slug !== undefined) {
      updates.push(`slug = $${idx++}`);
      values.push(payload.slug);
    }
    if (payload.content !== undefined) {
      updates.push(`content = $${idx++}`);
      values.push(payload.content);
    }
    if (payload.excerpt !== undefined) {
      updates.push(`excerpt = $${idx++}`);
      values.push(payload.excerpt);
    }
    if (payload.category_id !== undefined) {
      updates.push(`category_id = $${idx++}`);
      values.push(payload.category_id);
    }
    if (payload.status !== undefined) {
      updates.push(`status = $${idx++}`);
      values.push(payload.status);
      if (payload.status === 'published') {
        updates.push(`published_at = COALESCE(published_at, now())`);
      }
    }
    if (payload.cover_image_url !== undefined) {
      updates.push(`cover_image_url = $${idx++}`);
      values.push(payload.cover_image_url);
    }

    const query = `UPDATE public.blog_posts SET ${updates.join(', ')} WHERE id = $1 RETURNING *;`;
    const res = await pool.query(query, values);

    if (res.rows.length === 0) {
      return { post: null, error: 'Article not found.' };
    }

    const r = res.rows[0];
    return { post: { id: r.id, title: r.title, slug: r.slug, status: r.status, updated_at: r.updated_at } as BlogPost };
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : 'Unknown blog update error';
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
