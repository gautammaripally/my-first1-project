-- Fix function search path security issue
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.otp_verifications 
  WHERE expires_at < now() OR verified = true;
$$;