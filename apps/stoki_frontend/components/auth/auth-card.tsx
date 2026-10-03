"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { GoogleOAuthProvider, GoogleLogin, CredentialResponse } from "@react-oauth/google";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  ArrowLeft,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { API_ENDPOINTS } from "@/lib/api";

interface AuthCardProps {
  initialMode?: "signin" | "signup";
}

type AuthView = "signin" | "signup" | "otp" | "forgot";

export function AuthCard({ initialMode = "signin" }: AuthCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/dashboard";

  const [view, setView] = useState<AuthView>(initialMode);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");

  // OTP Verification
  const [otpCode, setOtpCode] = useState("");
  const [otpResendCountdown, setOtpResendCountdown] = useState(0);

  // Forgot Password
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotOtpSent, setForgotOtpSent] = useState(false);

  // Resend OTP countdown
  useEffect(() => {
    if (otpResendCountdown > 0) {
      const timer = setTimeout(() => setOtpResendCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpResendCountdown]);

  const handleAuthSuccess = (token: string, user: any) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("stoki_auth_token", token);
      localStorage.setItem("stoki_user_email", user?.email || email);
      localStorage.setItem("stoki_user_name", user?.full_name || fullName);
    }
    setSuccessMsg("Verified! Redirecting...");
    setTimeout(() => {
      router.push(redirectTarget);
    }, 800);
  };

  // Google OAuth Success Handler
  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setErrorMsg("Google Sign-In did not return credentials.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(API_ENDPOINTS.googleAuth, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: credentialResponse.credential }),
      });

      const data = await res.json();
      if (!res.ok || !data.access_token) {
        throw new Error(data.detail || "Google authentication failed.");
      }

      handleAuthSuccess(data.access_token, data.user);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to sign in with Google.");
    } finally {
      setIsLoading(false);
    }
  };

  // Request Sign Up OTP
  const handleInitiateSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(API_ENDPOINTS.sendOtp, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          purpose: "signup",
          full_name: fullName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to send verification code.");
      }

      setView("otp");
      setOtpResendCountdown(60);
      setSuccessMsg(`Code sent to ${email}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initiate sign up.");
    } finally {
      setIsLoading(false);
    }
  };

  // Complete Sign Up with OTP
  const handleVerifyOtpAndSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.length < 6) {
      setErrorMsg("Please enter the 6-digit code.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(API_ENDPOINTS.signup, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone_number: phoneNumber ? `+91 ${phoneNumber.trim()}` : null,
          password: password,
          otp: otpCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.access_token) {
        throw new Error(data.detail || "Sign up failed.");
      }

      handleAuthSuccess(data.access_token, data.user);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  // Standard Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg("Please enter your email and password.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(API_ENDPOINTS.login, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.access_token) {
        throw new Error(data.detail || "Invalid email or password.");
      }

      handleAuthSuccess(data.access_token, data.user);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password: Send OTP
  const handleForgotSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setErrorMsg("Please enter your registered email.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(API_ENDPOINTS.forgotPasswordSendOtp, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          purpose: "forgot_password",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to dispatch reset code.");
      }

      setForgotOtpSent(true);
      setSuccessMsg("Reset code sent to your email.");
    } catch (err: any) {
      setErrorMsg(err.message || "Email address not recognized.");
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password: Reset
  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp.trim() || !forgotNewPassword) {
      setErrorMsg("Please fill in the OTP and new password.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(API_ENDPOINTS.forgotPasswordReset, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          otp: forgotOtp.trim(),
          new_password: forgotNewPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Password reset failed.");
      }

      setSuccessMsg("Password reset successfully. Please sign in.");
      setView("signin");
      setForgotOtpSent(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reset password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Lightweight, zero-CPU background grid */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
            backgroundSize: "36px 36px",
          }}
        />
        <div className="absolute inset-0 bg-radial from-emerald-500/[0.03] via-transparent to-transparent" />
      </div>

      {/* Clean, Precision Auth Card (No top colored line, clean 1px border) */}
      <div
        className={cn(
          "relative w-full max-w-[410px] rounded-2xl p-6 sm:p-7 z-10 transition-all",
          "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800",
          "shadow-xl text-zinc-900 dark:text-zinc-50"
        )}
      >
        {/* Brand Header */}
        <div className="text-center mb-5">
          <Link href="/" className="inline-flex items-center gap-2 group mb-2.5">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg overflow-hidden shrink-0">
              <Image
                src="/stoki_v2.png"
                alt="Stoki Logo"
                width={32}
                height={32}
                priority
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-zinc-950 dark:text-zinc-50">
              Stoki
            </span>
          </Link>

          <h1 className="text-base sm:text-lg font-bold tracking-tight">
            {view === "otp"
              ? "Verify Your Email"
              : view === "forgot"
              ? "Reset Password"
              : view === "signin"
              ? "Sign in to Intelligence"
              : "Launch Your Workspace"}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {view === "otp"
              ? `Enter the 6-digit code sent to ${email}`
              : view === "forgot"
              ? "Enter your email to receive a password reset code"
              : view === "signin"
              ? "Real-time stockout radar across 500+ dark stores"
              : "Zero friction · No credit card required"}
          </p>
        </div>

        {/* Tab Switcher (Visible only in signin / signup) */}
        {(view === "signin" || view === "signup") && (
          <div className="relative flex rounded-lg p-1 bg-slate-100 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 mb-5">
            <button
              type="button"
              onClick={() => {
                setView("signin");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={cn(
                "flex-1 py-1.5 text-xs font-semibold rounded-md transition-all",
                view === "signin"
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
              )}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setView("signup");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={cn(
                "flex-1 py-1.5 text-xs font-semibold rounded-md transition-all",
                view === "signup"
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
              )}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Alerts */}
        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* -------------------------------------------------------------
            VIEW: EMAIL OTP VERIFICATION (Clean In-Card Step, No Modal)
            ------------------------------------------------------------- */}
        {view === "otp" && (
          <form onSubmit={handleVerifyOtpAndSignUp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 text-center">
                6-Digit Security Code
              </label>
              <input
                type="text"
                maxLength={6}
                autoFocus
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-full py-2.5 text-center font-mono text-xl font-bold tracking-[8px] rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || otpCode.length < 6}
              className="w-full py-2.5 rounded-lg font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                "Verify & Launch Workspace"
              )}
            </button>

            <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
              <button
                type="button"
                onClick={() => setView("signup")}
                className="hover:underline flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                Edit details
              </button>
              <button
                type="button"
                disabled={otpResendCountdown > 0 || isLoading}
                onClick={handleInitiateSignUp}
                className="text-emerald-600 dark:text-emerald-400 disabled:opacity-50 font-medium"
              >
                {otpResendCountdown > 0 ? `Resend in ${otpResendCountdown}s` : "Resend Code"}
              </button>
            </div>
          </form>
        )}

        {/* -------------------------------------------------------------
            VIEW: FORGOT PASSWORD
            ------------------------------------------------------------- */}
        {view === "forgot" && (
          <form onSubmit={forgotOtpSent ? handleForgotReset : handleForgotSendOtp} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Registered Email
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3 w-3.5 h-3.5 text-zinc-400" />
                <input
                  type="email"
                  required
                  disabled={forgotOtpSent}
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3 py-2 rounded-lg text-xs bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {forgotOtpSent && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    6-Digit Code
                  </label>
                  <div className="relative flex items-center">
                    <KeyRound className="absolute left-3 w-3.5 h-3.5 text-zinc-400" />
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value)}
                      placeholder="123456"
                      className="w-full pl-9 pr-3 py-2 rounded-lg text-xs font-mono tracking-widest bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    New Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3 w-3.5 h-3.5 text-zinc-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 rounded-lg text-xs bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg font-bold text-xs bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
              ) : forgotOtpSent ? (
                "Update Password"
              ) : (
                "Send Reset Code"
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setView("signin");
                setForgotOtpSent(false);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="w-full text-center text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 pt-1"
            >
              ← Back to Sign In
            </button>
          </form>
        )}

        {/* -------------------------------------------------------------
            VIEW: SIGN IN / CREATE ACCOUNT FORM
            ------------------------------------------------------------- */}
        {(view === "signin" || view === "signup") && (
          <>
            {/* Primary 1-Click CTA: Continue with Google */}
            <div className="mb-4 flex justify-center">
              <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}>
                <div
                  className="w-full flex justify-center [&>div]:!overflow-hidden [&>div]:!rounded-full [&_iframe]:!rounded-full [&_iframe]:!overflow-hidden"
                  style={{ colorScheme: mounted && resolvedTheme === "dark" ? "dark" : "light" }}
                >
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setErrorMsg("Google Sign-In was cancelled or failed.")}
                    theme={mounted && resolvedTheme === "dark" ? "filled_black" : "outline"}
                    size="large"
                    text={view === "signin" ? "signin_with" : "signup_with"}
                    shape="pill"
                    width="360"
                  />
                </div>
              </GoogleOAuthProvider>
            </div>

            {/* Clean Monospace Divider */}
            <div className="relative flex items-center justify-center my-4">
              <div className="w-full border-t border-slate-200 dark:border-zinc-800" />
              <span className="absolute px-2.5 bg-white dark:bg-zinc-900 text-[10px] font-mono tracking-wider text-zinc-400 uppercase">
                OR CONTINUE WITH EMAIL
              </span>
            </div>

            <form onSubmit={view === "signup" ? handleInitiateSignUp : handleLogin} className="space-y-3">
              {view === "signup" && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Full Name
                  </label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3 w-3.5 h-3.5 text-zinc-400" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className="w-full pl-9 pr-3 py-2 rounded-lg text-xs bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Work Email
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3 w-3.5 h-3.5 text-zinc-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="founder@brand.com"
                    className="w-full pl-9 pr-3 py-2 rounded-lg text-xs bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {view === "signup" && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Mobile Number <span className="text-zinc-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-2.5 flex items-center gap-1 text-xs font-mono text-zinc-500 select-none">
                      <Phone className="w-3.5 h-3.5 text-zinc-400" />
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="98765 43210"
                      className="w-full pl-14 pr-3 py-2 rounded-lg text-xs font-mono bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Password
                  </label>
                  {view === "signin" && (
                    <button
                      type="button"
                      onClick={() => {
                        setView("forgot");
                        setForgotEmail(email);
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3 w-3.5 h-3.5 text-zinc-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-9 py-2 rounded-lg text-xs bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  "w-full py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm",
                  "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white",
                  "disabled:opacity-60 active:scale-[0.99] mt-3"
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Please wait...</span>
                  </>
                ) : (
                  <>
                    <span>{view === "signin" ? "Sign In" : "Continue with Email"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
