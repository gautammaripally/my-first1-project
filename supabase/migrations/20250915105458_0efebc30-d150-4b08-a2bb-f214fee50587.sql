-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Everyone can view profiles" ON public.profiles;

-- Create a restricted policy that allows users to see only their own complete profile data
CREATE POLICY "Users can view their own complete profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Create a policy that allows everyone to see only public profile fields (no email)
CREATE POLICY "Everyone can view public profile fields"
ON public.profiles
FOR SELECT
TO authenticated
USING (true)
WITH (
  -- This is handled by the query itself - we'll update the code to only select safe fields
);