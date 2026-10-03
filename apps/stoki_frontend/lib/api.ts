// apps/stoki_frontend/lib/api.ts

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const API_ENDPOINTS = {
  // Authentication
  signup: `${API_BASE_URL}/api/v1/auth/signup`,
  register: `${API_BASE_URL}/api/v1/auth/register`,
  login: `${API_BASE_URL}/api/v1/auth/login`,
  googleAuth: `${API_BASE_URL}/api/v1/auth/google`,
  sendOtp: `${API_BASE_URL}/api/v1/auth/send-otp`,
  forgotPasswordSendOtp: `${API_BASE_URL}/api/v1/auth/forgot-password/send-otp`,
  forgotPasswordReset: `${API_BASE_URL}/api/v1/auth/forgot-password/reset`,
  me: `${API_BASE_URL}/api/v1/auth/me`,
  logout: `${API_BASE_URL}/api/v1/auth/logout`,

  // Tenants & Organization
  tenantsMe: `${API_BASE_URL}/api/v1/tenants/me`,
  tenantsOnboarding: `${API_BASE_URL}/api/v1/tenants/onboarding`,

  // Platforms Master Registry
  platforms: `${API_BASE_URL}/api/v1/platforms`,

  // Payments & Checkout
  applyCoupon: `${API_BASE_URL}/api/v1/payments/apply-coupon`,
  createOrder: `${API_BASE_URL}/api/v1/payments/create-order`,
  verifyPayment: `${API_BASE_URL}/api/v1/payments/verify`,
  webhook: `${API_BASE_URL}/api/v1/webhooks/razorpay`,
} as const;

export interface PlatformItem {
  id: string;
  display_name: string;
  slug: string;
  tagline?: string | null;
  logo_url?: string | null;
  brand_color?: string | null;
  badge_bg?: string | null;
  is_active: boolean;
  sort_order: number;
}

export function getAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("stoki_auth_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

