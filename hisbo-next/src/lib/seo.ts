/** Fixed production SEO identity, including preview deployments. */
export const SITE_URL = 'https://www.hisbo.in';

export function canonicalUrl(path = '/'): string {
  return SITE_URL + '/' + path.replace(/^\/+/, '');
}

export function blogUrl(slug: string): string {
  return canonicalUrl('/blog/' + encodeURIComponent(slug));
}

/** Prevent database text from closing the inert JSON-LD script element. */
export function serializeJsonLd(value: Record<string, unknown>): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
