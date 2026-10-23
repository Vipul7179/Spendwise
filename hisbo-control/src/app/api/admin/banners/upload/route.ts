import { NextResponse } from 'next/server';
import { verifyRealAdminSession } from '@/lib/auth/admin-guard';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { logAuthEvent } from '@/lib/auth/audit';
import { validateImageBuffer } from '@/lib/storage/image-validator';

export const dynamic = 'force-dynamic';

// 2 MB file size limit enforced by the production 'banners' bucket
const MAX_BANNER_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

/**
 * Administrative API: Secure Banner Image Upload to Supabase Storage
 *
 * Targets the verified public 'banners' bucket (2 MB max) on the Spendwise
 * production Supabase project (omnhxlqykmtzxdagppcl).
 *
 * Requirements:
 * 1. Authenticated administrator session verified on staging auth.
 * 2. Upload routed to production via PROD_SUPABASE_URL and PROD_SUPABASE_SERVICE_KEY.
 * 3. Never falls back to staging authentication project for storage writes.
 */
export async function POST(request: Request) {
  // 1. Verify authenticated administrator session
  const auth = await verifyRealAdminSession(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.statusCode });
  }

  // 2. Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ success: false, error: 'Expected multipart/form-data payload.' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ success: false, error: 'A valid image file is required.' }, { status: 400 });
  }

  // 3. File size check against 2 MB bucket limit
  if (file.size > MAX_BANNER_IMAGE_SIZE_BYTES) {
    return NextResponse.json(
      {
        success: false,
        error: `File size exceeds the 2 MB limit for the banners bucket (received ${(file.size / 1024 / 1024).toFixed(2)} MB).`,
      },
      { status: 400 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json({ success: false, error: 'File cannot be empty.' }, { status: 400 });
  }

  // 4. Read buffer and validate magic bytes (JPEG, PNG, WebP, AVIF) & reject SVG
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const validation = validateImageBuffer(fileBuffer, file.type);
  if (!validation.valid || !validation.extension) {
    return NextResponse.json({ success: false, error: validation.error || 'Invalid image format.' }, { status: 400 });
  }

  // 5. Initialize server-side Supabase Storage client for PRODUCTION
  const targetUrl = process.env.PROD_SUPABASE_URL;
  const targetServiceKey = process.env.PROD_SUPABASE_SERVICE_KEY;

  if (!targetUrl || !targetServiceKey) {
    return NextResponse.json(
      {
        success: false,
        error: 'Production Supabase Storage credentials (PROD_SUPABASE_URL and PROD_SUPABASE_SERVICE_KEY) are not configured in hisbo-control/.env.local.',
      },
      { status: 503 }
    );
  }

  const storageClient = createClient(targetUrl, targetServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 6. Generate sanitized destination path (strictly in production 'banners' bucket)
  const safeFilename = `banner_${Date.now()}_${randomBytes(4).toString('hex')}.${validation.extension}`;
  const bucketName = 'banners';

  try {
    const { error: uploadError } = await storageClient.storage
      .from(bucketName)
      .upload(safeFilename, fileBuffer, {
        contentType: validation.mimeType || file.type,
        upsert: false,
      });

    if (uploadError) {
      if (uploadError.message?.includes('Bucket not found')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Storage bucket "banners" does not exist in the configured Supabase project.',
          },
          { status: 502 }
        );
      }
      return NextResponse.json({ success: false, error: uploadError.message }, { status: 500 });
    }

    // 7. Obtain public CDN URL
    const { data: publicUrlData } = storageClient.storage.from(bucketName).getPublicUrl(safeFilename);

    logAuthEvent('info', 'BANNER_IMAGE_UPLOADED' as any, {
      admin: auth.user?.email,
      path: safeFilename,
      sizeBytes: file.size,
      mimeType: validation.mimeType || file.type,
    });

    return NextResponse.json({
      success: true,
      publicUrl: publicUrlData.publicUrl,
      imagePath: safeFilename,
      size: file.size,
      mimeType: validation.mimeType || file.type,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Storage upload failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
