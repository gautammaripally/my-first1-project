-- Fix security warnings

-- 1. Check if email already exists before creating user
CREATE OR REPLACE FUNCTION public.check_email_exists(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if email exists in auth.users
  RETURN EXISTS (
    SELECT 1 FROM auth.users WHERE email = p_email
  );
END;
$$;

-- 2. Update OTP expiry to exactly 10 minutes and improve security
ALTER TABLE public.otp_verifications 
ALTER COLUMN expires_at SET DEFAULT (now() + interval '10 minutes');

-- 3. Remove email exposure from OTP table by restricting who can read it
-- Only the service role should be able to read OTP records
DROP POLICY IF EXISTS "Only service role can read OTP records" ON public.otp_verifications;

CREATE POLICY "Restrict OTP table access"
ON public.otp_verifications
FOR SELECT
TO service_role
USING (true);

-- 4. Ensure password data is not logged or exposed
-- Update the OTP validation function to be more secure
CREATE OR REPLACE FUNCTION public.validate_and_get_otp(p_email text, p_otp_code text)
RETURNS TABLE(otp_id uuid, user_data jsonb, is_valid boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  otp_record RECORD;
  recent_count INTEGER;
BEGIN
  -- Check for spam/abuse: limit OTP requests per email (max 3 in 5 minutes)
  SELECT COUNT(*) INTO recent_count
  FROM public.otp_verifications 
  WHERE email = p_email 
    AND created_at > (now() - interval '5 minutes')
    AND verified = false;
    
  -- If too many recent OTPs, return invalid
  IF recent_count > 3 THEN
    -- Log the abuse attempt without exposing data
    RAISE WARNING 'Too many OTP attempts for email: %', left(p_email, 3) || '***';
    RETURN QUERY SELECT NULL::uuid, NULL::jsonb, false;
    RETURN;
  END IF;
  
  -- Find valid OTP (must not be expired and not already verified)
  SELECT * INTO otp_record
  FROM public.otp_verifications 
  WHERE email = p_email 
    AND otp_code = p_otp_code
    AND verified = false
    AND expires_at > now()  -- Must not be expired (10 minute window)
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF otp_record.id IS NOT NULL THEN
    -- Remove password from user_data before returning for security
    RETURN QUERY SELECT 
      otp_record.id, 
      jsonb_set(otp_record.user_data, '{password}', '"[REDACTED]"'::jsonb),
      true;
  ELSE
    RETURN QUERY SELECT NULL::uuid, NULL::jsonb, false;
  END IF;
END;
$$;