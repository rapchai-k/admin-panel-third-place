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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      bulk_operations: {
        Row: {
          completed_at: string | null
          created_at: string
          error_count: number
          error_details: Json | null
          id: string
          initiated_by: string
          operation_data: Json | null
          operation_type: string
          started_at: string
          status: string
          success_count: number
          target_count: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_count?: number
          error_details?: Json | null
          id?: string
          initiated_by: string
          operation_data?: Json | null
          operation_type: string
          started_at?: string
          status?: string
          success_count?: number
          target_count?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_count?: number
          error_details?: Json | null
          id?: string
          initiated_by?: string
          operation_data?: Json | null
          operation_type?: string
          started_at?: string
          status?: string
          success_count?: number
          target_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "bulk_operations_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          id: string
          admin_user_id: string
          action: string
          target_type: string
          target_id: string
          previous_state: Json | null
          new_state: Json | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          admin_user_id: string
          action: string
          target_type: string
          target_id: string
          previous_state?: Json | null
          new_state?: Json | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          admin_user_id?: string
          action?: string
          target_type?: string
          target_id?: string
          previous_state?: Json | null
          new_state?: Json | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          city: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          city: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          city?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_members: {
        Row: {
          community_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          community_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          community_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_comments: {
        Row: {
          created_at: string
          discussion_id: string
          flagged_count: number
          id: string
          text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discussion_id: string
          flagged_count?: number
          id?: string
          text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discussion_id?: string
          flagged_count?: number
          id?: string
          text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_comments_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      discussions: {
        Row: {
          community_id: string
          created_at: string
          created_by: string
          expires_at: string
          extended: boolean
          id: string
          is_visible: boolean
          prompt: string | null
          title: string
          updated_at: string
        }
        Insert: {
          community_id: string
          created_at?: string
          created_by: string
          expires_at: string
          extended?: boolean
          id?: string
          is_visible?: boolean
          prompt?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          community_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          extended?: boolean
          id?: string
          is_visible?: boolean
          prompt?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussions_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string | null
          id: string
          message_id: string | null
          provider: string
          recipient: string
          sent_at: string | null
          status: string
          subject: string
          template_id: string | null
          template_name: string | null
          updated_at: string
          user_id: string | null
          variables_used: Json | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type?: string | null
          id?: string
          message_id?: string | null
          provider?: string
          recipient: string
          sent_at?: string | null
          status?: string
          subject: string
          template_id?: string | null
          template_name?: string | null
          updated_at?: string
          user_id?: string | null
          variables_used?: Json | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string | null
          id?: string
          message_id?: string | null
          provider?: string
          recipient?: string
          sent_at?: string | null
          status?: string
          subject?: string
          template_id?: string | null
          template_name?: string | null
          updated_at?: string
          user_id?: string | null
          variables_used?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          created_at: string
          created_by: string | null
          display_name: string
          event_type: string
          html_content: string
          id: string
          is_active: boolean
          name: string
          subject: string
          updated_at: string
          variables: Json
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_name: string
          event_type: string
          html_content: string
          id?: string
          is_active?: boolean
          name: string
          subject: string
          updated_at?: string
          variables?: Json
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_name?: string
          event_type?: string
          html_content?: string
          id?: string
          is_active?: boolean
          name?: string
          subject?: string
          updated_at?: string
          variables?: Json
          version?: number
        }
        Relationships: []
      }
      event_registrations: {
        Row: {
          created_at: string
          event_id: string
          id: string
          payment_id: string | null
          payment_session_id: string | null
          status: Database["public"]["Enums"]["registration_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          payment_id?: string | null
          payment_session_id?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          payment_id?: string | null
          payment_session_id?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_payment_session_id_fkey"
            columns: ["payment_session_id"]
            isOneToOne: false
            referencedRelation: "payment_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }

      events: {
        Row: {
          capacity: number
          community_id: string
          created_at: string
          currency: string | null
          date_time: string | null
          description: string | null
          external_link: string | null
          host_id: string | null
          id: string
          image_url: string | null
          is_cancelled: boolean
          is_recurring_parent: boolean
          parent_event_id: string | null
          price: number | null
          recurrence_count: number | null
          recurrence_day_of_month: number | null
          recurrence_days_of_week: number[] | null
          recurrence_end_date: string | null
          recurrence_end_type: string | null
          recurrence_frequency: number | null
          recurrence_metadata: Json | null
          recurrence_pattern: string | null
          series_index: number | null
          title: string
          updated_at: string
          venue: string
        }
        Insert: {
          capacity: number
          community_id: string
          created_at?: string
          currency?: string | null
          date_time?: string | null
          description?: string | null
          external_link?: string | null
          host_id?: string | null
          id?: string
          image_url?: string | null
          is_cancelled?: boolean
          is_recurring_parent?: boolean
          parent_event_id?: string | null
          price?: number | null
          recurrence_count?: number | null
          recurrence_day_of_month?: number | null
          recurrence_days_of_week?: number[] | null
          recurrence_end_date?: string | null
          recurrence_end_type?: string | null
          recurrence_frequency?: number | null
          recurrence_metadata?: Json | null
          recurrence_pattern?: string | null
          series_index?: number | null
          title: string
          updated_at?: string
          venue: string
        }
        Update: {
          capacity?: number
          community_id?: string
          created_at?: string
          currency?: string | null
          date_time?: string | null
          description?: string | null
          external_link?: string | null
          host_id?: string | null
          id?: string
          image_url?: string | null
          is_cancelled?: boolean
          is_recurring_parent?: boolean
          parent_event_id?: string | null
          price?: number | null
          recurrence_count?: number | null
          recurrence_day_of_month?: number | null
          recurrence_days_of_week?: number[] | null
          recurrence_end_date?: string | null
          recurrence_end_type?: string | null
          recurrence_frequency?: number | null
          recurrence_metadata?: Json | null
          recurrence_pattern?: string | null
          series_index?: number | null
          title?: string
          updated_at?: string
          venue?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      flags: {
        Row: {
          comment_id: string | null
          created_at: string
          flagged_by_id: string
          flagged_user_id: string
          id: string
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["flag_status"]
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          flagged_by_id: string
          flagged_user_id: string
          id?: string
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["flag_status"]
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          flagged_by_id?: string
          flagged_user_id?: string
          id?: string
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["flag_status"]
        }
        Relationships: [
          {
            foreignKeyName: "flags_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "discussion_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flags_flagged_by_id_fkey"
            columns: ["flagged_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flags_flagged_user_id_fkey"
            columns: ["flagged_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email: boolean
          sms: boolean
          updated_at: string
          user_id: string
          whatsapp: boolean
        }
        Insert: {
          created_at?: string
          email?: boolean
          sms?: boolean
          updated_at?: string
          user_id: string
          whatsapp?: boolean
        }
        Update: {
          created_at?: string
          email?: boolean
          sms?: boolean
          updated_at?: string
          user_id?: string
          whatsapp?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_logs: {
        Row: {
          cashfree_signature: string | null
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          payment_session_id: string
        }
        Insert: {
          cashfree_signature?: string | null
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          payment_session_id: string
        }
        Update: {
          cashfree_signature?: string | null
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          payment_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_logs_payment_session_id_fkey"
            columns: ["payment_session_id"]
            isOneToOne: false
            referencedRelation: "payment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_sessions: {
        Row: {
          amount: number
          cashfree_order_id: string | null
          cashfree_payment_id: string | null
          created_at: string
          currency: string
          event_id: string
          expires_at: string
          id: string
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          payment_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          cashfree_order_id?: string | null
          cashfree_payment_id?: string | null
          created_at?: string
          currency?: string
          event_id: string
          expires_at?: string
          id?: string
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          payment_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          cashfree_order_id?: string | null
          cashfree_payment_id?: string | null
          created_at?: string
          currency?: string
          event_id?: string
          expires_at?: string
          id?: string
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          payment_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          id: string
          joined_at: string
          referred_user_id: string
          referrer_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          referred_user_id: string
          referrer_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          referred_user_id?: string
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }

      user_activity_log: {
        Row: {
          action_type: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string
          timestamp: string
          user_id: string
        }
        Insert: {
          action_type: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type: string
          timestamp?: string
          user_id: string
        }
        Update: {
          action_type?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge: string
          granted_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge: string
          granted_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge?: string
          granted_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          is_active: boolean
          permission_type: string
          resource_id: string | null
          resource_type: string | null
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          permission_type: string
          resource_id?: string | null
          resource_type?: string | null
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          permission_type?: string
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_requests: {
        Row: {
          additional_details: Json | null
          admin_notes: string | null
          contact_email: string
          contact_phone: string | null
          created_at: string
          description: string
          id: string
          request_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          additional_details?: Json | null
          admin_notes?: string | null
          contact_email: string
          contact_phone?: string | null
          created_at?: string
          description: string
          id?: string
          request_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          additional_details?: Json | null
          admin_notes?: string | null
          contact_email?: string
          contact_phone?: string | null
          created_at?: string
          description?: string
          id?: string
          request_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          id: string
          is_banned: boolean
          name: string
          photo_url: string | null
          referral_code: string | null
          referred_by: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          welcome_email_sent: string | null
          welcome_email_sent_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string
          id: string
          is_banned?: boolean
          name: string
          photo_url?: string | null
          referral_code?: string | null
          referred_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          welcome_email_sent?: string | null
          welcome_email_sent_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_banned?: boolean
          name?: string
          photo_url?: string | null
          referral_code?: string | null
          referred_by?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          welcome_email_sent?: string | null
          welcome_email_sent_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_configurations: {
        Row: {
          created_at: string
          created_by: string
          events: string[]
          id: string
          is_active: boolean
          name: string
          secret_key: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by: string
          events: string[]
          id?: string
          is_active?: boolean
          name: string
          secret_key?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string
          events?: string[]
          id?: string
          is_active?: boolean
          name?: string
          secret_key?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          attempts: number
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          last_attempt_at: string | null
          payload: Json
          response_body: string | null
          response_status: number | null
          status: string
          webhook_config_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          last_attempt_at?: string | null
          payload: Json
          response_body?: string | null
          response_status?: number | null
          status?: string
          webhook_config_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          last_attempt_at?: string | null
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          status?: string
          webhook_config_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_config_id_fkey"
            columns: ["webhook_config_id"]
            isOneToOne: false
            referencedRelation: "webhook_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      dispatch_webhook: {
        Args: { actor_user_id?: string; event_data: Json; event_type: string }
        Returns: undefined
      }
      generate_referral_code: { Args: never; Returns: string }
      get_user_email: {
        Args: { _user_id: string }
        Returns: string
      }
      get_user_emails: {
        Args: { _user_ids: string[] }
        Returns: { user_id: string; email: string }[]
      }
      get_user_highest_role: {
        Args: { _user_id?: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_role: {
        Args: { user_id?: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_users_with_counts: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          photo_url: string | null
          role: Database["public"]["Enums"]["user_role"]
          is_banned: boolean
          created_at: string
          updated_at: string
          referral_code: string | null
          referred_by: string | null
          email: string | null
          community_count: number
          event_count: number
          badge_count: number
        }[]
      }
      has_permission: {
        Args: {
          _permission_type: string
          _resource_id?: string
          _resource_type?: string
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id?: string }; Returns: boolean }
      is_admin_user: { Args: { _user_id?: string }; Returns: boolean }
      is_community_member: {
        Args: { _community_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "community_manager"
        | "event_organizer"
        | "user"
      flag_status: "open" | "resolved" | "urgent"
      payment_status: "yet_to_pay" | "paid"
      registration_status: "unregistered" | "registered"
      user_role: "user" | "admin"
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
      app_role: [
        "admin",
        "moderator",
        "community_manager",
        "event_organizer",
        "user",
      ],
      flag_status: ["open", "resolved", "urgent"],
      payment_status: ["yet_to_pay", "paid"],
      registration_status: ["unregistered", "registered"],
      user_role: ["user", "admin"],
    },
  },
} as const
