from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, EmailStr, Field


# --- Authentication Schemas ---

class SignUpRequest(BaseModel):
    full_name: str = Field(..., min_length=2, description="User's full name")
    email: EmailStr
    phone_number: str | None = None
    password: str = Field(..., min_length=6, description="Password (at least 6 characters)")
    otp: str | None = Field(default=None, description="6-digit verification code")


class SendOTPRequest(BaseModel):
    email: EmailStr
    purpose: str = Field(default="signup", description="'signup' or 'forgot_password'")
    full_name: str | None = None


class ForgotPasswordResetRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=4, max_length=10, description="OTP received on email")
    new_password: str = Field(..., min_length=6, description="New secure password")


class GoogleAuthRequest(BaseModel):
    id_token: str = Field(..., description="Google OAuth2 ID Token from client")


class MessageResponse(BaseModel):
    success: bool = True
    message: str


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password (at least 6 characters)")
    company_name: str = Field(..., min_length=2, description="Tenant / Brand company name")
    full_name: str | None = None
    phone_number: str | None = None


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str



class UserSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str | None = None
    role: str = "owner"


class TenantSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    company_name: str
    plan_name: str = "Starter"
    status: str = "active"


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_hours: int = 24
    user: UserSummary
    tenant: TenantSummary


class UserProfileResponse(BaseModel):
    user_id: str
    email: str
    full_name: str | None = None
    role: str
    tenant_id: str
    company_name: str
    plan_name: str
    subscription_status: str
    max_daily_scans: int
    scans_used_today: int
    extra_scan_credits: int
    current_period_end: datetime | None = None


# --- Payment & Coupon Schemas ---

class ApplyCouponRequest(BaseModel):
    plan_id: str = Field(..., description="ID or code of the subscription plan (e.g. STARTER_30D, PRO_30D, ANNUAL)")
    coupon_code: str = Field(..., min_length=1, description="Promotional coupon code")


class ApplyCouponResponse(BaseModel):
    valid: bool = True
    code: str
    base_price: int
    discount_amount: int
    final_amount: int


class CreateOrderRequest(BaseModel):
    plan_id: str = Field(..., description="Subscription plan identifier")
    coupon_code: str | None = Field(default=None, description="Optional coupon code to apply")


class CreateOrderResponse(BaseModel):
    order_id: str
    amount: int
    currency: str = "INR"
    key_id: str


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class VerifyPaymentResponse(BaseModel):
    success: bool
    redirect_url: str = "/dashboard?payment=success"

