# scripts/seed_tasks.py
import json
import os
import sys
import redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
QUEUE_NAME = "instamart_tasks"

# Sample tickets matching your workflow
TEST_TICKETS = [
    {
        "brand_id": "brand_coke_001",
        "brand": "Coca-Cola",
        "query": "coca cola",
        "pincode": "400001"
    },
    {
        "brand_id": "brand_cloud9_001",
        "brand": "Cloud9",
        "query": "cloud9",
        "pincode": "136400001129"
    },
    {
        "brand_id": "brand_cloud9_001",
        "brand": "Cloud9",
        "query": "cloud9",
        "pincode": "400001"
    }
]


def seed_queue():
    try:
        r = redis.Redis.from_url(REDIS_URL, decode_responses=True)
        r.ping()
        print(f"[*] Connected to Redis at {REDIS_URL}")
    except redis.ConnectionError as exc:
        print(f"[-] Redis connection failed: {exc}")
        sys.exit(1)

    print(f"[*] Pushing {len(TEST_TICKETS)} tickets to '{QUEUE_NAME}'...")

    for ticket in TEST_TICKETS:
        payload = json.dumps(ticket)
        r.rpush(QUEUE_NAME, payload)
        print(f"  [->] Pushed ticket: brand_id={ticket['brand_id']} | pincode={ticket['pincode']} | query='{ticket['query']}'")

    current_len = r.llen(QUEUE_NAME)
    print(f"[OK] Seeding complete. Current queue length: {current_len}")


if __name__ == "__main__":
    seed_queue()