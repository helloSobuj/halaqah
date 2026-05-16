export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null
          badges: Json
          bio: string | null
          created_at: string
          display_name: string | null
          gender: string | null
          id: string
          language: string
          level: number
          location: string | null
          points: number
          qa_answer_streak: number
          qa_last_answered_on: string | null
          qa_reputation: number
          streak: number
          theme: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          badges?: Json
          bio?: string | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          id: string
          language?: string
          level?: number
          location?: string | null
          points?: number
          qa_answer_streak?: number
          qa_last_answered_on?: string | null
          qa_reputation?: number
          streak?: number
          theme?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          badges?: Json
          bio?: string | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          id?: string
          language?: string
          level?: number
          location?: string | null
          points?: number
          qa_answer_streak?: number
          qa_last_answered_on?: string | null
          qa_reputation?: number
          streak?: number
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      qa_answers: {
        Row: {
          body_md: string
          citations: Json
          created_at: string
          endorsed_at: string | null
          endorsed_by: string | null
          id: string
          is_accepted: boolean
          is_deleted: boolean
          is_scholar_endorsed: boolean
          question_id: string
          updated_at: string
          user_id: string
          vote_score: number
        }
        Insert: {
          body_md: string
          citations?: Json
          created_at?: string
          endorsed_at?: string | null
          endorsed_by?: string | null
          id?: string
          is_accepted?: boolean
          is_deleted?: boolean
          is_scholar_endorsed?: boolean
          question_id: string
          updated_at?: string
          user_id: string
          vote_score?: number
        }
        Update: {
          body_md?: string
          citations?: Json
          created_at?: string
          endorsed_at?: string | null
          endorsed_by?: string | null
          id?: string
          is_accepted?: boolean
          is_deleted?: boolean
          is_scholar_endorsed?: boolean
          question_id?: string
          updated_at?: string
          user_id?: string
          vote_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "qa_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "qa_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name_bn: string
          name_en: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name_bn: string
          name_en: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name_bn?: string
          name_en?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      qa_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          parent_id: string
          parent_type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          parent_id: string
          parent_type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          parent_id?: string
          parent_type?: string
          user_id?: string
        }
        Relationships: []
      }
      qa_daily_quests: {
        Row: {
          answered: number
          asked: number
          bonus_claimed: boolean
          date: string
          upvoted: number
          user_id: string
        }
        Insert: {
          answered?: number
          asked?: number
          bonus_claimed?: boolean
          date: string
          upvoted?: number
          user_id: string
        }
        Update: {
          answered?: number
          asked?: number
          bonus_claimed?: boolean
          date?: string
          upvoted?: number
          user_id?: string
        }
        Relationships: []
      }
      qa_flags: {
        Row: {
          created_at: string
          id: string
          reason: string
          status: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          status?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          status?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      qa_follows: {
        Row: {
          created_at: string
          question_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          question_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_follows_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "qa_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_question_tags: {
        Row: {
          question_id: string
          tag_id: string
        }
        Insert: {
          question_id: string
          tag_id: string
        }
        Update: {
          question_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_question_tags_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "qa_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_question_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "qa_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_questions: {
        Row: {
          accepted_answer_id: string | null
          answer_count: number
          body_md: string
          category_id: string | null
          created_at: string
          duplicate_of: string | null
          id: string
          is_anonymous: boolean
          is_deleted: boolean
          language: string
          last_activity_at: string
          scholar_review_required: boolean
          search_tsv: unknown
          status: string
          title: string
          updated_at: string
          user_id: string
          view_count: number
          vote_score: number
        }
        Insert: {
          accepted_answer_id?: string | null
          answer_count?: number
          body_md: string
          category_id?: string | null
          created_at?: string
          duplicate_of?: string | null
          id?: string
          is_anonymous?: boolean
          is_deleted?: boolean
          language?: string
          last_activity_at?: string
          scholar_review_required?: boolean
          search_tsv?: unknown
          status?: string
          title: string
          updated_at?: string
          user_id: string
          view_count?: number
          vote_score?: number
        }
        Update: {
          accepted_answer_id?: string | null
          answer_count?: number
          body_md?: string
          category_id?: string | null
          created_at?: string
          duplicate_of?: string | null
          id?: string
          is_anonymous?: boolean
          is_deleted?: boolean
          language?: string
          last_activity_at?: string
          scholar_review_required?: boolean
          search_tsv?: unknown
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          view_count?: number
          vote_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "qa_questions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "qa_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_reputation_events: {
        Row: {
          created_at: string
          delta: number
          id: string
          reason: string
          source_id: string | null
          source_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          reason: string
          source_id?: string | null
          source_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          reason?: string
          source_id?: string | null
          source_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      qa_tags: {
        Row: {
          created_at: string
          id: string
          label: string
          slug: string
          usage_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          slug: string
          usage_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          slug?: string
          usage_count?: number
        }
        Relationships: []
      }
      qa_votes: {
        Row: {
          created_at: string
          id: string
          target_id: string
          target_type: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          target_id: string
          target_type: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          target_type?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json
          completed_at: string
          fingerprint: string | null
          id: string
          ip_address: string | null
          points_awarded: number
          quiz_id: string
          score: number
          time_taken_seconds: number
          total: number
          user_agent: string | null
          user_id: string
        }
        Insert: {
          answers?: Json
          completed_at?: string
          fingerprint?: string | null
          id?: string
          ip_address?: string | null
          points_awarded?: number
          quiz_id: string
          score?: number
          time_taken_seconds?: number
          total?: number
          user_agent?: string | null
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string
          fingerprint?: string | null
          id?: string
          ip_address?: string | null
          points_awarded?: number
          quiz_id?: string
          score?: number
          time_taken_seconds?: number
          total?: number
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_bookmarks: {
        Row: {
          created_at: string
          id: string
          quiz_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quiz_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quiz_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_bookmarks_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_bookmarks_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name_bn: string
          name_en: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name_bn: string
          name_en: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name_bn?: string
          name_en?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          correct_indices: number[]
          correct_order: number[]
          correct_text: string[]
          created_at: string
          explanation_bn: string | null
          explanation_en: string | null
          hint_bn: string | null
          hint_en: string | null
          id: string
          image_url: string | null
          options_bn: Json
          options_en: Json
          order_index: number
          points: number
          quiz_id: string
          text_bn: string
          text_en: string
          type: string
        }
        Insert: {
          correct_indices?: number[]
          correct_order?: number[]
          correct_text?: string[]
          created_at?: string
          explanation_bn?: string | null
          explanation_en?: string | null
          hint_bn?: string | null
          hint_en?: string | null
          id?: string
          image_url?: string | null
          options_bn?: Json
          options_en?: Json
          order_index?: number
          points?: number
          quiz_id: string
          text_bn: string
          text_en: string
          type?: string
        }
        Update: {
          correct_indices?: number[]
          correct_order?: number[]
          correct_text?: string[]
          created_at?: string
          explanation_bn?: string | null
          explanation_en?: string | null
          hint_bn?: string | null
          hint_en?: string | null
          id?: string
          image_url?: string | null
          options_bn?: Json
          options_en?: Json
          order_index?: number
          points?: number
          quiz_id?: string
          text_bn?: string
          text_en?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_reminders: {
        Row: {
          channels: string[]
          created_at: string
          id: string
          message_bn: string | null
          message_en: string | null
          quiz_id: string | null
          read_at: string | null
          remind_at: string
          sent_at: string | null
          tournament_id: string | null
          user_id: string
        }
        Insert: {
          channels?: string[]
          created_at?: string
          id?: string
          message_bn?: string | null
          message_en?: string | null
          quiz_id?: string | null
          read_at?: string | null
          remind_at: string
          sent_at?: string | null
          tournament_id?: string | null
          user_id: string
        }
        Update: {
          channels?: string[]
          created_at?: string
          id?: string
          message_bn?: string | null
          message_en?: string | null
          quiz_id?: string | null
          read_at?: string | null
          remind_at?: string
          sent_at?: string | null
          tournament_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_reminders_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_reminders_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          description_bn: string | null
          description_en: string | null
          difficulty: string
          ends_at: string | null
          id: string
          instant_feedback: boolean
          max_attempts: number
          pass_mark: number
          published: boolean
          starts_at: string | null
          time_limit_seconds: number
          timezone: string
          title_bn: string
          title_en: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description_bn?: string | null
          description_en?: string | null
          difficulty?: string
          ends_at?: string | null
          id?: string
          instant_feedback?: boolean
          max_attempts?: number
          pass_mark?: number
          published?: boolean
          starts_at?: string | null
          time_limit_seconds?: number
          timezone?: string
          title_bn: string
          title_en: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description_bn?: string | null
          description_en?: string | null
          difficulty?: string
          ends_at?: string | null
          id?: string
          instant_feedback?: boolean
          max_attempts?: number
          pass_mark?: number
          published?: boolean
          starts_at?: string | null
          time_limit_seconds?: number
          timezone?: string
          title_bn?: string
          title_en?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "quiz_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_matches: {
        Row: {
          closes_at: string | null
          created_at: string
          id: string
          match_index: number
          next_match_id: string | null
          next_slot: number | null
          p1_attempt_id: string | null
          p1_score: number | null
          p1_time_seconds: number | null
          p1_user_id: string | null
          p2_attempt_id: string | null
          p2_score: number | null
          p2_time_seconds: number | null
          p2_user_id: string | null
          round: number
          starts_at: string | null
          status: string
          tournament_id: string
          winner_user_id: string | null
        }
        Insert: {
          closes_at?: string | null
          created_at?: string
          id?: string
          match_index: number
          next_match_id?: string | null
          next_slot?: number | null
          p1_attempt_id?: string | null
          p1_score?: number | null
          p1_time_seconds?: number | null
          p1_user_id?: string | null
          p2_attempt_id?: string | null
          p2_score?: number | null
          p2_time_seconds?: number | null
          p2_user_id?: string | null
          round: number
          starts_at?: string | null
          status?: string
          tournament_id: string
          winner_user_id?: string | null
        }
        Update: {
          closes_at?: string | null
          created_at?: string
          id?: string
          match_index?: number
          next_match_id?: string | null
          next_slot?: number | null
          p1_attempt_id?: string | null
          p1_score?: number | null
          p1_time_seconds?: number | null
          p1_user_id?: string | null
          p2_attempt_id?: string | null
          p2_score?: number | null
          p2_time_seconds?: number | null
          p2_user_id?: string | null
          round?: number
          starts_at?: string | null
          status?: string
          tournament_id?: string
          winner_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_participants: {
        Row: {
          id: string
          joined_at: string
          seed: number | null
          status: string
          tournament_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          seed?: number | null
          status?: string
          tournament_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          seed?: number | null
          status?: string
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_participants_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          bracket_size: number
          created_at: string
          created_by: string | null
          current_round: number
          description_bn: string | null
          description_en: string | null
          id: string
          name_bn: string
          name_en: string
          prize_bn: string | null
          prize_en: string | null
          quiz_id: string
          registration_closes_at: string
          registration_opens_at: string
          round_minutes: number
          starts_at: string
          status: string
          updated_at: string
          winner_user_id: string | null
        }
        Insert: {
          bracket_size?: number
          created_at?: string
          created_by?: string | null
          current_round?: number
          description_bn?: string | null
          description_en?: string | null
          id?: string
          name_bn: string
          name_en: string
          prize_bn?: string | null
          prize_en?: string | null
          quiz_id: string
          registration_closes_at: string
          registration_opens_at?: string
          round_minutes?: number
          starts_at: string
          status?: string
          updated_at?: string
          winner_user_id?: string | null
        }
        Update: {
          bracket_size?: number
          created_at?: string
          created_by?: string | null
          current_round?: number
          description_bn?: string | null
          description_en?: string | null
          id?: string
          name_bn?: string
          name_en?: string
          prize_bn?: string | null
          prize_en?: string | null
          quiz_id?: string
          registration_closes_at?: string
          registration_opens_at?: string
          round_minutes?: number
          starts_at?: string
          status?: string
          updated_at?: string
          winner_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _advance_byes: { Args: { _tournament_id: string }; Returns: undefined }
      _qa_add_rep: {
        Args: {
          _delta: number
          _reason: string
          _src_id: string
          _src_type: string
          _user: string
        }
        Returns: undefined
      }
      attempts_left:
        | {
            Args: { _fingerprint: string; _ip: string; _quiz_id: string }
            Returns: number
          }
        | {
            Args: {
              _fingerprint: string
              _ip: string
              _quiz_id: string
              _user_id: string
            }
            Returns: number
          }
      get_quiz_leaderboard: {
        Args: { _category_id?: string; _period?: string; _quiz_id?: string }
        Returns: {
          attempts: number
          avatar_url: string
          best_time: number
          display_name: string
          total_points: number
          total_score: number
          user_id: string
        }[]
      }
      get_user_highest_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      qa_accept_answer: { Args: { _answer_id: string }; Returns: undefined }
      qa_attach_tags: {
        Args: { _labels: string[]; _question_id: string }
        Returns: undefined
      }
      qa_bump_view: { Args: { _question_id: string }; Returns: undefined }
      qa_cast_vote: {
        Args: { _target_id: string; _target_type: string; _value: number }
        Returns: Json
      }
      qa_endorse_answer: { Args: { _answer_id: string }; Returns: undefined }
      qa_leaderboard: {
        Args: { _period?: string }
        Returns: {
          accepted: number
          answers: number
          avatar_url: string
          display_name: string
          rep_gained: number
          total_rep: number
          user_id: string
        }[]
      }
      set_quiz_reminder: {
        Args: { _minutes_before?: number; _quiz_id: string }
        Returns: string
      }
      start_tournament: { Args: { _tournament_id: string }; Returns: Json }
      submit_quiz_attempt: {
        Args: {
          _answers: Json
          _fingerprint: string
          _ip: string
          _quiz_id: string
          _time_taken: number
          _ua: string
        }
        Returns: Json
      }
      submit_tournament_match: {
        Args: { _attempt_id: string; _match_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "scholar" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "scholar", "user"],
    },
  },
} as const
