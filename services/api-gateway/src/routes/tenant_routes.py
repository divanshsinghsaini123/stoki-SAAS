import logging
import sys
from pathlib import Path
from typing import Any

# Add project root to sys.path so 'packages' can be imported
PROJECT_ROOT = Path(__file__).resolve().parents[4]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from packages.database.connection import get_db
from packages.database.models import Tenant, TenantUser

try:
    from ..auth import get_current_user
    from ..schemas import (
        TenantOnboardingRequest,
        TenantSettingsUpdateRequest,
        TenantResponse,
        MessageResponse,
    )
except ImportError:
    from auth import get_current_user
    from schemas import (
        TenantOnboardingRequest,
        TenantSettingsUpdateRequest,
        TenantResponse,
        MessageResponse,
    )

logger = logging.getLogger("tenant-routes")
router = APIRouter(prefix="/tenants", tags=["Tenant & Workspace Management"])


@router.get("/me", response_model=TenantResponse)
def get_current_tenant(
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns the current user's organization/tenant profile."""
    tenant_id = current_user.get("tenant_id")
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant organization not found.",
        )

    return TenantResponse(
        id=str(tenant.id),
        company_name=tenant.company_name,
        email=tenant.email,
        phone_number=tenant.phone_number,
        logo_url=tenant.logo_url,
        website_url=tenant.website_url,
        industry_category=tenant.industry_category,
        organization_size=tenant.organization_size,
        team_size=tenant.team_size,
        brand_count_estimate=tenant.brand_count_estimate,
        target_platforms=tenant.target_platforms or ["blinkit", "zepto", "instamart"],
        is_onboarded=bool(tenant.is_onboarded),
        settings=tenant.settings or {},
        created_at=tenant.created_at,
    )


@router.patch("/onboarding", response_model=TenantResponse)
def complete_or_update_onboarding(
    payload: TenantOnboardingRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Saves multi-step onboarding wizard responses.
    When mark_completed=True, sets is_onboarded=True so the modal is never shown again.
    """
    tenant_id = current_user.get("tenant_id")
    role = current_user.get("role", "member")
    if role not in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owners or admins can update onboarding details.",
        )

    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant organization not found.",
        )

    if payload.company_name and payload.company_name.strip():
        tenant.company_name = payload.company_name.strip()
    if payload.logo_url is not None:
        tenant.logo_url = payload.logo_url.strip() if payload.logo_url else None
    if payload.website_url is not None:
        tenant.website_url = payload.website_url.strip() if payload.website_url else None
    if payload.industry_category is not None:
        tenant.industry_category = payload.industry_category.strip() if payload.industry_category else None
    if payload.organization_size is not None:
        tenant.organization_size = payload.organization_size.strip() if payload.organization_size else None
    if payload.team_size is not None:
        tenant.team_size = payload.team_size.strip() if payload.team_size else None
    if payload.brand_count_estimate is not None:
        tenant.brand_count_estimate = payload.brand_count_estimate.strip() if payload.brand_count_estimate else None
    if payload.target_platforms is not None:
        tenant.target_platforms = payload.target_platforms

    if payload.mark_completed:
        tenant.is_onboarded = True

    db.commit()
    db.refresh(tenant)

    logger.info(
        f"Tenant {tenant.id} onboarding updated (is_onboarded={tenant.is_onboarded}) by user {current_user.get('user_id')}"
    )

    return TenantResponse(
        id=str(tenant.id),
        company_name=tenant.company_name,
        email=tenant.email,
        phone_number=tenant.phone_number,
        logo_url=tenant.logo_url,
        website_url=tenant.website_url,
        industry_category=tenant.industry_category,
        organization_size=tenant.organization_size,
        team_size=tenant.team_size,
        brand_count_estimate=tenant.brand_count_estimate,
        target_platforms=tenant.target_platforms or ["blinkit", "zepto", "instamart"],
        is_onboarded=bool(tenant.is_onboarded),
        settings=tenant.settings or {},
        created_at=tenant.created_at,
    )


@router.put("/me", response_model=TenantResponse)
def update_tenant_settings(
    payload: TenantSettingsUpdateRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Updates organization profile, scale metrics, and telemetry alert settings."""
    tenant_id = current_user.get("tenant_id")
    role = current_user.get("role", "member")
    if role not in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only workspace owners or admins can modify organization settings.",
        )

    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant organization not found.",
        )

    if payload.company_name and payload.company_name.strip():
        tenant.company_name = payload.company_name.strip()
    if payload.phone_number is not None:
        tenant.phone_number = payload.phone_number.strip() if payload.phone_number else None
    if payload.logo_url is not None:
        tenant.logo_url = payload.logo_url.strip() if payload.logo_url else None
    if payload.website_url is not None:
        tenant.website_url = payload.website_url.strip() if payload.website_url else None
    if payload.industry_category is not None:
        tenant.industry_category = payload.industry_category.strip() if payload.industry_category else None
    if payload.organization_size is not None:
        tenant.organization_size = payload.organization_size.strip() if payload.organization_size else None
    if payload.team_size is not None:
        tenant.team_size = payload.team_size.strip() if payload.team_size else None
    if payload.brand_count_estimate is not None:
        tenant.brand_count_estimate = payload.brand_count_estimate.strip() if payload.brand_count_estimate else None
    if payload.target_platforms is not None:
        tenant.target_platforms = payload.target_platforms

    # Deep merge or update settings
    if payload.settings is not None:
        current_settings = dict(tenant.settings or {})
        current_settings.update(payload.settings)
        tenant.settings = current_settings

    db.commit()
    db.refresh(tenant)

    logger.info(f"Tenant {tenant.id} settings updated by user {current_user.get('user_id')}")

    return TenantResponse(
        id=str(tenant.id),
        company_name=tenant.company_name,
        email=tenant.email,
        phone_number=tenant.phone_number,
        logo_url=tenant.logo_url,
        website_url=tenant.website_url,
        industry_category=tenant.industry_category,
        organization_size=tenant.organization_size,
        team_size=tenant.team_size,
        brand_count_estimate=tenant.brand_count_estimate,
        target_platforms=tenant.target_platforms or ["blinkit", "zepto", "instamart"],
        is_onboarded=bool(tenant.is_onboarded),
        settings=tenant.settings or {},
        created_at=tenant.created_at,
    )
