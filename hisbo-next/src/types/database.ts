import type { AppState } from './state';
import type { BlogPost, BlogCategory } from './blog';

export interface Database {
  public: {
    Tables: {
      user_data: {
        Row: {
          user_id: string;
          data: AppState;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          data: AppState;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          data?: AppState;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          is_admin: boolean;
          last_seen: string | null;
        };
        Insert: {
          id: string;
          is_admin?: boolean;
          last_seen?: string | null;
        };
        Update: {
          id?: string;
          is_admin?: boolean;
          last_seen?: string | null;
        };
      };
      banners: {
        Row: {
          id: string;
          title: string | null;
          description: string | null;
          link_url: string | null;
          image_url: string;
          image_path: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title?: string | null;
          description?: string | null;
          link_url?: string | null;
          image_url: string;
          image_path?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string | null;
          description?: string | null;
          link_url?: string | null;
          image_url?: string;
          image_path?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
      blog_categories: {
        Row: BlogCategory;
        Insert: Omit<BlogCategory, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<BlogCategory>;
      };
      blog_posts: {
        Row: BlogPost;
        Insert: Omit<BlogPost, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<BlogPost>;
      };
    };
  };
}

