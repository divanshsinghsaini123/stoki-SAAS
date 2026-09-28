# Project: Stoki SaaS (Hyperlocal Q-Commerce Stock & Pricing Intelligence)

## 1. Executive Summary & Purpose

**Stoki** is a multi-tenant B2B inventory, out-of-stock (OOS), and pricing intelligence SaaS engineered for FMCG brands, consumer goods enterprises, and quick-commerce operators.

### 1.1 Problem Statement
Quick-commerce platforms (Blinkit, Zepto, Swiggy Instamart, BigBasket) operate decentralized dark-store fulfillment networks across Indian metro corridors. Stock availability, pricing, discounting, and pack configurations fluctuate minute-by-minute at the hyper-local pincode level. FMCG brands lose up to 18% of quick-commerce revenue due to undetected regional stock-outs and pricing discrepancies.

### 1.2 Objective & Core Value
Stoki automates real-time, pincode-level dark-store tracking across all 4 major platforms, normalizes fragmented catalog responses into a unified intelligence schema, flags stock anomalies in under 60 seconds, and provides actionable dashboards and webhook alerts to safeguard brand market share.

---

## 2. Monorepo Architecture & Tech Stack

The repository is organized as a unified monorepo:

```
stoki/
├── apps/
│   └── stoki_frontend/       # Next.js 15+ (App Router), Tailwind CSS v4, Framer Motion
├── services/
│   ├── api-gateway/          # FastAPI 0.110+, Python 3.11+, SQLAlchemy Async, JWT Auth
│   └── scrapers/             # Distributed scraper workers (Playwright, HTTPX, Proxies)
├── packages/
│   ├── database/             # PostgreSQL 16+ models (SQLAlchemy 2.0), Alembic migrations
│   └── shared/               # Shared Pydantic schemas, platform definitions, constants
├── PRODUCT.md                # Canonical Product Specification (Impeccable schema 1)
├── DESIGN.md                 # Canonical Design System & Token Spec (Impeccable schema 1)
└── agent.md                  # Master System Architecture & Engineering Guardrails
```

### 2.1 Technology Components
- **Frontend / Client Experience (`apps/stoki_frontend`):** Next.js 15+ App Router, React 19, TypeScript, Tailwind CSS v4, Geist fonts, Framer Motion.
- **Backend API Gateway (`services/api-gateway`):** FastAPI, Python 3.11+, Asyncpg, SQLAlchemy 2.0 async session, Redis caching, JWT token auth (`/api/v1/auth`, `/api/v1/telemetry`, `/api/v1/inventory`).
- **Scraper Services (`services/scrapers`):** Independent headless workers utilizing HTTPX and Playwright with residential proxy rotation, Akamai/Cloudflare anti-bot handling, and session pooling.
- **Task Dispatch & Caching:** Redis 7+ for scraping rate-limit queuing, worker job dispatch, and high-speed telemetry caching.
- **Primary Database (`packages/database`):** PostgreSQL 16+ utilizing relational columns for indexed lookups and `JSONB` for unstructured vendor attributes.

---

## 3. Data Flow & Unified Intelligence Schema

Every scraper worker normalizes platform payloads into the standard `inventory_snapshots` table before committing to PostgreSQL.

```
[ Quick-Commerce Platforms ]
  (Blinkit, Zepto, Instamart, BigBasket)
           │
           ▼
[ Distributed Scraper Workers ] (Playwright / HTTPX + Residential Proxies)
           │
           ▼
   [ Redis Ingestion Queue ]
           │
           ▼
[ Database Writer Microservice ]
           │
           ▼
 [ PostgreSQL 16+ Storage ] (Relational + JSONB Schema)
           │
           ▼
   [ FastAPI Gateway ] (Async SQLAlchemy / Endpoints)
           │
     ┌─────┴───────────────┐
     ▼                     ▼
[ Next.js Frontend ]  [ Webhook Alerts / Slack ]
```

### 3.1 Universal Core Fields (Relational Columns & Indexed)
| Column Name | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary key (auto-generated) |
| `platform` | VARCHAR(50) | Target platform (`blinkit`, `zepto`, `instamart`, `bigbasket`) |
| `pincode` | VARCHAR(10) | 6-digit Indian postal code (e.g. `400001`, `110001`) |
| `dark_store_id` | VARCHAR(100) | Platform-specific fulfillment hub ID (e.g. `POD-402`, `ZPT-CST`) |
| `sku_id` | VARCHAR(100) | Universal SKU or platform catalog identifier |
| `title` | VARCHAR(255) | Cleaned, normalized product title |
| `brand` | VARCHAR(100) | Extracted brand name (e.g. `Red Bull`, `Coca-Cola`, `Lay's`) |
| `mrp` | NUMERIC(10, 2) | Maximum Retail Price in INR |
| `selling_price` | NUMERIC(10, 2) | Active discounted purchase price in INR |
| `stock_status` | VARCHAR(20) | Enum: `in_stock`, `out_of_stock`, `low_stock` |
| `stock_qty` | INTEGER | Exact or bounded inventory quantity when reported |
| `scraped_at` | TIMESTAMPTZ | UTC timestamp of verification check |
| `platform_metadata` | **JSONB** | Dynamic, unstandardized platform attributes |

### 3.2 JSONB Specification (`platform_metadata`)
Platform-specific metadata is stored inside `platform_metadata` without altering relational table schemas:
- **Blinkit:** `{"eta_minutes": 11, "bundle_offer": true, "inventory_bucket": "high", "merchant_id": "pod-402"}`
- **Zepto:** `{"stock_count": 4, "badge": "Superfast", "discount_percentage": 15, "delivery_fee": 0}`
- **Swiggy Instamart:** `{"store_distance_km": 1.4, "rain_fee": false, "surge_active": false}`
- **BigBasket:** `{"slot_available": "Instant 15m", "rating": 4.5, "weight_grams": 500}`

---

## 4. Design Standards & Token Synchronization

All user interfaces adhere strictly to the canonical tokens documented in `d:\stoki\DESIGN.md`:
- **Primary Color:** Electric Emerald (`#10B981`) for live telemetry, in-stock badges, and active nodes.
- **Warning Color:** Warm Amber (`#F59E0B`) for high velocity, inventory warnings, and price drift.
- **Danger Color:** Crimson Rose (`#F43F5E`) for confirmed out-of-stock events and scraper blackouts.
- **Neutral Foundation:** High-Contrast Monochrome. Crisp `#F8FAFC` page background with pure white cards in light mode; obsidian `#09090B` with zinc `#18181B` surfaces in dark mode.
- **Banned Palette:** Saturated AI indigo/purple (`#6366F1`) is prohibited.
- **Platform Vectors:** Bespoke vector SVG components in `apps/stoki_frontend/components/ui/platform-logos.tsx` for Blinkit, Zepto, Swiggy Instamart, and BigBasket.

---

## 5. Engineering Guardrails for AI Agents

1. **Scraping Isolation:** Scrapers must remain independent worker microservices. Never place scraping logic inside Next.js server actions or frontend API routes.
2. **PostgreSQL JSONB Hygiene:** Use standard relational columns for fields requiring range queries, cross-platform aggregation, or multi-column foreign keys (`sku_id`, `pincode`, `selling_price`, `stock_status`). Reserve `platform_metadata` strictly for auxiliary vendor attributes.
3. **GIN Indexing:** Any query filtering keys or values inside `platform_metadata` must leverage PostgreSQL GIN indexes using the containment operator (`@>`).
4. **Idempotent Snapshot Commits:** Inventory writes should be append-only snapshot records or upserted based on `(platform, dark_store_id, sku_id, date_trunc('hour', scraped_at))`.
5. **Tailwind CSS v4 Dark Mode:** Class-based dark mode requires `@variant dark (&:where(.dark, .dark *));` in `apps/stoki_frontend/app/globals.css`. Never remove this.
6. **Zero Layout Shift (CLS = 0):** Always assign explicit fixed or minimum heights to animated UI containers (e.g. `ScannerWidget`, `CityRadar`).
7. **Calm Motion Standards:** Avoid frantic `animate-ping` animations. Keep pulse cycles calm (>= 3.5s).

---

## 6. Development Milestones & Current Status

| Milestone | Scope | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Milestone 1** | Standalone scrapers (Blinkit, BigBasket, Zepto, Instamart) | **Complete** | Akamai & Cloudflare bypass verified |
| **Milestone 2** | PostgreSQL Schema (Core + JSONB) in `packages/database` | **Complete** | SQLAlchemy async models + Alembic migrations |
| **Milestone 3** | FastAPI Gateway (`services/api-gateway`) | **Complete** | Auth routes, telemetry endpoints, JWT |
| **Milestone 4** | Next.js Landing Page & Design System | **Complete** | Impeccable tokens, 3D SKU stage, City Radar, Marquee |
| **Milestone 5** | Sticky-Scroll "How It Works" Flow & App Dashboards | **In Progress** | Enterprise onboarding & brand catalog setup |
