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
        # Default starter demo plan if no subscription record exists yet
        return SubscriptionResponse(
            tenant_id=tenant_id or "default-tenant",
            plan_name="Starter (Free Trial)",
            billing_cycle="monthly",
            status="active",
            max_daily_scans=10,
            scans_used_today=2,
            scans_remaining_today=0,
            current_period_end=None,
            is_expired=False,
        )

    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == sub.plan_id).first()
    max_scans = plan.max_daily_scans if plan else 10
    used_today = sub.scans_used_today or 0
    remaining = max(0, max_scans - used_today)
    is_expired = False
    if sub.current_period_end and sub.current_period_end < datetime.utcnow():
        is_expired = True

    return SubscriptionResponse(
        tenant_id=str(sub.tenant_id),
        plan_name=plan.plan_name if plan else "Custom Plan",
        billing_cycle=plan.billing_cycle if plan else "monthly",
        status="expired" if is_expired else sub.status,
        max_daily_scans=max_scans,
        scans_used_today=used_today,
        scans_remaining_today=remaining,
        current_period_end=sub.current_period_end,
        is_expired=is_expired,
    )
