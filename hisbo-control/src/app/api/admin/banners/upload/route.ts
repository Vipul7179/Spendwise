import { NextResponse } from 'next/server';
import { verifyRealAdminSession } from '@/lib/auth/admin-guard';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { logAuthEvent } from '@/lib/auth/audit';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
]);

/**
 * Administrative API: Secure Banner Image Upload to Supabase Storage
 *
 * Security Requirements:
 * 1. Strict server-side admin verification (rejects demo and unauthenticated sessions).
 * 2. File size clamped to 5 MB maximum.
 * 3. File MIME type validated against strict raster whitelist (JPEG, PNG, WebP, GIF).
 *    SVG files are strictly REJECTED to prevent embedded script / XSS vulnerabilities.
 * 4. Bucket strictly restricted to 'banners' (prevents path traversal or writes to user receipt buckets).
 * 5. Server-side credentials stay on server; never exposed to browser or client bundles.
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

  // 3. File size validation
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { success: false, error: `File size exceeds the 5 MB limit (received ${(file.size / 1024 / 1024).toFixed(2)} MB).` },
      { status: 400 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json({ success: false, error: 'File cannot be empty.' }, { status: 400 });
  }

  // 4. MIME type validation
  const ext = ALLOWED_MIME_TYPES.get(file.type);
  if (!ext) {
    return NextResponse.json(
      {
        success: false,
        error: `Unsupported file type "${file.type}". Allowed formats: JPEG, PNG, WebP, GIF (SVG is strictly prohibited).`,
      },
      { status: 400 }
    );
  }

  // 5. Initialize server-side Supabase Storage client
  const targetUrl = process.env.PROD_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const targetServiceKey = process.env.PROD_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!targetUrl || !targetServiceKey) {
    return NextResponse.json(
      {
        success: false,
        error: 'Supabase Storage credentials are not configured in hisbo-control/.env.local.',
      },
      { status: 503 }
    );
  }

  const storageClient = createClient(targetUrl, targetServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 6. Generate sanitized destination path (strictly in 'banners' bucket)
  const safeFilename = `banner_${Date.now()}_${randomBytes(4).toString('hex')}.${ext}`;
  const bucketName = 'banners';

  try {
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await storageClient.storage
      .from(bucketName)
      .upload(safeFilename, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      // Check if bucket does not exist
      if (uploadError.message?.includes('Bucket not found')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Storage bucket "banners" does not exist in the configured Supabase project. Please create the public "banners" bucket in Supabase Storage.',
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
      mimeType: file.type,
    });

    return NextResponse.json({
      success: true,
      publicUrl: publicUrlData.publicUrl,
      imagePath: safeFilename,
      size: file.size,
      mimeType: file.type,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Storage upload failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

