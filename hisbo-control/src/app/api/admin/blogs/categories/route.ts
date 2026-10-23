import { NextResponse } from 'next/server';
import { verifyRealAdminSession } from '@/lib/auth/admin-guard';
import {
  fetchProductionBlogCategories,
  createProductionBlogCategory,
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
        categories: [],
      },
      { status: 503 }
    );
  }

  const catRes = await fetchProductionBlogCategories();
  if (catRes.error) {
    return NextResponse.json({ success: false, error: catRes.error }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
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
    const name = body.name?.trim();
    if (!name || name.length < 2 || name.length > 40) {
      return NextResponse.json(
        { success: false, error: 'Category name must be between 2 and 40 characters.' },
        { status: 400 }
      );
    }

    const res = await createProductionBlogCategory({
      name,
      slug: body.slug?.trim() || undefined,
      sort_order: body.sort_order ? Number(body.sort_order) : 0,
    });

    if (res.error || !res.category) {
      return NextResponse.json(
        { success: false, error: res.error || 'Failed to create category' },
        { status: 400 }
      );
    }

    logAuthEvent('info', 'BLOG_CATEGORY_CREATED' as any, {
      admin: auth.user?.email,
      category: res.category.name,
      slug: res.category.slug,
    });

    return NextResponse.json({ success: true, category: res.category });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid request payload';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

