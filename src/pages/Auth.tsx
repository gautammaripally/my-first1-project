import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useAuth } from '@/components/auth/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { GraduationCap, ArrowLeft } from 'lucide-react';

export default function Auth() {
  const { user, signIn } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('student');

  // OTP verification state
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpEmail, setOtpEmail] = useState('');

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(loginEmail, loginPassword);
      
      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "Successfully logged in to Campus Notes Hub.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Call edge function to send OTP
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: {
          email: signupEmail,
          password: signupPassword,
          fullName,
          role
        }
      });

      if (error) {
        toast({
          title: "Registration Failed",
          description: "Failed to send verification code. Please try again.",
          variant: "destructive",
        });
      } else {
        setOtpEmail(signupEmail);
        setShowOTPInput(true);
        toast({
          title: "Verification Code Sent!",
          description: "Please check your email for the 6-digit verification code.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpValue.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Call edge function to verify OTP
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: {
          email: otpEmail,
          otpCode: otpValue
        }
      });

      if (error) {
        toast({
          title: "Verification Failed",
          description: "Invalid or expired verification code.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Account Created Successfully!",
          description: "You can now log in with your email and password.",
        });
        // Reset form and show login
        setShowOTPInput(false);
        setOtpValue('');
        setSignupEmail('');
        setSignupPassword('');
        setFullName('');
        setRole('student');
        // Switch to login tab
        const loginTab = document.querySelector('[value="login"]') as HTMLElement;
        loginTab?.click();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSignup = () => {
    setShowOTPInput(false);
    setOtpValue('');
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Campus Notes Hub</h1>
          <p className="text-muted-foreground">Connect, share, and learn together</p>
        </div>

        <Card className="shadow-campus">
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="student@university.edu"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing In..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
                {!showOTPInput ? (
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="student@university.edu"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a strong password"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select value={role} onValueChange={setRole}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="teacher">Teacher</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Sending Code..." : "Send Verification Code"}
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center space-y-2">
                      <h3 className="text-lg font-semibold text-campus-navy">Verify Your Email</h3>
                      <p className="text-sm text-muted-foreground">
                        We've sent a 6-digit verification code to<br />
                        <span className="font-medium text-campus-blue">{otpEmail}</span>
                      </p>
                    </div>
                    
                    <form onSubmit={handleOTPVerification} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="otp-input">Verification Code</Label>
                        <div className="flex justify-center">
                          <InputOTP
                            value={otpValue}
                            onChange={setOtpValue}
                            maxLength={6}
                            id="otp-input"
                          >
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <Button type="submit" className="w-full" disabled={loading || otpValue.length !== 6}>
                          {loading ? "Verifying..." : "Verify & Create Account"}
                        </Button>
                        
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="w-full" 
                          onClick={handleBackToSignup}
                          disabled={loading}
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Back to Sign Up
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}