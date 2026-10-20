import type { SupabaseClient } from '@supabase/supabase-js';
import type { BannerItem } from '@/types/banner';

// Storage and row updates are separate operations. Delete only after a confirmed
// row commit, and preserve objects whenever a failed response leaves doubt.
export async function saveBannerWithImage(
  client: SupabaseClient,
  payload: Omit<BannerItem, 'id' | 'created_at'>,
  previous: BannerItem | null,
  upload?: { path: string; file: File },
): Promise<{ banner: BannerItem; cleanupWarning: boolean }> {
  const bucket = client.storage.from('banners');
  const next = { ...payload };
  if (upload) {
    const { error } = await bucket.upload(upload.path, upload.file, { contentType: upload.file.type, upsert: false });
    if (error) throw error;
    next.image_path = upload.path;
    next.image_url = bucket.getPublicUrl(upload.path).data.publicUrl;
  }

  try {
    const query = previous
      ? client.from('banners').update(next).eq('id', previous.id)
      : client.from('banners').insert(next);
    const { data, error } = await query.select().single();
    if (error) throw error;
    if (!data || data.image_path !== next.image_path || data.image_url !== next.image_url) {
      throw new Error('Could not confirm the saved banner image. Refresh before retrying.');
    }

    let cleanupWarning = false;
    if (previous?.image_path && previous.image_path !== next.image_path) {
      try {
        const { data: references, error: readError } = await client.from('banners')
          .select('id').eq('image_path', previous.image_path).limit(1);
        if (readError) throw readError;
        if (!references?.length) {
          const { error: removeError } = await bucket.remove([previous.image_path]);
          if (removeError) throw removeError;
        }
      } catch {
        // The saved row is valid. Cleanup failure must not be reported as a failed save.
        cleanupWarning = true;
      }
    }
    return { banner: data as BannerItem, cleanupWarning };
  } catch (error) {
    if (upload) {
      try {
        const { data: references, error: readError } = await client.from('banners')
          .select('id').eq('image_path', upload.path).limit(1);
        // A lost response can hide a successful DB commit. Read back before
        // removing an upload; if read-back also fails, retain it for inspection.
        if (!readError && references && references.length === 0) {
          const { error: cleanupError } = await bucket.remove([upload.path]);
          if (cleanupError) console.warn('[Banners] New image cleanup failed:', cleanupError);
        }
      } catch { /* Preserve uncertain storage objects rather than break a live row. */ }
    }
    throw error;
  }
}
