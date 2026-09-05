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
          country: string | null
          created_at: string
          currency: string
          date_format: string
          date_of_birth: string | null
          default_dashboard_view: string
          display_name: string | null
          email: string | null
          full_name: string | null
          id: string
          language: string
          notification_preferences: Json
          phone: string | null
          timezone: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          date_format?: string
          date_of_birth?: string | null
          default_dashboard_view?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          language?: string
          notification_preferences?: Json
          phone?: string | null
          timezone?: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          date_format?: string
          date_of_birth?: string | null
          default_dashboard_view?: string
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          language?: string
          notification_preferences?: Json
          phone?: string | null
          timezone?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      shared_activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          list_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          list_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          list_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_activity_logs_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "shared_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_invitations: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          invited_email: string
          list_id: string
          responded_at: string | null
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by: string
          invited_email: string
          list_id: string
          responded_at?: string | null
          status?: string
          token: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          invited_email?: string
          list_id?: string
          responded_at?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_invitations_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "shared_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_list_members: {
        Row: {
          id: string
          joined_at: string
          list_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          list_id: string
          role: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          list_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_list_members_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "shared_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_lists: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      shared_transaction_splits: {
        Row: {
          amount: number
          id: string
          percentage: number | null
          transaction_id: string
          user_id: string
        }
        Insert: {
          amount: number
          id?: string
          percentage?: number | null
          transaction_id: string
          user_id: string
        }
        Update: {
          amount?: number
          id?: string
          percentage?: number | null
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_transaction_splits_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "shared_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          creator_id: string
          date: string
          id: string
          list_id: string
          notes: string | null
          split_method: string
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          creator_id: string
          date: string
          id?: string
          list_id: string
          notes?: string | null
          split_method?: string
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          creator_id?: string
          date?: string
          id?: string
          list_id?: string
          notes?: string | null
          split_method?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_transactions_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "shared_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          date: string
          description: string | null
          id: number
          parent_transaction_id: number | null
          recurring_end_date: string | null
          recurring_frequency: string | null
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          date: string
          description?: string | null
          id?: never
          parent_transaction_id?: number | null
          recurring_end_date?: string | null
          recurring_frequency?: string | null
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          date?: string
          description?: string | null
          id?: never
          parent_transaction_id?: number | null
          recurring_end_date?: string | null
          recurring_frequency?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_parent_transaction_id_fkey"
            columns: ["parent_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_is_list_member: { Args: { list_id: string }; Returns: boolean }
      delete_user_account: { Args: never; Returns: undefined }
      get_financial_summary: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: Json
      }
      get_users_by_ids: {
        Args: { user_ids: string[] }
        Returns: {
          email: string
          id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
