import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuthRequest {
  type: 'rate-check' | 'validate-input';
  email?: string;
  password?: string;
  fullName?: string;
  ipAddress?: string;
  attemptType?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { type, email, password, fullName, ipAddress, attemptType }: AuthRequest = await req.json();

    // Rate limiting check
    if (type === 'rate-check') {
      if (!ipAddress || !email) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: rateLimitResult, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
        p_ip_address: ipAddress,
        p_email: email,
        p_attempt_type: attemptType || 'login',
        p_max_attempts: attemptType === 'signup' ? 3 : 5,
        p_window_minutes: 15
      });

      if (rateLimitError) {
        console.error('Rate limit error:', rateLimitError);
        return new Response(
          JSON.stringify({ error: 'Rate limiting service temporarily unavailable' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(rateLimitResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Input validation
    if (type === 'validate-input') {
      const errors: string[] = [];

      // Email validation
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Invalid email format');
      }

      // Password validation
      if (password) {
        if (password.length < 8) {
          errors.push('Password must be at least 8 characters long');
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
          errors.push('Password must contain uppercase, lowercase, and numeric characters');
        }
        // Check against common passwords
        const commonPasswords = ['password', '123456', 'password123', 'admin', 'qwerty'];
        if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
          errors.push('Password is too common, please choose a more secure password');
        }
      }

      // Name validation
      if (fullName && (fullName.length < 2 || fullName.length > 50)) {
        errors.push('Full name must be between 2 and 50 characters');
      }

      // Sanitize inputs
      const sanitizedData: any = {};
      if (email) {
        const { data: sanitizedEmail } = await supabase.rpc('sanitize_text_input', { input_text: email });
        sanitizedData.email = sanitizedEmail;
      }
      if (fullName) {
        const { data: sanitizedName } = await supabase.rpc('sanitize_text_input', { input_text: fullName });
        sanitizedData.fullName = sanitizedName;
      }

      return new Response(
        JSON.stringify({
          valid: errors.length === 0,
          errors,
          sanitizedData: errors.length === 0 ? sanitizedData : null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request type' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Secure auth function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});