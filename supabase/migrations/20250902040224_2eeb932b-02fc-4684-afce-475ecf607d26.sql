-- Enhanced security for otp_verifications table
-- Create more restrictive policies without complex NEW references

-- Drop and recreate INSERT policy with basic validation
DROP POLICY IF EXISTS "Allow OTP creation during signup" ON public.otp_verifications;

-- Create restrictive INSERT policy for OTP creation
CREATE POLICY "Restricted OTP creation for signup" 
ON public.otp_verifications 
FOR INSERT 
TO anon, authenticated
WITH CHECK (
  -- Basic validation that OTP code is 6 digits
  length(otp_code) = 6
  AND otp_code ~ '^[0-9]{6}$'
  -- Ensure email has basic format
  AND email ~ '^[^@]+@[^@]+\.[^@]+$'
);

-- Create secure function for OTP validation (used by edge functions only)
CREATE OR REPLACE FUNCTION public.validate_and_get_otp(p_email text, p_otp_code text)
RETURNS TABLE(
  otp_id uuid,
  user_data jsonb,
  is_valid boolean
) 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  otp_record RECORD;
  recent_count INTEGER;
BEGIN
  -- Check for spam/abuse: limit OTP requests per email
  SELECT COUNT(*) INTO recent_count
  FROM public.otp_verifications 
  WHERE email = p_email 
    AND created_at > (now() - interval '5 minutes')
    AND verified = false;
    
  -- If too many recent OTPs, return invalid
  IF recent_count > 3 THEN
    RETURN QUERY SELECT NULL::uuid, NULL::jsonb, false;
    RETURN;
  END IF;
  
  -- Find valid OTP
  SELECT * INTO otp_record
  FROM public.otp_verifications 
  WHERE email = p_email 
    AND otp_code = p_otp_code
    AND verified = false
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF otp_record.id IS NOT NULL THEN
    RETURN QUERY SELECT otp_record.id, otp_record.user_data, true;
  ELSE
    RETURN QUERY SELECT NULL::uuid, NULL::jsonb, false;
  END IF;
END;
$$ LANGUAGE plpgsql;