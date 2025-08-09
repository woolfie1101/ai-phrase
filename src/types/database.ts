// Supabase Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          display_name: string | null;
          avatar_url: string | null;
          streak_count: number;
          last_study_date: string | null;
          settings: any; // JSON type
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          streak_count?: number;
          last_study_date?: string | null;
          settings?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          streak_count?: number;
          last_study_date?: string | null;
          settings?: any;
          updated_at?: string;
        };
      };
      folders: {
        Row: {
          id: string;
          name: string;
          parent_id: string | null;
          user_id: string;
          schedule: any; // JSON type
          color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          parent_id?: string | null;
          user_id: string;
          schedule?: any;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          parent_id?: string | null;
          user_id?: string;
          schedule?: any;
          color?: string | null;
          updated_at?: string;
        };
      };
      flashcard_files: {
        Row: {
          id: string;
          name: string;
          folder_id: string;
          user_id: string;
          study_mode: string;
          schedule: any; // JSON type
          total_cards: number;
          new_cards: number;
          learning_cards: number;
          review_cards: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          folder_id: string;
          user_id: string;
          study_mode?: string;
          schedule?: any;
          total_cards?: number;
          new_cards?: number;
          learning_cards?: number;
          review_cards?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          folder_id?: string;
          user_id?: string;
          study_mode?: string;
          schedule?: any;
          total_cards?: number;
          new_cards?: number;
          learning_cards?: number;
          review_cards?: number;
          updated_at?: string;
        };
      };
      flashcards: {
        Row: {
          id: string;
          file_id: string;
          front: string;
          back: string;
          notes: string | null;
          status: string;
          ease_factor: number;
          interval: number;
          repetitions: number;
          due_date: string;
          last_review: string | null;
          language: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          file_id: string;
          front: string;
          back: string;
          notes?: string | null;
          status?: string;
          ease_factor?: number;
          interval?: number;
          repetitions?: number;
          due_date?: string;
          last_review?: string | null;
          language?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          file_id?: string;
          front?: string;
          back?: string;
          notes?: string | null;
          status?: string;
          ease_factor?: number;
          interval?: number;
          repetitions?: number;
          due_date?: string;
          last_review?: string | null;
          language?: string | null;
          updated_at?: string;
        };
      };
      study_sessions: {
        Row: {
          id: string;
          user_id: string;
          file_id: string;
          cards_studied: number;
          correct_answers: number;
          study_duration: number;
          session_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          file_id: string;
          cards_studied?: number;
          correct_answers?: number;
          study_duration?: number;
          session_date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          file_id?: string;
          cards_studied?: number;
          correct_answers?: number;
          study_duration?: number;
          session_date?: string;
        };
      };
      daily_stats: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          cards_studied: number;
          new_cards_learned: number;
          review_cards_completed: number;
          study_time_minutes: number;
          completion_percentage: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          cards_studied?: number;
          new_cards_learned?: number;
          review_cards_completed?: number;
          study_time_minutes?: number;
          completion_percentage?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          cards_studied?: number;
          new_cards_learned?: number;
          review_cards_completed?: number;
          study_time_minutes?: number;
          completion_percentage?: number;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      card_status: 'new' | 'learning' | 'review' | 'suspended';
      study_mode: 'bidirectional' | 'front-to-back' | 'back-to-front';
      day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    };
  };
}