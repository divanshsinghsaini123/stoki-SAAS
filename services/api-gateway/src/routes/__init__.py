from .auth_routes import router as auth_router
from .payment_routes import router as payment_router
from .tenant_routes import router as tenant_router
from .platform_routes import router as platform_router

__all__ = ["auth_router", "payment_router", "tenant_router", "platform_router"]

