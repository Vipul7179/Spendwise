import { NextResponse } from 'next/server';
import { verifyRealAdminSession } from '@/lib/auth/admin-guard';
import {
  fetchProductionBlogs,
  fetchProductionBlogCategories,
  createProductionBlogPost,
  updateProductionBlogPost,
  deleteProductionBlogPost,
  getProductionOperatorStatus,
} from '@/lib/production/operator';
import { logAuthEvent } from '@/lib/auth/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await verifyRealAdminSession(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.statusCode });
  }

  const status = getProductionOperatorStatus();
  if (!status.enabled || !status.configured) {
    return NextResponse.json(
      {
        success: false,
        requiresConfiguration: true,
        error: status.message,
        posts: [],
        categories: [],
      },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const categoryId = url.searchParams.get('categoryId') || undefined;
  const postStatus = (url.searchParams.get('status') as any) || undefined;
  const search = url.searchParams.get('search') || undefined;
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  const [postsRes, catRes] = await Promise.all([
    fetchProductionBlogs({ categoryId, status: postStatus, search, limit, offset }),
    fetchProductionBlogCategories(),
  ]);

  if (postsRes.error) {
    return NextResponse.json({ success: false, error: postsRes.error }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    posts: postsRes.posts,
    total: postsRes.count,
    categories: catRes.categories,
  });
}

export async function POST(request: Request) {
  const auth = await verifyRealAdminSession(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.statusCode });
  }

  try {
    const body = await request.json();
    if (!body.title || !body.slug || !body.content) {
      return NextResponse.json({ success: false, error: 'Title, slug, and content are required.' }, { status: 400 });
    }

    const res = await createProductionBlogPost({
      title: body.title,
      slug: body.slug,
      content: body.content,
      excerpt: body.excerpt,
      category_id: body.category_id,
      status: body.status || 'draft',
      author_name: body.author_name || auth.user?.name || 'Administrator',
      author_position: body.author_position || null,
      tags: Array.isArray(body.tags) ? body.tags : [],
      is_featured: Boolean(body.is_featured),
      cover_image_url: body.cover_image_url,
      cover_alt: body.cover_alt,
      seo_title: body.seo_title,
      seo_description: body.seo_description,
      published_at: body.published_at,
    });

    if (res.error || !res.post) {
      return NextResponse.json({ success: false, error: res.error || 'Failed to create blog post' }, { status: 500 });
    }

    logAuthEvent('info', 'BLOG_POST_CREATED' as any, {
      admin: auth.user?.email,
      slug: body.slug,
      status: body.status,
    });

    return NextResponse.json({ success: true, post: res.post });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid request payload';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const auth = await verifyRealAdminSession(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.statusCode });
  }

  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ success: false, error: 'Post ID is required for update.' }, { status: 400 });
    }

    const res = await updateProductionBlogPost(body.id, body.updates || {});
    if (res.error || !res.post) {
      return NextResponse.json({ success: false, error: res.error || 'Failed to update article' }, { status: 500 });
    }

    logAuthEvent('info', 'BLOG_POST_UPDATED' as any, {
      admin: auth.user?.email,
      postId: body.id,
    });

    return NextResponse.json({ success: true, post: res.post });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid request payload';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const auth = await verifyRealAdminSession(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.statusCode });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ success: false, error: 'Article ID is required.' }, { status: 400 });
  }

  const res = await deleteProductionBlogPost(id);
  if (!res.success) {
    return NextResponse.json({ success: false, error: res.error || 'Failed to delete article' }, { status: 500 });
  }

  logAuthEvent('warn', 'BLOG_POST_DELETED' as any, {
    admin: auth.user?.email,
    postId: id,
  });

  return NextResponse.json({ success: true, id });
}

