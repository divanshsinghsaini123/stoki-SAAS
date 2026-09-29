import os
from pathlib import Path
from dotenv import load_dotenv

# Locate project root and load .env
PROJECT_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(PROJECT_ROOT / ".env")

raw_redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
# If running outside docker and host is 'redis', fall back to 'localhost'
if "redis://redis:" in raw_redis_url:
    REDIS_URL = raw_redis_url.replace("redis://redis:", "redis://localhost:")
else:
    REDIS_URL = raw_redis_url
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://stoki:stoki_password@localhost:5434/stoki_db")
PORT = int(os.getenv("INVENTORY_SERVICE_PORT", "8001"))
CACHE_DEFAULT_TTL = int(os.getenv("INVENTORY_CACHE_TTL_SECONDS", "45"))
