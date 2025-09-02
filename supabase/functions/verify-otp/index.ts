import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyOTPRequest {
  email: string;
  otpCode: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otpCode }: VerifyOTPRequest = await req.json();

    // Initialize Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Use secure function to validate OTP and get user data
    const { data: otpResult, error: otpError } = await supabaseClient
      .rpc("validate_and_get_otp", {
        p_email: email,
        p_otp_code: otpCode
      })
      .single();

    if (otpError || !otpResult || !otpResult.is_valid || !otpResult.otp_id) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired verification code" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Extract user data from OTP result
    const userData = otpResult.user_data as {
      email: string;
      password: string;
      fullName: string;
      role: string;
    };

    // Create the user account using Supabase Auth Admin API
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true, // Auto-confirm email since we verified OTP
      user_metadata: {
        full_name: userData.fullName,
        role: userData.role
      }
    });

    if (authError || !authData.user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Failed to create user account" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark OTP as verified
    const { error: updateError } = await supabaseClient
      .from("otp_verifications")
      .update({ verified: true })
      .eq("id", otpResult.otp_id);

    if (updateError) {
      console.error("Update error:", updateError);
    }

    // Clean up expired OTPs
    await supabaseClient.rpc("cleanup_expired_otps");

    console.log("User account created successfully:", userData.email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Account created successfully! You can now log in with your email.",
        userId: authData.user.id
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in verify-otp function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);