from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict


class LiveStockItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    brand_id: str | None = None
    platform: str
    pincode: str
    dark_store_id: str
    sku_id: str
    parent_product_name: str | None = None
    title: str
    brand: str | None = None
    size: str | None = None
    mrp: float | None = None
    selling_price: float | None = None
    stock_status: str
    in_stock: bool
    max_allowed_cart_qty: int | None = None
    scraped_at: datetime
    platform_metadata: dict[str, Any] | None = None


class LiveStockResponse(BaseModel):
    total_records: int
    page: int = 1
    page_size: int = 50
    total_pages: int = 1
    has_next: bool = False
    has_prev: bool = False
    cached: bool = False
    items: list[LiveStockItem]


class PlatformAvailability(BaseModel):
    platform: str
    total_stores: int
    in_stock_stores: int
    out_of_stock_stores: int
    availability_rate: float


class PincodeAvailability(BaseModel):
    pincode: str
    total_stores: int
    in_stock_stores: int
    out_of_stock_stores: int
    availability_rate: float


class AvailabilityMetricsResponse(BaseModel):
    brand: str | None = None
    total_servicing_stores: int
    in_stock_stores: int
    out_of_stock_stores: int
    overall_availability_rate: float
    by_platform: list[PlatformAvailability]
    by_pincode: list[PincodeAvailability]
    cached: bool = False


class TrendPoint(BaseModel):
    timestamp: str
    in_stock_count: int
    out_of_stock_count: int
    avg_selling_price: float | None = None
    availability_rate: float


class TrendsResponse(BaseModel):
    brand: str | None = None
    sku_id: str | None = None
    days: int
    total_points: int
    cached: bool = False
    timeline: list[TrendPoint]


class AlertItem(BaseModel):
    alert_type: str  # 'OUT_OF_STOCK', 'LOW_STOCK', 'CART_LIMIT_BREACH', 'PRICE_DROP'
    severity: str    # 'CRITICAL', 'WARNING', 'INFO'
    platform: str
    pincode: str
    dark_store_id: str
    sku_id: str
    title: str
    brand: str | None = None
    message: str
    details: dict[str, Any] = {}
    detected_at: datetime


class AlertsResponse(BaseModel):
    total_alerts: int
    cached: bool = False
    alerts: list[AlertItem]


# --- Campaigns & Scan Schedules ---
class CampaignItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tenant_id: str | None = None
    brand_id: str
    campaign_name: str
    platforms: list[str]
    pincodes: list[str]
    scan_type: str
    cron_expression: str | None = None
    is_active: bool
    created_at: datetime


class CreateCampaignRequest(BaseModel):
    brand_id: str
    campaign_name: str
    platforms: list[str] = ["blinkit", "zepto", "instamart", "bigbasket"]
    pincodes: list[str] = ["400001", "400009"]
    scan_type: str = "scheduled"  # 'manual' or 'scheduled'
    cron_expression: str | None = "0 9 * * *"


class CampaignListResponse(BaseModel):
    total_campaigns: int
    campaigns: list[CampaignItem]


class LastScanResponse(BaseModel):
    campaign_id: str
    campaign_name: str | None = None
    last_run_id: str | None = None
    status: str  # 'completed', 'running', 'failed', 'never_run'
    started_at: datetime | None = None
    completed_at: datetime | None = None
    duration_seconds: float | None = None
    total_items_found: int = 0
    error_message: str | None = None


class TriggerScanResponse(BaseModel):
    success: bool
    job_run_id: str
    campaign_id: str
    brand_id: str
    queued_tasks_count: int
    dispatched_platforms: list[str]
    message: str


# --- Subscriptions & Quota ---
class SubscriptionResponse(BaseModel):
    tenant_id: str
    plan_name: str
    billing_cycle: str
    status: str
    max_daily_scans: int
    scans_used_today: int
    scans_remaining_today: int
    current_period_end: datetime | None = None
    is_expired: bool = False


# --- Notifications ---
class NotificationItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tenant_id: str
    type: str
    title: str
    message: str
    is_read: bool
    metadata_json: dict[str, Any] | None = None
    created_at: datetime


class NotificationListResponse(BaseModel):
    unread_count: int
    total_notifications: int
    page: int = 1
    page_size: int = 50
    total_pages: int = 1
    notifications: list[NotificationItem]

