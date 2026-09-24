# services/scrapers/instamart-worker/src/worker.py
import json
import logging
import os
import random
import time
import redis

from packages.database.connection import get_db_context
from packages.database.models import InventorySnapshot
from .scraper import InstamartScraper
from .parser import parse_instamart_response

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("instamart-worker")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
QUEUE_NAME = "instamart_tasks"


def save_to_database(snapshots_data: list[dict]):
    if not snapshots_data:
        return

    with get_db_context() as db:
        for item in snapshots_data:
            snapshot = InventorySnapshot(**item)
            db.add(snapshot)
    logger.info(f"Persisted {len(snapshots_data)} records to database.")


def process_ticket(scraper: InstamartScraper, ticket_data: dict):
    brand_id = ticket_data.get("brand_id")
    pincode = ticket_data.get("pincode")
    query = ticket_data.get("query")
    target_brand = ticket_data.get("brand", query)

    if not brand_id or not pincode or not query:
        logger.error(f"Invalid ticket format: {ticket_data}")
        return

    logger.info(f"Processing ticket -> Brand ID: {brand_id}, Pincode: {pincode}, Query: {query}")

    # 1. Fetch raw API response
    raw_response = scraper.fetch_search_results(pincode=pincode, query=query)
    if not raw_response:
        logger.warning(f"No response returned for pincode {pincode}")
        return

    # 2. Parse items and attach brand_id
    extracted_rows = parse_instamart_response(
        raw_response=raw_response,
        pincode=pincode,
        brand_id=brand_id,
        target_brand=target_brand,
        query=query
    )
    # 3. Save to database
    save_to_database(extracted_rows)


def start_worker():
    r = redis.Redis.from_url(REDIS_URL, decode_responses=True)
    scraper = InstamartScraper(headless=True)
    logger.info(f"Instamart worker running. Listening on queue '{QUEUE_NAME}'...")

    try:
        while True:
            task = r.blpop(QUEUE_NAME, timeout=10)
            if not task:
                continue

            _, raw_payload = task
            ticket_data = json.loads(raw_payload)

            process_ticket(scraper, ticket_data)

            cooldown = random.uniform(3.0, 5.0)
            time.sleep(cooldown)

    except KeyboardInterrupt:
        logger.info("Stopping worker...")
    finally:
        scraper.close()


if __name__ == "__main__":
    start_worker()