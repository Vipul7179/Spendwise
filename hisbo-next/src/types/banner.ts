export interface BannerItem {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string;
  image_path: string | null;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
}
