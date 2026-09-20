# scripts/seed_tasks.py
import json
import os
import sys
import redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Sample tickets matching your workflow
TEST_TICKETS = [
    {
        "brand_id": "brand_redbull_001",
        "brand": "Red Bull",
        "query": "Red Bull",
        "pincode": "400009",
    }
]


def seed_queue(queue_name: str = "blinkit_tasks"):
    try:
        r = redis.Redis.from_url(REDIS_URL, decode_responses=True)
        r.ping()
        print(f"[*] Connected to Redis at {REDIS_URL}")
    except redis.ConnectionError as exc:
        print(f"[-] Redis connection failed: {exc}")
        sys.exit(1)

    print(f"[*] Pushing {len(TEST_TICKETS)} tickets to '{queue_name}'...")

    for ticket in TEST_TICKETS:
        payload = json.dumps(ticket)
        r.rpush(queue_name, payload)
        print(
            f"  [->] Pushed ticket: brand_id={ticket['brand_id']} | pincode={ticket['pincode']} | query='{ticket['query']}'"
        )

    current_len = r.llen(queue_name)
    print(f"[OK] Seeding complete. Current '{queue_name}' queue length: {current_len}")


if __name__ == "__main__":
    target_queue = sys.argv[1] if len(sys.argv) > 1 else "blinkit_tasks"
    seed_queue(target_queue)