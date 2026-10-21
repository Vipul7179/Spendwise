import { canonicalUrl } from '@/lib/seo';
import type { Metadata } from 'next';
import Link from 'next/link';
import BlogCard from '@/components/blog/BlogCard';
import { redirect } from 'next/navigation';
import { LinkFeedback } from '@/components/common/NavigationFeedback';
import BlogEmptyState from '@/components/blog/BlogEmptyState';
import BlogToolbar from '@/components/blog/BlogToolbar';
import { BLOG_PAGE_SIZE, getPublishedBlogPosts, getBlogCategoriesResult } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Hisbo Journal — Guides & Tips for Your Money Life',
  description:
    'Practical advice and thoughtful guides to help you build better money habits and feel more confident with your finances.',
  alternates: {
    canonical: canonicalUrl('/blog'),
  },
  openGraph: {
    title: 'Hisbo Journal — Guides & Tips for Your Money Life',
    description:
      'Practical advice and thoughtful guides to help you build better money habits and feel more confident with your finances.',
    url: canonicalUrl('/blog'),
    siteName: 'Hisbo',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hisbo Journal — Guides & Tips for Your Money Life',
    description:
      'Practical advice and thoughtful guides to help you build better money habits and feel more confident with your finances.',
  },
};

interface BlogPageProps {
  searchParams: Promise<{
    category?: string;
    q?: string;
    page?: string;
  }>;
}

export default async function BlogIndexPage({ searchParams }: BlogPageProps) {
  const resolvedParams = await searchParams;
  const currentCategory = resolvedParams.category || 'all';
  const currentSearch = resolvedParams.q || '';
  const requestedPage = Number(resolvedParams.page);
  const page = Number.isSafeInteger(requestedPage * BLOG_PAGE_SIZE) && requestedPage > 0 ? requestedPage : 1;
  const pageHref = (number: number) => {
    const params = new URLSearchParams();
    if (currentCategory !== 'all') params.set('category', currentCategory);
    if (currentSearch) params.set('q', currentSearch);
    if (number > 1) params.set('page', String(number));
    return `/blog${params.size ? `?${params}` : ''}`;
  };

  const [{ categories, error: categoryError }, { posts, total, error: postError }] = await Promise.all([
    getBlogCategoriesResult(),
    getPublishedBlogPosts({
      limit: BLOG_PAGE_SIZE,
      offset: (page - 1) * BLOG_PAGE_SIZE,
      categoryId: currentCategory !== 'all' ? currentCategory : undefined,
      search: currentSearch || undefined,
    }),
  ]);

  const error = postError || categoryError;
  const pageCount = Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE));
  if (!postError && page > pageCount) redirect(pageHref(pageCount));
  const categoryMap = Object.fromEntries(categories.map(category => [category.id, category]));
  const hasFilter = currentSearch.trim() !== '' || currentCategory !== 'all';

  return (
    <section className="blog-shell">
      <BlogToolbar
        categories={categories}
        currentCategory={currentCategory}
        currentSearch={currentSearch}
      />

      {error ? (
        <BlogEmptyState kind={error === 'config' ? 'config' : 'error'} />
      ) : posts.length > 0 ? (
        <>
          <p role="status">{total} articles · Page {page} of {pageCount}</p>
          <div className="blog-grid">
            {posts.map(post => <BlogCard key={post.id} post={post} category={categoryMap[post.category_id || '']} />)}
          </div>
          <nav aria-label="Blog pagination" style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 20 }}>
            {page > 1 && <Link className="b" href={pageHref(page - 1)} rel="prev">Previous<LinkFeedback /></Link>}
            <span aria-current="page">Page {page} of {pageCount}</span>
            {page < pageCount && <Link className="b" href={pageHref(page + 1)} rel="next">Next<LinkFeedback /></Link>}
          </nav>
        </>
      ) : hasFilter ? (
        <div className="blog-empty">
          No articles match those filters. Try another keyword or select &ldquo;All categories&rdquo;.
          <div style={{ marginTop: '12px' }}>
            <Link href="/blog" className="g">
              Reset filters
            </Link>
          </div>
        </div>
      ) : (
        <BlogEmptyState kind="empty" />
      )}
    </section>
  );
}
