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

# Add current directory to sys.path for scraper/parser
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

import redis
from packages.database.connection import get_db_context, Base, engine
from packages.database.models import InventorySnapshot, ScraperFailureLog

try:
    from .scraper import ZeptoScraper
    from .parser import parse_zepto_response
except ImportError:
    from scraper import ZeptoScraper
    from parser import parse_zepto_response

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("zepto-worker")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
QUEUE_NAME = "zepto_tasks"


def save_to_database(snapshots_data: list[dict]):
    """Persists extracted snapshot dictionaries into PostgreSQL."""
    if not snapshots_data:
        logger.warning("0 records extracted — nothing to persist to database.")
        return

    with get_db_context() as db:
        for item in snapshots_data:
            snapshot = InventorySnapshot(**item)
            db.add(snapshot)
    logger.info(f"Persisted {len(snapshots_data)} Zepto records to database.")


def save_failure_to_database(ticket_data: dict, error_message: str, error_details: dict | None = None):
    """Persists failed scrape attempts into PostgreSQL scraper_failure_logs table."""
    try:
        with get_db_context() as db:
            failure_record = ScraperFailureLog(
                platform="zepto",
                brand_id=ticket_data.get("brand_id"),
                pincode=str(ticket_data.get("pincode") or ""),
                query=str(ticket_data.get("query") or ""),
                status="FAILED",
                error_message=str(error_message)[:1000],
                error_details=error_details or {},
            )
            db.add(failure_record)
        logger.info(
            f"Logged failure in database -> Platform: zepto, Pincode: {ticket_data.get('pincode')}, Error: {error_message}"
        )
    except Exception as e:
        logger.error(f"Failed to record failure log to database: {e}", exc_info=True)


def process_ticket(scraper: ZeptoScraper, ticket_data: dict):
    brand_id = ticket_data.get("brand_id")
    pincode = ticket_data.get("pincode")
    query = ticket_data.get("query")
    target_brand = ticket_data.get("brand", query)

    if not brand_id or not pincode or not query:
        err = f"Invalid ticket format: {ticket_data}"
        logger.error(err)
        save_failure_to_database(ticket_data, err)
        return

    logger.info(
        f"Processing ticket -> Brand ID: {brand_id}, Pincode: {pincode}, Query: {query}, Brand: {target_brand}"
    )

    try:
        # 1. Fetch raw API response via Zepto Playwright flow
        raw_response = scraper.fetch_search_results(
            pincode=pincode, query=query, target_brand=target_brand
        )
        if not raw_response or raw_response.get("status") != "SUCCESS":
            err = f"Scraper could not retrieve search results for pincode {pincode}"
            logger.warning(err)
            save_failure_to_database(ticket_data, err, {"status": raw_response.get("status") if raw_response else "NONE"})
            return

        # 2. Parse product listings and map to universal InventorySnapshot schema
        extracted_rows = parse_zepto_response(
            raw_response=raw_response,
            pincode=pincode,
            brand_id=brand_id,
            target_brand=target_brand,
            query=query,
        )

        if not extracted_rows:
            err = f"0 matching records parsed for query '{query}' in pincode {pincode}"
            logger.warning(err)
            save_failure_to_database(ticket_data, err)
            return

        # 3. Store into PostgreSQL
        save_to_database(extracted_rows)

    except Exception as e:
        err = f"Exception processing ticket: {e}"
        logger.error(err, exc_info=True)
        save_failure_to_database(ticket_data, err, {"exception": str(e)})


def start_worker():
    # Automatically verify/create database tables in PostgreSQL
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified/created successfully.")

    r = redis.Redis.from_url(REDIS_URL, decode_responses=True, socket_timeout=None)
    scraper = ZeptoScraper()
    logger.info(f"Zepto worker running. Listening on queue '{QUEUE_NAME}'...")

    try:
        while True:
            try:
                task = r.blpop(QUEUE_NAME, timeout=5)
                if not task:
                    continue

                _, raw_payload = task
                ticket_data = json.loads(raw_payload)

                process_ticket(scraper, ticket_data)

                cooldown = random.uniform(2.5, 4.5)
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
