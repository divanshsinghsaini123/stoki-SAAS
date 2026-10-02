"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  RotateCw,
  X,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_ENDPOINTS } from "@/lib/api";

interface AuthCardProps {
  initialMode?: "signin" | "signup";
}

// Hyperlocal telemetry live mock chips that drift in the background
const TELEMETRY_CARDS = [
  {
    code: "110001",
    area: "Connaught Place, DL",
    platform: "Blinkit",
    status: "98.4% In-Stock",
    color: "emerald",
    top: "12%",
    left: "8%",
  },
  {
    code: "400053",
    area: "Andheri West, MH",
    platform: "Zepto",
    status: "Price Drop Alert",
    color: "amber",
    top: "22%",
    right: "7%",
  },
  {
    code: "560034",
    area: "Koramangala, KA",
    platform: "Instamart",
    status: "Pod #4 Active",
    color: "emerald",
    bottom: "20%",
    left: "10%",
  },
  {
    code: "122002",
    area: "Cyber City, HR",
    platform: "BigBasket",
    status: "Shadow Stock Alert",
    color: "rose",
    bottom: "16%",
    right: "9%",
  },
];

export function AuthCard({ initialMode = "signin" }: AuthCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/dashboard";

  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");

  // OTP Verification Modal / Step
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpResendCountdown, setOtpResendCountdown] = useState(0);

  // Forgot Password Flow
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotOtpSent, setForgotOtpSent] = useState(false);

  // Resend OTP countdown effect
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
    setSuccessMsg("Authentication verified. Redirecting...");
    setTimeout(() => {
      router.push(redirectTarget);
    }, 900);
  };

  // Google OAuth Success Handler
  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setErrorMsg("Google Sign-In did not return valid credentials.");
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
      setErrorMsg(err.message || "Something went wrong during Google sign in.");
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
      // Dispatch 6-digit OTP to user's email
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

      setShowOtpStep(true);
      setOtpResendCountdown(60);
      setSuccessMsg(`Verification code sent to ${email}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initiate sign up.");
    } finally {
      setIsLoading(false);
    }
  };

  // Complete Sign Up with OTP
  const handleVerifyOtpAndSignUp = async () => {
    if (!otpCode.trim()) {
      setErrorMsg("Please enter the 6-digit verification code.");
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

      setShowOtpStep(false);
      handleAuthSuccess(data.access_token, data.user);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to verify code.");
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
      setErrorMsg("Please enter your registered email address.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(API_ENDPOINTS.forgotPasswordSendOtp, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Unable to send password reset code.");
      }
      setForgotOtpSent(true);
      setSuccessMsg("Reset code sent to your registered email.");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send reset code.");
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password: Reset with OTP
  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp.trim() || !forgotNewPassword) {
      setErrorMsg("Please enter the OTP and your new password.");
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

      setSuccessMsg("Password reset successfully! Please sign in.");
      setShowForgotPassword(false);
      setForgotOtpSent(false);
      setMode("signin");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reset password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* ============================================================
          1. CREATIVE ARCHITECTURAL BACKDROP
          Subtle isometric coordinate grid + radar pulse + floating chips
          ============================================================ */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Radial Dark Vignette */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#09090B]/60 to-[#09090B] dark:block hidden" />

        {/* Isometric Grid Lines */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: `linear-gradient(to right, #10B981 1px, transparent 1px), linear-gradient(to bottom, #10B981 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />

        {/* Radar Pulse Concentric Circles (Centered behind card) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border border-emerald-500/10 animate-pulse pointer-events-none" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full border border-emerald-500/15 pointer-events-none" />

        {/* Ambient Emerald & Amber Backlight Blur */}
        <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 rounded-full bg-amber-500/5 blur-[100px] pointer-events-none" />

        {/* Floating Hyperlocal Telemetry Cards */}
        {TELEMETRY_CARDS.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 0.75, y: [0, -8, 0] }}
            transition={{
              duration: 4.5 + idx * 0.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              top: (item as any).top,
              left: (item as any).left,
              right: (item as any).right,
              bottom: (item as any).bottom,
            }}
            className="hidden lg:flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/70 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800/80 backdrop-blur-md shadow-lg text-[11px] font-mono tracking-tight"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-bold text-zinc-900 dark:text-zinc-100">{item.code}</span>
            <span className="text-zinc-400">•</span>
            <span className="text-zinc-600 dark:text-zinc-400">{item.platform}</span>
            <span className="text-zinc-400">•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{item.status}</span>
          </motion.div>
        ))}
      </div>

      {/* ============================================================
          2. GLASSMORPHIC PRECISION AUTH CARD
          ============================================================ */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.45, bounce: 0.04 }}
        className={cn(
          "relative w-full max-w-md rounded-3xl z-10 overflow-hidden shadow-2xl p-7 sm:p-9",
          "bg-white/95 dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800/90 backdrop-blur-2xl",
          "text-zinc-900 dark:text-zinc-50"
        )}
      >
        {/* Subtle Brand Emerald Gradient Border at the Top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-500" />

        {/* Brand Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2.5 group mb-3">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl overflow-hidden group-hover:scale-105 transition-transform shrink-0">
              <Image
                src="/stoki_v2.png"
                alt="Stoki Logo"
                width={36}
                height={36}
                priority
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-zinc-950 dark:text-zinc-50">
              Stoki
            </span>
          </Link>
          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight">
            {showForgotPassword
              ? "Reset Your Password"
              : mode === "signin"
              ? "Sign in to Intelligence"
              : "Launch Your Workspace"}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {showForgotPassword
              ? "Enter your email to receive an instant verification code"
              : mode === "signin"
              ? "Real-time stockout radar across 500+ dark stores"
              : "No credit card required · Zero brand setup friction"}
          </p>
        </div>

        {/* Tab Switcher (Sign In vs Create Account) */}
        {!showForgotPassword && (
          <div className="relative flex rounded-xl p-1 bg-slate-100 dark:bg-zinc-950/70 border border-slate-200 dark:border-zinc-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={cn(
                "relative flex-1 py-2 text-xs font-semibold rounded-lg transition-colors z-10",
                mode === "signin"
                  ? "text-zinc-950 dark:text-white"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              Sign In
              {mode === "signin" && (
                <motion.div
                  layoutId="auth-tab-active"
                  className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-lg shadow-sm -z-10"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={cn(
                "relative flex-1 py-2 text-xs font-semibold rounded-lg transition-colors z-10",
                mode === "signup"
                  ? "text-zinc-950 dark:text-white"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              Create Account
              {mode === "signup" && (
                <motion.div
                  layoutId="auth-tab-active"
                  className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-lg shadow-sm -z-10"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          </div>
        )}

        {/* Error / Success Notifications */}
        <AnimatePresence mode="wait">
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </motion.div>
          )}
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============================================================
            FORGOT PASSWORD FLOW
            ============================================================ */}
        {showForgotPassword ? (
          <form onSubmit={forgotOtpSent ? handleForgotReset : handleForgotSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Registered Email
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-4 h-4 text-zinc-400" />
                <input
                  type="email"
                  required
                  disabled={forgotOtpSent}
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
              </div>
            </div>

            {forgotOtpSent && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    6-Digit Security Code
                  </label>
                  <div className="relative flex items-center">
                    <KeyRound className="absolute left-3.5 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value)}
                      placeholder="123456"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs font-mono tracking-widest bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    New Secure Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 w-4 h-4 text-zinc-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 disabled:opacity-60 transition-all"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : forgotOtpSent ? (
                "Update Password & Sign In"
              ) : (
                "Send Verification Code"
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(false);
                setForgotOtpSent(false);
                setErrorMsg(null);
              }}
              className="w-full text-center text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 pt-1"
            >
              Back to Sign In
            </button>
          </form>
        ) : (
          <>
            {/* Primary CTA: Continue with Google */}
            <div className="mb-5 flex flex-col items-center justify-center">
              <div className="w-full flex justify-center [&>div]:w-full">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setErrorMsg("Google Sign-In was cancelled or failed.")}
                  theme="outline"
                  size="large"
                  text={mode === "signin" ? "signin_with" : "signup_with"}
                  shape="pill"
                  width="100%"
                />
              </div>
            </div>

            {/* Clean Monospace Divider */}
            <div className="relative flex items-center justify-center my-5">
              <div className="w-full border-t border-slate-200 dark:border-zinc-800" />
              <span className="absolute px-3 bg-white dark:bg-zinc-900 text-[10px] font-mono tracking-widest text-zinc-400 uppercase">
                OR CONTINUE WITH EMAIL
              </span>
            </div>

            {/* Standard Email Auth Form */}
            <form onSubmit={mode === "signup" ? handleInitiateSignUp : handleLogin} className="space-y-3.5">
              {mode === "signup" && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Full Name
                  </label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3.5 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Work Email
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 w-4 h-4 text-zinc-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="founder@brand.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                </div>
              </div>

              {mode === "signup" && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Mobile Number <span className="text-zinc-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3 flex items-center gap-1 text-xs font-mono text-zinc-500 dark:text-zinc-400 select-none">
                      <Phone className="w-3.5 h-3.5 text-zinc-400" />
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="98765 43210"
                      className="w-full pl-16 pr-3.5 py-2.5 rounded-xl text-xs font-mono bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Password
                  </label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(true);
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
                  <Lock className="absolute left-3.5 w-4 h-4 text-zinc-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  "w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-200 shadow-md",
                  "bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200",
                  "disabled:opacity-60 active:scale-[0.99] mt-2"
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Please wait...</span>
                  </>
                ) : (
                  <>
                    <span>{mode === "signin" ? "Sign In" : "Verify Email & Register"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {/* Security Badge Ribbon */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-center gap-4 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            256-Bit TLS Auth
          </span>
          <span>•</span>
          <span>Zero-Password OAuth</span>
          <span>•</span>
          <span>Instant Workspace</span>
        </div>
      </motion.div>

      {/* ============================================================
          EMAIL OTP VERIFICATION MODAL (For Sign Up)
          ============================================================ */}
      <AnimatePresence>
        {showOtpStep && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOtpStep(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 shadow-2xl z-10 text-center"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-500/15 text-emerald-500 mx-auto flex items-center justify-center mb-3">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-50">
                Verify Your Email
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-5">
                We sent a 6-digit code to <strong className="text-zinc-900 dark:text-zinc-100">{email}</strong>
              </p>

              <div className="mb-4">
                <input
                  type="text"
                  maxLength={6}
                  autoFocus
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="w-full py-3 text-center font-mono text-2xl font-bold tracking-[8px] rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="button"
                onClick={handleVerifyOtpAndSignUp}
                disabled={isLoading || otpCode.length < 6}
                className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all mb-3"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Launch Workspace"}
              </button>

              <div className="flex items-center justify-between text-xs text-zinc-500">
                <button
                  type="button"
                  onClick={() => setShowOtpStep(false)}
                  className="hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={otpResendCountdown > 0 || isLoading}
                  onClick={(e) => handleInitiateSignUp(e as any)}
                  className="text-emerald-600 dark:text-emerald-400 disabled:opacity-50 font-medium"
                >
                  {otpResendCountdown > 0 ? `Resend code in ${otpResendCountdown}s` : "Resend Code"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
