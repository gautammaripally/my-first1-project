-- Fix RLS policies for otp_verifications to work with service role key
-- The previous policies using auth.jwt() don't work correctly with service role
-- We need to use auth.role() = 'service_role' or bypass RLS for service role

-- Drop the problematic policies
DROP POLICY IF EXISTS "Service role only can delete OTP records" ON public.otp_verifications;
DROP POLICY IF EXISTS "Service role only can read OTP records" ON public.otp_verifications;
DROP POLICY IF EXISTS "Service role only can update OTP records" ON public.otp_verifications;

-- Create new secure policies that properly work with service role key
-- Service role bypasses RLS by default, but we add explicit policies for clarity and security

CREATE POLICY "Service role can read OTP records" 
ON public.otp_verifications 
FOR SELECT 
USING (
  -- Allow service role (used by edge functions)
  current_setting('role') = 'service_role' OR
  -- Or if using service role key, bypass the check
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

CREATE POLICY "Service role can update OTP records" 
ON public.otp_verifications 
FOR UPDATE 
USING (
  -- Allow service role (used by edge functions)
  current_setting('role') = 'service_role' OR
  -- Or if using service role key, bypass the check
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

CREATE POLICY "Service role can delete OTP records" 
ON public.otp_verifications 
FOR DELETE 
USING (
  -- Allow service role (used by edge functions)
  current_setting('role') = 'service_role' OR
  -- Or if using service role key, bypass the check
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- The INSERT policy should remain as is since it validates user input
-- Keep the existing restricted OTP creation policy