// ====================================================================
// Hisbo Control — Blog Slug Generation & Validation
// ====================================================================
//
// Complies strictly with the PostgreSQL database constraint:
// CHECK (((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text) AND ((char_length(slug) >= 3) AND (char_length(slug) <= 90))))
//
// Guarantees:
// 1. Only lowercase ASCII letters and digits [a-z0-9].
// 2. Single hyphen separators between words (no consecutive '--').
// 3. No leading or trailing hyphens.
// 4. Length between 3 and 90 characters inclusive.
// ====================================================================

export const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const MIN_SLUG_LENGTH = 3;
export const MAX_SLUG_LENGTH = 90;

/**
 * Generates a clean, compliant slug from any title string.
 */
export function slugifyBlogTitle(input: string): string {
  if (!input) return '';

  let slug = input
    .toLowerCase()
    .normalize('NFKD') // Normalize unicode
    .replace(/[\u0300-\u036f]/g, '') // Strip diacritics
    .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric chars
    .trim()
    .replace(/[\s_]+/g, '-') // Replace whitespace and underscores with hyphen
    .replace(/-+/g, '-') // Collapse consecutive hyphens
    .replace(/^-+|-+$/g, ''); // Trim leading and trailing hyphens

  // Enforce maximum length without cutting off into a trailing hyphen
  if (slug.length > MAX_SLUG_LENGTH) {
    slug = slug.slice(0, MAX_SLUG_LENGTH).replace(/-+$/, '');
  }

  return slug;
}

/**
 * Validates a slug against database constraints.
 */
export function validateBlogSlug(slug: string): { valid: boolean; error?: string } {
  if (!slug || slug.trim().length === 0) {
    return { valid: false, error: 'Slug is required.' };
  }

  const trimmed = slug.trim();

  if (trimmed.length < MIN_SLUG_LENGTH) {
    return {
      valid: false,
      error: `Slug must be at least ${MIN_SLUG_LENGTH} characters (currently ${trimmed.length}).`,
    };
  }

  if (trimmed.length > MAX_SLUG_LENGTH) {
    return {
      valid: false,
      error: `Slug cannot exceed ${MAX_SLUG_LENGTH} characters (currently ${trimmed.length}).`,
    };
  }

  if (trimmed.startsWith('-') || trimmed.endsWith('-')) {
    return {
      valid: false,
      error: 'Slug cannot start or end with a hyphen.',
    };
  }

  if (trimmed.includes('--')) {
    return {
      valid: false,
      error: 'Slug cannot contain consecutive hyphens ("--").',
    };
  }

  if (!SLUG_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: 'Slug can only contain lowercase letters, numbers, and single hyphens (e.g. "smart-money-habits").',
    };
  }

  return { valid: true };
}

