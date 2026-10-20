'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { createClient } from '@/lib/supabase/client';

interface BannerItem {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string;
  image_path: string | null;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
}

function safeUrl(v: string | null): string {
  if (!v) return '';
  try {
    const u = new URL(v.trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '';
  } catch {
    return '';
  }
}

async function shrinkImg(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    throw new Error('Please choose a JPG, PNG or WebP image.');
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('That image is too large (maximum 8 MB).');
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / bitmap.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/webp', 0.85)
      );
      if (blob && blob.size < file.size) {
        return new File([blob], 'banner.webp', { type: 'image/webp' });
      }
    }
  } catch {}

  return file;
}

export default function AdminBannersPage() {
  const router = useRouter();
  const { user, isAdmin, isLoading, showToast } = useApp();

  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(true);

  // Add / Edit Modal state
  const [editingBanner, setEditingBanner] = useState<BannerItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formLink, setFormLink] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formOrder, setFormOrder] = useState('0');
  const [formActive, setFormActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Delete Modal state
  const [bannerToDelete, setBannerToDelete] = useState<BannerItem | null>(null);

  const fetchBanners = useCallback(async () => {
    try {
      setLoadingBanners(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBanners(data || []);
    } catch (err: any) {
      console.error('[Admin] Fetch banners error:', err);
      showToast(err.message || 'Could not load banners.', 'err');
    } finally {
      setLoadingBanners(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!isLoading) {
      if (!user || !isAdmin) {
        return;
      }
      fetchBanners();
    }
  }, [isLoading, user, isAdmin, fetchBanners]);

  if (isLoading) {
    return (
      <div className="card">
        <h2>Promotional banners</h2>
        <p className="mut">Checking authorization…</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
        <h2>Access Restricted</h2>
        <p className="mut">You do not have permission to manage promotional banners.</p>
        <Link href="/overview" className="b" style={{ display: 'inline-block', marginTop: '12px' }}>
          Back to overview
        </Link>
      </div>
    );
  }

  const openAddForm = () => {
    setEditingBanner(null);
    setFormTitle('');
    setFormDesc('');
    setFormLink('');
    setFormImageUrl('');
    setFormFile(null);
    setFormOrder('0');
    setFormActive(true);
    setIsFormOpen(true);
  };

  const openEditForm = (b: BannerItem) => {
    setEditingBanner(b);
    setFormTitle(b.title || '');
    setFormDesc(b.description || '');
    setFormLink(b.link_url || '');
    setFormImageUrl(b.image_url || '');
    setFormFile(null);
    setFormOrder(String(b.sort_order || 0));
    setFormActive(b.is_active);
    setIsFormOpen(true);
  };

  const handleToggleActive = async (b: BannerItem) => {
    try {
      const supabase = createClient();
      const nextActive = !b.is_active;
      const { error } = await supabase
        .from('banners')
        .update({ is_active: nextActive })
        .eq('id', b.id);

      if (error) throw error;

      setBanners((prev) =>
        prev.map((item) => (item.id === b.id ? { ...item, is_active: nextActive } : item))
      );
      showToast(nextActive ? 'Banner activated.' : 'Banner deactivated.');
    } catch (err: any) {
      showToast(err.message || 'Could not update banner status.', 'err');
    }
  };

  const handleDeleteBanner = async () => {
    if (!bannerToDelete) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from('banners').delete().eq('id', bannerToDelete.id);
      if (error) throw error;

      if (bannerToDelete.image_path) {
        await supabase.storage.from('banners').remove([bannerToDelete.image_path]);
      }

      setBanners((prev) => prev.filter((b) => b.id !== bannerToDelete.id));
      setBannerToDelete(null);
      showToast('Banner deleted.');
    } catch (err: any) {
      showToast(err.message || 'Could not delete banner.', 'err');
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const trimmedTitle = formTitle.trim();
    if (trimmedTitle.length > 60) {
      showToast('Title must be 60 characters or fewer.', 'err');
      return;
    }

    const trimmedDesc = formDesc.trim();
    if (trimmedDesc.length > 140) {
      showToast('Description must be 140 characters or fewer.', 'err');
      return;
    }

    const trimmedLink = formLink.trim();
    if (trimmedLink && !safeUrl(trimmedLink)) {
      showToast('Enter a valid link starting with https:// or http://.', 'err');
      return;
    }

    const orderNum = parseInt(formOrder || '0', 10);
    if (isNaN(orderNum) || orderNum < 0 || orderNum > 999) {
      showToast('Order must be a whole number from 0 to 999.', 'err');
      return;
    }

    const trimmedImgUrl = formImageUrl.trim();
    if (!formFile && !trimmedImgUrl && (!editingBanner || !editingBanner.image_url)) {
      showToast('Choose an image or paste an image link.', 'err');
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();
      let finalImgUrl = editingBanner?.image_url || '';
      let finalImgPath = editingBanner?.image_path || null;

      if (formFile) {
        const smallFile = await shrinkImg(formFile);
        if (smallFile.size > 2 * 1024 * 1024) {
          throw new Error('Image is still over 2 MB. Please choose a smaller image.');
        }

        const ext = smallFile.type === 'image/webp' ? 'webp' : smallFile.type === 'image/png' ? 'png' : 'jpg';
        const uploadPath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('banners')
          .upload(uploadPath, smallFile, { contentType: smallFile.type, upsert: false });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('banners').getPublicUrl(uploadPath);

        // Delete previous storage image if replaced
        if (editingBanner?.image_path) {
          await supabase.storage.from('banners').remove([editingBanner.image_path]);
        }

        finalImgUrl = publicUrlData.publicUrl;
        finalImgPath = uploadPath;
      } else if (trimmedImgUrl && trimmedImgUrl !== editingBanner?.image_url) {
        if (editingBanner?.image_path) {
          await supabase.storage.from('banners').remove([editingBanner.image_path]);
        }
        finalImgUrl = trimmedImgUrl;
        finalImgPath = null;
      }

      const payload = {
        title: trimmedTitle || null,
        description: trimmedDesc || null,
        link_url: trimmedLink ? safeUrl(trimmedLink) : null,
        image_url: finalImgUrl,
        image_path: finalImgPath,
        sort_order: orderNum,
        is_active: formActive,
      };

      if (editingBanner) {
        const { data, error } = await supabase
          .from('banners')
          .update(payload)
          .eq('id', editingBanner.id)
          .select()
          .single();

        if (error) throw error;
        setBanners((prev) => prev.map((b) => (b.id === editingBanner.id ? data : b)));
        showToast('Banner updated.');
      } else {
        const { data, error } = await supabase
          .from('banners')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        setBanners((prev) => [data, ...prev]);
        showToast('Banner created.');
      }

      setIsFormOpen(false);
    } catch (err: any) {
      console.error('[Admin] Save banner error:', err);
      showToast(err.message || 'Could not save banner.', 'err');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '14px' }}>
        <div className="ahd" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <h2 style={{ margin: 0 }}>Promotional banners</h2>
          <button type="button" className="b" onClick={openAddForm} style={{ flex: 'none' }}>
            Add banner
          </button>
        </div>
        <p className="mut" style={{ margin: '8px 0 16px' }}>
          Active banners appear on every user&apos;s Overview page. Best image size: 1600 &times; 600 px.
        </p>

        {loadingBanners ? (
          <div className="empty">Loading banners…</div>
        ) : banners.length ? (
          <div className="alist" style={{ display: 'grid', gap: '10px' }}>
            {banners.map((b) => (
              <div
                key={b.id}
                className="arow"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '96px 1fr',
                  gap: '12px',
                  alignItems: 'center',
                  border: '1px solid var(--line)',
                  borderRadius: '14px',
                  padding: '10px',
                  background: 'var(--bg)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.image_url}
                  alt={b.title || 'Banner'}
                  loading="lazy"
                  style={{
                    width: '96px',
                    aspectRatio: '8/3',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    background: 'var(--line)',
                  }}
                />

                <div style={{ minWidth: 0 }}>
                  <b>{b.title || 'Untitled banner'}</b>{' '}
                  <span
                    className={`st2 ${b.is_active ? 'on' : ''}`}
                    style={{
                      display: 'inline-block',
                      fontSize: '0.7rem',
                      padding: '2px 8px',
                      borderRadius: '99px',
                      background: b.is_active
                        ? 'color-mix(in srgb, var(--ok) 16%, transparent)'
                        : 'var(--card)',
                      color: b.is_active ? 'var(--ok)' : 'var(--mut)',
                      border: '1px solid var(--line)',
                    }}
                  >
                    {b.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <div className="mut" style={{ fontSize: '0.82rem', overflowWrap: 'anywhere', marginTop: '2px' }}>
                    {b.link_url ? b.link_url : 'No link'} &middot; order {b.sort_order}
                  </div>
                </div>

                <div className="acts" style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button type="button" className="g" onClick={() => openEditForm(b)}>
                    Edit
                  </button>
                  <button type="button" className="g" onClick={() => handleToggleActive(b)}>
                    {b.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button type="button" className="g" onClick={() => setBannerToDelete(b)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">No banners yet. Add your first one.</div>
        )}
      </div>

      {/* Add / Edit Banner Modal */}
      {isFormOpen && (
        <div
          className="mod"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSaving) setIsFormOpen(false);
          }}
        >
          <div className="box" role="dialog" aria-modal="true" aria-label="Banner Form" style={{ maxWidth: '520px' }}>
            <div className="nm adm">
              <h2>{editingBanner ? 'Edit banner' : 'Add banner'}</h2>
              <form onSubmit={handleSaveBanner} style={{ width: '100%' }}>
                <label className="lbl" htmlFor="bt">
                  Title (optional)
                </label>
                <input
                  id="bt"
                  type="text"
                  maxLength={60}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  style={{ width: '100%', marginBottom: '8px' }}
                />

                <label className="lbl" htmlFor="bd">
                  Description (optional)
                </label>
                <input
                  id="bd"
                  type="text"
                  maxLength={140}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  style={{ width: '100%', marginBottom: '8px' }}
                />

                <label className="lbl" htmlFor="bl">
                  Redirect link (optional)
                </label>
                <input
                  id="bl"
                  type="url"
                  placeholder="https://example.com/offer"
                  maxLength={2000}
                  value={formLink}
                  onChange={(e) => setFormLink(e.target.value)}
                  style={{ width: '100%', marginBottom: '8px' }}
                />

                <label className="lbl" htmlFor="bf">
                  Banner image
                </label>
                {editingBanner?.image_url && !formFile && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={editingBanner.image_url}
                    alt="Current preview"
                    className="bprev"
                    style={{
                      width: '100%',
                      aspectRatio: '8/3',
                      objectFit: 'cover',
                      borderRadius: '12px',
                      border: '1px solid var(--line)',
                      marginBottom: '8px',
                    }}
                  />
                )}
                <input
                  id="bf"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setFormFile(e.target.files[0]);
                  }}
                  style={{ width: '100%', marginBottom: '4px' }}
                />
                <div className="note" style={{ margin: '0 0 10px' }}>
                  Best size 1600 &times; 600 px (JPG, PNG or WebP). Larger images are resized automatically.
                </div>

                <label className="lbl" htmlFor="bi">
                  Or paste an image link
                </label>
                <input
                  id="bi"
                  type="url"
                  placeholder="https://..."
                  maxLength={2000}
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  style={{ width: '100%', marginBottom: '8px' }}
                />

                <label className="lbl" htmlFor="bs">
                  Display order (0 shows first)
                </label>
                <input
                  id="bs"
                  type="number"
                  min="0"
                  max="999"
                  value={formOrder}
                  onChange={(e) => setFormOrder(e.target.value)}
                  style={{ width: '100%', marginBottom: '10px' }}
                />

                <label
                  className="chk"
                  style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '14px' }}
                >
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    style={{ width: '16px', height: '16px', flex: 'none', padding: 0 }}
                  />
                  <span>Active (visible to users)</span>
                </label>

                <button
                  type="submit"
                  className="b cta"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving…' : 'Save banner'}
                </button>
                <button
                  type="button"
                  className="g"
                  disabled={isSaving}
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancel
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Banner Modal */}
      {bannerToDelete && (
        <div
          className="mod"
          onClick={(e) => {
            if (e.target === e.currentTarget) setBannerToDelete(null);
          }}
        >
          <div className="box" role="dialog" aria-modal="true" aria-label="Delete banner">
            <div className="nm">
              <div className="av bad">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                </svg>
              </div>
              <h2>Delete this banner?</h2>
              <p className="mut" style={{ textAlign: 'center' }}>
                <b>{bannerToDelete.title || 'Untitled banner'}</b>
                <br />
                This cannot be undone.
              </p>
              <button
                type="button"
                className="b dng"
                onClick={handleDeleteBanner}
              >
                Delete
              </button>
              <button
                type="button"
                className="g"
                onClick={() => setBannerToDelete(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
