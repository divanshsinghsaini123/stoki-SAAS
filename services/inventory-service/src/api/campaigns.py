import json
import sys
import uuid
from datetime import datetime
from pathlib import Path

# Add project root to sys.path so 'packages' can be imported
PROJECT_ROOT = Path(__file__).resolve().parents[4]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from packages.database.connection import get_db
from packages.database.models import ScanCampaign, ScanJobRun, Brand, TenantSubscription, SubscriptionPlan
try:
    from ..cache import redis_client
    from ..schemas.responses import (
        CampaignItem,
        CampaignListResponse,
        CreateCampaignRequest,
        LastScanResponse,
        TriggerScanResponse,
    )
except ImportError:
    from cache import redis_client
    from schemas.responses import (
        CampaignItem,
        CampaignListResponse,
        CreateCampaignRequest,
        LastScanResponse,
        TriggerScanResponse,
    )

router = APIRouter(prefix="/campaigns", tags=["Campaigns & Scheduling"])

PRIORITY_QUEUE_MAP = {
    "enterprise": {
        "blinkit": "enterprise_blinkit_tasks",
        "zepto": "enterprise_zepto_tasks",
        "instamart": "enterprise_instamart_tasks",
        "bigbasket": "enterprise_bigbasket_tasks",
    },
    "growth": {
        "blinkit": "growth_blinkit_tasks",
        "zepto": "growth_zepto_tasks",
        "instamart": "growth_instamart_tasks",
        "bigbasket": "growth_bigbasket_tasks",
    },
    "starter": {
        "blinkit": "starter_blinkit_tasks",
        "zepto": "starter_zepto_tasks",
        "instamart": "starter_instamart_tasks",
        "bigbasket": "starter_bigbasket_tasks",
    },
    "free": {
        "blinkit": "free_blinkit_tasks",
        "zepto": "free_zepto_tasks",
        "instamart": "free_instamart_tasks",
        "bigbasket": "free_bigbasket_tasks",
    },
}

def get_priority_tier(scan_queue_priority: int) -> str:
    if scan_queue_priority >= 3:
        return "enterprise"
    elif scan_queue_priority == 2:
        return "growth"
    elif scan_queue_priority == 1:
        return "starter"
    return "free"  # priority 0 = free tier


@router.get("", response_model=CampaignListResponse)
def list_campaigns(
    brand_id: str | None = Query(None, description="Optional brand ID filter"),
    db: Session = Depends(get_db),
):
    """Lists all configured scan campaigns and schedules."""
    query = db.query(ScanCampaign)
    if brand_id:
        query = query.filter(ScanCampaign.brand_id == brand_id)
    
    campaigns = query.order_by(ScanCampaign.created_at.desc()).all()
    items = []
    for c in campaigns:
        items.append(
            CampaignItem(
                id=str(c.id),
                tenant_id=str(c.tenant_id) if c.tenant_id else None,
                brand_id=c.brand_id,
                campaign_name=c.campaign_name,
                platforms=c.platforms or [],
                pincodes=c.pincodes or [],
                scan_type=c.scan_type,
                cron_expression=c.cron_expression,
                is_active=c.is_active,
                created_at=c.created_at,
            )
        )
    return CampaignListResponse(total_campaigns=len(items), campaigns=items)


def validate_tenant_subscription(
    db: Session,
    tenant_id: str | None,
    brand_id: str | None = None,
    consume_scan: bool = False,
    is_new_brand: bool = False,
):
    """
    Validates tenant subscription status, expiry, brand limits, and daily scan quotas.
    Auto-updates status to 'expired' if current_period_end has elapsed.
    """
    if not tenant_id:
        return None, None

    sub = db.query(TenantSubscription).filter(TenantSubscription.tenant_id == tenant_id).first()
    if not sub:
        raise HTTPException(
            status_code=403,
            detail="Active subscription required. No subscription record found for this tenant.",
        )

    now = datetime.utcnow()

    # 1. Expiry Check
    if sub.current_period_end and sub.current_period_end < now:
        if sub.status != "expired":
            sub.status = "expired"
            db.commit()
        raise HTTPException(
            status_code=403,
            detail=f"Subscription expired on {sub.current_period_end.strftime('%Y-%m-%d')}. Please renew your plan to continue.",
        )

    if sub.status != "active":
        raise HTTPException(
            status_code=403,
            detail=f"Subscription is not active (current status: '{sub.status}'). Please check billing.",
        )

    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == sub.plan_id).first()
    if not plan:
        raise HTTPException(status_code=403, detail="Assigned subscription plan was not found.")

    # 2. Brand Count Check
    if is_new_brand and brand_id:
        existing_brands_count = (
            db.query(ScanCampaign.brand_id)
            .filter(ScanCampaign.tenant_id == tenant_id)
            .distinct()
            .count()
        )
        if existing_brands_count >= plan.max_brands:
            raise HTTPException(
                status_code=403,
                detail=f"Your plan allows up to {plan.max_brands} brand(s). You are currently tracking {existing_brands_count} brand(s). Upgrade plan to add more brands.",
            )

    # 3. Midnight Daily Quota Reset
    if not sub.last_quota_reset_at or sub.last_quota_reset_at.date() < now.date():
        sub.scans_used_today = 0
        sub.last_quota_reset_at = now
        db.commit()

    # 4. Quota Consumption
    if consume_scan:
        max_scans = plan.max_daily_scans or 0
        hard_cap = getattr(plan, "max_daily_hard_cap", 0) or 0
        used_today = sub.scans_used_today or 0

        # 4a. Universal Hard Cap Check: Absolute ceiling to protect scrapers and platforms
        if hard_cap > 0 and used_today >= hard_cap:
            raise HTTPException(
                status_code=429,
                detail=f"Daily safety limit reached: Your account has hit the maximum ceiling of {hard_cap} scans today. Further scans are paused until midnight UTC for platform safety.",
            )

        # 4b. Regular Daily Allowance & Extra Credits Pool
        if used_today >= max_scans:
            extra_credits = getattr(sub, "extra_scan_credits", 0) or 0
            if extra_credits > 0:
                sub.extra_scan_credits = extra_credits - 1
                sub.scans_used_today = used_today + 1
                db.commit()
            else:
                raise HTTPException(
                    status_code=429,
                    detail=f"Daily scan limit reached ({used_today}/{max_scans} scans used today) and 0 extra scan credits remaining.",
                )
        else:
            sub.scans_used_today = used_today + 1
            db.commit()

    return sub, plan


@router.post("", response_model=CampaignItem)
def create_campaign(
    payload: CreateCampaignRequest,
    db: Session = Depends(get_db),
):
    """Creates a new scan campaign / schedule with target platforms, pincodes, and cron."""
    # Validate subscription status, expiry, and brand limits
    if payload.tenant_id:
        validate_tenant_subscription(
            db=db,
            tenant_id=payload.tenant_id,
            brand_id=payload.brand_id,
            consume_scan=False,
            is_new_brand=True,
        )

    new_campaign = ScanCampaign(
        id=uuid.uuid4(),
        tenant_id=uuid.UUID(payload.tenant_id) if payload.tenant_id else None,
        brand_id=payload.brand_id,
        campaign_name=payload.campaign_name,
        platforms=payload.platforms,
        pincodes=payload.pincodes,
        scan_type=payload.scan_type,
        cron_expression=payload.cron_expression,
        is_active=True,
    )
    db.add(new_campaign)
    db.commit()
    db.refresh(new_campaign)

    return CampaignItem(
        id=str(new_campaign.id),
        tenant_id=str(new_campaign.tenant_id) if new_campaign.tenant_id else None,
        brand_id=new_campaign.brand_id,
        campaign_name=new_campaign.campaign_name,
        platforms=new_campaign.platforms or [],
        pincodes=new_campaign.pincodes or [],
        scan_type=new_campaign.scan_type,
        cron_expression=new_campaign.cron_expression,
        is_active=new_campaign.is_active,
        created_at=new_campaign.created_at,
    )



@router.get("/{campaign_id}/last-scan", response_model=LastScanResponse)
def get_last_scan(
    campaign_id: str,
    db: Session = Depends(get_db),
):
    """Returns the most recent execution history and status for a specific campaign."""
    campaign = db.query(ScanCampaign).filter(ScanCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    last_run = (
        db.query(ScanJobRun)
        .filter(ScanJobRun.campaign_id == campaign_id)
        .order_by(ScanJobRun.started_at.desc())
        .first()
    )

    if not last_run:
        return LastScanResponse(
            campaign_id=campaign_id,
            campaign_name=campaign.campaign_name,
            last_run_id=None,
            status="never_run",
            started_at=None,
            completed_at=None,
            duration_seconds=None,
            total_items_found=0,
        )

    duration = None
    if last_run.completed_at and last_run.started_at:
        duration = round((last_run.completed_at - last_run.started_at).total_seconds(), 1)

    return LastScanResponse(
        campaign_id=campaign_id,
        campaign_name=campaign.campaign_name,
        last_run_id=str(last_run.id),
        status=last_run.status,
        started_at=last_run.started_at,
        completed_at=last_run.completed_at,
        duration_seconds=duration,
        total_items_found=last_run.total_items_found,
        error_message=last_run.error_message,
    )


@router.post("/{campaign_id}/trigger", response_model=TriggerScanResponse)
def trigger_scan(
    campaign_id: str,
    db: Session = Depends(get_db),
):
    """
    Triggers an immediate manual scan for a campaign:
    1. Checks daily quota limits.
    2. Creates a ScanJobRun record.
    3. Dispatches task tickets to Redis queues for target platforms.
    """
    campaign = db.query(ScanCampaign).filter(ScanCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis queue service unavailable")

    # Validate subscription and consume 1 scan (or extra credit)
    if campaign.tenant_id:
        validate_tenant_subscription(
            db=db,
            tenant_id=str(campaign.tenant_id),
            brand_id=campaign.brand_id,
            consume_scan=True,
            is_new_brand=False,
        )

    # Resolve Brand display name for query
    brand = db.query(Brand).filter(Brand.id == campaign.brand_id).first()
    query_text = brand.brand_name if brand else campaign.brand_id


    # Create job run record
    job_run = ScanJobRun(
        id=uuid.uuid4(),
        campaign_id=campaign.id,
        brand_id=campaign.brand_id,
        tenant_id=campaign.tenant_id,
        status="running",
        started_at=datetime.utcnow(),
    )
    db.add(job_run)
    db.commit()
    db.refresh(job_run)

    # Determine priority tier from subscription plan
    sub, plan = validate_tenant_subscription(
        db=db,
        tenant_id=str(campaign.tenant_id) if campaign.tenant_id else None,
        brand_id=campaign.brand_id,
        consume_scan=False,  # Already consumed above, just fetch plan here
        is_new_brand=False,
    ) if campaign.tenant_id else (None, None)
    priority = getattr(plan, "scan_queue_priority", 1) if plan else 1
    tier = get_priority_tier(priority)
    tier_queues = PRIORITY_QUEUE_MAP.get(tier, PRIORITY_QUEUE_MAP["starter"])

    # Dispatch tasks to platform Redis queues
    platforms = campaign.platforms or ["blinkit", "zepto", "instamart", "bigbasket"]
    pincodes = campaign.pincodes or ["400001", "400009"]
    queued_count = 0
    dispatched_platforms = []

    for platform_name in platforms:
        queue_name = tier_queues.get(platform_name.lower())
        if not queue_name:
            continue

        dispatched_platforms.append(platform_name)
        for pin in pincodes:
            ticket = {
                "ticket_id": str(uuid.uuid4()),
                "brand_id": campaign.brand_id,
                "brand": query_text,
                "query": query_text,
                "platform": platform_name.lower(),
                "pincode": str(pin),
                "campaign_id": str(campaign.id),
                "job_run_id": str(job_run.id),
                "tenant_id": str(campaign.tenant_id) if campaign.tenant_id else None,
                "dispatched_at": datetime.utcnow().isoformat(),
            }
            # Enterprise = lpush (front of queue), others = rpush (back)
            if tier == "enterprise":
                redis_client.lpush(queue_name, json.dumps(ticket))
            else:
                redis_client.rpush(queue_name, json.dumps(ticket))
            queued_count += 1

    return TriggerScanResponse(
        success=True,
        job_run_id=str(job_run.id),
        campaign_id=str(campaign.id),
        brand_id=campaign.brand_id,
        queued_tasks_count=queued_count,
        dispatched_platforms=dispatched_platforms,
        message=f"Dispatched {queued_count} tasks across {len(dispatched_platforms)} platforms.",
    )


@router.get("/dispatcher/status")
def get_campaign_dispatcher_status():
    """Returns the current state and telemetry of the 1-minute Campaign Dispatcher heartbeat."""
    try:
        from ..dispatcher import get_dispatcher_stats, async_scheduler
    except ImportError:
        from dispatcher import get_dispatcher_stats, async_scheduler

    stats = get_dispatcher_stats()
    is_running = bool(async_scheduler and async_scheduler.running)
    return {
        "scheduler_running": is_running,
        "heartbeat_interval": "1 minute (every minute at :00s)",
        "telemetry": stats,
    }


@router.post("/dispatcher/trigger-heartbeat")
def trigger_dispatcher_heartbeat_now():
    """Manually forces a Campaign Dispatcher heartbeat tick immediately."""
    try:
        from ..dispatcher import dispatch_due_campaigns
    except ImportError:
        from dispatcher import dispatch_due_campaigns

    result = dispatch_due_campaigns()
    return {
        "success": True,
        "message": f"Heartbeat tick executed manually: {result.get('dispatched_count', 0)} campaign(s) dispatched.",
        "details": result,
    }

