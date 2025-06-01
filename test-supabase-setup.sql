-- =====================================================
-- TEST SUPABASE SETUP
-- =====================================================
-- Run these queries to test if your setup is working correctly

-- 1. Test if we can create a user profile manually
DO $$
DECLARE
    test_user_id UUID := '550e8400-e29b-41d4-a716-446655440000';
BEGIN
    -- Try to insert a test profile
    INSERT INTO public.profiles (id, full_name, company)
    VALUES (test_user_id, 'Test User', 'Test Company')
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        company = EXCLUDED.company;

    RAISE NOTICE 'Profile creation test: SUCCESS';

    -- Clean up
    DELETE FROM public.profiles WHERE id = test_user_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Profile creation test: FAILED - %', SQLERRM;
END $$;

-- 2. Test contact form submission
DO $$
BEGIN
    INSERT INTO public.contact_submissions (name, email, company, message, language)
    VALUES ('Test Contact', 'contact@test.com', 'Test Company', 'Test message', 'en');

    RAISE NOTICE 'Contact submission test: SUCCESS';

    -- Clean up
    DELETE FROM public.contact_submissions WHERE email = 'contact@test.com';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Contact submission test: FAILED - %', SQLERRM;
END $$;

-- 3. Check if all required tables exist
SELECT
    CASE
        WHEN COUNT(*) = 3 THEN 'All required tables exist'
        ELSE 'Missing tables: ' || (3 - COUNT(*))::text
    END as table_status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'data_uploads', 'contact_submissions');

-- 4. Check if RLS is enabled
SELECT
    tablename,
    CASE
        WHEN rowsecurity THEN 'RLS Enabled'
        ELSE 'RLS Disabled'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'data_uploads');

-- 5. Check if trigger exists
SELECT
    CASE
        WHEN COUNT(*) > 0 THEN 'Trigger exists'
        ELSE 'Trigger missing'
    END as trigger_status
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 6. Check function exists
SELECT
    CASE
        WHEN COUNT(*) > 0 THEN 'Function exists'
        ELSE 'Function missing'
    END as function_status
FROM information_schema.routines
WHERE routine_name = 'handle_new_user' AND routine_schema = 'public';

-- =====================================================
-- EXPECTED OUTPUT:
-- =====================================================
-- You should see:
-- - "Profile creation test: SUCCESS"
-- - "Contact submission test: SUCCESS"
-- - "All required tables exist"
-- - "RLS Enabled" for both tables
-- - "Trigger exists"
-- - "Function exists"
-- =====================================================
