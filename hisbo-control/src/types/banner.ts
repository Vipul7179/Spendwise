// ====================================================================
// Hisbo Control — Promotional Banner Types
// ====================================================================

export interface BannerItem {
  id: string;
  title: string | null;
  description: string | null;
  link_url: string | null;
  image_url: string;
  image_path: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export type CreateBannerPayload = Omit<BannerItem, 'id' | 'created_at'>;
export type UpdateBannerPayload = Partial<CreateBannerPayload>;

