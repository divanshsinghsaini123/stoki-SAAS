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
    from ..schemas.responses import (
        AvailabilityMetricsResponse,
        PlatformAvailability,
        PincodeAvailability,
    )
except ImportError:
    from cache import get_cached_json, set_cached_json
    from schemas.responses import (
        AvailabilityMetricsResponse,
        PlatformAvailability,
        PincodeAvailability,
    )

router = APIRouter(prefix="/analytics", tags=["Availability Metrics"])


@router.get("/availability-rate", response_model=AvailabilityMetricsResponse)
def get_availability_rate(
    brand: str | None = Query("Red Bull", description="Brand name to analyze"),
    brand_id: str | None = Query(None, description="Brand ID to analyze"),
    pincode: str | None = Query(None, description="Optional pincode filter"),
    db: Session = Depends(get_db),
):
    """
    Component 2: Availability Rate & Metrics Engine
    Calculates dark-store level availability percentage:
        Availability Rate = (In-Stock Stores / Total Servicing Stores) * 100
    Provides overall score, platform-wise breakdown, and pincode-wise matrix.
    """
    cache_key = f"analytics:availability:{brand}:{brand_id}:{pincode}"
    cached = get_cached_json(cache_key)
    if cached:
        cached["cached"] = True
        return AvailabilityMetricsResponse(**cached)

    where_clauses = ["1=1"]
    params = {}

    if brand:
        where_clauses.append("LOWER(brand) LIKE :brand")
        params["brand"] = f"%{brand.lower()}%"
    if brand_id:
        where_clauses.append("brand_id = :brand_id")
        params["brand_id"] = brand_id
    if pincode:
        where_clauses.append("pincode = :pincode")
        params["pincode"] = pincode

    filter_sql = " AND ".join(where_clauses)

    # 1. Overall & per-platform metrics based on the latest snapshot per store
    query = text(f"""
        WITH latest_store_skus AS (
            SELECT DISTINCT ON (platform, dark_store_id, sku_id)
                   platform, pincode, dark_store_id, sku_id, in_stock
            FROM inventory_snapshots
            WHERE {filter_sql}
            ORDER BY platform, dark_store_id, sku_id, scraped_at DESC
        )
        SELECT platform,
               COUNT(DISTINCT dark_store_id) as total_stores,
               COUNT(DISTINCT CASE WHEN in_stock = true THEN dark_store_id END) as in_stock_stores,
               COUNT(DISTINCT CASE WHEN in_stock = false THEN dark_store_id END) as oos_stores
        FROM latest_store_skus
        GROUP BY platform
    """)

    platform_rows = db.execute(query, params).mappings().all()

    total_servicing = 0
    total_in_stock = 0
    by_platform: list[PlatformAvailability] = []

    for r in platform_rows:
        t_stores = int(r["total_stores"] or 0)
        in_stores = int(r["in_stock_stores"] or 0)
        oos_stores = int(r["oos_stores"] or 0)
        rate = round((in_stores / t_stores * 100.0), 2) if t_stores > 0 else 0.0

        total_servicing += t_stores
        total_in_stock += in_stores

        by_platform.append(
            PlatformAvailability(
                platform=r["platform"],
                total_stores=t_stores,
                in_stock_stores=in_stores,
                out_of_stock_stores=oos_stores,
                availability_rate=rate,
            )
        )

    # 2. Pincode-wise metrics
    pincode_query = text(f"""
        WITH latest_store_skus AS (
            SELECT DISTINCT ON (platform, dark_store_id, sku_id)
                   pincode, dark_store_id, in_stock
            FROM inventory_snapshots
            WHERE {filter_sql}
            ORDER BY platform, dark_store_id, sku_id, scraped_at DESC
        )
        SELECT pincode,
               COUNT(DISTINCT dark_store_id) as total_stores,
               COUNT(DISTINCT CASE WHEN in_stock = true THEN dark_store_id END) as in_stock_stores,
               COUNT(DISTINCT CASE WHEN in_stock = false THEN dark_store_id END) as oos_stores
        FROM latest_store_skus
        GROUP BY pincode
        ORDER BY pincode
    """)

    pincode_rows = db.execute(pincode_query, params).mappings().all()
    by_pincode: list[PincodeAvailability] = []

    for r in pincode_rows:
        t_stores = int(r["total_stores"] or 0)
        in_stores = int(r["in_stock_stores"] or 0)
        oos_stores = int(r["oos_stores"] or 0)
        rate = round((in_stores / t_stores * 100.0), 2) if t_stores > 0 else 0.0

        by_pincode.append(
            PincodeAvailability(
                pincode=r["pincode"],
                total_stores=t_stores,
                in_stock_stores=in_stores,
                out_of_stock_stores=oos_stores,
                availability_rate=rate,
            )
        )

    overall_rate = (
        round((total_in_stock / total_servicing * 100.0), 2)
        if total_servicing > 0
        else 0.0
    )
    total_oos = total_servicing - total_in_stock

    response_data = AvailabilityMetricsResponse(
        brand=brand,
        total_servicing_stores=total_servicing,
        in_stock_stores=total_in_stock,
        out_of_stock_stores=max(0, total_oos),
        overall_availability_rate=overall_rate,
        by_platform=by_platform,
        by_pincode=by_pincode,
        cached=False,
    )

    set_cached_json(cache_key, response_data.model_dump())
    return response_data
