import { NextResponse } from 'next/server';
import { verifyRealAdminSession } from '@/lib/auth/admin-guard';
import {
  fetchProductionBanners,
  createProductionBanner,
  updateProductionBanner,
  deleteProductionBanner,
  reorderProductionBanners,
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
        banners: [],
      },
      { status: 503 }
    );
  }

  const { banners, error } = await fetchProductionBanners();
  if (error) {
    return NextResponse.json({ success: false, error }, { status: 500 });
  }

  return NextResponse.json({ success: true, banners });
}

export async function POST(request: Request) {
  const auth = await verifyRealAdminSession(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.statusCode });
  }

  try {
    const body = await request.json();

    // Reorder action
    if (body.action === 'reorder' && Array.isArray(body.orderedIds)) {
      const res = await reorderProductionBanners(body.orderedIds);
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error || 'Failed to reorder' }, { status: 500 });
      }
      logAuthEvent('info', 'BANNERS_REORDERED' as any, { admin: auth.user?.email });
      return NextResponse.json({ success: true, message: 'Banners reordered successfully.' });
    }

    // Create banner
    if (!body.image_url) {
      return NextResponse.json({ success: false, error: 'Banner image URL is required.' }, { status: 400 });
    }

    const res = await createProductionBanner({
      title: body.title || null,
      description: body.description || null,
      link_url: body.link_url || null,
      image_url: body.image_url,
      image_path: body.image_path || null,
      sort_order: body.sort_order ?? 0,
      is_active: body.is_active ?? true,
    });

    if (res.error || !res.banner) {
      return NextResponse.json({ success: false, error: res.error || 'Failed to create banner' }, { status: 500 });
    }

    logAuthEvent('info', 'BANNER_CREATED' as any, {
      admin: auth.user?.email,
      bannerId: res.banner.id,
      title: res.banner.title,
    });

    return NextResponse.json({ success: true, banner: res.banner });
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
      return NextResponse.json({ success: false, error: 'Banner ID is required.' }, { status: 400 });
    }

    const res = await updateProductionBanner(body.id, body.updates || {});
    if (res.error || !res.banner) {
      return NextResponse.json({ success: false, error: res.error || 'Failed to update banner' }, { status: 500 });
    }

    logAuthEvent('info', 'BANNER_UPDATED' as any, {
      admin: auth.user?.email,
      bannerId: body.id,
    });

    return NextResponse.json({ success: true, banner: res.banner });
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
    return NextResponse.json({ success: false, error: 'Banner ID is required.' }, { status: 400 });
  }

  const res = await deleteProductionBanner(id);
  if (!res.success) {
    return NextResponse.json({ success: false, error: res.error || 'Failed to delete banner' }, { status: 500 });
  }

  logAuthEvent('warn', 'BANNER_DELETED' as any, {
    admin: auth.user?.email,
    bannerId: id,
  });

  return NextResponse.json({ success: true, id });
}

