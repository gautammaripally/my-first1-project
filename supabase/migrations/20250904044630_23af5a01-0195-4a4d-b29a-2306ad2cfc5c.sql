-- First, drop the overly permissive policy that allows all authenticated users to read all profiles
DROP POLICY IF EXISTS "profiles_select_all_authenticated" ON public.profiles;

-- Create a more restrictive policy: users can only read their own profile data
CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- Create a separate policy for the people directory that only exposes non-sensitive fields
-- This will be handled at the application level by selecting only specific fields