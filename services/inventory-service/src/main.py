import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from .api import (
        live_stock_router,
        availability_router,
        trends_router,
        alerts_router,
        campaigns_router,
        subscriptions_router,
        notifications_router,
    )
except ImportError:
    from api import (
        live_stock_router,
        availability_router,
        trends_router,
        alerts_router,
        campaigns_router,
        subscriptions_router,
        notifications_router,
    )

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("stoki-inventory-service")

app = FastAPI(
    title="Stoki Hyperlocal Q-Commerce Intelligence Service",
    description=(
        "Core SaaS intelligence, multi-tenant scheduling, real-time stock lookup, "
        "and availability analytics across Blinkit, Zepto, Swiggy Instamart, and BigBasket."
    ),
    version="1.1.0",
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
    from .config import PORT
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
