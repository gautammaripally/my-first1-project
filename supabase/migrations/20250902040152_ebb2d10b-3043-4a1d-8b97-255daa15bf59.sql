-- Enhanced security for otp_verifications table
-- Make INSERT policy more restrictive to prevent abuse

-- Drop and recreate INSERT policy with better restrictions
DROP POLICY IF EXISTS "Allow OTP creation during signup" ON public.otp_verifications;

-- Create more restrictive INSERT policy to prevent spam/abuse
CREATE POLICY "Restricted OTP creation for signup" 
ON public.otp_verifications 
FOR INSERT 
TO anon, authenticated
WITH CHECK (
  -- Only allow if no recent unverified OTP exists for this email
  NOT EXISTS (
    SELECT 1 FROM public.otp_verifications 
    WHERE otp_verifications.email = NEW.email 
    AND otp_verifications.verified = false 
    AND otp_verifications.created_at > (now() - interval '2 minutes')
  )
  -- Ensure email format is valid (basic validation)
  AND NEW.email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  -- Ensure OTP code is 6 digits
  AND length(NEW.otp_code) = 6
  AND NEW.otp_code ~ '^[0-9]{6}$'
);

-- Add additional function for secure OTP lookup (used by edge functions)
CREATE OR REPLACE FUNCTION public.get_valid_otp_record(p_email text, p_otp_code text)
RETURNS TABLE(
  id uuid,
  email text,
  otp_code text,
  user_data jsonb,
  expires_at timestamptz,
  verified boolean,
  created_at timestamptz
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    otp.id,
    otp.email,
    otp.otp_code,
    otp.user_data,
    otp.expires_at,
    otp.verified,
    otp.created_at
  FROM public.otp_verifications otp
  WHERE otp.email = p_email 
    AND otp.otp_code = p_otp_code
    AND otp.verified = false
    AND otp.expires_at > now()
  ORDER BY otp.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;