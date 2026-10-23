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
import { SparklesIcon } from '@/components/blog/EditorIcons';
import { BlogPost, BlogCategory } from '@/types/blog';
import { ImageUploader } from '@/components/ui/ImageUploader';
import { RichBlogEditor } from '@/components/blog/RichBlogEditor';
import { BlogCategoryModal } from '@/components/blog/BlogCategoryModal';
import { slugifyBlogTitle, validateBlogSlug } from '@/lib/blog/slug-utils';

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
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [slugValidationMsg, setSlugValidationMsg] = useState<{ valid: boolean; error?: string }>({ valid: true });
  const [formCategory, setFormCategory] = useState('');
  const [formExcerpt, setFormExcerpt] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCoverImage, setFormCoverImage] = useState('');
  const [formCoverAlt, setFormCoverAlt] = useState('');

  // 1 & 2. Author and Designation
  const [formAuthor, setFormAuthor] = useState('Hisbo Editorial');
  const [formAuthorPosition, setFormAuthorPosition] = useState('');

  // 4. Tags
  const [formTags, setFormTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // 5. Featured Toggle
  const [formIsFeatured, setFormIsFeatured] = useState(false);

  // 6. SEO
  const [formSeoTitle, setFormSeoTitle] = useState('');
  const [formSeoDescription, setFormSeoDescription] = useState('');

  // 8. Publishing Options: draft | publish_now | schedule
  const [publishingMode, setPublishingMode] = useState<'draft' | 'publish_now' | 'schedule'>('draft');
  const [scheduledDate, setScheduledDate] = useState('');

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

  // Slug generator and validator handlers
  const handleTitleChange = (val: string) => {
    setFormTitle(val);
    if (isCreating && !isSlugManuallyEdited) {
      const generated = slugifyBlogTitle(val);
      setFormSlug(generated);
      setSlugValidationMsg(validateBlogSlug(generated));
    }
  };

  const handleSlugChange = (val: string) => {
    setIsSlugManuallyEdited(true);
    // Auto-clean illegal characters as they type
    const cleaned = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setFormSlug(cleaned);
    setSlugValidationMsg(validateBlogSlug(cleaned));
  };

  // Tag addition & removal
  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (trimmed && !formTags.includes(trimmed)) {
      setFormTags([...formTags, trimmed]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormTags(formTags.filter((t) => t !== tagToRemove));
  };

  const openCreateModal = () => {
    setFormTitle('');
    setFormSlug('');
    setIsSlugManuallyEdited(false);
    setSlugValidationMsg({ valid: true });
    setFormCategory(categories.length > 0 ? categories[0].id : '');
    setFormExcerpt('');
    setFormContent('');
    setFormCoverImage('');
    setFormCoverAlt('');
    setFormAuthor('Hisbo Editorial');
    setFormAuthorPosition('');
    setFormTags([]);
    setTagInput('');
    setFormIsFeatured(false);
    setFormSeoTitle('');
    setFormSeoDescription('');
    setPublishingMode('draft');
    setScheduledDate('');
    setIsCreating(true);
    setIsEditing(false);
  };

  const openEditModal = (post: BlogPost) => {
    setSelectedPost(post);
    setFormTitle(post.title || '');
    setFormSlug(post.slug || '');
    setIsSlugManuallyEdited(true);
    setSlugValidationMsg(validateBlogSlug(post.slug || ''));
    setFormCategory(post.category_id || (categories.length > 0 ? categories[0].id : ''));
    setFormExcerpt(post.excerpt || '');
    setFormContent(post.content || '');
    setFormCoverImage(post.cover_image_url || '');
    setFormCoverAlt(post.cover_alt || '');
    setFormAuthor(post.author_name || 'Hisbo Editorial');
    setFormAuthorPosition(post.author_position || '');
    setFormTags(post.tags || []);
    setTagInput('');
    setFormIsFeatured(Boolean(post.is_featured));
    setFormSeoTitle(post.seo_title || '');
    setFormSeoDescription(post.seo_description || '');

    // Determine publishing mode
    if (post.status === 'published') {
      const pubDate = post.published_at || post.publishedAt;
      if (post.is_scheduled && pubDate) {
        setPublishingMode('schedule');
        try {
          const d = new Date(pubDate);
          setScheduledDate(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
        } catch {
          setScheduledDate('');
        }
      } else {
        setPublishingMode('publish_now');
        setScheduledDate('');
      }
    } else {
      setPublishingMode('draft');
      setScheduledDate('');
    }

    setIsEditing(true);
    setIsCreating(false);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('Article Title is required.');
      return;
    }

    const slugCheck = validateBlogSlug(formSlug);
    if (!slugCheck.valid) {
      showToast(slugCheck.error || 'Invalid slug.');
      return;
    }

    if (!formContent.trim()) {
      showToast('Article Content is required.');
      return;
    }

    if (publishingMode !== 'draft' && !formCoverImage.trim()) {
      showToast('Cover Image is required when publishing.');
      return;
    }

    // Determine status & published_at
    const status = publishingMode === 'draft' ? 'draft' : 'published';
    let publishedAt: string | undefined = undefined;
    if (publishingMode === 'schedule' && scheduledDate) {
      publishedAt = new Date(scheduledDate).toISOString();
    } else if (publishingMode === 'publish_now') {
      publishedAt = new Date().toISOString();
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
          status,
          published_at: publishedAt,
          cover_image_url: formCoverImage.trim() || undefined,
          cover_alt: formCoverAlt.trim() || undefined,
          author_name: formAuthor.trim() || 'Hisbo Editorial',
          author_position: formAuthorPosition.trim() || undefined,
          tags: formTags,
          is_featured: formIsFeatured,
          seo_title: formSeoTitle.trim() || undefined,
          seo_description: formSeoDescription.trim() || undefined,
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

    if (!formTitle.trim()) {
      showToast('Article Title is required.');
      return;
    }

    const slugCheck = validateBlogSlug(formSlug);
    if (!slugCheck.valid) {
      showToast(slugCheck.error || 'Invalid slug.');
      return;
    }

    if (!formContent.trim()) {
      showToast('Article Content is required.');
      return;
    }

    if (publishingMode !== 'draft' && !formCoverImage.trim()) {
      showToast('Cover image is required when publishing.');
      return;
    }

    const status = publishingMode === 'draft' ? 'draft' : 'published';
    let publishedAt: string | null = null;
    if (publishingMode === 'schedule' && scheduledDate) {
      publishedAt = new Date(scheduledDate).toISOString();
    } else if (publishingMode === 'publish_now') {
      publishedAt = new Date().toISOString();
    }

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
            status,
            published_at: publishedAt,
            cover_image_url: formCoverImage.trim() || null,
            cover_alt: formCoverAlt.trim() || null,
            author_name: formAuthor.trim() || 'Hisbo Editorial',
            author_position: formAuthorPosition.trim() || null,
            tags: formTags,
            is_featured: formIsFeatured,
            seo_title: formSeoTitle.trim() || null,
            seo_description: formSeoDescription.trim() || null,
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

  const handleDeletePost = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${title}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/blogs?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');

      showToast(`Article deleted.`);
      void fetchBlogs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete';
      showToast(`Error: ${msg}`);
    }
  };

  const filteredPosts = posts.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.author_name && p.author_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.tags && p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Toast Alert */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--accent)',
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            zIndex: 9999,
            fontSize: '0.875rem',
            color: 'var(--text-main)',
          }}
        >
          <CheckCircleIcon size={18} style={{ color: 'var(--accent)' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Blog Article Management
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Publish, edit, and organize editorial articles, SEO metadata, and author profiles on hisbo.in/blog.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => void fetchBlogs()}
            disabled={isLoading}
            className="btn btn-secondary btn-sm"
            style={{ gap: '0.4rem' }}
          >
            <RefreshIcon size={14} className={isLoading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={openCreateModal}
            className="btn btn-primary btn-sm"
            style={{ gap: '0.4rem' }}
            disabled={isConfigNeeded}
          >
            <PlusIcon size={16} />
            <span>Draft New Article</span>
          </button>
        </div>
      </div>

      {/* Configuration Needed Warning */}
      {isConfigNeeded && (
        <div
          className="admin-card"
          style={{
            borderLeft: '4px solid var(--warning, #f59e0b)',
            background: 'rgba(245, 158, 11, 0.05)',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
          }}
        >
          <AlertTriangleIcon size={24} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
          <div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Production Content Operator Setup Required
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              {errorMsg}
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div
        className="admin-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '0.85rem 1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 260 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <SearchIcon
              size={15}
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, slug, author, or tags..."
              className="input-field"
              style={{ paddingLeft: '2.1rem', fontSize: '0.8125rem' }}
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input-field"
            style={{ width: 'auto', minWidth: 160, fontSize: '0.8125rem' }}
          >
            <option value="all">All Categories ({posts.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          Showing <strong>{filteredPosts.length}</strong> of <strong>{posts.length}</strong> articles
        </div>
      </div>

      {/* Articles Table */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading blog articles from production database...
          </div>
        ) : filteredPosts.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center' }}>
            <BlogIcon size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>No articles found</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              {searchQuery || selectedCategory !== 'all'
                ? 'Try adjusting your search filters.'
                : 'Click "Draft New Article" to write your first blog post.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 260 }}>Article Title &amp; Slug</th>
                  <th style={{ minWidth: 120 }}>Category</th>
                  <th style={{ minWidth: 150 }}>Author</th>
                  <th style={{ minWidth: 110 }}>Status</th>
                  <th style={{ minWidth: 120 }}>Published</th>
                  <th style={{ textAlign: 'right', minWidth: 150 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map((post) => {
                  return (
                    <tr key={post.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                          {post.is_featured && (
                            <span
                              title="Featured Article"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px',
                                background: 'rgba(245, 158, 11, 0.15)',
                                color: '#f59e0b',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                borderRadius: 4,
                                padding: '1px 5px',
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                flexShrink: 0,
                                marginTop: 2,
                              }}
                            >
                              <SparklesIcon size={10} />
                              <span>Featured</span>
                            </span>
                          )}
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.875rem' }}>
                              {post.title}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 2 }}>
                              /blog/{post.slug}
                            </div>
                            {post.tags && post.tags.length > 0 && (
                              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: 4 }}>
                                {post.tags.slice(0, 3).map((t) => (
                                  <span
                                    key={t}
                                    style={{
                                      fontSize: '0.6875rem',
                                      background: 'var(--bg-secondary)',
                                      color: 'var(--text-secondary)',
                                      padding: '1px 6px',
                                      borderRadius: 4,
                                      border: '1px solid var(--border-light)',
                                    }}
                                  >
                                    #{t}
                                  </span>
                                ))}
                                {post.tags.length > 3 && (
                                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                                    +{post.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-neutral">
                          {post.category || 'General'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-main)' }}>
                          {post.author_name || 'Hisbo Team'}
                        </div>
                        {post.author_position && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {post.author_position}
                          </div>
                        )}
                      </td>
                      <td>
                        {post.is_scheduled ? (
                          <span
                            className="badge"
                            style={{
                              background: 'rgba(56, 189, 248, 0.15)',
                              color: '#38bdf8',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                            }}
                          >
                            Scheduled
                          </span>
                        ) : (
                          <span className={`badge ${post.status === 'published' ? 'badge-success' : 'badge-neutral'}`}>
                            {post.status === 'published' ? 'Published' : 'Draft'}
                          </span>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                        {post.published_at || post.publishedAt ? (
                          <span>
                            {new Date(post.published_at || post.publishedAt!).toLocaleDateString()}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unpublished</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button
                            onClick={() => openEditModal(post)}
                            className="btn btn-secondary btn-sm"
                          >
                            Edit
                          </button>
                          {post.status === 'published' && !post.is_scheduled && (
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Category Creation Modal */}
      <BlogCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onCategoryCreated={(newCat) => {
          setCategories((prev) => [...prev, newCat]);
          setFormCategory(newCat.id);
          showToast(`Category "${newCat.name}" created and selected!`);
        }}
      />

      {/* Create / Edit Article Modal */}
      {(isCreating || isEditing) && (
        <div
          className="modal-overlay"
          onClick={() => {
            setIsCreating(false);
            setIsEditing(false);
          }}
          style={{ zIndex: 1050 }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              padding: '1.75rem',
              maxWidth: 900,
              width: '95%',
              maxHeight: '92vh',
              overflowY: 'auto',
              borderRadius: 12,
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem',
                borderBottom: '1px solid var(--border)',
                paddingBottom: '0.75rem',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {isCreating ? 'Draft New Blog Article' : 'Edit Blog Article'}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  {isCreating
                    ? 'Write, format, configure SEO, and publish a new editorial post.'
                    : `Editing "${selectedPost?.title}" (/blog/${selectedPost?.slug})`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setIsEditing(false);
                }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <XIcon size={20} />
              </button>
            </div>

            <form
              onSubmit={isCreating ? handleCreatePost : handleUpdatePost}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
            >
              {/* SECTION 1: Title & Slug */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Article Title * <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({formTitle.length}/120 chars)</span>
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g. 5 Habits of People Who Never Overspend"
                    maxLength={120}
                    required
                    className="input-field"
                    style={{ fontSize: '0.9375rem', fontWeight: 600 }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      URL Slug * <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({formSlug.length}/90 chars)</span>
                    </label>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Preview: hisbo.in/blog/<strong>{formSlug || 'slug'}</strong>
                    </span>
                  </div>
                  <input
                    type="text"
                    value={formSlug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="5-habits-of-people-who-never-overspend"
                    maxLength={90}
                    required
                    className="input-field"
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.8125rem',
                      borderColor: !slugValidationMsg.valid ? '#ef4444' : undefined,
                    }}
                  />
                  {!slugValidationMsg.valid && (
                    <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>
                      {slugValidationMsg.error}
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 2: Category & Author Information (Grid) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
                  gap: '1rem',
                  padding: '1rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: 8,
                  border: '1px solid var(--border-light)',
                }}
              >
                {/* 3. Category with "+ Create New Category" */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Category *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      + Create New Category
                    </button>
                  </div>
                  <select
                    value={formCategory}
                    onChange={(e) => {
                      if (e.target.value === '__create_new__') {
                        setIsCategoryModalOpen(true);
                      } else {
                        setFormCategory(e.target.value);
                      }
                    }}
                    className="input-field"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    <option value="__create_new__">+ Create New Category...</option>
                  </select>
                </div>

                {/* 1. Author Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Author Name * <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({formAuthor.length}/80)</span>
                  </label>
                  <input
                    type="text"
                    value={formAuthor}
                    onChange={(e) => setFormAuthor(e.target.value)}
                    placeholder="e.g. Vipul Singh or Hisbo Editorial"
                    maxLength={80}
                    required
                    className="input-field"
                  />
                </div>

                {/* 2. Author Position / Designation */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Author Designation / Role
                  </label>
                  <input
                    type="text"
                    value={formAuthorPosition}
                    onChange={(e) => setFormAuthorPosition(e.target.value)}
                    placeholder="e.g. Lead Financial Strategist, Staff Writer"
                    maxLength={80}
                    className="input-field"
                  />
                </div>

                {/* 5. Featured Article Toggle */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      cursor: 'pointer',
                      userSelect: 'none',
                      marginTop: '0.5rem',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formIsFeatured}
                      onChange={(e) => setFormIsFeatured(e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: 'var(--accent)', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <SparklesIcon size={14} style={{ color: '#f59e0b' }} />
                        <span>Featured Article</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Display prominently with highlighted badge
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* SECTION 3: Tags Management (Feature 4) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Article Tags
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.4rem',
                    padding: '0.4rem 0.6rem',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    minHeight: 40,
                  }}
                >
                  {formTags.map((t) => (
                    <span
                      key={t}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-main)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: 4,
                        fontSize: '0.75rem',
                        border: '1px solid var(--border-light)',
                      }}
                    >
                      #{t}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                      >
                        <XIcon size={12} />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        handleAddTag(tagInput);
                      }
                    }}
                    placeholder={formTags.length === 0 ? 'Type tag and press Enter (e.g. savings, budgets)...' : 'Add tag...'}
                    style={{
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      color: 'var(--text-main)',
                      fontSize: '0.8125rem',
                      flex: 1,
                      minWidth: 160,
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Press Enter or comma to add multiple tags. Helps readers discover related financial topics.
                </div>
              </div>

              {/* SECTION 4: Cover Image Uploader */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1rem' }}>
                <ImageUploader
                  label="Cover Image *"
                  value={formCoverImage}
                  onChange={(url) => setFormCoverImage(url)}
                  uploadEndpoint="/api/admin/blogs/upload"
                  aspectRatio="blog"
                  maxSizeMb={3}
                  required={publishingMode !== 'draft'}
                  helperText="Recommended: 1200x630 WebP, PNG, JPG, or AVIF (max 3 MB)."
                />
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Cover Image Alt Text
                  </label>
                  <input
                    type="text"
                    value={formCoverAlt}
                    onChange={(e) => setFormCoverAlt(e.target.value)}
                    placeholder="Descriptive alt text for screen readers & SEO"
                    maxLength={160}
                    className="input-field"
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Accurate descriptions improve accessibility and Google Images ranking.
                  </span>
                </div>
              </div>

              {/* SECTION 5: Excerpt */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Meta Excerpt / Short Summary <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({formExcerpt.length}/300 chars)</span>
                </label>
                <textarea
                  value={formExcerpt}
                  onChange={(e) => setFormExcerpt(e.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder="A concise summary displayed on blog cards and search snippets..."
                  className="input-field"
                />
              </div>

              {/* SECTION 6: Rich Text Body Editor (Feature 7) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Article Content (Rich Markdown / HTML) *
                </label>
                <RichBlogEditor
                  value={formContent}
                  onChange={(val) => setFormContent(val)}
                  placeholder="Draft your story. Format headers with H1/H2, add lists, code snippets, or click 'Insert Image' to upload directly..."
                  minHeight={340}
                />
              </div>

              {/* SECTION 7: SEO Title & Description (Feature 6) */}
              <div
                style={{
                  padding: '1rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: 8,
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}
              >
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  Search Engine Optimization (SEO Metadata)
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      SEO Title Tag <span style={{ fontSize: '0.75rem', color: formSeoTitle.length > 70 ? '#ef4444' : 'var(--text-muted)' }}>({formSeoTitle.length}/70 chars)</span>
                    </label>
                    <input
                      type="text"
                      value={formSeoTitle}
                      onChange={(e) => setFormSeoTitle(e.target.value)}
                      placeholder={formTitle || 'Custom page title for search engines'}
                      maxLength={70}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      SEO Meta Description <span style={{ fontSize: '0.75rem', color: formSeoDescription.length > 170 ? '#ef4444' : 'var(--text-muted)' }}>({formSeoDescription.length}/170 chars)</span>
                    </label>
                    <textarea
                      value={formSeoDescription}
                      onChange={(e) => setFormSeoDescription(e.target.value)}
                      placeholder={formExcerpt || 'Meta description for Google search snippet...'}
                      maxLength={170}
                      rows={2}
                      className="input-field"
                    />
                  </div>
                </div>

                {/* Live Google Search Result Preview */}
                <div
                  style={{
                    background: '#ffffff',
                    color: '#202124',
                    padding: '0.75rem 1rem',
                    borderRadius: 8,
                    border: '1px solid #dadce0',
                    marginTop: '0.25rem',
                    fontFamily: 'arial, sans-serif',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: '#202124', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 600 }}>hisbo.in</span>
                    <span style={{ color: '#5f6368' }}>› blog › {formSlug || 'article-slug'}</span>
                  </div>
                  <div style={{ fontSize: '1.05rem', color: '#1a0dab', fontWeight: 500, margin: '2px 0 3px', lineHeight: 1.3 }}>
                    {formSeoTitle || formTitle || 'Article Title — Hisbo Journal'}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#4d5156', lineHeight: 1.4 }}>
                    {formSeoDescription || formExcerpt || 'Discover practical habits and guides for a healthier financial life with Hisbo.'}
                  </div>
                </div>
              </div>

              {/* SECTION 8: Publishing Options (Feature 8) */}
              <div
                style={{
                  padding: '1rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: 8,
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Publishing Options
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '0.75rem' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.6rem 0.8rem',
                      background: publishingMode === 'draft' ? 'var(--bg-card)' : 'transparent',
                      border: `1px solid ${publishingMode === 'draft' ? 'var(--accent)' : 'var(--border-light)'}`,
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="publishingMode"
                      value="draft"
                      checked={publishingMode === 'draft'}
                      onChange={() => setPublishingMode('draft')}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>Save as Draft</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Only admins can see</div>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.6rem 0.8rem',
                      background: publishingMode === 'publish_now' ? 'var(--bg-card)' : 'transparent',
                      border: `1px solid ${publishingMode === 'publish_now' ? 'var(--accent)' : 'var(--border-light)'}`,
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="publishingMode"
                      value="publish_now"
                      checked={publishingMode === 'publish_now'}
                      onChange={() => setPublishingMode('publish_now')}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>Publish Immediately</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Live on hisbo.in/blog</div>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.6rem 0.8rem',
                      background: publishingMode === 'schedule' ? 'var(--bg-card)' : 'transparent',
                      border: `1px solid ${publishingMode === 'schedule' ? 'var(--accent)' : 'var(--border-light)'}`,
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="publishingMode"
                      value="schedule"
                      checked={publishingMode === 'schedule'}
                      onChange={() => setPublishingMode('schedule')}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>Schedule for Later</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Automated future release</div>
                    </div>
                  </label>
                </div>

                {publishingMode === 'schedule' && (
                  <div style={{ marginTop: '0.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      Scheduled Release Date &amp; Time
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      required={publishingMode === 'schedule'}
                      className="input-field"
                      style={{ width: 'auto', minWidth: 240 }}
                    />
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Article will automatically appear publicly on hisbo.in once this time arrives.
                    </div>
                  </div>
                )}
              </div>

              {/* Form Action Buttons (Sticky at bottom) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--border)',
                  paddingTop: '1rem',
                  marginTop: '0.5rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setIsEditing(false);
                  }}
                  className="btn btn-secondary btn-sm"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting || !slugValidationMsg.valid}
                    style={{ minWidth: 140, fontWeight: 600 }}
                  >
                    {isSubmitting
                      ? 'Saving...'
                      : isCreating
                      ? publishingMode === 'draft'
                        ? 'Save as Draft'
                        : publishingMode === 'schedule'
                        ? 'Schedule Article'
                        : 'Publish Article'
                      : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
