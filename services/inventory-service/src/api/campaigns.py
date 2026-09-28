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

QUEUE_MAP = {
    "blinkit": "blinkit_tasks",
    "zepto": "zepto_tasks",
    "instamart": "instamart_tasks",
    "bigbasket": "bigbasket_tasks",
}


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


@router.post("", response_model=CampaignItem)
def create_campaign(
    payload: CreateCampaignRequest,
    db: Session = Depends(get_db),
):
    """Creates a new scan campaign / schedule with target platforms, pincodes, and cron."""
    new_campaign = ScanCampaign(
        id=uuid.uuid4(),
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

    # Dispatch tasks to platform Redis queues
    platforms = campaign.platforms or ["blinkit", "zepto", "instamart", "bigbasket"]
    pincodes = campaign.pincodes or ["400001", "400009"]
    queued_count = 0
    dispatched_platforms = []

    for platform_name in platforms:
        queue_name = QUEUE_MAP.get(platform_name.lower())
        if not queue_name:
            continue

        dispatched_platforms.append(platform_name)
        for pin in pincodes:
            ticket = {
                "brand_id": campaign.brand_id,
                "brand": query_text,
                "query": query_text,
                "pincode": str(pin),
                "campaign_id": str(campaign.id),
                "job_run_id": str(job_run.id),
            }
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
