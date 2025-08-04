export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      chats: {
        Row: {
          created_at: string | null
          deleted: boolean | null
          has_unread: boolean | null
          id: string
          last_message: string | null
          last_message_sender_id: string | null
          last_message_time: string | null
          owner_id: string
          space_id: string | null
          space_image: string | null
          space_name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deleted?: boolean | null
          has_unread?: boolean | null
          id?: string
          last_message?: string | null
          last_message_sender_id?: string | null
          last_message_time?: string | null
          owner_id: string
          space_id?: string | null
          space_image?: string | null
          space_name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deleted?: boolean | null
          has_unread?: boolean | null
          id?: string
          last_message?: string | null
          last_message_sender_id?: string | null
          last_message_time?: string | null
          owner_id?: string
          space_id?: string | null
          space_image?: string | null
          space_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          chat_id: string | null
          content: string
          created_at: string | null
          id: string
          sender_id: string
        }
        Insert: {
          chat_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          sender_id: string
        }
        Update: {
          chat_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      space_deletion_notifications: {
        Row: {
          created_at: string
          deletion_reason: string
          id: string
          space_name: string
          user_id: string
          viewed: boolean
        }
        Insert: {
          created_at?: string
          deletion_reason: string
          id?: string
          space_name: string
          user_id: string
          viewed?: boolean
        }
        Update: {
          created_at?: string
          deletion_reason?: string
          id?: string
          space_name?: string
          user_id?: string
          viewed?: boolean
        }
        Relationships: []
      }
      space_photos: {
        Row: {
          created_at: string | null
          id: string
          space_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          space_id: string
          storage_path: string
        }
        Update: {
          created_at?: string | null
          id?: string
          space_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_photos_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_promotions: {
        Row: {
          active: boolean
          amount: number
          created_at: string
          expires_at: string | null
          id: string
          payment_id: string | null
          payment_status: string
          plan_id: string
          preference_id: string | null
          space_id: string
          user_id: string
        }
        Insert: {
          active?: boolean
          amount: number
          created_at?: string
          expires_at?: string | null
          id?: string
          payment_id?: string | null
          payment_status: string
          plan_id: string
          preference_id?: string | null
          space_id: string
          user_id: string
        }
        Update: {
          active?: boolean
          amount?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          payment_id?: string | null
          payment_status?: string
          plan_id?: string
          preference_id?: string | null
          space_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_promotions_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_subscriptions: {
        Row: {
          amount: number
          created_at: string
          id: string
          next_billing_date: string | null
          payer_email: string
          plan_id: string
          preapproval_plan_id: string
          space_id: string
          started_at: string | null
          status: string
          subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          next_billing_date?: string | null
          payer_email: string
          plan_id: string
          preapproval_plan_id: string
          space_id: string
          started_at?: string | null
          status: string
          subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          next_billing_date?: string | null
          payer_email?: string
          plan_id?: string
          preapproval_plan_id?: string
          space_id?: string
          started_at?: string | null
          status?: string
          subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_subscriptions_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          address: string
          air_conditioning: boolean | null
          capacity: string
          categories: string[] | null
          created_at: string | null
          description: string
          id: string
          instagram: string | null
          kitchen: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          number: string
          parking: boolean | null
          phone: string
          pool: boolean | null
          price: string
          rejection_reason: string | null
          sound_system: boolean | null
          state: string
          status: Database["public"]["Enums"]["space_approval_status"] | null
          user_id: string
          wifi: boolean | null
          zip_code: string
        }
        Insert: {
          address: string
          air_conditioning?: boolean | null
          capacity: string
          categories?: string[] | null
          created_at?: string | null
          description: string
          id?: string
          instagram?: string | null
          kitchen?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          number: string
          parking?: boolean | null
          phone: string
          pool?: boolean | null
          price: string
          rejection_reason?: string | null
          sound_system?: boolean | null
          state: string
          status?: Database["public"]["Enums"]["space_approval_status"] | null
          user_id: string
          wifi?: boolean | null
          zip_code: string
        }
        Update: {
          address?: string
          air_conditioning?: boolean | null
          capacity?: string
          categories?: string[] | null
          created_at?: string | null
          description?: string
          id?: string
          instagram?: string | null
          kitchen?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          number?: string
          parking?: boolean | null
          phone?: string
          pool?: boolean | null
          price?: string
          rejection_reason?: string | null
          sound_system?: boolean | null
          state?: string
          status?: Database["public"]["Enums"]["space_approval_status"] | null
          user_id?: string
          wifi?: boolean | null
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "spaces_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      vendor_deletion_notifications: {
        Row: {
          created_at: string
          deletion_reason: string
          id: string
          user_id: string
          vendor_name: string
          viewed: boolean
        }
        Insert: {
          created_at?: string
          deletion_reason: string
          id?: string
          user_id: string
          vendor_name: string
          viewed?: boolean
        }
        Update: {
          created_at?: string
          deletion_reason?: string
          id?: string
          user_id?: string
          vendor_name?: string
          viewed?: boolean
        }
        Relationships: []
      }
      vendor_promotions: {
        Row: {
          active: boolean
          amount: number
          created_at: string
          expires_at: string | null
          id: string
          payment_id: string | null
          payment_status: string
          plan_id: string
          preference_id: string | null
          user_id: string
          vendor_id: string
        }
        Insert: {
          active?: boolean
          amount: number
          created_at?: string
          expires_at?: string | null
          id?: string
          payment_id?: string | null
          payment_status?: string
          plan_id: string
          preference_id?: string | null
          user_id: string
          vendor_id: string
        }
        Update: {
          active?: boolean
          amount?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          payment_id?: string | null
          payment_status?: string
          plan_id?: string
          preference_id?: string | null
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_promotions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string
          available_days: string[] | null
          category: string
          contact_number: string
          created_at: string
          description: string
          id: string
          images: string[] | null
          instagram: string | null
          latitude: number | null
          longitude: number | null
          name: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["vendor_approval_status"]
          user_id: string
          working_hours: string | null
        }
        Insert: {
          address: string
          available_days?: string[] | null
          category: string
          contact_number: string
          created_at?: string
          description: string
          id?: string
          images?: string[] | null
          instagram?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["vendor_approval_status"]
          user_id: string
          working_hours?: string | null
        }
        Update: {
          address?: string
          available_days?: string[] | null
          category?: string
          contact_number?: string
          created_at?: string
          description?: string
          id?: string
          images?: string[] | null
          instagram?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["vendor_approval_status"]
          user_id?: string
          working_hours?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_all_spaces: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          created_at: string
          status: Database["public"]["Enums"]["space_approval_status"]
          user_id: string
          price: string
          profiles: Json
        }[]
      }
      admin_get_space_photos: {
        Args: { space_id_param: string }
        Returns: {
          id: string
          space_id: string
          storage_path: string
          created_at: string
        }[]
      }
      check_user_role: {
        Args: { user_id: string; requested_role: string }
        Returns: boolean
      }
      delete_space_with_photos: {
        Args: { space_id_param: string }
        Returns: undefined
      }
      get_user_id_by_email: {
        Args: { email_input: string }
        Returns: string
      }
      has_role: {
        Args: { requested_role: string }
        Returns: boolean
      }
      mark_notification_viewed: {
        Args: { notification_id: string }
        Returns: undefined
      }
      mark_vendor_notification_viewed: {
        Args: { notification_id: string }
        Returns: undefined
      }
    }
    Enums: {
      space_approval_status: "pending" | "approved" | "rejected"
      vendor_approval_status: "pending" | "approved" | "rejected"
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
      space_approval_status: ["pending", "approved", "rejected"],
      vendor_approval_status: ["pending", "approved", "rejected"],
    },
  },
} as const
