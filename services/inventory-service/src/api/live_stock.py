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
    from ..schemas.responses import LiveStockResponse, LiveStockItem
except ImportError:
    from cache import get_cached_json, set_cached_json
    from schemas.responses import LiveStockResponse, LiveStockItem

router = APIRouter(prefix="/inventory", tags=["Live Stock"])


@router.get("/live-stock", response_model=LiveStockResponse)
def get_live_stock(
    brand: str | None = Query(None, description="Filter by brand name (e.g. 'Red Bull')"),
    brand_id: str | None = Query(None, description="Filter by brand ID"),
    platform: str | None = Query(None, description="Filter by platform ('blinkit', 'zepto', 'instamart', 'bigbasket')"),
    pincode: str | None = Query(None, description="Filter by 6-digit pincode"),
    sku_id: str | None = Query(None, description="Filter by platform SKU ID"),
    in_stock_only: bool = Query(False, description="Filter only in-stock items"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """
    Component 1: Live Stock Lookup
    Returns the real-time latest inventory snapshot for each dark store & SKU.
    Results are cached in Redis for fast sub-second dashboard delivery.
    """
    cache_key = f"inventory:live:{brand}:{brand_id}:{platform}:{pincode}:{sku_id}:{in_stock_only}:{limit}"
    cached = get_cached_json(cache_key)
    if cached:
        return LiveStockResponse(total_records=len(cached), cached=True, items=cached)

    # Use SQL window function to pick ONLY the latest snapshot per (platform, dark_store_id, sku_id)
    where_clauses = ["1=1"]
    params = {"limit": limit}

    if brand:
        where_clauses.append("LOWER(brand) LIKE :brand")
        params["brand"] = f"%{brand.lower()}%"
    if brand_id:
        where_clauses.append("brand_id = :brand_id")
        params["brand_id"] = brand_id
    if platform:
        where_clauses.append("platform = :platform")
        params["platform"] = platform
    if pincode:
        where_clauses.append("pincode = :pincode")
        params["pincode"] = pincode
    if sku_id:
        where_clauses.append("sku_id = :sku_id")
        params["sku_id"] = sku_id
    if in_stock_only:
        where_clauses.append("in_stock = true")

    filter_sql = " AND ".join(where_clauses)

    query = text(f"""
        WITH ranked_snapshots AS (
            SELECT *,
                   ROW_NUMBER() OVER(
                       PARTITION BY platform, dark_store_id, sku_id 
                       ORDER BY scraped_at DESC
                   ) as rn
            FROM inventory_snapshots
            WHERE {filter_sql}
        )
        SELECT id, brand_id, platform, pincode, dark_store_id, sku_id,
               parent_product_name, title, brand, size, mrp, selling_price,
               stock_status, in_stock, max_allowed_cart_qty, scraped_at, platform_metadata
        FROM ranked_snapshots
        WHERE rn = 1
        ORDER BY scraped_at DESC
        LIMIT :limit
    """)

    rows = db.execute(query, params).mappings().all()

    items = []
    for r in rows:
        item_dict = dict(r)
        item_dict["id"] = str(item_dict["id"])
        item_dict["mrp"] = float(item_dict["mrp"]) if item_dict["mrp"] is not None else None
        item_dict["selling_price"] = float(item_dict["selling_price"]) if item_dict["selling_price"] is not None else None
        items.append(LiveStockItem(**item_dict))

    # Cache response in Redis for 45s
    set_cached_json(cache_key, [item.model_dump() for item in items])

    return LiveStockResponse(total_records=len(items), cached=False, items=items)
