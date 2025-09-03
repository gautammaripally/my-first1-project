-- Fix RLS policy to allow users to see all profiles in the people directory
-- Currently users can only see their own profile, but for a people directory they should see everyone

-- Drop the restrictive policy that only allows users to see their own profile
DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;

-- Create a new policy that allows all authenticated users to read all profiles
CREATE POLICY "profiles_select_all_authenticated" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Note: Keep the existing insert/update policies that restrict users to only modify their own profile