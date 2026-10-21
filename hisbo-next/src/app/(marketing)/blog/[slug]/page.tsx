import { SITE_URL, canonicalUrl as siteUrl, blogUrl, serializeJsonLd } from '@/lib/seo';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import BlogCard from '@/components/blog/BlogCard';
import {
  getBlogPostBySlug,
  getRelatedBlogPosts,
  getBlogCategories,
  blogTimestampMeta,
  safeBlogImage,
} from '@/lib/blog';
import { renderMarkdown } from '@/lib/markdown';

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const post = await getBlogPostBySlug(resolvedParams.slug);

  if (!post) {
    return {
      title: 'Article Not Found',
    };
  }

  const title = post.seo_title || post.title;
  const description =
    post.seo_description ||
    post.excerpt ||
    'Practical ideas and guides for a healthier financial life with Hisbo.';
  const canonicalUrl = blogUrl(post.slug);
  const ogImage =
    safeBlogImage(post.og_image_url) ||
    safeBlogImage(post.cover_image_url) ||
    '/icon-512.png';

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: post.noindex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'article',
      publishedTime: post.published_at || undefined,
      modifiedTime: post.updated_at || undefined,
      authors: [post.author_name || 'Hisbo Team'],
      images: [
        {
          url: ogImage,
          alt: post.cover_alt || post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const resolvedParams = await params;
  const post = await getBlogPostBySlug(resolvedParams.slug);

  if (!post) {
    notFound();
  }

  const [categories, relatedPosts] = await Promise.all([
    // Taxonomy is optional decoration; an unavailable category query must not
    // take every otherwise readable published article down with it.
    getBlogCategories().catch(() => []),
    getRelatedBlogPosts(post.id, post.category_id, 3),
  ]);

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const category = categoryMap[post.category_id || ''];
  const ts = blogTimestampMeta(post);
  const coverImage =
    safeBlogImage(post.cover_image_url) ||
    'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80';
  const cleanHtml = renderMarkdown(post.content || '');

  // JSON-LD structured data for Article/BlogPosting
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || post.title,
    image: coverImage,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: {
      '@type': 'Person',
      name: post.author_name || 'Hisbo Team',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Hisbo',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: siteUrl('/logo-mark.webp'),
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': blogUrl(post.slug),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleJsonLd) }}
      />

      <section className="blog-shell blog-article">
        <div className="row">
          <Link className="backlink" href="/blog">
            &larr; Back to blog
          </Link>
        </div>

        <header className="hero">
          <div className="frame">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImage}
              alt={post.cover_alt || post.title}
              loading="eager"
            />
          </div>
        </header>

        <div className="meta-row">
          <span className="tag">{category ? category.name : 'General'}</span>
          <span>{post.author_name || 'Hisbo Team'}</span>
          <span>&bull;</span>
          <time
            dateTime={post.published_at || ''}
            title={ts.pubTime ? `Published: ${ts.pubTime}` : ''}
          >
            {ts.pubTime || 'Recently published'}
          </time>
          {ts.isUpdated && (
            <>
              <span>&bull;</span>
              <span
                title={`Last updated: ${ts.upTime}`}
                style={{ color: 'var(--acc)', fontWeight: 600 }}
              >
                Updated {ts.upRelative}
              </span>
            </>
          )}
        </div>

        <h1>{post.title}</h1>
        {post.excerpt && (
          <p style={{ color: 'var(--mut)', margin: '0', fontSize: '1.05rem', lineHeight: 1.6 }}>
            {post.excerpt}
          </p>
        )}

        <article
          className="story"
          dangerouslySetInnerHTML={{ __html: cleanHtml }}
        />

        {relatedPosts.length > 0 && (
          <section style={{ marginTop: '28px' }}>
            <h2 style={{ fontSize: '1.4rem', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
              Related articles
            </h2>
            <div className="related">
              {relatedPosts.map((related) => (
                <BlogCard
                  key={related.id}
                  post={related}
                  category={categoryMap[related.category_id || '']}
                  compact={true}
                />
              ))}
            </div>
          </section>
        )}
      </section>

    </>
  );
}
