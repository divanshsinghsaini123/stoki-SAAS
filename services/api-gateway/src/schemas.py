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
    is_onboarded: bool = False
    logo_url: str | None = None
    website_url: str | None = None
    industry_category: str | None = None
    organization_size: str | None = None
    team_size: str | None = None
    brand_count_estimate: str | None = None
    target_platforms: list[str] = ["blinkit", "zepto", "instamart"]


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_hours: int = 168
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
    # Tenant profile & onboarding fields
    is_onboarded: bool = False
    logo_url: str | None = None
    website_url: str | None = None
    industry_category: str | None = None
    organization_size: str | None = None
    team_size: str | None = None
    brand_count_estimate: str | None = None
    target_platforms: list[str] = ["blinkit", "zepto", "instamart"]


# --- Tenant Onboarding & Management Schemas ---

class TenantOnboardingRequest(BaseModel):
    company_name: str | None = Field(default=None, description="Updated workspace/brand company name")
    logo_url: str | None = Field(default=None, description="Logo or avatar URL")
    website_url: str | None = Field(default=None, description="Company website URL")
    industry_category: str | None = Field(default=None, description="e.g. FMCG / F&B, Beauty & Personal Care")
    organization_size: str | None = Field(default=None, description="Employee headcount tier")
    team_size: str | None = Field(default=None, description="Analytics/eCommerce team size")
    brand_count_estimate: str | None = Field(default=None, description="Estimated number of managed brands")
    target_platforms: list[str] | None = Field(default=None, description="Target Q-Commerce platforms list")
    mark_completed: bool = Field(default=True, description="Sets is_onboarded = True when complete")


class TenantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    company_name: str
    email: str
    phone_number: str | None = None
    logo_url: str | None = None
    website_url: str | None = None
    industry_category: str | None = None
    organization_size: str | None = None
    team_size: str | None = None
    brand_count_estimate: str | None = None
    target_platforms: list[str] = ["blinkit", "zepto", "instamart"]
    is_onboarded: bool = False
    settings: dict[str, Any] = {}
    created_at: datetime | None = None


class TenantSettingsUpdateRequest(BaseModel):
    company_name: str | None = None
    phone_number: str | None = None
    logo_url: str | None = None
    website_url: str | None = None
    industry_category: str | None = None
    organization_size: str | None = None
    team_size: str | None = None
    brand_count_estimate: str | None = None
    target_platforms: list[str] | None = None
    settings: dict[str, Any] | None = None


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


# --- Platform Master Schemas ---

class PlatformResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    display_name: str
    slug: str
    tagline: str | None = None
    logo_url: str | None = None
    brand_color: str | None = None
    badge_bg: str | None = None
    is_active: bool = True
    sort_order: int = 0

