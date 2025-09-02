-- Fix critical security vulnerability in otp_verifications table
-- Remove overly permissive RLS policies and restrict access

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can create OTP verification" ON public.otp_verifications;
DROP POLICY IF EXISTS "Anyone can read their own OTP verification" ON public.otp_verifications;
DROP POLICY IF EXISTS "Anyone can update OTP verification" ON public.otp_verifications;

-- Create secure policies that prevent unauthorized access to sensitive data

-- Allow INSERT only for unauthenticated users (needed for signup process)
-- But limit to prevent abuse by adding reasonable constraints
CREATE POLICY "Allow OTP creation during signup" 
ON public.otp_verifications 
FOR INSERT 
TO anon, authenticated
WITH CHECK (
  -- Prevent creating multiple OTPs for same email within short time
  NOT EXISTS (
    SELECT 1 FROM public.otp_verifications 
    WHERE email = NEW.email 
    AND created_at > (now() - interval '1 minute')
    AND verified = false
  )
);

-- Restrict SELECT to only service role (edge functions)
-- No direct client access to prevent data leaks
CREATE POLICY "Service role only can read OTP records" 
ON public.otp_verifications 
FOR SELECT 
TO service_role 
USING (true);

-- Restrict UPDATE to only service role (edge functions)
CREATE POLICY "Service role only can update OTP records" 
ON public.otp_verifications 
FOR UPDATE 
TO service_role 
USING (true);

-- No DELETE policy needed - cleanup function handles expired records

-- Add additional security: create index for performance and add constraint
CREATE INDEX IF NOT EXISTS idx_otp_verifications_email_created ON public.otp_verifications(email, created_at);

-- Add constraint to prevent storing OTPs for too long (additional protection)
CREATE OR REPLACE FUNCTION public.validate_otp_expiry()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure OTP expires within reasonable time (max 15 minutes)
  IF NEW.expires_at > (NEW.created_at + interval '15 minutes') THEN
    RAISE EXCEPTION 'OTP expiry time cannot exceed 15 minutes';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to validate OTP expiry time
DROP TRIGGER IF EXISTS validate_otp_expiry_trigger ON public.otp_verifications;
CREATE TRIGGER validate_otp_expiry_trigger
  BEFORE INSERT OR UPDATE ON public.otp_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_otp_expiry();