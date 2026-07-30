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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ad_videos: {
        Row: {
          ad_name: string
          created_at: string
          file_name: string | null
          id: string
          user_id: string
          video_url: string
        }
        Insert: {
          ad_name: string
          created_at?: string
          file_name?: string | null
          id?: string
          user_id?: string
          video_url: string
        }
        Update: {
          ad_name?: string
          created_at?: string
          file_name?: string | null
          id?: string
          user_id?: string
          video_url?: string
        }
        Relationships: []
      }
      ai_analysis_logs: {
        Row: {
          analysis_type: string
          campaign_config_id: string | null
          created_at: string | null
          duration_ms: number | null
          error: string | null
          id: string
          input_data: Json | null
          output_data: Json | null
          tokens_used: number | null
        }
        Insert: {
          analysis_type: string
          campaign_config_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          tokens_used?: number | null
        }
        Update: {
          analysis_type?: string
          campaign_config_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_analysis_logs_campaign_config_id_fkey"
            columns: ["campaign_config_id"]
            isOneToOne: false
            referencedRelation: "campaign_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_training_data: {
        Row: {
          category: string
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          tags: string[] | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          category?: string
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          tags?: string[] | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bm_account_secrets: {
        Row: {
          access_token: string | null
          bm_account_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          bm_account_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          bm_account_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bm_account_secrets_bm_account_id_fkey"
            columns: ["bm_account_id"]
            isOneToOne: true
            referencedRelation: "bm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bm_account_secrets_bm_account_id_fkey"
            columns: ["bm_account_id"]
            isOneToOne: true
            referencedRelation: "bm_accounts_public"
            referencedColumns: ["id"]
          },
        ]
      }
      bm_accounts: {
        Row: {
          ad_account_id: string
          created_at: string
          currency: string
          id: string
          is_active: boolean
          label: string
          slug: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ad_account_id: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          label: string
          slug: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          ad_account_id?: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          label?: string
          slug?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      campaign_budget_history: {
        Row: {
          ad_name: string | null
          campaign_id: string
          created_at: string
          id: string
          new_budget: number
          previous_budget: number | null
          user_id: string
        }
        Insert: {
          ad_name?: string | null
          campaign_id: string
          created_at?: string
          id?: string
          new_budget: number
          previous_budget?: number | null
          user_id: string
        }
        Update: {
          ad_name?: string | null
          campaign_id?: string
          created_at?: string
          id?: string
          new_budget?: number
          previous_budget?: number | null
          user_id?: string
        }
        Relationships: []
      }
      campaign_configs: {
        Row: {
          adset_id: string | null
          auto_apply: boolean | null
          bm_account: string | null
          budget_current: number | null
          budget_max: number | null
          budget_min: number | null
          campaign_id: string | null
          country: string | null
          created_at: string | null
          id: string
          monitoring_enabled: boolean | null
          monitoring_interval: number | null
          name: string
          target_cpa: number | null
          target_ctr: number | null
          target_roas: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          adset_id?: string | null
          auto_apply?: boolean | null
          bm_account?: string | null
          budget_current?: number | null
          budget_max?: number | null
          budget_min?: number | null
          campaign_id?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          monitoring_enabled?: boolean | null
          monitoring_interval?: number | null
          name: string
          target_cpa?: number | null
          target_ctr?: number | null
          target_roas?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          adset_id?: string | null
          auto_apply?: boolean | null
          bm_account?: string | null
          budget_current?: number | null
          budget_max?: number | null
          budget_min?: number | null
          campaign_id?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          monitoring_enabled?: boolean | null
          monitoring_interval?: number | null
          name?: string
          target_cpa?: number | null
          target_ctr?: number | null
          target_roas?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      countries: {
        Row: {
          code: string
          created_at: string
          currency_code: string
          flag: string
          id: string
          is_active: boolean
          name: string
          rate_to_brl: number
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          currency_code?: string
          flag?: string
          id?: string
          is_active?: boolean
          name: string
          rate_to_brl?: number
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          code?: string
          created_at?: string
          currency_code?: string
          flag?: string
          id?: string
          is_active?: boolean
          name?: string
          rate_to_brl?: number
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      niches: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          keyword: string
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          keyword: string
          name: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          keyword?: string
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      optimization_suggestions: {
        Row: {
          applied_at: string | null
          campaign_config_id: string | null
          change_percent: number | null
          created_at: string | null
          current_value: number | null
          error_message: string | null
          expires_at: string | null
          id: string
          metrics_snapshot: Json | null
          reasoning: string
          status: string | null
          suggested_value: number | null
          suggestion_type: string
          whatsapp_message_id: string | null
        }
        Insert: {
          applied_at?: string | null
          campaign_config_id?: string | null
          change_percent?: number | null
          created_at?: string | null
          current_value?: number | null
          error_message?: string | null
          expires_at?: string | null
          id?: string
          metrics_snapshot?: Json | null
          reasoning: string
          status?: string | null
          suggested_value?: number | null
          suggestion_type: string
          whatsapp_message_id?: string | null
        }
        Update: {
          applied_at?: string | null
          campaign_config_id?: string | null
          change_percent?: number | null
          created_at?: string | null
          current_value?: number | null
          error_message?: string | null
          expires_at?: string | null
          id?: string
          metrics_snapshot?: Json | null
          reasoning?: string
          status?: string | null
          suggested_value?: number | null
          suggestion_type?: string
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "optimization_suggestions_campaign_config_id_fkey"
            columns: ["campaign_config_id"]
            isOneToOne: false
            referencedRelation: "campaign_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved: boolean
          created_at: string
          email: string
          id: string
          webhook_key: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          email: string
          id: string
          webhook_key?: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          email?: string
          id?: string
          webhook_key?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_sales: {
        Row: {
          campaign: string
          country: string
          created_at: string
          creative: string
          currency: string
          date: string
          id: string
          phone: string | null
          revenue: number
          sales: number
          user_id: string
        }
        Insert: {
          campaign?: string
          country?: string
          created_at?: string
          creative?: string
          currency?: string
          date?: string
          id?: string
          phone?: string | null
          revenue?: number
          sales?: number
          user_id: string
        }
        Update: {
          campaign?: string
          country?: string
          created_at?: string
          creative?: string
          currency?: string
          date?: string
          id?: string
          phone?: string | null
          revenue?: number
          sales?: number
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          created_at: string | null
          direction: string
          id: string
          intent: string | null
          message: string
          message_id: string | null
          phone: string | null
          processed: boolean | null
          suggestion_id: string | null
        }
        Insert: {
          created_at?: string | null
          direction: string
          id?: string
          intent?: string | null
          message: string
          message_id?: string | null
          phone?: string | null
          processed?: boolean | null
          suggestion_id?: string | null
        }
        Update: {
          created_at?: string | null
          direction?: string
          id?: string
          intent?: string | null
          message?: string
          message_id?: string | null
          phone?: string | null
          processed?: boolean | null
          suggestion_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "optimization_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      zapi_config: {
        Row: {
          client_token: string | null
          created_at: string | null
          id: string
          instance_id: string
          is_active: boolean | null
          phone: string
          token: string
          updated_at: string | null
          user_id: string
          webhook_configured: boolean | null
        }
        Insert: {
          client_token?: string | null
          created_at?: string | null
          id?: string
          instance_id: string
          is_active?: boolean | null
          phone: string
          token: string
          updated_at?: string | null
          user_id?: string
          webhook_configured?: boolean | null
        }
        Update: {
          client_token?: string | null
          created_at?: string | null
          id?: string
          instance_id?: string
          is_active?: boolean | null
          phone?: string
          token?: string
          updated_at?: string | null
          user_id?: string
          webhook_configured?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      bm_accounts_public: {
        Row: {
          ad_account_id: string | null
          created_at: string | null
          currency: string | null
          id: string | null
          is_active: boolean | null
          label: string | null
          slug: string | null
          sort_order: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ad_account_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string | null
          is_active?: boolean | null
          label?: string | null
          slug?: string | null
          sort_order?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ad_account_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string | null
          is_active?: boolean | null
          label?: string | null
          slug?: string | null
          sort_order?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
