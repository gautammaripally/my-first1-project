-- Add explicit deny policy for regular users to completely secure OTP table
-- This ensures no authenticated users can access sensitive email and personal data

-- Add policy to explicitly deny SELECT access for regular authenticated users
CREATE POLICY "Deny regular user access to OTP records" 
ON public.otp_verifications 
FOR SELECT 
USING (false);