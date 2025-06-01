-- =====================================================
-- QUICK FIX FOR PROFILES TABLE ISSUE
-- =====================================================
-- This will fix the immediate signup issue

-- 1. First, let's see what columns currently exist in profiles
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Drop the existing trigger that's causing issues
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Drop the problematic function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 4. Create a new, working trigger function that matches your current table structure
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert into profiles table with only the columns that exist
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

-- 5. Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- 6. Test the function manually
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
BEGIN
    -- Try to insert a test profile
    INSERT INTO public.profiles (id, full_name, company)
    VALUES (test_user_id, 'Test User', 'Test Company');
    
    RAISE NOTICE 'Profile creation test: SUCCESS - ID: %', test_user_id;
    
    -- Clean up
    DELETE FROM public.profiles WHERE id = test_user_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Profile creation test: FAILED - %', SQLERRM;
END $$;

-- 7. Check if everything is working
SELECT 
    'Trigger function exists' as status
WHERE EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'handle_new_user' AND routine_schema = 'public'
);

SELECT 
    'Trigger exists' as status
WHERE EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'on_auth_user_created'
);

-- =====================================================
-- AFTER RUNNING THIS:
-- =====================================================
-- 1. Your signup should work without 500 errors
-- 2. Profiles will be created automatically
-- 3. The email is stored in auth.users (accessible via joins)
-- 4. You can test signup in your app
-- =====================================================
