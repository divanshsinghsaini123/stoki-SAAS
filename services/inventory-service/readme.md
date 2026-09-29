services/inventory-service/src/
├── main.py                     # FastAPI application, CORS, and /health
├── config.py                   # Environment config (.env loader & port mappings)
├── cache.py                    # Redis Caching Layer (Sub-second retrieval with fallback)
├── schemas/
│   └── responses.py            # Pydantic response models for all endpoints
└── api/
    ├── __init__.py             # Router exports
    ├── live_stock.py           # [Pillar 1] Live Stock Lookup
    ├── availability.py         # [Pillar 2] Availability Rate & Metrics Engine
    ├── trends.py               # [Pillar 3] Historical & OOS / Pricing Trends
    └── alerts.py               # [Pillar 4] Low Stock & Cart Limit Breach Alerts



Implementation Details:
1. Live Stock Lookup (GET /api/v1/inventory/live-stock)
File: 

live_stock.py
Logic: PostgreSQL window function ROW_NUMBER() OVER (PARTITION BY platform, dark_store_id, sku_id ORDER BY scraped_at DESC) use karke har dark store aur SKU ka sabse latest snapshot nikaalta hai.
Filters: brand, brand_id, platform, pincode, sku_id, in_stock_only.
2. Availability Rate & Metrics Engine (GET /api/v1/analytics/availability-rate)
File: 

availability.py
Logic: Exact formula implement ki hai: $$\text{Availability Rate} = \left( \frac{\text{In-Stock Stores}}{\text{Total Servicing Stores}} \right) \times 100$$
Breakdown:
Overall brand score
Platform-wise breakdown (Blinkit, Zepto, Instamart, BigBasket)
Pincode-wise matrix (e.g., 400001 vs 400009)
3. Historical & OOS Trends (GET /api/v1/analytics/trends)
File: 

trends.py
Logic: DATE_TRUNC se time-series aggregation karta hai (7, 30 ya 90 din ka window).
OOS counts, in-stock count, average selling price aur availability trajectory return karta hai (dashboard charts ke liye).
4. Low Stock & Breach Alerts (GET /api/v1/alerts)
File: 

alerts.py
Alert Types:
OUT_OF_STOCK (Critical): Item kisi dark store me poora khatam ho gaya.
LOW_STOCK (Warning): max_allowed_cart_qty <= 3 ya metadata me lowStockText.
CART_LIMIT_BREACH (Warning): Vendor JSONB metadata me quantityLimitBreachedMessage flag hona.
5. Redis Caching Layer (cache.py)
File: 

cache.py
Saare analytical aur lookup endpoints Redis me cached rehte hain (45s TTL) taaki dashboard par sub-second response mile.
Fail-safe: Agar Redis temporarily down ho, to automatically direct database query par fallback karta hai bina request fail kiye.