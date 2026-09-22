```markdown
# Project: Stoki SaaS (Hyperlocal Q-Commerce Inventory Intelligence)

## 1. Executive Summary & Purpose
Stoki is a multi-tenant B2B inventory, stock-out, and pricing intelligence SaaS designed for FMCG brands, consumer goods companies, and quick-commerce operators.

### Problem Statement
Quick-commerce platforms (Blinkit, BigBasket, Zepto, Swiggy Instamart) operate on decentralized, dark-store fulfillment models. Inventory levels, pricing, discounting, and stock availability change minute-by-minute at the hyper-local pincode level. Brands lose market share due to unmonitored stock-outs and regional pricing errors with zero real-time visibility.

### Objective
Stoki automates pincode-level dark-store tracking across quick-commerce channels, normalizes fragmented catalog responses into a unified intelligence schema, flags stock anomalies, and provides clean analytics to optimize brand availability.


## 2. System Architecture & Tech Stack


### Stack Components
- **Frontend / BFF:** Next.js (TypeScript) handling user authentication sessions, visualization dashboards, and SSR.
- **Backend API & Processing:** Python 3.11+ (FastAPI, SQLAlchemy, Celery/Arq) for long-running batch ingestion and analytics.
- **Message Broker & Queue:** Redis for task dispatching and scraper rate-limit queuing.
- **Primary Database:** PostgreSQL 16+ utilizing relational columns for indexed lookups and `JSONB` for unstructured vendor attributes.
- **Automation / Scraping:** Playwright, HTTPX, and residential proxy rotation.

---

## 3. Data Entities & Ingestion Standards

Every scraper must normalize platform-specific payloads into the standard `inventory_snapshots` table before saving to PostgreSQL.

### Universal Core Fields (Relational Columns & Indexed)
| Column Name | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary key (auto-generated) |
| `platform` | VARCHAR(50) | Target platform (`blinkit`, `bigbasket`, `zepto`) |
| `pincode` | VARCHAR(10) | 6-digit Indian postal code |
| `dark_store_id` | VARCHAR(100) | Platform-specific store/warehouse identifier |
| `sku_id` | VARCHAR(100) | Universal SKU or platform product identifier |
| `title` | VARCHAR(255) | Cleaned product display name |
| `brand` | VARCHAR(100) | Extracted or normalized brand name |
| `mrp` | NUMERIC(10, 2) | Maximum Retail Price in INR |
| `selling_price` | NUMERIC(10, 2) | Active discounted purchase price in INR |
| `stock_status` | VARCHAR(20) | Enum: `in_stock`, `out_of_stock`, `low_stock` |
| `scraped_at` | TIMESTAMPTZ | UTC timestamp of the scraper check |
| `platform_metadata` | **JSONB** | Dynamic, unstandardized platform attributes |

### JSONB Specification (`platform_metadata`)
Any extra or fluctuating data returned by specific platforms must go inside this field without altering the relational schema:
- **Blinkit:** `{"eta_minutes": 11, "bundle_offer": true, "inventory_bucket": "high"}`
- **BigBasket:** `{"slot_available": "Tomorrow Morning", "rating": 4.5, "weight_grams": 500}`
- **Zepto:** `{"stock_count": 4, "badge": "Superfast", "discount_percentage": 15}`

---

## 4. Engineering Guardrails for the AI Agent

1. **Scraping Isolation:** Scrapers must remain independent worker microservices. Never place scraping logic inside Next.js server actions or frontend API routes.
2. **PostgreSQL JSONB Hygiene:** Use standard relational columns for fields that require range queries, cross-platform aggregation, or multi-column foreign keys (`sku_id`, `pincode`, `selling_price`). Reserve `platform_metadata` strictly for auxiliary, vendor-specific flags.
3. **GIN Indexing:** Any query checking key/value pairs inside `platform_metadata` must leverage PostgreSQL GIN indexes using the containment operator (`@>`).
4. **Resilient Parsing:** Quick-commerce APIs update headers and contracts often. Every worker must wrap response parsing in Pydantic models with `default=None` or fallback fall-throughs.
5. **Idempotency:** Inventory writes should be append-only snapshot records or upserted based on `(platform, dark_store_id, sku_id, date_trunc('hour', scraped_at))`.

---

## 5. Development Roadmap & Priorities
1. **Milestone 1:** Build standalone Blinkit and BigBasket scraper workers with proxy and anti-bot handling.
2. **Milestone 2:** Define PostgreSQL schema (Core + `JSONB`) in `packages/database` and implement the Redis ingestion queue.
3. **Milestone 3:** Create FastAPI endpoints for inventory aggregation, out-of-stock alerts, and price tracking.
4. **Milestone 4:** Build the Next.js client dashboard consuming the FastAPI gateway endpoints.

