import { NextResponse } from 'next/server';
import { verifyRealAdminSession } from '@/lib/auth/admin-guard';
import {
  fetchProductionSettings,
  updateProductionSetting,
  getProductionOperatorStatus,
} from '@/lib/production/operator';
import { logAuthEvent } from '@/lib/auth/audit';

export const dynamic = 'force-dynamic';

const DEFAULT_SETTINGS = {
  maintenance_mode: {
    key: 'maintenance_mode',
    value: { enabled: false, message: 'Hisbo is currently undergoing scheduled platform maintenance.' },
    description: 'Global maintenance mode toggle and customer notice banner',
    updated_at: new Date().toISOString(),
  },
  allow_signups: {
    key: 'allow_signups',
    value: { enabled: true },
    description: 'Control customer registration availability',
    updated_at: new Date().toISOString(),
  },
  announcement_bar: {
    key: 'announcement_bar',
    value: { enabled: false, message: '', link: '' },
    description: 'Top promotional announcement bar across web endpoints',
    updated_at: new Date().toISOString(),
  },
  support_contact: {
    key: 'support_contact',
    value: { email: 'support@hisbo.in', phone: '' },
    description: 'Official contact metadata displayed in platform footers',
    updated_at: new Date().toISOString(),
  },
};

export async function GET(request: Request) {
  const auth = await verifyRealAdminSession(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.statusCode });
  }

  const status = getProductionOperatorStatus();
  if (!status.enabled || !status.configured) {
    return NextResponse.json(
      {
        success: true,
        configured: false,
        source: 'local_defaults',
        message: status.message,
        settings: DEFAULT_SETTINGS,
      }
    );
  }

  const { settings, error } = await fetchProductionSettings();
  if (error) {
    return NextResponse.json({ success: false, error }, { status: 500 });
  }

  // Merge loaded settings over defaults
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  return NextResponse.json({ success: true, configured: true, source: 'production', settings: merged });
}

export async function POST(request: Request) {
  const auth = await verifyRealAdminSession(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.statusCode });
  }

  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || !value || typeof value !== 'object') {
      return NextResponse.json({ success: false, error: 'Setting key and object value are required.' }, { status: 400 });
    }

    const res = await updateProductionSetting(key, value, auth.user?.email || 'admin');
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error || 'Failed to update setting' }, { status: 500 });
    }

    logAuthEvent('info', 'PLATFORM_SETTING_UPDATED' as any, {
      admin: auth.user?.email,
      settingKey: key,
    });

    return NextResponse.json({ success: true, key, value });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid request payload';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

