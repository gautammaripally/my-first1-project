-- Fix critical security vulnerability in otp_verifications RLS policies
-- The current policies use 'true' expressions which allow any authenticated user access
-- This exposes sensitive email addresses and personal data to potential attackers

-- Drop the existing insecure policies
DROP POLICY IF EXISTS "Service role only can delete OTP records" ON public.otp_verifications;
DROP POLICY IF EXISTS "Service role only can read OTP records" ON public.otp_verifications;
DROP POLICY IF EXISTS "Service role only can update OTP records" ON public.otp_verifications;

-- Create secure policies that properly restrict access to service role only
-- These policies check for the specific service_role instead of allowing all access

CREATE POLICY "Service role only can delete OTP records" 
ON public.otp_verifications 
FOR DELETE 
USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role only can read OTP records" 
ON public.otp_verifications 
FOR SELECT 
USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role only can update OTP records" 
ON public.otp_verifications 
FOR UPDATE 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Ensure RLS is enabled (should already be enabled but making sure)
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;