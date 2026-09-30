import json
import logging
import os
import random
import sys
import time
from pathlib import Path

# Add project root to sys.path so 'packages' can be imported
PROJECT_ROOT = Path(__file__).resolve().parents[4]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Load environment variables from root .env
from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / ".env")

# Add current directory to sys.path for scraper/parser
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

import redis
from packages.database.connection import get_db_context, Base, engine
from packages.database.models import InventorySnapshot, ScraperFailureLog
from packages.database.repository import record_job_run_progress

try:
    from .scraper import InstamartScraper
    from .parser import parse_instamart_response
except ImportError:
    from scraper import InstamartScraper
    from parser import parse_instamart_response

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("instamart-worker")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
PRIORITY_QUEUES = [
    "enterprise_instamart_tasks",
    "growth_instamart_tasks",
    "starter_instamart_tasks",
    "free_instamart_tasks",  # Lowest priority, processed only when all others are empty
]


def save_to_database(snapshots_data: list[dict]):
    """Persists extracted snapshot dictionaries into PostgreSQL."""
    if not snapshots_data:
        logger.warning("0 records extracted — nothing to persist to database.")
        return

    with get_db_context() as db:
        for item in snapshots_data:
            snapshot = InventorySnapshot(**item)
            db.add(snapshot)
    logger.info(f"Persisted {len(snapshots_data)} Instamart records to database.")


def save_failure_to_database(ticket_data: dict, error_message: str, error_details: dict | None = None):
    """Persists failed scrape attempts into PostgreSQL scraper_failure_logs table."""
    try:
        with get_db_context() as db:
            failure_record = ScraperFailureLog(
                platform="instamart",
                brand_id=ticket_data.get("brand_id"),
                pincode=str(ticket_data.get("pincode") or ""),
                query=str(ticket_data.get("query") or ""),
                status="FAILED",
                error_message=str(error_message)[:1000],
                error_details=error_details or {},
            )
            db.add(failure_record)
        logger.info(
            f"Logged failure in database -> Platform: instamart, Pincode: {ticket_data.get('pincode')}, Error: {error_message}"
        )
    except Exception as e:
        logger.error(f"Failed to record failure log to database: {e}", exc_info=True)


def process_ticket(scraper: InstamartScraper, ticket_data: dict):
    brand_id = ticket_data.get("brand_id")
    pincode = ticket_data.get("pincode")
    query = ticket_data.get("query")
    target_brand = ticket_data.get("brand", query)

    if not brand_id or not pincode or not query:
        err = f"Invalid ticket format: {ticket_data}"
        logger.error(err)
        save_failure_to_database(ticket_data, err)
        return

    logger.info(f"Processing ticket -> Brand ID: {brand_id}, Pincode: {pincode}, Query: {query}, Brand: {target_brand}")

    try:
        # 1. Fetch raw API response
        raw_response = scraper.fetch_search_results(pincode=pincode, query=query)
        if not raw_response:
            err = f"No response returned for pincode {pincode}"
            logger.warning(err)
            save_failure_to_database(ticket_data, err)
            return

        # 2. Parse items and attach brand_id
        extracted_rows = parse_instamart_response(
            raw_response=raw_response,
            pincode=pincode,
            brand_id=brand_id,
            target_brand=target_brand,
            query=query
        )

        campaign_id = ticket_data.get("campaign_id")
        job_run_id = ticket_data.get("job_run_id")
        tenant_id = ticket_data.get("tenant_id")

        if not extracted_rows:
            err = f"0 matching records parsed for query '{query}' in pincode {pincode}"
            logger.warning(err)
            save_failure_to_database(ticket_data, err)
            if job_run_id:
                record_job_run_progress(job_run_id, "instamart", str(pincode), 0, success=True, error_message=err)
            return

        # 3. Attach campaign and job run metadata if provided in ticket
        for row in extracted_rows:
            if campaign_id:
                row["campaign_id"] = campaign_id
            if job_run_id:
                row["job_run_id"] = job_run_id
            if tenant_id:
                row["tenant_id"] = tenant_id

        # 4. Save to database
        save_to_database(extracted_rows)

        # 5. Record job run progress
        if job_run_id:
            record_job_run_progress(job_run_id, "instamart", str(pincode), len(extracted_rows), success=True)

    except Exception as e:
        err = f"Exception processing Instamart ticket: {e}"
        logger.error(err, exc_info=True)
        save_failure_to_database(ticket_data, err, {"exception": str(e)})
        if ticket_data.get("job_run_id"):
            record_job_run_progress(ticket_data["job_run_id"], "instamart", str(pincode), 0, success=False, error_message=err)



def start_worker():
    # Automatically create tables in PostgreSQL if they do not exist
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified/created successfully.")

    r = redis.Redis.from_url(REDIS_URL, decode_responses=True, socket_timeout=None)
    headless = os.getenv("HEADLESS", "true").lower() in ("true", "1", "yes")
    scraper = InstamartScraper(headless=headless)
    logger.info(f"Instamart worker running. Listening on queues {PRIORITY_QUEUES} (enterprise first)...")

    try:
        while True:
            try:
                task = r.blpop(PRIORITY_QUEUES, timeout=5)
                if not task:
                    continue

                _, raw_payload = task
                ticket_data = json.loads(raw_payload)

                process_ticket(scraper, ticket_data)

                base_cooldown = float(
                    os.getenv("INSTAMART_COOLDOWN_SECONDS") or os.getenv("SCRAPER_COOLDOWN_SECONDS", "60.0")
                )
                cooldown = max(60.0, base_cooldown) + random.uniform(2.0, 5.0)
                logger.info(f"Ticket processed. Cooldown for {cooldown:.1f}s to respect rate limits...")
                time.sleep(cooldown)

            except (redis.exceptions.TimeoutError, TimeoutError):
                continue
            except Exception as e:
                logger.error(f"Error processing ticket: {e}", exc_info=True)

    except KeyboardInterrupt:
        logger.info("Stopping worker...")
    finally:
        scraper.close()


if __name__ == "__main__":
    start_worker()