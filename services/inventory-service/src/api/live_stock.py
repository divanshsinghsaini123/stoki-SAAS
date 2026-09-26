import math
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
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page (1-200)"),
    db: Session = Depends(get_db),
):
    """
    Component 1: Live Stock Lookup with Server-Side Pagination
    - Picks the latest snapshot for each (platform, dark_store_id, sku_id).
    - Supports page & page_size with LIMIT and OFFSET.
    - Cached in Redis for sub-second retrieval.
    """
    offset = (page - 1) * page_size
    cache_key = f"inventory:live:{brand}:{brand_id}:{platform}:{pincode}:{sku_id}:{in_stock_only}:{page}:{page_size}"
    cached = get_cached_json(cache_key)
    if cached:
        cached["cached"] = True
        return LiveStockResponse(**cached)

    where_clauses = ["1=1"]
    params = {"limit": page_size, "offset": offset}

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
        ),
        latest_items AS (
            SELECT *,
                   COUNT(*) OVER() as full_count
            FROM ranked_snapshots
            WHERE rn = 1
        )
        SELECT id, brand_id, platform, pincode, dark_store_id, sku_id,
               parent_product_name, title, brand, size, mrp, selling_price,
               stock_status, in_stock, max_allowed_cart_qty, scraped_at, platform_metadata,
               full_count
        FROM latest_items
        ORDER BY scraped_at DESC
        LIMIT :limit OFFSET :offset
    """)

    rows = db.execute(query, params).mappings().all()

    items = []
    total_records = 0

    for r in rows:
        total_records = int(r["full_count"])
        item_dict = dict(r)
        item_dict.pop("full_count", None)
        item_dict["id"] = str(item_dict["id"])
        item_dict["mrp"] = float(item_dict["mrp"]) if item_dict["mrp"] is not None else None
        item_dict["selling_price"] = float(item_dict["selling_price"]) if item_dict["selling_price"] is not None else None
        items.append(LiveStockItem(**item_dict))

    total_pages = max(1, math.ceil(total_records / page_size)) if total_records > 0 else 1
    has_next = page < total_pages
    has_prev = page > 1

    response = LiveStockResponse(
        total_records=total_records,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=has_next,
        has_prev=has_prev,
        cached=False,
        items=items,
    )

    # Cache response in Redis for 45s
    set_cached_json(cache_key, response.model_dump())

    return response
