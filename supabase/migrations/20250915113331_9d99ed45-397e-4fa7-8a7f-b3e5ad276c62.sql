-- Create rate limiting table for authentication attempts
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL,
  email TEXT,
  attempt_type TEXT NOT NULL, -- 'login', 'signup', 'otp'
  attempts INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  blocked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_ip_email ON public.auth_rate_limits(ip_address, email);
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_window ON public.auth_rate_limits(window_start);

-- Policy: Only system can manage rate limits (no user access)
CREATE POLICY "System only access" ON public.auth_rate_limits
FOR ALL USING (false);

-- Function to check and update rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_ip_address INET,
  p_email TEXT DEFAULT NULL,
  p_attempt_type TEXT DEFAULT 'login',
  p_max_attempts INTEGER DEFAULT 5,
  p_window_minutes INTEGER DEFAULT 15
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_attempts INTEGER := 0;
  window_start TIMESTAMP WITH TIME ZONE := now() - (p_window_minutes || ' minutes')::INTERVAL;
  blocked_until TIMESTAMP WITH TIME ZONE;
  rate_record RECORD;
BEGIN
  -- Clean up old records
  DELETE FROM public.auth_rate_limits 
  WHERE window_start < (now() - '1 hour'::INTERVAL);

  -- Check existing rate limit record
  SELECT * INTO rate_record
  FROM public.auth_rate_limits
  WHERE ip_address = p_ip_address 
    AND (p_email IS NULL OR email = p_email)
    AND attempt_type = p_attempt_type
    AND window_start > window_start
  ORDER BY window_start DESC
  LIMIT 1;

  -- Check if currently blocked
  IF rate_record.blocked_until IS NOT NULL AND rate_record.blocked_until > now() THEN
    RETURN json_build_object(
      'allowed', false,
      'error', 'Too many attempts. Please try again later.',
      'retry_after', EXTRACT(EPOCH FROM (rate_record.blocked_until - now()))
    );
  END IF;

  -- Count recent attempts
  SELECT COALESCE(SUM(attempts), 0) INTO current_attempts
  FROM public.auth_rate_limits
  WHERE ip_address = p_ip_address
    AND (p_email IS NULL OR email = p_email) 
    AND attempt_type = p_attempt_type
    AND window_start > window_start;

  -- If exceeded limit, block
  IF current_attempts >= p_max_attempts THEN
    -- Update or insert blocking record
    INSERT INTO public.auth_rate_limits (ip_address, email, attempt_type, attempts, blocked_until)
    VALUES (p_ip_address, p_email, p_attempt_type, current_attempts + 1, now() + '30 minutes'::INTERVAL)
    ON CONFLICT (ip_address, COALESCE(email, ''), attempt_type) 
    DO UPDATE SET 
      attempts = auth_rate_limits.attempts + 1,
      blocked_until = now() + '30 minutes'::INTERVAL;

    RETURN json_build_object(
      'allowed', false,
      'error', 'Too many attempts. Account temporarily blocked.',
      'retry_after', 1800
    );
  END IF;

  -- Record this attempt
  INSERT INTO public.auth_rate_limits (ip_address, email, attempt_type, attempts)
  VALUES (p_ip_address, p_email, p_attempt_type, 1)
  ON CONFLICT (ip_address, COALESCE(email, ''), attempt_type)
  DO UPDATE SET attempts = auth_rate_limits.attempts + 1;

  RETURN json_build_object('allowed', true, 'remaining_attempts', p_max_attempts - current_attempts - 1);
END;
$$;

-- Function to sanitize user inputs
CREATE OR REPLACE FUNCTION public.sanitize_text_input(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove potentially dangerous characters and limit length
  RETURN LEFT(
    REGEXP_REPLACE(
      REGEXP_REPLACE(input_text, '[<>"\'';&()|*?~^${}[\]\\]', '', 'g'),
      '\s+', ' ', 'g'
    ),
    255
  );
END;
$$;