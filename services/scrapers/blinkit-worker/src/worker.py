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
from packages.database.models import InventorySnapshot

try:
    from .scraper import BlinkitScraper
    from .parser import parse_blinkit_response
except ImportError:
    from scraper import BlinkitScraper
    from parser import parse_blinkit_response

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("blinkit-worker")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
QUEUE_NAME = "blinkit_tasks"


def save_to_database(snapshots_data: list[dict]):
    """Persists extracted snapshot dictionaries into PostgreSQL."""
    if not snapshots_data:
        logger.warning("0 records extracted — nothing to persist to database.")
        return

    with get_db_context() as db:
        for item in snapshots_data:
            snapshot = InventorySnapshot(**item)
            db.add(snapshot)
    logger.info(f"Persisted {len(snapshots_data)} records to database.")


def process_ticket(scraper: BlinkitScraper, ticket_data: dict):
    brand_id = ticket_data.get("brand_id")
    pincode = ticket_data.get("pincode")
    query = ticket_data.get("query")
    target_brand = ticket_data.get("brand", query)

    if not brand_id or not pincode or not query:
        logger.error(f"Invalid ticket format: {ticket_data}")
        return

    logger.info(
        f"Processing ticket -> Brand ID: {brand_id}, Pincode: {pincode}, Query: {query}, Brand: {target_brand}"
    )

    # 1. Fetch raw API response via Blinkit API chaining
    raw_response = scraper.fetch_search_results(
        pincode=pincode, query=query, target_brand=target_brand
    )
    if not raw_response or raw_response.get("status") != "SUCCESS":
        logger.warning(f"No successful response returned for pincode {pincode}")
        return

    # 2. Parse snippets and map to InventorySnapshot schema
    extracted_rows = parse_blinkit_response(
        raw_response=raw_response,
        pincode=pincode,
        brand_id=brand_id,
        target_brand=target_brand,
        query=query,
    )

    # 3. Store into PostgreSQL
    save_to_database(extracted_rows)


def start_worker():
    # Automatically verify/create database tables in PostgreSQL
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified/created successfully.")

    r = redis.Redis.from_url(REDIS_URL, decode_responses=True, socket_timeout=None)
    scraper = BlinkitScraper()
    logger.info(f"Blinkit worker running. Listening on queue '{QUEUE_NAME}'...")

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
