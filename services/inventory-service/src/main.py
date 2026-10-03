import logging
import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager

# Add project root to sys.path so 'packages' can be imported
PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Add inventory src to sys.path
INVENTORY_SRC = Path(__file__).resolve().parent
if str(INVENTORY_SRC) not in sys.path:
    sys.path.insert(0, str(INVENTORY_SRC))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from .config import PORT
    from .api import (
        live_stock_router,
        availability_router,
        trends_router,
        alerts_router,
        campaigns_router,
        subscriptions_router,
        notifications_router,
    )
    from .dispatcher import start_async_scheduler, stop_async_scheduler
except ImportError:
    from config import PORT
    from api import (
        live_stock_router,
        availability_router,
        trends_router,
        alerts_router,
        campaigns_router,
        subscriptions_router,
        notifications_router,
    )
    from dispatcher import start_async_scheduler, stop_async_scheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("stoki-inventory-service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manages application startup and shutdown lifecycle events."""
    enable_scheduler = os.getenv("ENABLE_CAMPAIGN_SCHEDULER", "true").lower() in ("true", "1", "yes")
    if enable_scheduler:
        try:
            start_async_scheduler()
            logger.info("Campaign Dispatcher 1-minute heartbeat started successfully.")
        except Exception as e:
            logger.error(f"Failed to start Campaign Dispatcher: {e}", exc_info=True)
    yield
    if enable_scheduler:
        try:
            stop_async_scheduler()
            logger.info("Campaign Dispatcher stopped cleanly.")
        except Exception as e:
            logger.error(f"Failed to stop Campaign Dispatcher: {e}", exc_info=True)


app = FastAPI(
    title="Stoki Hyperlocal Q-Commerce Intelligence Service",
    description=(
        "Core SaaS intelligence, multi-tenant scheduling, real-time stock lookup, "
        "and availability analytics across Blinkit, Zepto, Swiggy Instamart, and BigBasket."
    ),
    version="1.2.0",
    lifespan=lifespan,
)


# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all modules under /api/v1
API_V1_PREFIX = "/api/v1"
app.include_router(live_stock_router, prefix=API_V1_PREFIX)
app.include_router(availability_router, prefix=API_V1_PREFIX)
app.include_router(trends_router, prefix=API_V1_PREFIX)
app.include_router(alerts_router, prefix=API_V1_PREFIX)
app.include_router(campaigns_router, prefix=API_V1_PREFIX)
app.include_router(subscriptions_router, prefix=API_V1_PREFIX)
app.include_router(notifications_router, prefix=API_V1_PREFIX)


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "stoki-inventory-service",
        "version": "1.1.0",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
