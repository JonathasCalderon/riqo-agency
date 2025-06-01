-- =====================================================
-- DEBUGGING SUPABASE SCHEMA ISSUES
-- =====================================================
-- Run these queries in your Supabase SQL Editor to debug the signup issue

-- 1. Check if the profiles table exists
SELECT table_name, table_schema
FROM information_schema.tables
WHERE table_name = 'profiles' AND table_schema = 'public';

-- 2. Check if the trigger function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'handle_new_user' AND routine_schema = 'public';

-- 3. Check if the trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 4. Check RLS policies on profiles table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';

-- 5. Check if RLS is enabled on profiles table
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'profiles' AND schemaname = 'public';

-- 6. Test if we can manually insert into profiles (this should work)
-- Replace 'test-uuid' with an actual UUID if needed
-- First, let's check what columns exist in profiles table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test insert (adjust columns based on what exists)
-- INSERT INTO public.profiles (id, full_name)
-- VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Test User');

-- 7. Check auth schema permissions
SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'postgres' AND table_schema = 'auth' AND table_name = 'users';
