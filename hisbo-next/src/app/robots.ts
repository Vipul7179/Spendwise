import type { MetadataRoute } from 'next';
import { canonicalUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    // Safe generic app/account shells must be crawlable to observe noindex.
    // Authentication and RLS, not robots.txt, protect user data.
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/'] }],
    sitemap: canonicalUrl('/sitemap.xml'),
  };
}
