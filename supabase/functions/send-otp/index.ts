import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Check if Resend API key is configured
const resendApiKey = Deno.env.get("RESEND_API_KEY");
if (!resendApiKey) {
  console.error("RESEND_API_KEY environment variable is not set");
}

const resend = new Resend(resendApiKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendOTPRequest {
  email: string;
  password: string;
  fullName: string;
  role: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if Resend API key is available
    if (!resendApiKey) {
      console.error("Resend API key not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured. Please contact support." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { email, password, fullName, role }: SendOTPRequest = await req.json();
    
    console.log("Processing OTP request for email:", email);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if email already exists in auth.users
    const { data: emailExists, error: checkError } = await supabaseClient
      .rpc("check_email_exists", { p_email: email });

    if (checkError) {
      console.error("Error checking email existence:", checkError);
      return new Response(
        JSON.stringify({ error: "Failed to verify email availability" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (emailExists) {
      console.log("Email already exists:", email);
      return new Response(
        JSON.stringify({ 
          error: "An account with this email already exists. Please try logging in instead.",
          errorType: "email_exists" 
        }),
        { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in database with user signup data
    const { error: dbError } = await supabaseClient
      .from("otp_verifications")
      .insert({
        email: email,
        otp_code: otpCode,
      user_data: {
        email,
        password,
        fullName,
        role
      }
      });

    if (dbError) {
      console.error("Database error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to store OTP" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send email with OTP
    console.log("Attempting to send OTP email to:", email);
    const emailResponse = await resend.emails.send({
      from: "Campus Notes Hub <onboarding@resend.dev>",
      to: [email],
      subject: "Your Campus Notes Hub Verification Code",
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px; font-family: Arial, sans-serif;">
          <div style="text-align: center; margin-bottom: 40px;">
            <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #1e40af, #3b82f6); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
              <svg width="40" height="40" fill="white" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <h1 style="color: #1e40af; margin: 0; font-size: 28px;">Welcome to Campus Notes Hub!</h1>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 12px; margin-bottom: 30px; text-align: center;">
            <h2 style="color: #334155; margin: 0 0 15px 0; font-size: 20px;">Your Verification Code</h2>
            <div style="background: white; padding: 20px; border-radius: 8px; border: 2px dashed #e2e8f0; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #1e40af; letter-spacing: 4px;">${otpCode}</span>
            </div>
            <p style="color: #64748b; margin: 0; font-size: 14px;">This code will expire in 10 minutes</p>
          </div>
          
          <div style="margin-bottom: 30px;">
            <h3 style="color: #334155; font-size: 18px;">Hi ${fullName}!</h3>
            <p style="color: #64748b; line-height: 1.6;">
              You're almost ready to join Campus Notes Hub as a <strong>${role}</strong>. 
              Enter the verification code above to complete your registration and start 
              sharing knowledge with your academic community.
            </p>
          </div>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>Security Notice:</strong> If you didn't request this code, please ignore this email. 
              Never share your verification code with anyone.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              Campus Notes Hub - Connect, Share, Learn Together
            </p>
          </div>
        </div>
      `,
    });

    if (emailResponse.error) {
      console.error("Email error details:", JSON.stringify(emailResponse.error));
      
      // Provide specific error messages based on the error type
      let errorMessage = "Failed to send verification email";
      let errorType = "email_send_failed";
      
      if (emailResponse.error.message?.includes("API key")) {
        errorMessage = "Email service not properly configured. Please contact support.";
        errorType = "service_config_error";
      } else if (emailResponse.error.message?.includes("domain") || 
                 emailResponse.error.message?.includes("testing emails")) {
        errorMessage = "Email service is in testing mode. Please contact support to enable full email delivery.";
        errorType = "domain_verification_required";
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage, errorType }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("OTP sent successfully to:", email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Verification code sent to your email" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-otp function:", error);
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