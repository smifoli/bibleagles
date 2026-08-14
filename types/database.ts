export type UserRole = "admin" | "member";
export type PackageStatus = "draft" | "active" | "archived";
export type Language = "pt" | "en" | "es" | "de" | "it";
export type HighlightColor = "yellow" | "green" | "rose" | "blue";
export type FontSizePreference = "normal" | "large" | "xlarge";
export type NotificationType =
  | "comment_reply"
  | "comment_on_thread"
  | "comment_like"
  | "comment_on_read_chapter"
  | "comment_on_any_chapter"
  | "chapter_read";
/** Alcance das notificações de comentários novos: só em capítulos já lidos (padrão) ou em toda a Bíblia. */
export type CommentNotificationScope = "read_chapters" | "all";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          avatar_url: string | null;
          role: UserRole;
          preferred_version: string;
          preferred_language: Language;
          notification_enabled: boolean;
          notification_time: string;
          comment_notification_scope: CommentNotificationScope;
          // Avisar quando alguém da família marcar um capítulo como lido.
          chapter_read_notifications: boolean;
          // Fuso IANA do último aparelho usado (TimezoneSync) — o lembrete
          // diário (cron, sem cookie de ninguém) lê daqui.
          timezone: string;
          // Data LOCAL (no fuso acima) do último lembrete diário enviado.
          reminder_last_sent_on: string | null;
          font_size: FontSizePreference;
          is_deleted: boolean;
          // Última visita a /family — usado só pra marcar o que é "novo" no feed
          // desde então; null enquanto o usuário nunca abriu a tela.
          family_feed_seen_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["users"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };
      reading_packages: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          start_date: string;
          status: PackageStatus;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["reading_packages"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["reading_packages"]["Insert"]>;
        Relationships: [];
      };
      reading_plan_days: {
        Row: {
          id: string;
          package_id: string;
          date: string;
          title: string;
          passages: Passage[];
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["reading_plan_days"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["reading_plan_days"]["Insert"]>;
        Relationships: [];
      };
      reading_progress: {
        Row: {
          id: string;
          user_id: string;
          // Mutuamente exclusivos (reading_progress_target_check): uma linha marca ou um
          // dia de plano (plan_day_id) ou um capítulo livre (book + chapter), nunca os dois.
          plan_day_id: string | null;
          book: string | null;
          chapter: number | null;
          completed_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["reading_progress"]["Row"], "id" | "completed_at"> & {
          completed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reading_progress"]["Insert"]>;
        Relationships: [];
      };
      bookmarks: {
        Row: {
          id: string;
          user_id: string;
          book: string;
          chapter: number;
          verse: number;
          bible_version: string;
          color: HighlightColor;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["bookmarks"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["bookmarks"]["Insert"]>;
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          user_id: string;
          book: string;
          chapter: number;
          verse: number;
          bible_version: string;
          content: string;
          parent_id: string | null;
          updated_at: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["comments"]["Row"], "id" | "updated_at" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["comments"]["Insert"]>;
        Relationships: [];
      };
      comment_likes: {
        Row: {
          id: string;
          user_id: string;
          comment_id: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["comment_likes"]["Row"], "id" | "created_at">;
        Update: never;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          actor_id: string;
          type: NotificationType;
          // Tipos de comentário carregam comment_id; chapter_read carrega
          // book+chapter (ver notifications_payload_check na migration).
          comment_id: string | null;
          book: string | null;
          chapter: number | null;
          read_at: string | null;
          created_at: string;
        };
        // Só nasce via trigger (security definer) — não há policy de insert pro usuário.
        Insert: never;
        Update: { read_at: string | null };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["push_subscriptions"]["Row"], "id" | "created_at">;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export interface Passage {
  book: string;
  chapter_start: number;
  verse_start: number | null;
  chapter_end: number | null;
  verse_end: number | null;
}
