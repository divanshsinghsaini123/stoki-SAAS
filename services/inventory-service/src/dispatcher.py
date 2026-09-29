import json
import logging
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Load .env
from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / ".env")

import redis
from croniter import croniter
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.schedulers.blocking import BlockingScheduler
from sqlalchemy import and_, or_, func
from sqlalchemy.orm import Session

from packages.database.connection import SessionLocal
from packages.database.models import (
    ScanCampaign,
    ScanJobRun,
    Brand,
    TenantSubscription,
    SubscriptionPlan,
)
from packages.database.repository import create_tenant_notification

try:
    from .config import REDIS_URL
except ImportError:
    from config import REDIS_URL

logger = logging.getLogger("campaign-dispatcher")

QUEUE_MAP = {
    "blinkit": "blinkit_tasks",
    "zepto": "zepto_tasks",
    "instamart": "instamart_tasks",
    "bigbasket": "bigbasket_tasks",
}

# Redis client for task fan-out and distributed locking
try:
    redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=3)
    redis_client.ping()
    logger.info("Dispatcher Redis connection established.")
except Exception as e:
    logger.warning(f"Dispatcher Redis connection failed: {e}. Queue pushes will fail until restored.")
    redis_client = None

# Global scheduler instance for FastAPI lifespan
async_scheduler: AsyncIOScheduler | None = None
_dispatcher_stats = {
    "last_run_at": None,
    "total_dispatches": 0,
    "last_campaigns_dispatched": [],
    "last_error": None,
}


def get_dispatcher_stats() -> dict[str, Any]:
    """Returns current telemetry for the campaign dispatcher heartbeat."""
    return _dispatcher_stats


def dispatch_due_campaigns() -> dict[str, Any]:
    """
    The 1-Minute Heartbeat Function:
    Step A: Query Active Campaigns (is_active=True, scan_type='scheduled')
            Validates tenant subscription is active, unexpired, and within quota.
    Step B: Time Evaluation using croniter against current UTC minute.
            Distributed lock prevents duplicate dispatch.
    Step C: Create the ScanJobRun record in PostgreSQL.
    Step D: Fan-out to Redis queues (blinkit_tasks, zepto_tasks, instamart_tasks, bigbasket_tasks).
    """
    now = datetime.now(timezone.utc)
    current_minute = now.replace(second=0, microsecond=0)
    minute_key_str = current_minute.strftime("%Y%m%d%H%M")
    
    logger.info(f"--- [Campaign Dispatcher Heartbeat] Tick at {current_minute.isoformat()} ---")
    _dispatcher_stats["last_run_at"] = now.isoformat()

    dispatched_summary = []
    session: Session = SessionLocal()

    try:
        # Step A: Query Active Campaigns
        # Join with Brand; outer join TenantSubscription and SubscriptionPlan for quota validation
        active_campaigns = (
            session.query(ScanCampaign, Brand.brand_name)
            .join(Brand, ScanCampaign.brand_id == Brand.id)
            .filter(
                ScanCampaign.is_active.is_(True),
                ScanCampaign.scan_type == "scheduled",
                ScanCampaign.cron_expression.isnot(None),
            )
            .all()
        )

        logger.info(f"Found {len(active_campaigns)} active scheduled campaign(s) to evaluate.")

        for campaign, brand_name in active_campaigns:
            campaign_id_str = str(campaign.id)

            # Step A.1: Tenant Subscription & Quota Validation (if campaign has a tenant)
            sub = None
            if campaign.tenant_id:
                sub = (
                    session.query(TenantSubscription)
                    .filter(TenantSubscription.tenant_id == campaign.tenant_id)
                    .first()
                )

                if not sub or sub.status != "active":
                    logger.warning(
                        f"Skipping campaign '{campaign.campaign_name}' ({campaign_id_str}): "
                        f"Tenant subscription is not active (status={sub.status if sub else 'None'})."
                    )
                    continue

                if sub.current_period_end and sub.current_period_end < now:
                    logger.warning(
                        f"Skipping campaign '{campaign.campaign_name}' ({campaign_id_str}): "
                        f"Tenant subscription expired on {sub.current_period_end.isoformat()}."
                    )
                    continue

                # Check Plan daily limit
                plan = (
                    session.query(SubscriptionPlan)
                    .filter(SubscriptionPlan.id == sub.plan_id)
                    .first()
                )
                max_scans = plan.max_daily_scans if plan else 100
                if (sub.scans_used_today or 0) >= max_scans:
                    logger.warning(
                        f"Skipping campaign '{campaign.campaign_name}' ({campaign_id_str}): "
                        f"Tenant daily scan limit exceeded ({sub.scans_used_today}/{max_scans})."
                    )
                    # Trigger notification once
                    create_tenant_notification(
                        tenant_id=str(campaign.tenant_id),
                        n_type="system",
                        title="Daily Scan Limit Exceeded",
                        message=f"Campaign '{campaign.campaign_name}' was skipped because your plan's daily scan limit ({max_scans}) was reached.",
                        metadata={"campaign_id": campaign_id_str, "max_scans": max_scans},
                    )
                    continue

            # Step B: Time Evaluation using croniter
            cron_expr = (campaign.cron_expression or "").strip()
            if not croniter.is_valid(cron_expr):
                logger.warning(
                    f"Campaign '{campaign.campaign_name}' ({campaign_id_str}) has invalid cron expression: '{cron_expr}'."
                )
                continue

            # Check if this campaign matches the current minute
            if not croniter.match(cron_expr, current_minute):
                continue

            # Distributed lock in Redis to ensure exactly-once execution per minute across worker replicas
            if redis_client:
                dedup_key = f"stoki:dispatcher:lock:{campaign_id_str}:{minute_key_str}"
                acquired = redis_client.set(dedup_key, "1", ex=120, nx=True)
                if not acquired:
                    logger.info(
                        f"Campaign '{campaign.campaign_name}' already dispatched for minute {minute_key_str}. Skipping duplicate."
                    )
                    continue

            logger.info(f"-> Campaign '{campaign.campaign_name}' is DUE (cron: '{cron_expr}'). Dispatching...")

            # Step C: Create the Job Run Record
            platforms = campaign.platforms or ["blinkit", "zepto", "instamart", "bigbasket"]
            pincodes = campaign.pincodes or ["400001", "400009"]
            total_tasks_count = len(platforms) * len(pincodes)

            job_run = ScanJobRun(
                id=uuid.uuid4(),
                campaign_id=campaign.id,
                brand_id=campaign.brand_id,
                tenant_id=campaign.tenant_id,
                status="running",
                started_at=now,
                total_items_found=0,
                execution_metadata={
                    "triggered_by": "scheduler_heartbeat",
                    "cron_expression": cron_expr,
                    "target_platforms": platforms,
                    "target_pincodes": pincodes,
                    "total_tasks_dispatched": total_tasks_count,
                    "dispatched_at": now.isoformat(),
                },
            )
            session.add(job_run)

            # Increment scans used today
            if sub:
                sub.scans_used_today = (sub.scans_used_today or 0) + 1

            session.commit()
            session.refresh(job_run)
            job_run_id_str = str(job_run.id)

            # Step D: Fan-out to Redis Queues
            queued_count = 0
            dispatched_platforms = []

            query_text = brand_name or campaign.brand_id

            if redis_client:
                for platform_name in platforms:
                    queue_name = QUEUE_MAP.get(platform_name.lower())
                    if not queue_name:
                        logger.warning(f"Unknown platform '{platform_name}', skipping queue push.")
                        continue

                    if platform_name not in dispatched_platforms:
                        dispatched_platforms.append(platform_name)

                    for pin in pincodes:
                        ticket = {
                            "ticket_id": str(uuid.uuid4()),
                            "brand_id": campaign.brand_id,
                            "brand": query_text,
                            "query": query_text,
                            "pincode": str(pin),
                            "platform": platform_name.lower(),
                            "campaign_id": campaign_id_str,
                            "job_run_id": job_run_id_str,
                            "tenant_id": str(campaign.tenant_id) if campaign.tenant_id else None,
                            "dispatched_at": now.isoformat(),
                        }
                        redis_client.rpush(queue_name, json.dumps(ticket))
                        queued_count += 1
            else:
                logger.error(f"Cannot dispatch tasks for job {job_run_id_str}: Redis client is not connected!")

            # Log and record stats
            logger.info(
                f"[SUCCESS] Dispatched campaign '{campaign.campaign_name}' (Run ID: {job_run_id_str}) "
                f"-> {queued_count} tasks pushed across {dispatched_platforms}."
            )

            # In-app notification for the tenant
            if campaign.tenant_id:
                create_tenant_notification(
                    tenant_id=str(campaign.tenant_id),
                    n_type="scan",
                    title=f"Scheduled Scan Started: {campaign.campaign_name}",
                    message=f"Scan job #{job_run_id_str[:8]} initiated across {len(dispatched_platforms)} platform(s) with {queued_count} pincode tasks.",
                    metadata={
                        "campaign_id": campaign_id_str,
                        "job_run_id": job_run_id_str,
                        "platforms": dispatched_platforms,
                        "queued_count": queued_count,
                    },
                )

            dispatched_summary.append({
                "campaign_id": campaign_id_str,
                "campaign_name": campaign.campaign_name,
                "job_run_id": job_run_id_str,
                "tasks_queued": queued_count,
                "platforms": dispatched_platforms,
            })

        _dispatcher_stats["total_dispatches"] += len(dispatched_summary)
        _dispatcher_stats["last_campaigns_dispatched"] = dispatched_summary
        _dispatcher_stats["last_error"] = None

    except Exception as e:
        logger.error(f"Error during campaign dispatch heartbeat: {e}", exc_info=True)
        _dispatcher_stats["last_error"] = str(e)
    finally:
        session.close()

    return {
        "tick_time": current_minute.isoformat(),
        "dispatched_count": len(dispatched_summary),
        "campaigns": dispatched_summary,
    }


# Async function wrapper for AsyncIOScheduler (FastAPI Lifespan)
async def async_dispatch_heartbeat():
    dispatch_due_campaigns()


def start_async_scheduler() -> AsyncIOScheduler:
    """Initializes and starts the AsyncIOScheduler running every minute."""
    global async_scheduler
    if async_scheduler and async_scheduler.running:
        logger.info("AsyncIOScheduler already running.")
        return async_scheduler

    async_scheduler = AsyncIOScheduler()
    async_scheduler.add_job(
        async_dispatch_heartbeat,
        "cron",
        second=0,  # Exactly at the start of every minute (xx:xx:00)
        id="campaign_dispatcher_1min_heartbeat",
        replace_existing=True,
    )
    async_scheduler.start()
    logger.info("APScheduler AsyncIOScheduler started: 1-minute campaign heartbeat active.")
    return async_scheduler


def stop_async_scheduler():
    """Stops the running AsyncIOScheduler cleanly."""
    global async_scheduler
    if async_scheduler and async_scheduler.running:
        async_scheduler.shutdown(wait=False)
        logger.info("APScheduler AsyncIOScheduler stopped.")


def run_standalone():
    """CLI / Standalone process entrypoint using BlockingScheduler."""
    logger.info("Starting standalone Campaign Dispatcher daemon...")
    scheduler = BlockingScheduler()
    scheduler.add_job(
        dispatch_due_campaigns,
        "cron",
        second=0,
        id="campaign_dispatcher_standalone_heartbeat",
        replace_existing=True,
    )
    # Also run immediately on boot
    logger.info("Running initial check on startup...")
    dispatch_due_campaigns()

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Campaign Dispatcher daemon stopped.")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    run_standalone()
