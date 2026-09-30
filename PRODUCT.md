# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Framer Motion, Lucide Icons, FastAPI (Python 3.11), Redis Priority Queue (Bull/Celery architecture).

## Users

Primary users are FMCG Brand Managers, Quick-Commerce Directors, Key Account Managers, and D2C Growth Leads operating across India's rapid delivery ecosystems (Blinkit, Zepto, Swiggy Instamart, BigBasket Now).

## Product Purpose

Stoki provides real-time hyperlocal inventory intelligence, dark-store presence tracking, and out-of-stock (OOS) prevention. It transforms opaque dark-store fulfillment grids into actionable, 60-second telemetry so brands prevent revenue bleed and algorithmic de-ranking.

## Positioning

Unlike slow, batch-oriented e-commerce scrapers or generic web monitoring tools, Stoki is engineered specifically for India's 10-minute q-commerce delivery network. It features dark-store POD identification (e.g., Blinkit POD-402, Zepto CST), 60-second automated scan cadences, Redis-prioritized dispatching, and zero-bullshit stock numbers.

## Operating Context

Q-commerce channels operate on ruthless instant gratification. If a beverage or snack SKU goes out of stock in South Delhi or Bandra West for even 45 minutes during evening peak hours, the quick-commerce algorithm down-ranks the listing, and competitors take the sales volume. Brand managers need instant alerts, automated multi-city cron campaigns, and exact unit counts.

## Capabilities and Constraints

- **Multi-Platform Dark-Store Coverage:** Blinkit, Zepto, Swiggy Instamart, and BigBasket Now.
- **Pincode Precision:** Granular 6-digit Indian pincode resolution with dark-store POD mapping.
- **Automated Cron Campaigns:** Scheduled background scans (e.g., `0 9,18 * * *`) with multi-pincode fan-out.
- **Priority Redis Dispatcher:** Enterprise tier jobs execute via L-Push sub-40ms priority queues.
- **Visual Design Identity:** High-contrast dual theme (Obsidian Glass night mode default, Slate-50 Daylight mode).
- **Typography:** Plus Jakarta Sans for UI readability and JetBrains Mono for telemetry, prices, and pincodes.

## Brand Commitments

- **Name:** Stoki
- **Aesthetic:** Linear meets Stripe — dense, clean, and engineered.
- **Color Discipline:** High-contrast Monochrome paired with Electric Emerald (`#10B981`) and Amber (`#F59E0B`). Saturated purple/indigo AI gradients are explicitly avoided.
- **Tone:** Technical, confident, operational, and grounded.

## Evidence on Hand

- Interactive real-time scanner on hero section with genuine FMCG product vectors (Red Bull, Coke Zero, Lay's).
- Hyperlocal Dark-Store Coverage Matrix with metro city nodes (Mumbai MMR, Delhi NCR, Bengaluru).
- 4-Platform live price comparison and OOS variance engine.

## Product Principles

1. **Ground Truth Over Speculation:** Show exact dark-store POD IDs, verified unit counts, and real latency.
2. **Zero Layout Shift (CLS):** Real-time animations and card state switches must never cause page jitter.
3. **Razor-Sharp Dual Contrast:** Deep obsidian in dark mode, crisp paper-white in daylight mode — never washed-out low-contrast text.
4. **Calm Precision:** Meaningful status indicators instead of frantic blinking or purple AI glow effects.
