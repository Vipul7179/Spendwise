'use client';

import React, { useState, useEffect } from 'react';
import {
  ImageIcon,
  PlusIcon,
  RefreshIcon,
  ExternalLinkIcon,
  CheckCircleIcon,
  XIcon,
  LockIcon,
  AlertTriangleIcon,
  ShieldIcon,
} from '@/components/icons';
import { BannerItem } from '@/types/banner';
import { ImageUploader } from '@/components/ui/ImageUploader';

export default function BannerManagementPage() {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigNeeded, setIsConfigNeeded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerItem | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formLink, setFormLink] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formImagePath, setFormImagePath] = useState('');
  const [formOrder, setFormOrder] = useState('0');
  const [formActive, setFormActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchBanners = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setIsConfigNeeded(false);

    try {
      const res = await fetch('/api/admin/banners');
      const data = await res.json();

      if (!res.ok) {
        if (data.requiresConfiguration) {
          setIsConfigNeeded(true);
          setErrorMsg(data.error || 'Production management is not yet configured.');
        } else {
          setErrorMsg(data.error || 'Failed to load banners from production database.');
        }
        setBanners([]);
        return;
      }

      setBanners(data.banners || []);
    } catch {
      setErrorMsg('Network error connecting to banners API.');
      setBanners([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function loadInitialBanners() {
      try {
        const res = await fetch('/api/admin/banners');
        const data = await res.json();
        if (ignore) return;

        if (!res.ok) {
          if (data.requiresConfiguration) {
            setIsConfigNeeded(true);
            setErrorMsg(data.error || 'Production management is not yet configured.');
          } else {
            setErrorMsg(data.error || 'Failed to load banners from production database.');
          }
          setBanners([]);
          return;
        }

        setBanners(data.banners || []);
      } catch {
        if (!ignore) {
          setErrorMsg('Network error connecting to banners API.');
          setBanners([]);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialBanners();
    return () => {
      ignore = true;
    };
  }, []);

  const openCreateModal = () => {
    setEditingBanner(null);
    setFormTitle('');
    setFormDesc('');
    setFormLink('');
    setFormImageUrl('');
    setFormImagePath('');
    setFormOrder(String(banners.length + 1));
    setFormActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (banner: BannerItem) => {
    setEditingBanner(banner);
    setFormTitle(banner.title || '');
    setFormDesc(banner.description || '');
    setFormLink(banner.link_url || '');
    setFormImageUrl(banner.image_url || '');
    setFormImagePath(banner.image_path || '');
    setFormOrder(String(banner.sort_order));
    setFormActive(banner.is_active);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formImageUrl.trim()) {
      showToast('Image URL is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingBanner) {
        // Update
        const res = await fetch('/api/admin/banners', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingBanner.id,
            updates: {
              title: formTitle.trim() || null,
              description: formDesc.trim() || null,
              link_url: formLink.trim() || null,
              image_url: formImageUrl.trim(),
              image_path: formImagePath.trim() || null,
              sort_order: parseInt(formOrder, 10) || 0,
              is_active: formActive,
            },
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Update failed');
        showToast('Banner updated successfully.');
      } else {
        // Create
        const res = await fetch('/api/admin/banners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formTitle.trim() || null,
            description: formDesc.trim() || null,
            link_url: formLink.trim() || null,
            image_url: formImageUrl.trim(),
            image_path: formImagePath.trim() || null,
            sort_order: parseInt(formOrder, 10) || 0,
            is_active: formActive,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Creation failed');
        showToast('Banner created successfully.');
      }

      setIsModalOpen(false);
      void fetchBanners();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      showToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleBannerStatus = async (banner: BannerItem) => {
    try {
      const res = await fetch('/api/admin/banners', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: banner.id,
          updates: { is_active: !banner.is_active },
        }),
      });
      if (!res.ok) throw new Error('Status update failed');
      showToast(`Banner marked as ${!banner.is_active ? 'Active' : 'Inactive'}.`);
      void fetchBanners();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update status';
      showToast(msg);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promotional banner?')) return;
    try {
      const res = await fetch(`/api/admin/banners?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showToast('Banner removed successfully.');
      void fetchBanners();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete banner';
      showToast(msg);
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= banners.length) return;

    const reordered = [...banners];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setBanners(reordered);

    try {
      const orderedIds = reordered.map((b) => b.id);
      await fetch('/api/admin/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reorder', orderedIds }),
      });
      showToast('Banner sort order saved.');
    } catch {
      showToast('Failed to save banner reordering.');
      void fetchBanners();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Promotional Banners
            </h1>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 999,
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Spendwise Production (omnhxlqykmtzxdagppcl)
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Manage the hero banner carousel displayed on customer web dashboards.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={fetchBanners} disabled={isLoading} className="btn btn-secondary btn-sm" title="Refresh Banners">
            <RefreshIcon size={15} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button onClick={openCreateModal} className="btn btn-primary btn-sm" style={{ gap: '0.4rem' }}>
            <PlusIcon size={16} />
            <span>New Banner</span>
          </button>
        </div>
      </div>

      {/* Production Setup Guidance */}
      {isConfigNeeded && (
        <div
          className="admin-card"
          style={{
            borderLeft: '4px solid #38bdf8',
            padding: '1.25rem 1.5rem',
            background: 'rgba(56, 189, 248, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <ShieldIcon size={20} style={{ color: '#38bdf8', flexShrink: 0 }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Production Management Awaiting Setup
            </h3>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Banners are stored in the Spendwise production database (<code>public.banners</code>) and displayed on live customer dashboards. To manage live banners:
          </p>
          <ol style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <li>Run migration <code>migrations/004_production_content_setup.sql</code> in your Supabase SQL Editor.</li>
            <li>Configure <code>PROD_OPERATOR_ENABLED=true</code> and <code>PROD_OPERATOR_DATABASE_URL</code> in <code>hisbo-control/.env.local</code>.</li>
            <li>Click &quot;Refresh&quot; to load your live banners.</li>
          </ol>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && !isConfigNeeded && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 8,
            fontSize: '0.8125rem',
            color: '#f87171',
          }}
        >
          <AlertTriangleIcon size={18} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: 'var(--bg-card)',
            border: '1px solid var(--accent)',
            padding: '0.75rem 1.25rem',
            borderRadius: 8,
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--text-main)',
            fontSize: '0.875rem',
            zIndex: 100,
          }}
        >
          <CheckCircleIcon size={18} style={{ color: 'var(--accent)' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Banners Grid / List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {isLoading ? (
          <div className="admin-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading banners from production database...
          </div>
        ) : banners.length === 0 ? (
          <div className="admin-card" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            {errorMsg && !isConfigNeeded ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <AlertTriangleIcon size={36} style={{ color: '#f87171', margin: '0 auto' }} />
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9375rem' }}>
                  Failed to Load Promotional Banners
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#f87171', maxWidth: 460, margin: '0 auto' }}>
                  {errorMsg}
                </p>
                <button onClick={fetchBanners} className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem', gap: '0.4rem' }}>
                  <RefreshIcon size={14} />
                  <span>Retry</span>
                </button>
              </div>
            ) : (
              <>
                <ImageIcon size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem auto' }} />
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9375rem' }}>
                  {isConfigNeeded ? 'Awaiting Production Management Setup' : 'No Promotional Banners Found'}
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.35rem', maxWidth: 440, margin: '0.35rem auto 0 auto' }}>
                  {isConfigNeeded
                    ? 'Complete the manual setup to manage the live carousel.'
                    : 'Click "New Banner" to create your first promotional carousel slide.'}
                </p>
              </>
            )}
          </div>
        ) : (
          banners.map((banner, index) => (
            <div
              key={banner.id}
              className="admin-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                padding: '1rem 1.25rem',
              }}
            >
              {/* Left thumbnail and info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 'min(100%, 240px)', flex: 1, flexWrap: 'wrap' }}>
                <div
                  style={{
                    width: 100,
                    height: 56,
                    borderRadius: 6,
                    background: 'var(--bg-secondary)',
                    overflow: 'hidden',
                    flexShrink: 0,
                    border: '1px solid var(--border)',
                    position: 'relative',
                  }}
                >
                  {banner.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={banner.image_url}
                      alt={banner.title || 'Banner'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      <ImageIcon size={20} />
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {banner.title || 'Untitled Banner'}
                    </h3>
                    <span className={`badge ${banner.is_active ? 'badge-success' : 'badge-neutral'}`}>
                      {banner.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {banner.description && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem', maxWidth: 420 }}>
                      {banner.description}
                    </p>
                  )}
                  {banner.link_url && (
                    <a
                      href={banner.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        fontSize: '0.6875rem',
                        color: 'var(--accent)',
                        marginTop: '0.25rem',
                      }}
                    >
                      <span>{banner.link_url}</span>
                      <ExternalLinkIcon size={10} />
                    </a>
                  )}
                </div>
              </div>

              {/* Right actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleMoveOrder(index, 'up')}
                  disabled={index === 0}
                  className="btn btn-secondary btn-sm"
                  title="Move Up"
                  style={{ padding: '0.25rem 0.5rem', opacity: index === 0 ? 0.4 : 1 }}
                >
                  ↑
                </button>
                <button
                  onClick={() => handleMoveOrder(index, 'down')}
                  disabled={index === banners.length - 1}
                  className="btn btn-secondary btn-sm"
                  title="Move Down"
                  style={{ padding: '0.25rem 0.5rem', opacity: index === banners.length - 1 ? 0.4 : 1 }}
                >
                  ↓
                </button>
                <button
                  onClick={() => toggleBannerStatus(banner)}
                  className="btn btn-secondary btn-sm"
                >
                  {banner.is_active ? 'Disable' : 'Enable'}
                </button>
                <button onClick={() => openEditModal(banner)} className="btn btn-secondary btn-sm">
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteBanner(banner.id)}
                  className="btn btn-secondary btn-sm"
                  style={{ color: 'var(--danger)' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-content admin-card"
            style={{ maxWidth: 520, padding: '1.75rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {editingBanner ? 'Edit Promotional Banner' : 'Create New Promotional Banner'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <XIcon size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Banner Title
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Save Smarter with Hisbo Splits"
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Description / Subtitle
                </label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="e.g. Split expenses effortlessly with roomies and friends."
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Target Destination URL (Optional)
                </label>
                <input
                  type="url"
                  value={formLink}
                  onChange={(e) => setFormLink(e.target.value)}
                  placeholder="https://www.hisbo.in/groups"
                  className="input-field"
                />
              </div>

              <ImageUploader
                label="Banner Image"
                value={formImageUrl}
                onChange={(url) => setFormImageUrl(url)}
                uploadEndpoint="/api/admin/banners/upload"
                aspectRatio="banner"
                required
                helperText="Upload image or enter URL. Supports JPEG, PNG, WebP, AVIF (max 5 MB)."
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={formOrder}
                    onChange={(e) => setFormOrder(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                  <input
                    type="checkbox"
                    id="bannerActive"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  <label htmlFor="bannerActive" style={{ fontSize: '0.8125rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                    Active (Visible)
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                  {isSubmitting ? 'Saving...' : editingBanner ? 'Save Changes' : 'Create Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

