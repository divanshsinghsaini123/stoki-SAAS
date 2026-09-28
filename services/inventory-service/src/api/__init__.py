from .live_stock import router as live_stock_router
from .availability import router as availability_router
from .trends import router as trends_router
from .alerts import router as alerts_router
from .campaigns import router as campaigns_router
from .subscriptions import router as subscriptions_router
from .notifications import router as notifications_router

__all__ = [
    "live_stock_router",
    "availability_router",
    "trends_router",
    "alerts_router",
    "campaigns_router",
    "subscriptions_router",
    "notifications_router",
]
