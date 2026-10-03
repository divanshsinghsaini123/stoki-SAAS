# packages/database/models.py
import enum
import uuid
from sqlalchemy import (
    Column,
    String,
    Numeric,
    Boolean,
    Integer,
    DateTime,
    ForeignKey,
    Index,
    Enum as SAEnum,
    text,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from .connection import Base


class Tenant(Base):
    """Organization / Company profile managing multiple brands, subscriptions, and team members."""

    __tablename__ = "tenants"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    company_name = Column(String(150), nullable=False)
    email = Column(String(150), nullable=False, unique=True, index=True)
    phone_number = Column(String(50), nullable=True)

    # --- New Organization & Onboarding Fields ---
    logo_url = Column(String(500), nullable=True)              # Workspace/Company avatar or logo (skippable)
    website_url = Column(String(255), nullable=True)           # Company website (e.g. https://brand.com)
    industry_category = Column(String(100), nullable=True)     # e.g., 'FMCG / F&B', 'Beauty & Personal Care', 'Home & Essentials', 'Health & Wellness', 'Electronics'
    organization_size = Column(String(50), nullable=True)      # e.g., '1-10', '11-50', '51-200', '200+'
    team_size = Column(String(50), nullable=True)              # e.g., 'Just me', '2-5', '6-15', '15+'
    brand_count_estimate = Column(String(30), nullable=True)   # How many brands they manage: '1', '2-5', '6-15', '15+'
    target_platforms = Column(
        JSONB,
        nullable=False,
        server_default=text("'[\"blinkit\", \"zepto\", \"instamart\"]'::jsonb"),
    )
    is_onboarded = Column(Boolean, nullable=False, default=False, server_default=text("false"))

    settings = Column(
        JSONB,
        nullable=False,
        server_default=text(
            "'{\"email_alerts\": true, \"timezone\": \"Asia/Kolkata\", \"slack_webhook\": null}'::jsonb"
        ),
    )
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class TenantUser(Base):
    """Team members & login credentials belonging to a tenant organization."""

    __tablename__ = "tenant_users"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    full_name = Column(String(100), nullable=False)
    email = Column(String(150), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False, default="member")  # 'owner', 'admin', 'member', 'viewer'
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class SubscriptionPlan(Base):
    """Master definitions for SaaS pricing tiers & quotas."""

    __tablename__ = "subscription_plans"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    plan_name = Column(String(50), nullable=False, unique=True)  # 'Starter', 'Growth', 'Enterprise'
    price = Column(Numeric(10, 2), nullable=False, default=0.0)
    billing_cycle = Column(String(20), nullable=False, default="monthly")  # 'monthly', 'yearly'
    max_daily_scans = Column(Integer, nullable=False, default=0)
    included_extra_scans = Column(Integer, nullable=False, default=0)  # One-time bonus/pool scans bundled with this plan
    max_daily_hard_cap = Column(Integer, nullable=False, default=0)  # Universal safety ceiling: Daily quota + extra scans cannot exceed this in 1 day
    max_brands = Column(Integer, nullable=False, default=1)
    scan_queue_priority = Column(Integer, nullable=False, default=1)  # 1=Starter, 2=Growth, 3=Enterprise — controls Redis queue tier (lpush vs rpush)

    allowed_platforms = Column(
        JSONB,
        nullable=False,
        server_default=text("'[\"blinkit\", \"zepto\", \"instamart\", \"bigbasket\"]'::jsonb"),
    )
    features = Column(JSONB, nullable=True, server_default=text("'{}'::jsonb"))
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class TenantSubscription(Base):
    """Tenant's active subscription status, quota usage, and payment tracking."""

    __tablename__ = "tenant_subscriptions"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    plan_id = Column(
        UUID(as_uuid=True),
        ForeignKey("subscription_plans.id"),
        nullable=False,
        index=True,
    )
    status = Column(String(30), nullable=False, default="active", index=True)  # 'active', 'past_due', 'canceled', 'trialing'
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True, index=True)  # Expiry date
    scans_used_today = Column(Integer, nullable=False, default=0)
    extra_scan_credits = Column(Integer, nullable=False, default=0)  # Un-expiring addon / yearly scan pool
    last_quota_reset_at = Column(DateTime(timezone=True), nullable=True)
    payment_provider_id = Column(String(100), nullable=True)  # Customer / Subscription ID in Razorpay/Stripe
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )



class Invoice(Base):
    """Payment transaction records & GST receipts."""

    __tablename__ = "invoices"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    subscription_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenant_subscriptions.id", ondelete="SET NULL"),
        nullable=True,
    )
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(10), nullable=False, default="INR")
    status = Column(String(30), nullable=False, default="paid")  # 'paid', 'failed', 'pending'
    payment_gateway_invoice_id = Column(String(100), nullable=True)
    invoice_pdf_url = Column(String(500), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class Brand(Base):
    """Target brands tracked by tenant organizations."""

    __tablename__ = "brands"

    id = Column(String(100), primary_key=True)  # e.g., 'brand_redbull_001'
    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    brand_name = Column(String(100), nullable=False, index=True)
    logo_url = Column(String(500), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class ScanCampaign(Base):
    """Schedules, targeting rules (pincodes, platforms), and cron triggers."""

    __tablename__ = "scan_campaigns"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    brand_id = Column(
        String(100),
        ForeignKey("brands.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    campaign_name = Column(String(150), nullable=False)  # e.g. "Delhi Morning Scan"
    platforms = Column(
        JSONB,
        nullable=False,
        server_default=text("'[\"blinkit\", \"zepto\", \"instamart\", \"bigbasket\"]'::jsonb"),
    )
    pincodes = Column(
        JSONB,
        nullable=False,
        server_default=text("'[\"400001\", \"400009\"]'::jsonb"),
    )
    scan_type = Column(String(30), nullable=False, default="scheduled")  # 'manual', 'scheduled'
    cron_expression = Column(String(50), nullable=True)  # e.g., '0 9 * * *'
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class ScanJobRun(Base):
    """Execution history & 'Last Scan' state tracking for campaigns."""

    __tablename__ = "scan_job_runs"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    campaign_id = Column(
        UUID(as_uuid=True),
        ForeignKey("scan_campaigns.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    brand_id = Column(String(100), nullable=True, index=True)
    tenant_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    status = Column(
        String(30), nullable=False, default="pending", index=True
    )  # 'pending', 'running', 'completed', 'failed'
    started_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )
    completed_at = Column(DateTime(timezone=True), nullable=True)
    total_items_found = Column(Integer, nullable=False, default=0)
    error_message = Column(String(1000), nullable=True)
    execution_metadata = Column(JSONB, nullable=True, server_default=text("'{}'::jsonb"))


class Notification(Base):
    """Alerts and notification feed for tenant users."""

    __tablename__ = "notifications"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type = Column(
        String(50), nullable=False, index=True
    )  # 'scan_completed', 'stock_alert', 'payment_reminder', 'plan_expired'
    title = Column(String(255), nullable=False)
    message = Column(String(1000), nullable=False)
    is_read = Column(Boolean, nullable=False, default=False, index=True)
    metadata_json = Column(JSONB, nullable=True, server_default=text("'{}'::jsonb"))
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )


class InventorySnapshot(Base):
    """Immutable, timestamped record of an SKU's inventory state at a specific dark store."""

    __tablename__ = "inventory_snapshots"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )

    # Multi-tenant and campaign audit links
    tenant_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    campaign_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    job_run_id = Column(UUID(as_uuid=True), nullable=True, index=True)

    # Core identification fields
    brand_id = Column(String(100), nullable=True, index=True)
    platform = Column(String(50), nullable=False, index=True)  # e.g., 'instamart', 'blinkit', 'zepto', 'bigbasket'
    pincode = Column(String(10), nullable=False, index=True)
    dark_store_id = Column(String(100), nullable=False, index=True)  # e.g., podId / merchant_id
    sku_id = Column(String(100), nullable=False, index=True)

    # Catalog & Product details
    parent_product_name = Column(String(255), nullable=True)
    title = Column(String(255), nullable=False)
    brand = Column(String(100), nullable=True, index=True)
    size = Column(String(100), nullable=True)  # e.g., '250 ml', '1 kg'

    # Pricing & Stock
    mrp = Column(Numeric(10, 2), nullable=True)
    selling_price = Column(Numeric(10, 2), nullable=True)
    stock_status = Column(String(50), nullable=False, index=True)  # 'in_stock', 'out_of_stock'
    in_stock = Column(Boolean, nullable=False, default=True)
    max_allowed_cart_qty = Column(Integer, nullable=True)

    # Platform-specific unstructured data (JSONB)
    platform_metadata = Column(JSONB, nullable=True, server_default=text("'{}'::jsonb"))

    # Timestamp
    scraped_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )

    # Composite indexes for fast analytical & timeseries queries
    __table_args__ = (
        Index(
            "ix_inventory_snapshots_lookup",
            "platform",
            "pincode",
            "sku_id",
            "scraped_at",
        ),
        Index(
            "ix_inventory_snapshots_dark_store",
            "platform",
            "dark_store_id",
            "sku_id",
        ),
        Index(
            "ix_inventory_snapshots_job_run",
            "job_run_id",
            "scraped_at",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<InventorySnapshot(platform='{self.platform}', "
            f"title='{self.title}', "
            f"sku_id='{self.sku_id}', "
            f"store='{self.dark_store_id}', "
            f"stock={self.in_stock}, "
            f"scraped_at={self.scraped_at})>"
        )


class ScraperFailureLog(Base):
    """Stores failed scrape attempts across workers (Zepto, Blinkit, Instamart, BigBasket)."""

    __tablename__ = "scraper_failure_logs"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )

    platform = Column(String(50), nullable=False, index=True)
    brand_id = Column(String(100), nullable=True, index=True)
    pincode = Column(String(10), nullable=False, index=True)
    query = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False, default="FAILED", index=True)
    error_message = Column(String(1000), nullable=True)
    error_details = Column(JSONB, nullable=True, server_default=text("'{}'::jsonb"))

    failed_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )

    def __repr__(self) -> str:
        return (
            f"<ScraperFailureLog(platform='{self.platform}', "
            f"pincode='{self.pincode}', "
            f"query='{self.query}', "
            f"error='{self.error_message}')>"
        )


class DiscountType(str, enum.Enum):
    PERCENTAGE = "PERCENTAGE"
    FLAT = "FLAT"


class Coupon(Base):
    """In-app discount coupons and promotional campaigns for Stoki subscriptions."""

    __tablename__ = "coupons"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    code = Column(String(50), unique=True, nullable=False, index=True)
    discount_type = Column(
        SAEnum(DiscountType, name="coupon_discount_type", native_enum=False),
        nullable=False,
    )
    discount_value = Column(Integer, nullable=False)
    applicable_plans = Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    min_checkout_amount = Column(Integer, nullable=False, default=0, server_default=text("0"))
    max_uses = Column(Integer, nullable=True)
    used_count = Column(Integer, nullable=False, default=0, server_default=text("0"))
    valid_until = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, server_default=text("true"))
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    def __repr__(self) -> str:
        return f"<Coupon(code='{self.code}', type='{self.discount_type}', val={self.discount_value})>"


class AuthOTP(Base):
    """Temporary one-time passwords for email verification and password resets."""

    __tablename__ = "auth_otps"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    email = Column(String(150), nullable=False, index=True)
    otp_code = Column(String(10), nullable=False)
    purpose = Column(String(50), nullable=False, default="signup")  # 'signup', 'forgot_password'
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, nullable=False, default=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    def __repr__(self) -> str:
        return f"<AuthOTP(email='{self.email}', purpose='{self.purpose}', used={self.is_used})>"