'use client';

import React, { useState, useEffect } from 'react';
import {
  BlogIcon,
  PlusIcon,
  SearchIcon,
  ExternalLinkIcon,
  CheckCircleIcon,
  XIcon,
  RefreshIcon,
  LockIcon,
  AlertTriangleIcon,
  ShieldIcon,
} from '@/components/icons';
import { BlogPost, BlogCategory } from '@/types/blog';

export default function BlogManagementPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfigNeeded, setIsConfigNeeded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formExcerpt, setFormExcerpt] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formStatus, setFormStatus] = useState<'draft' | 'published'>('draft');
  const [formCoverImage, setFormCoverImage] = useState('');
  const [formAuthor, setFormAuthor] = useState('Hisbo Editorial');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchBlogs = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setIsConfigNeeded(false);

    try {
      const res = await fetch('/api/admin/blogs');
      const data = await res.json();

      if (!res.ok) {
        if (data.requiresConfiguration) {
          setIsConfigNeeded(true);
          setErrorMsg(data.error || 'Production content operator is not yet configured.');
        } else {
          setErrorMsg(data.error || 'Failed to load blog posts from production database.');
        }
        setPosts([]);
        setCategories([]);
        return;
      }

      setPosts(data.posts || []);
      setCategories(data.categories || []);
      if (data.categories && data.categories.length > 0 && !formCategory) {
        setFormCategory(data.categories[0].id);
      }
    } catch {
      setErrorMsg('Network error connecting to blog management API.');
      setPosts([]);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function loadInitialBlogs() {
      try {
        const res = await fetch('/api/admin/blogs');
        const data = await res.json();
        if (ignore) return;

        if (!res.ok) {
          if (data.requiresConfiguration) {
            setIsConfigNeeded(true);
            setErrorMsg(data.error || 'Production content operator is not yet configured.');
          } else {
            setErrorMsg(data.error || 'Failed to load blog posts from production database.');
          }
          setPosts([]);
          setCategories([]);
          return;
        }

        setPosts(data.posts || []);
        setCategories(data.categories || []);
        if (data.categories && data.categories.length > 0) {
          setFormCategory((prev) => prev || data.categories[0].id);
        }
      } catch {
        if (!ignore) {
          setErrorMsg('Network error connecting to blog management API.');
          setPosts([]);
          setCategories([]);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialBlogs();
    return () => {
      ignore = true;
    };
  }, []);

  const openCreateModal = () => {
    setFormTitle('');
    setFormSlug('');
    setFormCategory(categories.length > 0 ? categories[0].id : '');
    setFormExcerpt('');
    setFormContent('');
    setFormStatus('draft');
    setFormCoverImage('');
    setFormAuthor('Hisbo Editorial');
    setIsCreating(true);
    setIsEditing(false);
  };

  const openEditModal = (post: BlogPost) => {
    setSelectedPost(post);
    setFormTitle(post.title || '');
    setFormSlug(post.slug || '');
    setFormCategory(post.category_id || (categories.length > 0 ? categories[0].id : ''));
    setFormExcerpt(post.excerpt || '');
    setFormContent(post.content || '');
    setFormStatus(post.status);
    setFormCoverImage(post.cover_image_url || '');
    setFormAuthor(post.author_name || 'Hisbo Editorial');
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formSlug.trim() || !formContent.trim()) {
      showToast('Title, slug, and content are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          slug: formSlug.trim(),
          content: formContent.trim(),
          excerpt: formExcerpt.trim() || undefined,
          category_id: formCategory || undefined,
          status: formStatus,
          cover_image_url: formCoverImage.trim() || undefined,
          author_name: formAuthor.trim() || 'Hisbo Editorial',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create article');
      }

      showToast(`Article "${formTitle}" created successfully!`);
      setIsCreating(false);
      void fetchBlogs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create article';
      showToast(`Error: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/blogs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedPost.id,
          updates: {
            title: formTitle.trim(),
            slug: formSlug.trim(),
            content: formContent.trim(),
            excerpt: formExcerpt.trim() || null,
            category_id: formCategory || null,
            status: formStatus,
            cover_image_url: formCoverImage.trim() || null,
            author_name: formAuthor.trim() || 'Hisbo Editorial',
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update article');
      }

      showToast(`Article "${formTitle}" updated successfully!`);
      setIsEditing(false);
      setSelectedPost(null);
      void fetchBlogs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update article';
      showToast(`Error: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (post: BlogPost) => {
    const nextStatus = post.status === 'published' ? 'draft' : 'published';
    try {
      const res = await fetch('/api/admin/blogs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: post.id,
          updates: { status: nextStatus },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to change publication status');
      }

      showToast(`Status updated to ${nextStatus} for "${post.title}".`);
      void fetchBlogs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle status';
      showToast(`Error: ${msg}`);
    }
  };

  const handleDeletePost = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete article "${title}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/blogs?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete article');
      }

      showToast(`Article deleted successfully.`);
      if (selectedPost?.id === id) {
        setSelectedPost(null);
      }
      void fetchBlogs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete article';
      showToast(`Error: ${msg}`);
    }
  };

  const filteredPosts = posts.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' ||
      p.category_id === selectedCategory ||
      (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Blog & Content Management
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Manage educational articles, SEO metadata, and category assignments on the main Hisbo production platform.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => void fetchBlogs()}
            className="btn btn-secondary btn-sm"
            style={{ gap: '0.4rem' }}
            disabled={isLoading}
          >
            <RefreshIcon size={14} />
            <span>Refresh</span>
          </button>
          <button
            onClick={openCreateModal}
            className="btn btn-primary btn-sm"
            style={{ gap: '0.4rem' }}
            disabled={isConfigNeeded}
          >
            <PlusIcon size={16} />
            <span>New Article</span>
          </button>
        </div>
      </div>

      {/* Configuration Required Banner */}
      {isConfigNeeded && (
        <div
          className="admin-card"
          style={{
            borderLeft: '4px solid #f59e0b',
            background: 'rgba(245, 158, 11, 0.05)',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
          }}
        >
          <AlertTriangleIcon size={22} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Production Content Operator Not Configured
            </h4>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.5 }}>
              Live blog management connects directly to the Spendwise production database (<code>omnhxlqykmtzxdagppcl</code>).
              To enable article drafting, editing, and publishing:
            </p>
            <ol style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.5rem', paddingLeft: '1.25rem', lineHeight: 1.6 }}>
              <li>
                Execute <code>migrations/004_production_content_setup.sql</code> in the Supabase SQL Editor to create the least-privilege <code>hisbo_platform_operator</code> role.
              </li>
              <li>
                Set <code>PROD_OPERATOR_DATABASE_URL</code> in your local <code>hisbo-control/.env.local</code>.
              </li>
            </ol>
          </div>
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

      {/* Safety Mode Notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem 1.25rem',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 10,
          fontSize: '0.8125rem',
          color: '#34d399',
        }}
      >
        <LockIcon size={18} style={{ flexShrink: 0 }} />
        <div>
          <strong>Operator Role Protection:</strong> Content operations use the dedicated <code>hisbo_platform_operator</code> role with grants limited to <code>blog_posts</code>, <code>blog_categories</code>, <code>banners</code>, and <code>platform_settings</code>. All financial records (<code>user_data</code>) remain completely inaccessible.
        </div>
      </div>

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

      {/* Search and Category Filter */}
      <div className="admin-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 260 }}>
          <SearchIcon size={18} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles by title or slug..."
            className="input-field"
            style={{ border: 'none', background: 'transparent', padding: '0.35rem' }}
          />
        </div>

        {/* Categories Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedCategory('all')}
            style={{
              padding: '0.25rem 0.65rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: 6,
              border: 'none',
              background: selectedCategory === 'all' ? 'var(--accent)' : 'var(--bg-secondary)',
              color: selectedCategory === 'all' ? '#ffffff' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              style={{
                padding: '0.25rem 0.65rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: 6,
                border: 'none',
                background: selectedCategory === c.id ? 'var(--accent)' : 'var(--bg-secondary)',
                color: selectedCategory === c.id ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Blog Posts Table */}
      <div className="admin-table-container">
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading production blog articles...
          </div>
        ) : filteredPosts.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            {isConfigNeeded ? (
              'Configure PROD_OPERATOR_DATABASE_URL to load production blog posts.'
            ) : errorMsg ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <AlertTriangleIcon size={32} style={{ color: '#f87171' }} />
                <div style={{ color: 'var(--text-main)', fontWeight: 600 }}>Failed to Load Blog Articles</div>
                <div style={{ color: '#f87171', fontSize: '0.875rem', maxWidth: 480 }}>{errorMsg}</div>
                <button onClick={() => void fetchBlogs()} className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem', gap: '0.4rem' }}>
                  <RefreshIcon size={14} />
                  <span>Retry</span>
                </button>
              </div>
            ) : (
              'No blog articles found. Draft a new article above.'
            )}
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title & Slug</th>
                <th>Category</th>
                <th>Status</th>
                <th>Author</th>
                <th>Published Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPosts.map((post) => (
                <tr key={post.id}>
                  <td>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9375rem' }}>
                        {post.title}
                      </div>
                      <code style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>/blog/{post.slug}</code>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-neutral">
                      {post.category || categories.find((c) => c.id === post.category_id)?.name || 'General'}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => void handleToggleStatus(post)}
                      className={`badge ${post.status === 'published' ? 'badge-success' : 'badge-warning'}`}
                      style={{ cursor: 'pointer', border: 'none' }}
                      title="Click to toggle status"
                    >
                      {post.status}
                    </button>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                    {post.author_name || post.author || 'Hisbo Staff'}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                    {post.published_at || post.publishedAt
                      ? new Date(post.published_at || post.publishedAt!).toLocaleDateString()
                      : 'Draft (Unpublished)'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button
                        onClick={() => openEditModal(post)}
                        className="btn btn-secondary btn-sm"
                      >
                        Edit
                      </button>
                      {post.status === 'published' && (
                        <a
                          href={`https://www.hisbo.in/blog/${post.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.35rem' }}
                          title="View Live Article"
                        >
                          <ExternalLinkIcon size={14} />
                        </a>
                      )}
                      <button
                        onClick={() => void handleDeletePost(post.id, post.title)}
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#ef4444' }}
                        title="Delete Article"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Article Modal */}
      {(isCreating || isEditing) && (
        <div className="modal-overlay" onClick={() => { setIsCreating(false); setIsEditing(false); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '1.75rem', maxWidth: 640 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {isCreating ? 'Draft New Blog Article' : 'Edit Blog Article'}
              </h3>
              <button
                onClick={() => { setIsCreating(false); setIsEditing(false); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={isCreating ? handleCreatePost : handleUpdatePost} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Article Title *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => {
                    setFormTitle(e.target.value);
                    if (isCreating && !formSlug) {
                      setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'));
                    }
                  }}
                  placeholder="e.g. 5 Habits of People Who Never Overspend"
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  URL Slug *
                </label>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="5-habits-of-people-who-never-overspend"
                  required
                  className="input-field"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="input-field"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Publish Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'published' | 'draft')}
                    className="input-field"
                  >
                    <option value="draft">Save as Draft</option>
                    <option value="published">Publish Immediately</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Cover Image URL
                </label>
                <input
                  type="url"
                  value={formCoverImage}
                  onChange={(e) => setFormCoverImage(e.target.value)}
                  placeholder="https://.../cover.webp"
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Meta Excerpt / Short Summary
                </label>
                <textarea
                  value={formExcerpt}
                  onChange={(e) => setFormExcerpt(e.target.value)}
                  rows={2}
                  placeholder="A concise description optimized for search snippets and social previews..."
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Article Content (Markdown / HTML) *
                </label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={8}
                  placeholder="Write full article body..."
                  required
                  className="input-field"
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => { setIsCreating(false); setIsEditing(false); }}
                  className="btn btn-secondary btn-sm"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : isCreating ? 'Create Article' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
