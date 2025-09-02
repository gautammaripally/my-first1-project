-- Fix Function Search Path Mutable warning
-- Update the validate_otp_expiry function to have a proper search path

CREATE OR REPLACE FUNCTION public.validate_otp_expiry()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure OTP expires within reasonable time (max 15 minutes)
  IF NEW.expires_at > (NEW.created_at + interval '15 minutes') THEN
    RAISE EXCEPTION 'OTP expiry time cannot exceed 15 minutes';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;