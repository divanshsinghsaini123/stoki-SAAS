import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Add project root to sys.path so 'packages' can be imported
PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Add gateway src to sys.path
GATEWAY_SRC = Path(__file__).resolve().parent
if str(GATEWAY_SRC) not in sys.path:
    sys.path.insert(0, str(GATEWAY_SRC))

from fastapi import FastAPI, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware

try:
    from .config import PORT, INVENTORY_SERVICE_URL
    from .auth import get_current_user, get_optional_user
    from .proxy import forward_to_upstream, close_http_client
    from .routes import auth_router, payment_router, tenant_router
except ImportError:
    from config import PORT, INVENTORY_SERVICE_URL
    from auth import get_current_user, get_optional_user
    from proxy import forward_to_upstream, close_http_client
    from routes import auth_router, payment_router, tenant_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("stoki-api-gateway")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for connection pooling and graceful teardown."""
    logger.info(f"API Gateway started. Upstream Inventory Service: {INVENTORY_SERVICE_URL}")
    yield
    await close_http_client()
    logger.info("API Gateway HTTP connections closed cleanly.")


app = FastAPI(
    title="Stoki API Gateway",
    description="Central security gate, JWT authentication, and reverse proxy for Stoki Q-Commerce SaaS.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for Next.js Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Authentication & User Management Routes
app.include_router(auth_router, prefix="/api/v1")

# Mount Razorpay Payment Gateway & Coupon Engine Routes
app.include_router(payment_router, prefix="/api/v1")

# Mount Tenant & Workspace Management Routes
app.include_router(tenant_router, prefix="/api/v1")


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "api-gateway",
        "upstream_inventory": INVENTORY_SERVICE_URL,
    }


# =========================================================================
# REVERSE PROXY ROUTING WITH TENANT CONTEXT INJECTION
# =========================================================================

# 1. Live Inventory & Stock Lookups
@app.api_route("/api/v1/inventory/{path:path}", methods=["GET", "POST", "PUT", "DELETE"], tags=["Inventory Proxy"])
async def proxy_inventory(request: Request, path: str, current_user: dict = Depends(get_current_user)):
    return await forward_to_upstream(request, INVENTORY_SERVICE_URL, current_user)


# 2. Analytics (Availability Rate & Historical Trends)
@app.api_route("/api/v1/analytics/{path:path}", methods=["GET", "POST", "PUT", "DELETE"], tags=["Analytics Proxy"])
async def proxy_analytics(request: Request, path: str, current_user: dict = Depends(get_current_user)):
    return await forward_to_upstream(request, INVENTORY_SERVICE_URL, current_user)


# 3. Stock & Cart Limit Alerts
@app.api_route("/api/v1/alerts", methods=["GET"], tags=["Alerts Proxy"])
async def proxy_alerts(request: Request, current_user: dict = Depends(get_current_user)):
    return await forward_to_upstream(request, INVENTORY_SERVICE_URL, current_user)


# 4. Scan Campaigns & Schedules
@app.api_route("/api/v1/campaigns/{path:path}", methods=["GET", "POST", "PUT", "DELETE"], tags=["Campaigns Proxy"])
async def proxy_campaigns_subpath(request: Request, path: str, current_user: dict = Depends(get_current_user)):
    return await forward_to_upstream(request, INVENTORY_SERVICE_URL, current_user)


@app.api_route("/api/v1/campaigns", methods=["GET", "POST"], tags=["Campaigns Proxy"])
async def proxy_campaigns_root(request: Request, current_user: dict = Depends(get_current_user)):
    return await forward_to_upstream(request, INVENTORY_SERVICE_URL, current_user)


# 5. Billing & Subscription Status
@app.api_route("/api/v1/subscriptions/{path:path}", methods=["GET", "POST"], tags=["Subscriptions Proxy"])
async def proxy_subscriptions(request: Request, path: str, current_user: dict = Depends(get_current_user)):
    return await forward_to_upstream(request, INVENTORY_SERVICE_URL, current_user)


# 6. Notifications Feed
@app.api_route("/api/v1/notifications/{path:path}", methods=["GET", "POST", "PUT", "PATCH"], tags=["Notifications Proxy"])
async def proxy_notifications_subpath(request: Request, path: str, current_user: dict = Depends(get_current_user)):
    return await forward_to_upstream(request, INVENTORY_SERVICE_URL, current_user)


@app.api_route("/api/v1/notifications", methods=["GET"], tags=["Notifications Proxy"])
async def proxy_notifications_root(request: Request, current_user: dict = Depends(get_current_user)):
    return await forward_to_upstream(request, INVENTORY_SERVICE_URL, current_user)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
