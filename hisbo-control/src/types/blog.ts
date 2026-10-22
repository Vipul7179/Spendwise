// ====================================================================
// Hisbo Control — Blog Management Types
// ====================================================================

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order?: number;
  created_at?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content?: string | null;
  category_id?: string | null;
  category?: string;
  status: 'draft' | 'published';
  published_at?: string | null;
  publishedAt?: string | null;
  created_at?: string;
  updated_at?: string;
  author_name?: string | null;
  author?: string;
  readTimeMinutes?: number;
  viewsCount?: number;
  tags?: string[];
  cover_image_url?: string | null;
  cover_alt?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  og_image_url?: string | null;
  noindex?: boolean;
}

