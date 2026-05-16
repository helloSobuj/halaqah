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
      blog_bookmarks: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_categories: {
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
      blog_comments: {
        Row: {
          body_md: string
          created_at: string
          id: string
          is_deleted: boolean
          parent_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body_md: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          parent_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body_md?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          parent_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "blog_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_tags: {
        Row: {
          post_id: string
          tag_id: string
        }
        Insert: {
          post_id: string
          tag_id: string
        }
        Update: {
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "blog_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          audio_duration_seconds: number | null
          audio_url: string | null
          author_id: string | null
          category_id: string | null
          comment_count: number
          content_md_bn: string
          content_md_en: string
          cover_image_url: string | null
          created_at: string
          excerpt_bn: string | null
          excerpt_en: string | null
          id: string
          is_featured: boolean
          is_published: boolean
          language: string
          like_count: number
          published_at: string | null
          reading_minutes: number
          slug: string
          title_bn: string
          title_en: string
          updated_at: string
          view_count: number
        }
        Insert: {
          audio_duration_seconds?: number | null
          audio_url?: string | null
          author_id?: string | null
          category_id?: string | null
          comment_count?: number
          content_md_bn?: string
          content_md_en?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt_bn?: string | null
          excerpt_en?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          language?: string
          like_count?: number
          published_at?: string | null
          reading_minutes?: number
          slug: string
          title_bn?: string
          title_en: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          audio_duration_seconds?: number | null
          audio_url?: string | null
          author_id?: string | null
          category_id?: string | null
          comment_count?: number
          content_md_bn?: string
          content_md_en?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt_bn?: string | null
          excerpt_en?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          language?: string
          like_count?: number
          published_at?: string | null
          reading_minutes?: number
          slug?: string
          title_bn?: string
          title_en?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_tags: {
        Row: {
          created_at: string
          id: string
          label_bn: string
          label_en: string
          slug: string
          usage_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          label_bn?: string
          label_en: string
          slug: string
          usage_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          label_bn?: string
          label_en?: string
          slug?: string
          usage_count?: number
        }
        Relationships: []
      }
      event_categories: {
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
      event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_shares: {
        Row: {
          channel: string
          created_at: string
          event_id: string
          id: string
          user_id: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          event_id: string
          id?: string
          user_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_shares_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          capacity: number | null
          category_id: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description_md_bn: string
          description_md_en: string
          ends_at: string | null
          id: string
          is_featured: boolean
          is_published: boolean
          mode: string
          online_url: string | null
          share_count: number
          slug: string
          starts_at: string
          timezone: string
          title_bn: string
          title_en: string
          updated_at: string
          venue: string | null
          view_count: number
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          category_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description_md_bn?: string
          description_md_en?: string
          ends_at?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          mode?: string
          online_url?: string | null
          share_count?: number
          slug: string
          starts_at: string
          timezone?: string
          title_bn: string
          title_en: string
          updated_at?: string
          venue?: string | null
          view_count?: number
        }
        Update: {
          address?: string | null
          capacity?: number | null
          category_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description_md_bn?: string
          description_md_en?: string
          ends_at?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          mode?: string
          online_url?: string | null
          share_count?: number
          slug?: string
          starts_at?: string
          timezone?: string
          title_bn?: string
          title_en?: string
          updated_at?: string
          venue?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      library_bookmarks: {
        Row: {
          book_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_bookmarks_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "library_books"
            referencedColumns: ["id"]
          },
        ]
      }
      library_books: {
        Row: {
          author: string | null
          avg_rating: number
          category_id: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          download_count: number
          external_url: string | null
          id: string
          is_featured: boolean
          language: string
          pages: number | null
          pdf_path: string | null
          pdf_size_bytes: number | null
          published_year: number | null
          rating_count: number
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          share_count: number
          slug: string
          source_type: string
          status: string
          submitted_by: string | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author?: string | null
          avg_rating?: number
          category_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          download_count?: number
          external_url?: string | null
          id?: string
          is_featured?: boolean
          language?: string
          pages?: number | null
          pdf_path?: string | null
          pdf_size_bytes?: number | null
          published_year?: number | null
          rating_count?: number
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          share_count?: number
          slug: string
          source_type: string
          status?: string
          submitted_by?: string | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author?: string | null
          avg_rating?: number
          category_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          download_count?: number
          external_url?: string | null
          id?: string
          is_featured?: boolean
          language?: string
          pages?: number | null
          pdf_path?: string | null
          pdf_size_bytes?: number | null
          published_year?: number | null
          rating_count?: number
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          share_count?: number
          slug?: string
          source_type?: string
          status?: string
          submitted_by?: string | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "library_books_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "library_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      library_categories: {
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
      library_comments: {
        Row: {
          body_md: string
          book_id: string
          created_at: string
          id: string
          is_deleted: boolean
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body_md: string
          book_id: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body_md?: string
          book_id?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_comments_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "library_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "library_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      library_downloads: {
        Row: {
          book_id: string
          created_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "library_downloads_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "library_books"
            referencedColumns: ["id"]
          },
        ]
      }
      library_ratings: {
        Row: {
          book_id: string
          created_at: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          book_id: string
          created_at?: string
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          book_id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "library_ratings_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "library_books"
            referencedColumns: ["id"]
          },
        ]
      }
      notice_reads: {
        Row: {
          notice_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          notice_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          notice_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notice_reads_notice_id_fkey"
            columns: ["notice_id"]
            isOneToOne: false
            referencedRelation: "notices"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          body_md_bn: string
          body_md_en: string
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          id: string
          is_pinned: boolean
          is_published: boolean
          priority: string
          published_at: string | null
          title_bn: string
          title_en: string
          updated_at: string
        }
        Insert: {
          body_md_bn?: string
          body_md_en?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_pinned?: boolean
          is_published?: boolean
          priority?: string
          published_at?: string | null
          title_bn?: string
          title_en: string
          updated_at?: string
        }
        Update: {
          body_md_bn?: string
          body_md_en?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_pinned?: boolean
          is_published?: boolean
          priority?: string
          published_at?: string | null
          title_bn?: string
          title_en?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      qa_badges: {
        Row: {
          awarded_at: string
          code: string
          id: string
          meta: Json
          user_id: string
        }
        Insert: {
          awarded_at?: string
          code: string
          id?: string
          meta?: Json
          user_id: string
        }
        Update: {
          awarded_at?: string
          code?: string
          id?: string
          meta?: Json
          user_id?: string
        }
        Relationships: []
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
          is_locked: boolean
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
          is_locked?: boolean
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
          is_locked?: boolean
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
      video_categories: {
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
      video_playlists: {
        Row: {
          category_id: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description_bn: string | null
          description_en: string | null
          id: string
          is_featured: boolean
          is_published: boolean
          slug: string
          sort_order: number
          title_bn: string
          title_en: string
          updated_at: string
          view_count: number
          youtube_playlist_id: string | null
        }
        Insert: {
          category_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description_bn?: string | null
          description_en?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          slug: string
          sort_order?: number
          title_bn?: string
          title_en: string
          updated_at?: string
          view_count?: number
          youtube_playlist_id?: string | null
        }
        Update: {
          category_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description_bn?: string | null
          description_en?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          slug?: string
          sort_order?: number
          title_bn?: string
          title_en?: string
          updated_at?: string
          view_count?: number
          youtube_playlist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_playlists_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "video_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          description_bn: string | null
          description_en: string | null
          duration_seconds: number | null
          id: string
          is_featured: boolean
          is_published: boolean
          language: string
          playlist_id: string | null
          slug: string
          sort_order: number
          speaker: string | null
          thumbnail_url: string | null
          title_bn: string
          title_en: string
          updated_at: string
          view_count: number
          youtube_url: string
          youtube_video_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description_bn?: string | null
          description_en?: string | null
          duration_seconds?: number | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          language?: string
          playlist_id?: string | null
          slug: string
          sort_order?: number
          speaker?: string | null
          thumbnail_url?: string | null
          title_bn?: string
          title_en: string
          updated_at?: string
          view_count?: number
          youtube_url: string
          youtube_video_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description_bn?: string | null
          description_en?: string | null
          duration_seconds?: number | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          language?: string
          playlist_id?: string | null
          slug?: string
          sort_order?: number
          speaker?: string | null
          thumbnail_url?: string | null
          title_bn?: string
          title_en?: string
          updated_at?: string
          view_count?: number
          youtube_url?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "video_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "video_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _advance_byes: { Args: { _tournament_id: string }; Returns: undefined }
      _library_recompute_rating: {
        Args: { _book_id: string }
        Returns: undefined
      }
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
      _qa_award_badge: {
        Args: { _code: string; _meta?: Json; _user: string }
        Returns: boolean
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
      bump_blog_view: { Args: { _post_id: string }; Returns: undefined }
      bump_event_view: { Args: { _event_id: string }; Returns: undefined }
      bump_library_download: { Args: { _book_id: string }; Returns: undefined }
      bump_library_view: { Args: { _book_id: string }; Returns: undefined }
      bump_video_view: { Args: { _video_id: string }; Returns: undefined }
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
      qa_claim_daily_bonus: { Args: never; Returns: Json }
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
