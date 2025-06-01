-- =====================================================
-- RIQO AGENCY - SUPABASE DATABASE SCHEMA
-- =====================================================
-- This file contains all the SQL commands to set up your
-- Supabase database for the Riqo Agency webapp
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. USER PROFILES TABLE
-- =====================================================
-- Extends the built-in auth.users table with additional profile information

CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    company TEXT,
    avatar_url TEXT,
    phone TEXT,
    country TEXT DEFAULT 'Bolivia',
    language_preference TEXT DEFAULT 'es' CHECK (language_preference IN ('en', 'es')),
    subscription_plan TEXT DEFAULT 'starter' CHECK (subscription_plan IN ('starter', 'professional', 'enterprise')),
    subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'cancelled', 'expired')),
    trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '14 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- 2. DATA UPLOADS TABLE
-- =====================================================
-- Stores information about CSV files uploaded by users

CREATE TABLE public.data_uploads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    original_file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_path TEXT, -- Supabase Storage path
    mime_type TEXT DEFAULT 'text/csv',
    row_count INTEGER,
    column_count INTEGER,
    columns_info JSONB, -- Store column names and types
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    processing_error TEXT,
    metadata JSONB, -- Additional file metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.data_uploads ENABLE ROW LEVEL SECURITY;

-- Create policies for data_uploads
CREATE POLICY "Users can view own uploads" ON public.data_uploads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own uploads" ON public.data_uploads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own uploads" ON public.data_uploads
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own uploads" ON public.data_uploads
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 3. DASHBOARDS TABLE
-- =====================================================
-- Stores dashboard configurations and metadata

CREATE TABLE public.dashboards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    dashboard_type TEXT DEFAULT 'custom' CHECK (dashboard_type IN ('custom', 'template', 'auto-generated')),
    config JSONB NOT NULL DEFAULT '{}', -- Dashboard configuration (charts, layout, etc.)
    data_source_ids UUID[] DEFAULT '{}', -- Array of data_upload IDs used in this dashboard
    is_public BOOLEAN DEFAULT FALSE,
    public_share_token TEXT UNIQUE, -- For public sharing
    grafana_dashboard_id TEXT, -- If integrated with Grafana
    grafana_dashboard_url TEXT,
    thumbnail_url TEXT, -- Dashboard preview image
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;

-- Create policies for dashboards
CREATE POLICY "Users can view own dashboards" ON public.dashboards
    FOR SELECT USING (auth.uid() = user_id OR is_public = TRUE);

CREATE POLICY "Users can insert own dashboards" ON public.dashboards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dashboards" ON public.dashboards
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dashboards" ON public.dashboards
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 4. DASHBOARD SHARES TABLE
-- =====================================================
-- Manages dashboard sharing with specific users or teams

CREATE TABLE public.dashboard_shares (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    dashboard_id UUID REFERENCES public.dashboards(id) ON DELETE CASCADE NOT NULL,
    shared_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    shared_with_email TEXT,
    shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    permission_level TEXT DEFAULT 'view' CHECK (permission_level IN ('view', 'edit', 'admin')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.dashboard_shares ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. API KEYS TABLE
-- =====================================================
-- For users who need API access to their data

CREATE TABLE public.api_keys (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    key_name TEXT NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    permissions JSONB DEFAULT '{"read": true, "write": false}',
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Create policies for api_keys
CREATE POLICY "Users can view own API keys" ON public.api_keys
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own API keys" ON public.api_keys
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 6. CONTACT FORM SUBMISSIONS TABLE
-- =====================================================
-- Stores contact form submissions from the website

CREATE TABLE public.contact_submissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT,
    message TEXT NOT NULL,
    language TEXT DEFAULT 'en',
    source_page TEXT DEFAULT 'contact',
    ip_address INET,
    user_agent TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. SUBSCRIPTION EVENTS TABLE
-- =====================================================
-- Track subscription changes and billing events

CREATE TABLE public.subscription_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('trial_started', 'subscription_created', 'subscription_updated', 'subscription_cancelled', 'payment_succeeded', 'payment_failed')),
    old_plan TEXT,
    new_plan TEXT,
    amount DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',
    stripe_event_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 8. USAGE ANALYTICS TABLE
-- =====================================================
-- Track user activity and usage for analytics

CREATE TABLE public.usage_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.usage_analytics ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 9. FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user is created
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to relevant tables
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_data_uploads_updated_at
    BEFORE UPDATE ON public.data_uploads
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dashboards_updated_at
    BEFORE UPDATE ON public.dashboards
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 10. INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for better query performance
CREATE INDEX idx_profiles_user_id ON public.profiles(id);
CREATE INDEX idx_data_uploads_user_id ON public.data_uploads(user_id);
CREATE INDEX idx_data_uploads_status ON public.data_uploads(processing_status);
CREATE INDEX idx_dashboards_user_id ON public.dashboards(user_id);
CREATE INDEX idx_dashboards_public ON public.dashboards(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_contact_submissions_status ON public.contact_submissions(status);
CREATE INDEX idx_contact_submissions_created_at ON public.contact_submissions(created_at);
CREATE INDEX idx_usage_analytics_user_id ON public.usage_analytics(user_id);
CREATE INDEX idx_usage_analytics_created_at ON public.usage_analytics(created_at);

-- =====================================================
-- 11. STORAGE BUCKETS
-- =====================================================
-- Note: These need to be created in the Supabase dashboard or via the API

-- Bucket for uploaded CSV files
-- INSERT INTO storage.buckets (id, name, public) VALUES ('data-uploads', 'data-uploads', false);

-- Bucket for dashboard thumbnails
-- INSERT INTO storage.buckets (id, name, public) VALUES ('dashboard-thumbnails', 'dashboard-thumbnails', true);

-- Bucket for user avatars
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- Your Riqo Agency database is now ready to use.
-- 
-- Next steps:
-- 1. Run this SQL in your Supabase SQL editor
-- 2. Create the storage buckets mentioned above
-- 3. Update your .env.local with your Supabase credentials
-- 4. Test the authentication flow
-- =====================================================
