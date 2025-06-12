// Extended types for existing Riqo Agency database structure
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          company: string | null
          avatar_url: string | null
          phone: string | null
          country: string
          language_preference: string
          subscription_plan: string
          subscription_status: string
          trial_ends_at: string | null
          created_at: string
          updated_at: string
          // Extended fields for client management
          client_type: string
          client_database_url: string | null
          client_database_anon_key: string | null
          client_database_service_key: string | null
          data_table_name: string
          grafana_dashboard_url: string | null
          grafana_org_id: number | null
        }
        Insert: {
          id: string
          full_name?: string | null
          company?: string | null
          avatar_url?: string | null
          phone?: string | null
          country?: string
          language_preference?: string
          subscription_plan?: string
          subscription_status?: string
          trial_ends_at?: string | null
          created_at?: string
          updated_at?: string
          client_type?: string
          client_database_url?: string | null
          client_database_anon_key?: string | null
          client_database_service_key?: string | null
          data_table_name?: string
          grafana_dashboard_url?: string | null
          grafana_org_id?: number | null
        }
        Update: {
          id?: string
          full_name?: string | null
          company?: string | null
          avatar_url?: string | null
          phone?: string | null
          country?: string
          language_preference?: string
          subscription_plan?: string
          subscription_status?: string
          trial_ends_at?: string | null
          created_at?: string
          updated_at?: string
          client_type?: string
          client_database_url?: string | null
          client_database_anon_key?: string | null
          client_database_service_key?: string | null
          data_table_name?: string
          grafana_dashboard_url?: string | null
          grafana_org_id?: number | null
        }
      }
      data_uploads: {
        Row: {
          id: string
          user_id: string
          file_name: string
          original_file_name: string
          file_size: number
          file_path: string | null
          mime_type: string
          row_count: number | null
          column_count: number | null
          columns_info: any | null
          processing_status: string
          processing_error: string | null
          metadata: any | null
          created_at: string
          updated_at: string
          // Extended fields
          processing_started_at: string | null
          processing_completed_at: string | null
          normalized_data_path: string | null
          client_database_synced: boolean
          sync_error_message: string | null
        }
        Insert: {
          id?: string
          user_id: string
          file_name: string
          original_file_name: string
          file_size: number
          file_path?: string | null
          mime_type?: string
          row_count?: number | null
          column_count?: number | null
          columns_info?: any | null
          processing_status?: string
          processing_error?: string | null
          metadata?: any | null
          created_at?: string
          updated_at?: string
          processing_started_at?: string | null
          processing_completed_at?: string | null
          normalized_data_path?: string | null
          client_database_synced?: boolean
          sync_error_message?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          file_name?: string
          original_file_name?: string
          file_size?: number
          file_path?: string | null
          mime_type?: string
          row_count?: number | null
          column_count?: number | null
          columns_info?: any | null
          processing_status?: string
          processing_error?: string | null
          metadata?: any | null
          created_at?: string
          updated_at?: string
          processing_started_at?: string | null
          processing_completed_at?: string | null
          normalized_data_path?: string | null
          client_database_synced?: boolean
          sync_error_message?: string | null
        }
      }
      dashboards: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          dashboard_type: string
          config: any
          data_source_ids: string[]
          is_public: boolean
          public_share_token: string | null
          grafana_dashboard_id: string | null
          grafana_dashboard_url: string | null
          thumbnail_url: string | null
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          dashboard_type?: string
          config?: any
          data_source_ids?: string[]
          is_public?: boolean
          public_share_token?: string | null
          grafana_dashboard_id?: string | null
          grafana_dashboard_url?: string | null
          thumbnail_url?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          dashboard_type?: string
          config?: any
          data_source_ids?: string[]
          is_public?: boolean
          public_share_token?: string | null
          grafana_dashboard_id?: string | null
          grafana_dashboard_url?: string | null
          thumbnail_url?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      client_profiles: {
        Row: {
          id: string
          name: string | null
          company: string | null
          client_type: string
          client_database_url: string | null
          client_database_anon_key: string | null
          client_database_service_key: string | null
          data_table_name: string
          grafana_dashboard_url: string | null
          grafana_org_id: number | null
          subscription_plan: string
          subscription_status: string
          created_at: string
          updated_at: string
        }
      }
    }
    Functions: {
      sync_to_client_database: {
        Args: { upload_id: string }
        Returns: boolean
      }
      get_user_client_config: {
        Args: { user_uuid: string }
        Returns: {
          has_client_db: boolean
          client_db_url: string | null
          data_table_name: string
          grafana_url: string | null
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types for easier usage with existing structure
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type DataUpload = Database['public']['Tables']['data_uploads']['Row']
export type DataUploadInsert = Database['public']['Tables']['data_uploads']['Insert']
export type DataUploadUpdate = Database['public']['Tables']['data_uploads']['Update']

export type Dashboard = Database['public']['Tables']['dashboards']['Row']
export type DashboardInsert = Database['public']['Tables']['dashboards']['Insert']
export type DashboardUpdate = Database['public']['Tables']['dashboards']['Update']

export type ClientProfile = Database['public']['Views']['client_profiles']['Row']

// Extended types for client functionality
export type ClientConfig = {
  id: string
  name: string | null
  company: string | null
  client_database_url: string | null
  client_database_anon_key: string | null
  client_database_service_key: string | null
  data_table_name: string
  grafana_dashboard_url: string | null
  subscription_plan: string
  subscription_status: string
}

export type DataUploadWithProfile = DataUpload & {
  profile: Profile
}

// Processing status enum (matching existing structure)
export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Client type enum
export enum ClientType {
  INDIVIDUAL = 'individual',
  BUSINESS = 'business',
  ENTERPRISE = 'enterprise'
}

// Subscription plan enum
export enum SubscriptionPlan {
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise'
}

// Subscription status enum
export enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}
