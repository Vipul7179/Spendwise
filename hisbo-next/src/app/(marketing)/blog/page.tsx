import type { Metadata } from 'next';
import Link from 'next/link';
import BlogPostList from '@/components/blog/BlogPostList';
import BlogEmptyState from '@/components/blog/BlogEmptyState';
import BlogToolbar from '@/components/blog/BlogToolbar';
import { BLOG_PAGE_SIZE, getPublishedBlogPosts, getBlogCategoriesResult } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Hisbo Journal — Guides & Tips for Your Money Life',
  description:
    'Practical advice and thoughtful guides to help you build better money habits and feel more confident with your finances.',
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: 'Hisbo Journal — Guides & Tips for Your Money Life',
    description:
      'Practical advice and thoughtful guides to help you build better money habits and feel more confident with your finances.',
    url: 'https://www.hisbo.in/blog',
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
  }>;
}

export default async function BlogIndexPage({ searchParams }: BlogPageProps) {
  const resolvedParams = await searchParams;
  const currentCategory = resolvedParams.category || 'all';
  const currentSearch = resolvedParams.q || '';

  const [{ categories, error: categoryError }, { posts, total, error: postError }] = await Promise.all([
    getBlogCategoriesResult(),
    getPublishedBlogPosts({
      limit: BLOG_PAGE_SIZE,
      categoryId: currentCategory !== 'all' ? currentCategory : undefined,
      search: currentSearch || undefined,
    }),
  ]);

  const error = postError || categoryError;
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
        <BlogPostList
          key={JSON.stringify([currentCategory, currentSearch, posts.map(post => [post.id, post.updated_at])])}
          initialPosts={posts}
          total={total}
          categories={categories}
          categoryId={currentCategory !== 'all' ? currentCategory : undefined}
          search={currentSearch || undefined}
        />
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
