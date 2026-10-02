// apps/stoki_frontend/lib/api.ts

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const API_ENDPOINTS = {
  // Authentication
  register: `${API_BASE_URL}/api/v1/auth/register`,
  login: `${API_BASE_URL}/api/v1/auth/login`,
  me: `${API_BASE_URL}/api/v1/auth/me`,

  // Payments & Checkout
  applyCoupon: `${API_BASE_URL}/api/v1/payments/apply-coupon`,
  createOrder: `${API_BASE_URL}/api/v1/payments/create-order`,
  verifyPayment: `${API_BASE_URL}/api/v1/payments/verify`,
  webhook: `${API_BASE_URL}/api/v1/webhooks/razorpay`,
} as const;
