import sys
from pathlib import Path

# Add project root to sys.path so 'packages' can be imported
PROJECT_ROOT = Path(__file__).resolve().parents[4]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from packages.database.connection import get_db
try:
    from ..cache import get_cached_json, set_cached_json
    from ..schemas.responses import AlertsResponse, AlertItem
except ImportError:
    from cache import get_cached_json, set_cached_json
    from schemas.responses import AlertsResponse, AlertItem

router = APIRouter(prefix="/alerts", tags=["Inventory Alerts"])


@router.get("", response_model=AlertsResponse)
def get_inventory_alerts(
    brand: str | None = Query("Red Bull", description="Brand name to scan alerts for"),
    platform: str | None = Query(None, description="Optional platform filter"),
    pincode: str | None = Query(None, description="Optional pincode filter"),
    severity: str | None = Query(None, description="Filter by severity: 'CRITICAL', 'WARNING', 'INFO'"),
    db: Session = Depends(get_db),
):
    """
    Component 4: Low Stock & Breach Alerts
    Detects critical stock-outs, low-stock thresholds, and cart quantity limit breaches
    from latest dark store snapshots and platform-specific JSONB flags.
    """
    cache_key = f"inventory:alerts:{brand}:{platform}:{pincode}:{severity}"
    cached = get_cached_json(cache_key)
    if cached:
        cached["cached"] = True
        return AlertsResponse(**cached)

    where_clauses = ["1=1"]
    params = {}

    if brand:
        where_clauses.append("LOWER(brand) LIKE :brand")
        params["brand"] = f"%{brand.lower()}%"
    if platform:
        where_clauses.append("platform = :platform")
        params["platform"] = platform
    if pincode:
        where_clauses.append("pincode = :pincode")
        params["pincode"] = pincode

    filter_sql = " AND ".join(where_clauses)

    query = text(f"""
        WITH latest_snapshots AS (
            SELECT DISTINCT ON (platform, dark_store_id, sku_id)
                   id, platform, pincode, dark_store_id, sku_id,
                   title, brand, mrp, selling_price, in_stock, stock_status,
                   max_allowed_cart_qty, platform_metadata, scraped_at
            FROM inventory_snapshots
            WHERE {filter_sql}
            ORDER BY platform, dark_store_id, sku_id, scraped_at DESC
        )
        SELECT *
        FROM latest_snapshots
        WHERE in_stock = false
           OR (max_allowed_cart_qty IS NOT NULL AND max_allowed_cart_qty <= 3)
           OR platform_metadata->>'quantityLimitBreachedMessage' IS NOT NULL
           OR platform_metadata->>'lowStockText' IS NOT NULL
        ORDER BY scraped_at DESC
        LIMIT 100
    """)

    rows = db.execute(query, params).mappings().all()

    alert_list: list[AlertItem] = []
    for r in rows:
        meta = r.get("platform_metadata") or {}
        in_stock = r["in_stock"]
        cart_qty = r["max_allowed_cart_qty"]
        breach_msg = meta.get("quantityLimitBreachedMessage")
        low_stock_msg = meta.get("lowStockText")

        # Determine alert classification
        if not in_stock:
            a_type = "OUT_OF_STOCK"
            sev = "CRITICAL"
            msg = f"Item is completely OUT OF STOCK at dark store {r['dark_store_id']} (Pincode {r['pincode']})."
        elif breach_msg:
            a_type = "CART_LIMIT_BREACH"
            sev = "WARNING"
            msg = f"Cart limit restriction breached: {breach_msg}"
        elif low_stock_msg or (cart_qty is not None and cart_qty <= 3):
            a_type = "LOW_STOCK"
            sev = "WARNING"
            units_text = f"Only {cart_qty} units left" if cart_qty else (low_stock_msg or "Low stock remaining")
            msg = f"Low stock warning: {units_text}."
        else:
            continue

        if severity and sev != severity.upper():
            continue

        alert_list.append(
            AlertItem(
                alert_type=a_type,
                severity=sev,
                platform=r["platform"],
                pincode=r["pincode"],
                dark_store_id=r["dark_store_id"],
                sku_id=r["sku_id"],
                title=r["title"],
                brand=r["brand"],
                message=msg,
                details={
                    "mrp": float(r["mrp"]) if r["mrp"] else None,
                    "selling_price": float(r["selling_price"]) if r["selling_price"] else None,
                    "max_allowed_cart_qty": cart_qty,
                    "metadata": meta,
                },
                detected_at=r["scraped_at"],
            )
        )

    response_data = AlertsResponse(
        total_alerts=len(alert_list),
        cached=False,
        alerts=alert_list,
    )

    set_cached_json(cache_key, response_data.model_dump())
    return response_data
