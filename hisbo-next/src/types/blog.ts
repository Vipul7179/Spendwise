export interface BlogCategory {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string | null;
  cover_image_url?: string | null;
  cover_alt?: string | null;
  category_id?: string | null;
  status: 'draft' | 'published';
  published_at?: string | null;
  author_name?: string | null;
  reading_minutes?: number | null;
  seo_title?: string | null;
  seo_description?: string | null;
  og_image_url?: string | null;
  noindex?: boolean;
  created_at: string;
  updated_at: string;
}

