# services/scrapers/instamart-worker/src/worker.py
import json
import logging
import os
import random
import time
import redis

from packages.database.connection import get_db_context
from packages.database.models import InventorySnapshot
from .scraper import fetch_instamart_data
from .parser import parse_instamart_cards

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("instamart-worker")

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
QUEUE_NAME = "instamart_tasks"


def save_to_database(snapshots_data: list[dict]):
    """Persists extracted snapshot dictionaries into PostgreSQL."""
    if not snapshots_data:
        return

    with get_db_context() as db:
        for item in snapshots_data:
            snapshot = InventorySnapshot(**item)
            db.add(snapshot)
    logger.info(f"Persisted {len(snapshots_data)} records to database.")


def process_ticket(ticket_data: dict):
    """Executes scrape, parsing, and database storage for a single ticket."""
    pincode = ticket_data.get("pincode")
    query = ticket_data.get("query")  # e.g., "cloud9" or specific SKU search

    logger.info(f"Processing ticket -> Pincode: {pincode}, Query: {query}")

    # 1. Fetch raw payload from Instamart API
    raw_response = fetch_instamart_data(pincode=pincode, query=query)
    if not raw_response:
        logger.warning(f"No response returned for pincode {pincode}")
        return

    # 2. Parse items and map to InventorySnapshot schema
    extracted_rows = parse_instamart_cards(raw_response, pincode=pincode)

    # 3. Store into DB via shared packages
    save_to_database(extracted_rows)


def start_worker():
    """Main daemon loop consuming jobs from Redis."""
    r = redis.Redis.from_url(REDIS_URL, decode_responses=True)
    logger.info(f"Instamart worker running. Listening on queue '{QUEUE_NAME}'...")

    while True:
        try:
            # BLPOP blocks until a task is available: returns (queue_name, data)
            task = r.blpop(QUEUE_NAME, timeout=10)
            if not task:
                continue

            _, raw_payload = task
            ticket_data = json.loads(raw_payload)

            process_ticket(ticket_data)

            # Polite jitter delay between requests to avoid IP bans
            cooldown = random.uniform(3.0, 6.0)
            logger.info(f"Cooldown sleeping for {cooldown:.2f}s...")
            time.sleep(cooldown)

        except redis.ConnectionError:
            logger.error("Lost connection to Redis. Retrying in 5s...")
            time.sleep(5)
        except Exception as e:
            logger.error(f"Error processing ticket: {e}", exc_info=True)


if __name__ == "__main__":
    start_worker()