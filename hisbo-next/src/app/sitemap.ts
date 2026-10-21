import type { MetadataRoute } from 'next';
import { getSitemapBlogPosts } from '@/lib/blog';
import { canonicalUrl, blogUrl } from '@/lib/seo';

// Outages must fail rather than publish a successful but incomplete sitemap.
export const dynamic = 'force-dynamic';

function validDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getSitemapBlogPosts();
  return [
    { url: canonicalUrl('/'), changeFrequency: 'daily', priority: 1 },
    { url: canonicalUrl('/blog'), changeFrequency: 'daily', priority: 0.8 },
    { url: canonicalUrl('/privacy'), lastModified: new Date('2026-10-13'), changeFrequency: 'monthly', priority: 0.3 },
    ...posts.map((post) => ({
      url: blogUrl(post.slug),
      lastModified: validDate(post.updated_at) || validDate(post.published_at),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
