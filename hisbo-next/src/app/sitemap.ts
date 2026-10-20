import type { MetadataRoute } from 'next';
import { getPublishedBlogPosts } from '@/lib/blog';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hisbo.in';

  // Static routes
  const routes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date('2026-10-13'),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  // Dynamic published blog posts
  try {
    const { posts } = await getPublishedBlogPosts({ limit: 100 });
    posts.forEach((post) => {
      if (!post.noindex) {
        routes.push({
          url: `${baseUrl}/blog/${encodeURIComponent(post.slug)}`,
          lastModified: new Date(post.updated_at || post.published_at || new Date()),
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }
    });
  } catch (error) {
    console.warn('[Sitemap] Could not fetch blog posts for sitemap:', error);
  }

  return routes;
}

