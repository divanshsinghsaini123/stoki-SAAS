from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, EmailStr, Field


# --- Authentication Schemas ---

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
