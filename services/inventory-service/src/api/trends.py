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
    from ..schemas.responses import TrendsResponse, TrendPoint
except ImportError:
    from cache import get_cached_json, set_cached_json
    from schemas.responses import TrendsResponse, TrendPoint

router = APIRouter(prefix="/analytics", tags=["Historical Trends"])


@router.get("/trends", response_model=TrendsResponse)
def get_historical_trends(
    brand: str | None = Query("Red Bull", description="Brand name to analyze"),
    sku_id: str | None = Query(None, description="Optional SKU ID"),
    platform: str | None = Query(None, description="Optional platform filter"),
    days: int = Query(7, ge=1, le=90, description="History window in days"),
    db: Session = Depends(get_db),
):
    """
    Component 3: Historical & OOS Trends
    Tracks time-series analytics — out-of-stock events, pricing fluctuations,
    and availability trajectory over the past 7, 30, or 90 days.
    """
    cache_key = f"analytics:trends:{brand}:{sku_id}:{platform}:{days}"
    cached = get_cached_json(cache_key)
    if cached:
        cached["cached"] = True
        return TrendsResponse(**cached)

    where_clauses = ["scraped_at >= NOW() - (:days || ' days')::INTERVAL"]
    params = {"days": str(days)}

    if brand:
        where_clauses.append("LOWER(brand) LIKE :brand")
        params["brand"] = f"%{brand.lower()}%"
    if sku_id:
        where_clauses.append("sku_id = :sku_id")
        params["sku_id"] = sku_id
    if platform:
        where_clauses.append("platform = :platform")
        params["platform"] = platform

    filter_sql = " AND ".join(where_clauses)

    # Time-bucket query by hour or day depending on range
    interval_bucket = "hour" if days <= 2 else "day"

    query = text(f"""
        SELECT DATE_TRUNC('{interval_bucket}', scraped_at) as bucket_time,
               COUNT(CASE WHEN in_stock = true THEN 1 END) as in_stock_count,
               COUNT(CASE WHEN in_stock = false THEN 1 END) as oos_count,
               ROUND(AVG(selling_price)::numeric, 2) as avg_price,
               COUNT(*) as total_events
        FROM inventory_snapshots
        WHERE {filter_sql}
        GROUP BY bucket_time
        ORDER BY bucket_time ASC
    """)

    rows = db.execute(query, params).mappings().all()

    points: list[TrendPoint] = []
    for r in rows:
        in_c = int(r["in_stock_count"] or 0)
        oos_c = int(r["oos_count"] or 0)
        total = in_c + oos_c
        rate = round((in_c / total * 100.0), 2) if total > 0 else 0.0
        avg_p = float(r["avg_price"]) if r["avg_price"] is not None else None

        points.append(
            TrendPoint(
                timestamp=str(r["bucket_time"]),
                in_stock_count=in_c,
                out_of_stock_count=oos_c,
                avg_selling_price=avg_p,
                availability_rate=rate,
            )
        )

    response_data = TrendsResponse(
        brand=brand,
        sku_id=sku_id,
        days=days,
        total_points=len(points),
        cached=False,
        timeline=points,
    )

    set_cached_json(cache_key, response_data.model_dump())
    return response_data
