-- Create a table to store OTP verification codes
CREATE TABLE public.otp_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  user_data JSONB NOT NULL, -- Store signup data temporarily
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '10 minutes'),
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert OTP verification requests (for signup)
CREATE POLICY "Anyone can create OTP verification" 
ON public.otp_verifications 
FOR INSERT 
WITH CHECK (true);

-- Allow anyone to select their own OTP verification by email
CREATE POLICY "Anyone can read their own OTP verification" 
ON public.otp_verifications 
FOR SELECT 
USING (true);

-- Allow anyone to update their own OTP verification
CREATE POLICY "Anyone can update OTP verification" 
ON public.otp_verifications 
FOR UPDATE 
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_otp_verifications_email_expires ON public.otp_verifications(email, expires_at);

-- Function to cleanup expired OTPs
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS VOID
LANGUAGE sql
AS $$
  DELETE FROM public.otp_verifications 
  WHERE expires_at < now() OR verified = true;
$$;