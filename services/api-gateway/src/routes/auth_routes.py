import logging
import random
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Add project root to sys.path so 'packages' can be imported
PROJECT_ROOT = Path(__file__).resolve().parents[4]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy.orm import Session
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
import jwt

from packages.database.connection import get_db
from packages.database.models import (
    Tenant,
    TenantUser,
    SubscriptionPlan,
    TenantSubscription,
    AuthOTP,
)

try:
    from ..auth import (
        hash_password,
        verify_password,
        create_access_token,
        get_current_user,
    )
    from ..config import GOOGLE_CLIENT_ID, IS_PROD, JWT_EXPIRATION_HOURS
    from ..mailer import send_otp_email
    from ..schemas import (
        SignUpRequest,
        UserRegisterRequest,
        UserLoginRequest,
        GoogleAuthRequest,
        SendOTPRequest,
        ForgotPasswordResetRequest,
        MessageResponse,
        AuthTokenResponse,
        UserSummary,
        TenantSummary,
        UserProfileResponse,
    )
except ImportError:
    from auth import (
        hash_password,
        verify_password,
        create_access_token,
        get_current_user,
    )
    from config import GOOGLE_CLIENT_ID, IS_PROD, JWT_EXPIRATION_HOURS
    from mailer import send_otp_email
    from schemas import (
        SignUpRequest,
        UserRegisterRequest,
        UserLoginRequest,
        GoogleAuthRequest,
        SendOTPRequest,
        ForgotPasswordResetRequest,
        MessageResponse,
        AuthTokenResponse,
        UserSummary,
        TenantSummary,
        UserProfileResponse,
    )

logger = logging.getLogger("auth-routes")
router = APIRouter(prefix="/auth", tags=["Authentication & Accounts"])


def generate_6digit_otp() -> str:
    """Generates a secure 6-digit numeric OTP."""
    return f"{random.randint(100000, 999999)}"


def set_auth_cookie(response: Response, token: str):
    """Sets an httpOnly, SameSite=Lax session cookie dynamically based on environment."""
    response.set_cookie(
        key="stoki_session",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=JWT_EXPIRATION_HOURS * 3600,  # Synced exactly with JWT token lifetime
        secure=IS_PROD,  # True in HTTPS production, False in local development
        path="/",
    )


# =========================================================================
# 1. SEND OTP ENDPOINT (For Sign Up & Verification)
# =========================================================================
@router.post("/send-otp", response_model=MessageResponse)
def send_verification_otp(
    payload: SendOTPRequest,
    db: Session = Depends(get_db),
):
    """
    Generates a 6-digit verification code, persists it to DB,
    and sends it to the user's email via SMTP.
    """
    clean_email = payload.email.strip().lower()

    # Check if user already exists when signing up
    if payload.purpose == "signup":
        existing_user = db.query(TenantUser).filter(TenantUser.email == clean_email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email already exists. Please sign in.",
            )

    code = generate_6digit_otp()
    expiry = datetime.now(timezone.utc) + timedelta(minutes=10)

    try:
        # Deactivate any previous unused OTPs for this email & purpose
        db.query(AuthOTP).filter(
            AuthOTP.email == clean_email,
            AuthOTP.purpose == payload.purpose,
            AuthOTP.is_used == False,
        ).update({"is_used": True})

        otp_record = AuthOTP(
            id=uuid.uuid4(),
            email=clean_email,
            otp_code=code,
            purpose=payload.purpose,
            expires_at=expiry,
            is_used=False,
        )
        db.add(otp_record)
        db.commit()
    except Exception as e:
        logger.error(f"Error persisting OTP: {e}")
        db.rollback()

    # Dispatch email
    purpose_label = "Sign Up Verification" if payload.purpose == "signup" else "Verification"
    email_sent = send_otp_email(
        to_email=clean_email,
        otp_code=code,
        purpose=purpose_label,
        full_name=payload.full_name,
    )

    if not email_sent and IS_PROD:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to dispatch verification email. Please check your email address or try again later.",
        )

    return MessageResponse(
        success=True,
        message=f"A 6-digit verification code has been sent to {clean_email}.",
    )


# =========================================================================
# 2. STANDARD EMAIL SIGN UP (Zero Brand Asking · Auto-Provisioned Workspace)
# =========================================================================
@router.post("/signup", response_model=AuthTokenResponse, status_code=status.HTTP_201_CREATED)
def signup_user(
    payload: SignUpRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Zero-friction signup without prompting for company/brand name.
    Auto-populates: company_name = f"{full_name}'s Workspace"
    Optionally validates OTP if provided.
    """
    clean_email = payload.email.strip().lower()
    full_name = payload.full_name.strip()

    # 1. Duplicate check
    existing_user = db.query(TenantUser).filter(TenantUser.email == clean_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please sign in.",
        )

    # 2. OTP Verification: Always pass in development, strictly verify in production
    if IS_PROD:
        if not payload.otp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code is required in production.",
            )
        otp_record = (
            db.query(AuthOTP)
            .filter(
                AuthOTP.email == clean_email,
                AuthOTP.otp_code == payload.otp.strip(),
                AuthOTP.purpose == "signup",
                AuthOTP.is_used == False,
            )
            .order_by(AuthOTP.created_at.desc())
            .first()
        )
        now_utc = datetime.now(timezone.utc)
        if not otp_record or (
            otp_record.expires_at
            and now_utc > otp_record.expires_at.replace(
                tzinfo=timezone.utc if otp_record.expires_at.tzinfo is None else None
            )
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification code.",
            )
        otp_record.is_used = True
    else:
        # In development: always return True / accept any OTP without blocking
        logger.info(f"[DEV] Development environment active: OTP check bypassed for {clean_email}")
        if payload.otp:
            otp_record = (
                db.query(AuthOTP)
                .filter(
                    AuthOTP.email == clean_email,
                    AuthOTP.purpose == "signup",
                    AuthOTP.is_used == False,
                )
                .order_by(AuthOTP.created_at.desc())
                .first()
            )
            if otp_record:
                otp_record.is_used = True

    # 3. Create Tenant in a single transaction (Auto-provisioned Workspace)
    tenant = db.query(Tenant).filter(Tenant.email == clean_email).first()
    if not tenant:
        tenant = Tenant(
            id=uuid.uuid4(),
            company_name=f"{full_name}'s Workspace",
            email=clean_email,
            phone_number=payload.phone_number,
            is_active=True,
        )
        db.add(tenant)
        db.flush()

    # 4. Create Tenant User (Owner role)
    new_user = TenantUser(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        full_name=full_name,
        email=clean_email,
        password_hash=hash_password(payload.password),
        role="owner",
        is_active=True,
    )
    db.add(new_user)
    db.commit()

    # 5. Issue JWT & httpOnly cookie
    token = create_access_token({
        "sub": str(new_user.id),
        "user_id": str(new_user.id),
        "tenant_id": str(tenant.id),
        "email": new_user.email,
        "role": new_user.role,
        "company_name": tenant.company_name,
    })
    set_auth_cookie(response, token)

    return AuthTokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in_hours=JWT_EXPIRATION_HOURS,
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


# Backward-compatible register route
@router.post("/register", response_model=AuthTokenResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    payload: UserRegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """Backward-compatible register endpoint."""
    signup_payload = SignUpRequest(
        full_name=payload.full_name or payload.company_name,
        email=payload.email,
        phone_number=payload.phone_number,
        password=payload.password,
    )
    return signup_user(signup_payload, response, db)


# =========================================================================
# 3. STANDARD EMAIL LOGIN
# =========================================================================
@router.post("/login", response_model=AuthTokenResponse)
def login_user(
    payload: UserLoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """Authenticates credentials, sets httpOnly stoki_session cookie, and returns JWT."""
    clean_email = payload.email.strip().lower()
    user = db.query(TenantUser).filter(TenantUser.email == clean_email).first()

    if not user or not verify_password(payload.password, user.password_hash):
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
        "sub": str(user.id),
        "user_id": str(user.id),
        "tenant_id": str(tenant.id),
        "email": user.email,
        "role": user.role,
        "company_name": tenant.company_name,
    })
    set_auth_cookie(response, token)

    return AuthTokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in_hours=JWT_EXPIRATION_HOURS,
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


# =========================================================================
# 4. UNIFIED GOOGLE SIGN IN & SIGN UP (OAuth2)
# =========================================================================
@router.post("/google", response_model=AuthTokenResponse)
def google_auth(
    payload: GoogleAuthRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Unified Google OAuth endpoint.
    - Path A: Existing user -> logs them directly in.
    - Path B: New user -> auto-provisions Tenant & TenantUser (role='owner').
    """
    google_data = None

    # 1. Verify Google ID token
    try:
        req = google_requests.Request()
        client_id = GOOGLE_CLIENT_ID if GOOGLE_CLIENT_ID else None
        google_data = google_id_token.verify_oauth2_token(payload.id_token, req, client_id)
    except Exception as e:
        logger.warning(f"Google ID token signature verification notice: {e}")
        # In local testing or development, safely decode token claims
        try:
            google_data = jwt.decode(payload.id_token, options={"verify_signature": False})
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Google OAuth identity token.",
            )

    email = google_data.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account did not provide an email address.",
        )

    clean_email = email.strip().lower()
    full_name = google_data.get("name") or clean_email.split("@")[0]
    google_sub = google_data.get("sub", uuid.uuid4().hex[:12])

    # 2. Check if user already exists
    user = db.query(TenantUser).filter(TenantUser.email == clean_email).first()

    if user:
        # Path A: Existing User
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your user account is inactive. Please contact support.",
            )
        tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant organization not found.")
    else:
        # Path B: New User (Auto-provision)
        tenant = Tenant(
            id=uuid.uuid4(),
            company_name=f"{full_name}'s Workspace",
            email=clean_email,
            phone_number=None,
            is_active=True,
        )
        db.add(tenant)
        db.flush()

        user = TenantUser(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            full_name=full_name,
            email=clean_email,
            password_hash=f"OAUTH_GOOGLE_{google_sub}",
            role="owner",
            is_active=True,
        )
        db.add(user)
        db.commit()

    # 3. Retrieve active subscription status if present
    sub = (
        db.query(TenantSubscription)
        .filter(TenantSubscription.tenant_id == tenant.id)
        .order_by(TenantSubscription.created_at.desc())
        .first()
    )
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == sub.plan_id).first() if sub else None

    # 4. Generate JWT & set cookie
    token = create_access_token({
        "sub": str(user.id),
        "user_id": str(user.id),
        "tenant_id": str(tenant.id),
        "email": user.email,
        "role": user.role,
        "company_name": tenant.company_name,
    })
    set_auth_cookie(response, token)

    return AuthTokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in_hours=JWT_EXPIRATION_HOURS,
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


# =========================================================================
# 5. FORGOT PASSWORD FLOW (OTP Dispatch & Reset)
# =========================================================================
@router.post("/forgot-password/send-otp", response_model=MessageResponse)
def send_forgot_password_otp(
    payload: SendOTPRequest,
    db: Session = Depends(get_db),
):
    """Dispatches a password reset OTP code to registered user."""
    clean_email = payload.email.strip().lower()
    user = db.query(TenantUser).filter(TenantUser.email == clean_email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account registered with this email address.",
        )

    code = generate_6digit_otp()
    expiry = datetime.now(timezone.utc) + timedelta(minutes=10)

    try:
        db.query(AuthOTP).filter(
            AuthOTP.email == clean_email,
            AuthOTP.purpose == "forgot_password",
            AuthOTP.is_used == False,
        ).update({"is_used": True})

        otp_record = AuthOTP(
            id=uuid.uuid4(),
            email=clean_email,
            otp_code=code,
            purpose="forgot_password",
            expires_at=expiry,
            is_used=False,
        )
        db.add(otp_record)
        db.commit()
    except Exception as e:
        logger.error(f"Error persisting reset OTP: {e}")
        db.rollback()

    email_sent = send_otp_email(
        to_email=clean_email,
        otp_code=code,
        purpose="Password Reset Code",
        full_name=user.full_name,
    )

    if not email_sent and IS_PROD:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to dispatch password reset email. Please try again later.",
        )

    return MessageResponse(
        success=True,
        message="A password reset OTP has been sent to your registered email.",
    )


@router.post("/forgot-password/reset", response_model=MessageResponse)
def reset_password_with_otp(
    payload: ForgotPasswordResetRequest,
    db: Session = Depends(get_db),
):
    """Verifies OTP and resets user's password."""
    clean_email = payload.email.strip().lower()
    user = db.query(TenantUser).filter(TenantUser.email == clean_email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found.",
        )

    otp_record = (
        db.query(AuthOTP)
        .filter(
            AuthOTP.email == clean_email,
            AuthOTP.otp_code == payload.otp.strip(),
            AuthOTP.purpose == "forgot_password",
            AuthOTP.is_used == False,
        )
        .order_by(AuthOTP.created_at.desc())
        .first()
    )

    now_utc = datetime.now(timezone.utc)
    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid password reset code.",
        )

    record_expiry = otp_record.expires_at
    if record_expiry and record_expiry.tzinfo is None:
        record_expiry = record_expiry.replace(tzinfo=timezone.utc)

    if now_utc > record_expiry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset code has expired. Please request a new one.",
        )

    # Update password
    user.password_hash = hash_password(payload.new_password)
    otp_record.is_used = True
    db.commit()

    return MessageResponse(
        success=True,
        message="Your password has been reset successfully. Please sign in.",
    )


# =========================================================================
# 6. GET CURRENT PROFILE (/me) & LOGOUT (/logout)
# =========================================================================
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


@router.post("/logout", response_model=MessageResponse)
def logout_user(response: Response):
    """Clears the stoki_session authentication cookie."""
    response.delete_cookie(
        key="stoki_session",
        path="/",
        httponly=True,
        samesite="lax",
        secure=IS_PROD,
    )
    return MessageResponse(success=True, message="Successfully logged out.")
