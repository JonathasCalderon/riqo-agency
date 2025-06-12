-- =====================================================
-- EXTEND EXISTING RIQO AGENCY DATABASE FOR CLIENT MANAGEMENT
-- =====================================================
-- This migration extends the existing database structure to support
-- multi-client CSV upload and processing functionality
-- =====================================================

-- Add client management fields to existing profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'individual' CHECK (client_type IN ('individual', 'business', 'enterprise'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS client_database_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS client_database_anon_key TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS client_database_service_key TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS data_table_name TEXT DEFAULT 'client_data';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS grafana_dashboard_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS grafana_org_id INTEGER;

-- Extend existing data_uploads table with additional processing fields
ALTER TABLE public.data_uploads ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.data_uploads ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.data_uploads ADD COLUMN IF NOT EXISTS normalized_data_path TEXT; -- Path to processed CSV
ALTER TABLE public.data_uploads ADD COLUMN IF NOT EXISTS client_database_synced BOOLEAN DEFAULT FALSE;
ALTER TABLE public.data_uploads ADD COLUMN IF NOT EXISTS sync_error_message TEXT;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_profiles_client_type ON public.profiles(client_type);
CREATE INDEX IF NOT EXISTS idx_data_uploads_processing_status ON public.data_uploads(processing_status);
CREATE INDEX IF NOT EXISTS idx_data_uploads_client_database_synced ON public.data_uploads(client_database_synced);

-- Create a view for easier client data access
CREATE OR REPLACE VIEW public.client_profiles AS
SELECT
  p.id,
  p.full_name as name,
  p.company,
  p.client_type,
  p.client_database_url,
  p.client_database_anon_key,
  p.client_database_service_key,
  p.data_table_name,
  p.grafana_dashboard_url,
  p.grafana_org_id,
  p.subscription_plan,
  p.subscription_status,
  p.created_at,
  p.updated_at
FROM public.profiles p
WHERE p.client_database_url IS NOT NULL;

-- Function to sync data to client database (placeholder for future implementation)
CREATE OR REPLACE FUNCTION public.sync_to_client_database(upload_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  upload_record RECORD;
  profile_record RECORD;
BEGIN
  -- Get upload and profile information
  SELECT du.*, p.client_database_url, p.client_database_service_key, p.data_table_name
  INTO upload_record
  FROM public.data_uploads du
  JOIN public.profiles p ON du.user_id = p.id
  WHERE du.id = upload_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Mark as synced (actual sync logic would be implemented in the application layer)
  UPDATE public.data_uploads
  SET client_database_synced = TRUE,
      updated_at = NOW()
  WHERE id = upload_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's client configuration
CREATE OR REPLACE FUNCTION public.get_user_client_config(user_uuid UUID)
RETURNS TABLE (
  has_client_db BOOLEAN,
  client_db_url TEXT,
  data_table_name TEXT,
  grafana_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (p.client_database_url IS NOT NULL) as has_client_db,
    p.client_database_url as client_db_url,
    COALESCE(p.data_table_name, 'client_data') as data_table_name,
    p.grafana_dashboard_url as grafana_url
  FROM public.profiles p
  WHERE p.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
