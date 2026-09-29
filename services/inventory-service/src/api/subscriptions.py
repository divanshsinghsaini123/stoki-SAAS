import sys
from datetime import datetime
from pathlib import Path

# Add project root to sys.path so 'packages' can be imported
PROJECT_ROOT = Path(__file__).resolve().parents[4]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from packages.database.connection import get_db
from packages.database.models import TenantSubscription, SubscriptionPlan, Tenant
try:
    from ..schemas.responses import SubscriptionResponse
except ImportError:
    from schemas.responses import SubscriptionResponse

router = APIRouter(prefix="/subscriptions", tags=["Billing & Subscriptions"])


@router.get("/current", response_model=SubscriptionResponse)
def get_current_subscription(
    tenant_id: str | None = Query(None, description="Optional tenant ID"),
    db: Session = Depends(get_db),
):
    """
    Returns active subscription plan details, daily scan limits, quota usage,
    and period expiration date.
    """
    query = db.query(TenantSubscription)
    if tenant_id:
        query = query.filter(TenantSubscription.tenant_id == tenant_id)
    
    sub = query.order_by(TenantSubscription.created_at.desc()).first()

    if not sub:
        # No subscription purchased yet
        return SubscriptionResponse(
            tenant_id=tenant_id or "unknown",
            plan_name="None",
            billing_cycle="none",
            status="no_subscription",
            max_daily_scans=0,
            max_brands=0,
            scans_used_today=0,
            scans_remaining_today=0,
            included_extra_scans=0,
            extra_scan_credits=0,
            current_period_end=None,
            is_expired=False,
        )

    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == sub.plan_id).first()
    max_scans = plan.max_daily_scans if plan else 0
    max_brands = plan.max_brands if plan else 0
    now = datetime.utcnow()


    # 1. Midnight quota reset check
    if not sub.last_quota_reset_at or sub.last_quota_reset_at.date() < now.date():
        sub.scans_used_today = 0
        sub.last_quota_reset_at = now
        db.commit()

    used_today = sub.scans_used_today or 0
    remaining = max(0, max_scans - used_today)

    # 2. Expiry check & DB sync
    is_expired = False
    if sub.current_period_end and sub.current_period_end < now:
        is_expired = True
        if sub.status != "expired":
            sub.status = "expired"
            db.commit()

    return SubscriptionResponse(
        tenant_id=str(sub.tenant_id),
        plan_name=plan.plan_name if plan else "Custom Plan",
        billing_cycle=plan.billing_cycle if plan else "monthly",
        status="expired" if is_expired else sub.status,
        max_daily_scans=max_scans,
        max_brands=max_brands,
        scans_used_today=used_today,
        scans_remaining_today=remaining,
        included_extra_scans=plan.included_extra_scans if plan else 0,
        extra_scan_credits=getattr(sub, "extra_scan_credits", 0) or 0,
        current_period_end=sub.current_period_end,
        is_expired=is_expired,
    )


