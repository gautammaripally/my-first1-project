-- Remove conflicting policies and create a single comprehensive policy
-- The current setup has both permissive and restrictive policies which may conflict

-- First, let's see what policies exist and remove all SELECT policies
DROP POLICY IF EXISTS "Service role can read OTP records" ON public.otp_verifications;
DROP POLICY IF EXISTS "Deny regular user access to OTP records" ON public.otp_verifications;

-- Create a single comprehensive SELECT policy that only allows service role
CREATE POLICY "Only service role can read OTP records" 
ON public.otp_verifications 
FOR SELECT 
USING (
  -- Only allow when using service role key (used by edge functions)
  current_setting('role') = 'service_role'
);