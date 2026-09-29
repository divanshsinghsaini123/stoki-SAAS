import logging
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Add project root to sys.path so 'packages' can be imported
PROJECT_ROOT = Path(__file__).resolve().parents[4]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from packages.database.connection import get_db
from packages.database.models import (
    Tenant,
    TenantUser,
    SubscriptionPlan,
    TenantSubscription,
)

try:
    from ..auth import hash_password, verify_password, create_access_token, get_current_user
    from ..schemas import (
        UserRegisterRequest,
        UserLoginRequest,
        AuthTokenResponse,
        UserSummary,
        TenantSummary,
        UserProfileResponse,
    )
except ImportError:
    from auth import hash_password, verify_password, create_access_token, get_current_user
    from schemas import (
        UserRegisterRequest,
        UserLoginRequest,
        AuthTokenResponse,
        UserSummary,
        TenantSummary,
        UserProfileResponse,
    )

logger = logging.getLogger("auth-routes")
router = APIRouter(prefix="/auth", tags=["Authentication & Accounts"])





@router.post("/register", response_model=AuthTokenResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    payload: UserRegisterRequest,
    db: Session = Depends(get_db),
):
    """
    Onboards a new Tenant Organization, creates the Owner user,
    assigns a 14-day Starter subscription, and issues a JWT token.
    """
    # 1. Check if user with this email already exists
    existing_user = db.query(TenantUser).filter(TenantUser.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists. Please log in.",
        )

    # 2. Create or find Tenant Organization
    tenant = db.query(Tenant).filter(Tenant.email == payload.email).first()
    if not tenant:
        tenant = Tenant(
            id=uuid.uuid4(),
            company_name=payload.company_name.strip(),
            email=payload.email,
            phone_number=payload.phone_number,
            is_active=True,
        )
        db.add(tenant)
        db.flush()

    # 3. Create Tenant User (Owner)
    full_name = payload.full_name or payload.company_name
    new_user = TenantUser(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        full_name=full_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role="owner",
        is_active=True,
    )
    db.add(new_user)
    db.commit()

    # Generate JWT token
    token = create_access_token({
        "user_id": str(new_user.id),
        "tenant_id": str(tenant.id),
        "email": new_user.email,
        "role": new_user.role,
        "company_name": tenant.company_name,
    })

    return AuthTokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in_hours=24,
        user=UserSummary(
            id=str(new_user.id),
            email=new_user.email,
            full_name=new_user.full_name,
            role=new_user.role,
        ),
        tenant=TenantSummary(
            id=str(tenant.id),
            company_name=tenant.company_name,
            plan_name="None",
            status="no_subscription",
        ),
    )



@router.post("/login", response_model=AuthTokenResponse)
def login_user(
    payload: UserLoginRequest,
    db: Session = Depends(get_db),
):
    """Authenticates user credentials and issues a signed JWT access token."""
    user = db.query(TenantUser).filter(TenantUser.email == payload.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your user account is inactive. Please contact support.",
        )

    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    if not tenant or not tenant.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your organization account is suspended.",
        )

    sub = (
        db.query(TenantSubscription)
        .filter(TenantSubscription.tenant_id == tenant.id)
        .order_by(TenantSubscription.created_at.desc())
        .first()
    )
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == sub.plan_id).first() if sub else None

    token = create_access_token({
        "user_id": str(user.id),
        "tenant_id": str(tenant.id),
        "email": user.email,
        "role": user.role,
        "company_name": tenant.company_name,
    })

    return AuthTokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in_hours=24,
        user=UserSummary(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            role=user.role,
        ),
        tenant=TenantSummary(
            id=str(tenant.id),
            company_name=tenant.company_name,
            plan_name=plan.plan_name if (plan and sub and sub.status == "active") else "None",
            status=sub.status if sub else "no_subscription",
        ),
    )


@router.get("/me", response_model=UserProfileResponse)
def get_current_profile(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns the authenticated user's organization profile and active subscription state."""
    user_id = current_user.get("user_id")
    tenant_id = current_user.get("tenant_id")

    user = db.query(TenantUser).filter(TenantUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant organization not found.")

    sub = (
        db.query(TenantSubscription)
        .filter(TenantSubscription.tenant_id == tenant.id)
        .order_by(TenantSubscription.created_at.desc())
        .first()
    )
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == sub.plan_id).first() if sub else None

    # Strict: No free plan or fallback assumptions
    is_active_plan = bool(sub and plan and sub.status == "active")

    return UserProfileResponse(
        user_id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        tenant_id=str(tenant.id),
        company_name=tenant.company_name,
        plan_name=plan.plan_name if is_active_plan else "None",
        subscription_status=sub.status if sub else "no_subscription",
        max_daily_scans=plan.max_daily_scans if is_active_plan else 0,
        scans_used_today=sub.scans_used_today if sub else 0,
        extra_scan_credits=sub.extra_scan_credits if sub else 0,
        current_period_end=sub.current_period_end if sub else None,
    )

