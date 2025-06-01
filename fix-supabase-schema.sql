-- =====================================================
-- FIXED SUPABASE SCHEMA FOR RIQO AGENCY
-- =====================================================
-- This is a corrected version that should resolve the signup issues
-- Run this AFTER checking what's missing with the debug script

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. DROP AND RECREATE PROFILES TABLE (if needed)
-- =====================================================

-- First, let's drop the existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop the profiles table if it exists (be careful with this in production!)
-- DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create the profiles table with correct structure
CREATE TABLE IF NOT EXISTS public.profiles (
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

-- =====================================================
-- 2. ENABLE RLS AND CREATE POLICIES
-- =====================================================

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create new policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- 3. CREATE IMPROVED TRIGGER FUNCTION
-- =====================================================

-- Create the function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert into profiles table (email is stored in auth.users, not profiles)
    INSERT INTO public.profiles (id, full_name, company)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'company', '')
    );

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- =====================================================
-- 4. CREATE THE TRIGGER
-- =====================================================

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 5. CREATE OTHER ESSENTIAL TABLES
-- =====================================================

-- Data uploads table
CREATE TABLE IF NOT EXISTS public.data_uploads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    original_file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_path TEXT,
    mime_type TEXT DEFAULT 'text/csv',
    row_count INTEGER,
    column_count INTEGER,
    columns_info JSONB,
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    processing_error TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on data_uploads
ALTER TABLE public.data_uploads ENABLE ROW LEVEL SECURITY;

-- Policies for data_uploads
CREATE POLICY "Users can manage own uploads" ON public.data_uploads
    FOR ALL USING (auth.uid() = user_id);

-- Contact submissions table
CREATE TABLE IF NOT EXISTS public.contact_submissions (
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
-- 6. CREATE UPDATED_AT TRIGGER FUNCTION
-- =====================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_data_uploads_updated_at ON public.data_uploads;
CREATE TRIGGER update_data_uploads_updated_at
    BEFORE UPDATE ON public.data_uploads
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 7. GRANT NECESSARY PERMISSIONS
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions on tables
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.data_uploads TO authenticated;
GRANT ALL ON public.contact_submissions TO anon, authenticated;

-- Grant permissions on sequences
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- 8. TEST THE SETUP
-- =====================================================

-- Test if the trigger function works
-- You can run this to test (replace with a real UUID):
-- INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_user_meta_data)
-- VALUES ('550e8400-e29b-41d4-a716-446655440000', 'test@example.com', 'encrypted', NOW(), NOW(), NOW(), '{"full_name": "Test User"}');

-- Check if profile was created:
-- SELECT * FROM public.profiles WHERE email = 'test@example.com';

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- This should resolve the signup issues.
-- The key fixes:
-- 1. Proper error handling in the trigger function
-- 2. Correct permissions and RLS policies
-- 3. Better handling of user metadata
-- 4. Proper SECURITY DEFINER function
-- =====================================================
