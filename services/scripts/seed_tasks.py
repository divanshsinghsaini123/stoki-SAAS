# scripts/seed_tasks.py
import json
import os
import sys
import redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Test tickets for testing scraper workflows
TEST_TICKETS = [
    # {
    #     "brand_id": "brand_redbull_001",
    #     "brand": "Red Bull",
    #     "query": "Red Bull",
    #     "pincode": "400001",
    # }
    # ,
    {
        "brand_id": "brand_redbull_001",
        "brand": "Red Bull",
        "query": "Red Bull",
        "pincode": "400009",
    }
]

QUEUE_ALIASES = {
    "bb": "bigbasket_tasks",
    "bigbasket": "bigbasket_tasks",
    "bigbasket_tasks": "bigbasket_tasks",
    "blinkit": "blinkit_tasks",
    "blinkit_tasks": "blinkit_tasks",
    "im": "instamart_tasks",
    "instamart": "instamart_tasks",
    "instamart_tasks": "instamart_tasks",
    "zepto": "zepto_tasks",
    "zapto": "zepto_tasks",
    "zepto_tasks": "zepto_tasks",
}


def seed_queue(queue_name: str = "zepto_tasks"):
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
    print(f"[OK] Seeding complete. Current '{queue_name}' queue length: {current_len}\n")


if __name__ == "__main__":
    arg = sys.argv[1].lower() if len(sys.argv) > 1 else "zepto_tasks"

    if arg == "all":
        for q in ["bigbasket_tasks", "blinkit_tasks", "instamart_tasks", "zepto_tasks"]:
            seed_queue(q)
    else:
        target_queue = QUEUE_ALIASES.get(arg, arg)
        seed_queue(target_queue)