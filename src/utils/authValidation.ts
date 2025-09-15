import { supabase } from '@/integrations/supabase/client';

// Get client IP address (fallback for rate limiting)
export const getClientIP = async (): Promise<string> => {
  try {
    // Try to get real IP from various headers
    // In production, this should be handled by your server/proxy
    return '127.0.0.1'; // Fallback for development
  } catch {
    return '127.0.0.1';
  }
};

// Rate limiting check
export const checkRateLimit = async (email: string, attemptType: 'login' | 'signup' | 'otp' = 'login') => {
  try {
    const ipAddress = await getClientIP();
    const { data, error } = await supabase.functions.invoke('secure-auth', {
      body: {
        type: 'rate-check',
        email,
        ipAddress,
        attemptType,
      },
    });

    if (error) {
      console.error('Rate limit check failed:', error);
      return { allowed: true }; // Fail open for availability
    }

    return data;
  } catch (error) {
    console.error('Rate limit service error:', error);
    return { allowed: true }; // Fail open for availability
  }
};

// Input validation
export const validateAuthInput = async (data: {
  email?: string;
  password?: string;
  fullName?: string;
}) => {
  try {
    const { data: result, error } = await supabase.functions.invoke('secure-auth', {
      body: {
        type: 'validate-input',
        ...data,
      },
    });

    if (error) {
      console.error('Input validation failed:', error);
      return { valid: false, errors: ['Validation service temporarily unavailable'] };
    }

    return result;
  } catch (error) {
    console.error('Validation service error:', error);
    return { valid: false, errors: ['Validation service temporarily unavailable'] };
  }
};

// Secure error messaging (don't expose internal details)
export const getSecureErrorMessage = (error: any): string => {
  if (!error?.message) return 'An unexpected error occurred. Please try again.';
  
  const message = error.message.toLowerCase();
  
  if (message.includes('invalid login credentials')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  
  if (message.includes('email already registered') || message.includes('already registered')) {
    return 'An account with this email already exists. Please try logging in instead.';
  }
  
  if (message.includes('email not confirmed')) {
    return 'Please check your email and click the confirmation link before signing in.';
  }
  
  if (message.includes('rate limit') || message.includes('too many')) {
    return 'Too many attempts. Please wait a few minutes before trying again.';
  }
  
  if (message.includes('network') || message.includes('fetch')) {
    return 'Network error. Please check your connection and try again.';
  }
  
  // Don't expose internal error details
  return 'An error occurred during authentication. Please try again.';
};

// Password strength indicator
export const getPasswordStrength = (password: string): {
  score: number;
  feedback: string[];
} => {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score += 1;
  else feedback.push('Use at least 8 characters');

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Add lowercase letters');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Add uppercase letters');

  if (/\d/.test(password)) score += 1;
  else feedback.push('Add numbers');

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
  else feedback.push('Add special characters');

  return { score, feedback };
};