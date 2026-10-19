import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/marketing/Navbar';
import Footer from '@/components/marketing/Footer';
import BlogCard from '@/components/blog/BlogCard';
import BlogEmptyState from '@/components/blog/BlogEmptyState';
import BlogToolbar from '@/components/blog/BlogToolbar';
import { getPublishedBlogPosts, getBlogCategories } from '@/lib/blog';

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

  const [categories, { posts }] = await Promise.all([
    getBlogCategories(),
    getPublishedBlogPosts({
      categoryId: currentCategory !== 'all' ? currentCategory : undefined,
      search: currentSearch || undefined,
    }),
  ]);

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const hasFilter = currentSearch.trim() !== '' || currentCategory !== 'all';

  return (
    <div className="lp">
      <Navbar />

      <main className="blog-shell">
        <BlogToolbar
          categories={categories}
          currentCategory={currentCategory}
          currentSearch={currentSearch}
        />

        {posts.length > 0 ? (
          <div className="blog-grid">
            {posts.map((post) => (
              <BlogCard
                key={post.id}
                post={post}
                category={categoryMap[post.category_id || '']}
              />
            ))}
          </div>
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
      </main>

      <Footer />
    </div>
  );
}
