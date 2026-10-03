import os
from pathlib import Path
from dotenv import load_dotenv

# Locate project root and load .env
PROJECT_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(PROJECT_ROOT / ".env")

PORT = int(os.getenv("API_GATEWAY_PORT", "8000"))

# Upstream microservices
raw_inventory_url = os.getenv("INVENTORY_SERVICE_URL", "http://localhost:8001")
if "http://inventory-service:" in raw_inventory_url and not os.path.exists("/.dockerenv"):
    INVENTORY_SERVICE_URL = raw_inventory_url.replace("inventory-service:", "localhost:")
else:
    INVENTORY_SERVICE_URL = raw_inventory_url

# JWT Authentication Config
JWT_SECRET = os.getenv("JWT_SECRET", "stoki_super_secure_jwt_secret_key_2026")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))

# Database URL for Auth (tenants, tenant_users)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://stoki:stoki_password@localhost:5434/stoki_db")

# Razorpay Payment Gateway Config
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_StokiDevKey123")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "stoki_test_secret_abc123")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "stoki_webhook_secret_xyz789")

# Google OAuth Config
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", os.getenv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", ""))

# SMTP Email Dispatch Config (Gmail / 16-Digit App Password)
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USER or "noreply@stoki.app")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "Stoki Intelligence")

# Runtime Environment
ENVIRONMENT = os.getenv("ENVIRONMENT", os.getenv("  ", "development")).lower()
IS_PROD = ENVIRONMENT in ("production", "prod")


