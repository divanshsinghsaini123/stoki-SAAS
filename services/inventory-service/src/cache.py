import json
import logging
from typing import Any
import redis
try:
    from .config import REDIS_URL, CACHE_DEFAULT_TTL
except ImportError:
    from config import REDIS_URL, CACHE_DEFAULT_TTL

logger = logging.getLogger("inventory-cache")

try:
    redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=2)
    redis_client.ping()
    logger.info("Redis cache client connected successfully.")
except Exception as e:
    logger.warning(f"Redis cache connection failed: {e}. Fallback to direct DB queries enabled.")
    redis_client = None


def get_cached_json(key: str) -> Any | None:
    """Retrieves and parses JSON data from Redis cache."""
    if not redis_client:
        return None
    try:
        data = redis_client.get(key)
        if data:
            return json.loads(data)
    except Exception as e:
        logger.warning(f"Redis GET failed for key {key}: {e}")
    return None


def set_cached_json(key: str, value: Any, ttl: int = CACHE_DEFAULT_TTL) -> None:
    """Serializes and caches JSON data into Redis with an expiration TTL."""
    if not redis_client:
        return
    try:
        redis_client.setex(key, ttl, json.dumps(value, default=str))
    except Exception as e:
        logger.warning(f"Redis SETEX failed for key {key}: {e}")
