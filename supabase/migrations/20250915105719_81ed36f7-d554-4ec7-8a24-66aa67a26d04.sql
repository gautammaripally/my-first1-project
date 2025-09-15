-- Drop the dangerously permissive SELECT policy
DROP POLICY IF EXISTS "Users can read OTP by email" ON public.otp_verifications;

-- Remove public read access entirely - OTP verification should only be handled by secure system functions
-- The INSERT and UPDATE policies are kept for the authentication flow to work

-- Create a security definer function for OTP verification that doesn't expose data
CREATE OR REPLACE FUNCTION public.verify_otp_code(
  p_email TEXT,
  p_otp_code TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  otp_record RECORD;
  result JSON;
BEGIN
  -- Find and verify the OTP
  SELECT * INTO otp_record
  FROM public.otp_verifications 
  WHERE email = p_email 
    AND otp_code = p_otp_code 
    AND verified = false 
    AND expires_at > now()
  LIMIT 1;

  IF otp_record.id IS NULL THEN
    -- Invalid or expired OTP
    RETURN json_build_object('success', false, 'error', 'Invalid or expired OTP');
  END IF;

  -- Mark OTP as verified
  UPDATE public.otp_verifications 
  SET verified = true 
  WHERE id = otp_record.id;

  -- Return success with user data (excluding sensitive fields)
  RETURN json_build_object(
    'success', true, 
    'user_data', otp_record.user_data
  );
END;
$$;