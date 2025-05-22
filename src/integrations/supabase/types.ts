export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      spaces: {
        Row: {
          address: string
          air_conditioning: boolean | null
          capacity: string
          categories: string[] | null
          created_at: string | null
          description: string
          id: string
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
      vendors: {
        Row: {
          address: string
          category: string
          contact_number: string
          created_at: string
          description: string
          id: string
          images: string[] | null
          name: string
          user_id: string
          working_hours: string | null
        }
        Insert: {
          address: string
          category: string
          contact_number: string
          created_at?: string
          description: string
          id?: string
          images?: string[] | null
          name: string
          user_id: string
          working_hours?: string | null
        }
        Update: {
          address?: string
          category?: string
          contact_number?: string
          created_at?: string
          description?: string
          id?: string
          images?: string[] | null
          name?: string
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
    }
    Enums: {
      space_approval_status: "pending" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      space_approval_status: ["pending", "approved", "rejected"],
    },
  },
} as const
