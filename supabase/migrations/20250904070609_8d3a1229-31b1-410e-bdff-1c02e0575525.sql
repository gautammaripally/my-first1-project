-- Remove the custom OTP table since we'll use Supabase's native auth
DROP TABLE IF EXISTS public.otp_verifications;

-- Remove the custom functions that were used for OTP
DROP FUNCTION IF EXISTS public.cleanup_expired_otps();
DROP FUNCTION IF EXISTS public.check_email_exists(text);
DROP FUNCTION IF EXISTS public.validate_otp_expiry();
DROP FUNCTION IF EXISTS public.validate_and_get_otp(text, text);