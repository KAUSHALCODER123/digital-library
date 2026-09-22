// Mirrors supabase/migrations. Regenerate with `npm run db:types` after linking the project.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ShelfStatusDb = 'WANT_TO_READ' | 'READING' | 'READ' | 'FAVORITE';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          role: 'patron' | 'staff';
          show_mature: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: { display_name?: string | null; show_mature?: boolean };
        Relationships: [];
      };
      shelf_items: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          status: ShelfStatusDb;
          progress: number | null;
          book: Json;
          added_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id: string;
          status: ShelfStatusDb;
          progress?: number | null;
          book: Json;
          added_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: ShelfStatusDb;
          progress?: number | null;
          book?: Json;
          added_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          rating: number;
          body: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: { id?: string; user_id: string; book_id: string; rating: number; body?: string | null };
        Update: { rating?: number; body?: string | null };
        Relationships: [];
      };
      curated_items: {
        Row: {
          id: string;
          shelf: 'staff_picks' | 'new_arrivals';
          book_id: string;
          book: Json;
          note: string | null;
          position: number;
          pinned_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          shelf: 'staff_picks' | 'new_arrivals';
          book_id: string;
          book: Json;
          note?: string | null;
          position?: number;
          pinned_by?: string | null;
        };
        Update: { note?: string | null; position?: number; book?: Json };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      get_book_reviews: {
        Args: { p_book_id: string; p_limit?: number; p_offset?: number };
        Returns: Array<{
          id: string;
          rating: number;
          body: string | null;
          created_at: string;
          updated_at: string;
          reviewer: string;
          is_mine: boolean;
        }>;
      };
      get_book_rating: { Args: { p_book_id: string }; Returns: Array<{ average: number | null; total: number }> };
      log_search: { Args: { p_term: string }; Returns: undefined };
      is_staff: { Args: Record<string, never>; Returns: boolean };
      top_searches: { Args: { p_days?: number; p_limit?: number }; Returns: Array<{ term: string; searches: number }> };
      most_shelved: {
        Args: { p_days?: number; p_limit?: number };
        Returns: Array<{ book_id: string; book: Json; shelvings: number }>;
      };
      delete_my_account: { Args: Record<string, never>; Returns: undefined };
    };
    Enums: { shelf_status: ShelfStatusDb };
    CompositeTypes: { [_ in never]: never };
  };
};
