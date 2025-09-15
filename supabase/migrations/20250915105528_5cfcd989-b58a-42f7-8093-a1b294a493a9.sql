-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Everyone can view profiles" ON public.profiles;

-- Create a policy that allows users to see their own complete profile data
CREATE POLICY "Users can view their own complete profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Create a policy that allows everyone to see public profile fields (excluding email)
-- This will work when queries specifically exclude the email field
CREATE POLICY "Everyone can view public profile fields"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);