---
name: stoki-qcommerce-ui-architect
description: Enterprise UI/UX & Frontend Architecture skill for Stoki — Hyperlocal Q-Commerce Inventory & Stock Intelligence SaaS. Use this skill whenever creating or modifying Next.js pages, components, animations, themes, or dashboard views.
---

# Stoki Frontend Design & Architecture Skill

## 1. Brand Identity & Aesthetic Direction
- **Persona:** Linear.app meets Stripe & Vercel, tailored for FMCG & Q-Commerce brands.
- **Vibe:** Hyper-minimalist structure, high-craft glassmorphism, crisp 1px borders, and vibrant Q-Commerce platform accents.
- **Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, `next-themes` (Dark/Light mode), `shadcn/ui`, `framer-motion` (animations), `lucide-react` (icons), `recharts` or `tremor` (analytics).

---

## 2. Typography System
- **Primary Sans (`--font-geist-sans` or `Plus Jakarta Sans`):** Used for all UI, headings, and body text.
  - Hero Headline: `text-4xl md:text-6xl font-bold tracking-tight leading-[1.08]`
  - Section Headers: `text-2xl md:text-4xl font-semibold tracking-tight`
  - Dashboard KPIs: `text-2xl md:text-3xl font-bold tabular-nums`
- **Monospace (`--font-geist-mono` or `JetBrains Mono`):** Strictly required for Pincodes (`400001`), SKU IDs, Cron expressions (`0 9 * * *`), prices (`₹120.00`), and timestamps.

---

## 3. Adaptive Dual-Theme System (Dark & Light Mode)
Use `next-themes` with CSS variables in `globals.css`. Both modes must look equally first-class and intentional:

### Daylight Mode (Crisp Editorial Paper)
- **Background Primary:** `#FAFAFA` (Warm Alabaster)
- **Card / Surface:** `#FFFFFF` with subtle shadow `0 1px 3px rgba(0,0,0,0.04)` and border `1px solid #E4E4E7`
- **Text Primary:** `#09090B` (Deep Zinc) | **Text Muted:** `#71717A`
- **Primary Brand Accent:** `#4F46E5` (Electric Indigo)

### Night Mode (Obsidian Glass — Default)
- **Background Primary:** `#09090B` (Rich Obsidian)
- **Card / Surface:** `rgba(24, 24, 27, 0.65)` with `backdrop-blur-xl` and border `1px solid rgba(255,255,255,0.08)`
- **Text Primary:** `#FAFAFA` | **Text Muted:** `#A1A1AA`
- **Primary Brand Accent:** `#6366F1` (Glowing Indigo)

### Q-Commerce Platform Semantic Tokens (Used in Badges, Charts & Live Scanner)
- **Blinkit:** `#F8CB46` (Amber Yellow) -> Badge bg `bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20`
- **Zepto:** `#8B5CF6` (Electric Purple) -> Badge bg `bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20`
- **Instamart:** `#FC8019` (Swiggy Orange) -> Badge bg `bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20`
- **BigBasket:** `#84C225` (Fresh Green) -> Badge bg `bg-lime-500/10 text-lime-600 dark:text-lime-400 border-lime-500/20`
- **Stock Status:**
  - In Stock: Emerald (`#10B981`) with breathing pulse dot
  - Out of Stock (OOS): Rose (`#F43F5E`) with alert pulse dot

---

## 4. Public Website Architecture (4 Clean Pages Only)

### Global Sticky Navbar
- Floating glass bar (`sticky top-4 z-50 mx-auto max-w-6xl rounded-full border backdrop-blur-md px-6 py-3`).
- **Left:** Stoki Logo + live pulsing status dot.
- **Center Links:** `Home`, `How It Works`, `Pricing`, `Contact`.
- **Right Actions:** Theme Toggle (Sun/Moon morph animation), `Login` (ghost button), `Start Tracking` (primary gradient button).

### Page 1: Landing Page (`/`)
1. **Hero Section with Interactive "Live Dark-Store Scanner" Widget:**
   - **Left/Top:** Headline *"Track Your Brand's Pulse Across Every Pincode & Dark Store."* + CTA buttons.
   - **Right/Bottom (The Creative Centerpiece):** An interactive glass card featuring:
     - **SKU Selector:** Tabs to switch sample FMCG products (e.g., *Red Bull Energy 250ml*, *Cloud9 Energy Can*, *Coca-Cola Zero 300ml*).
     - **Animated Pincode Slot-Roller:** Cycles automatically every 3.5 seconds (`400001 Mumbai` -> `110001 Delhi` -> `560001 Bengaluru` -> `136129 Kurukshetra`) or lets the visitor type a pincode.
     - **4-Platform Matrix:** Shows Blinkit, Zepto, Instamart, and BigBasket cards side-by-side. As the pincode flips, cards animate using `framer-motion` (`layoutId`) showing:
       - Dark Store ID (`POD-402`, `DS-MUM-09`)
       - Live Status Badge (`IN STOCK - Max Qty 12` in glowing green vs `OUT OF STOCK` in pulsing red)
       - Selling Price vs MRP (`₹115` ~~`₹125`~~)
2. **Infinite Brand & Review Marquee:**
   - Dual-row horizontal infinite scroll (`marquee`).
   - Fetches approved reviews from `GET /api/v1/reviews?is_published=true` showing Manager Name, Designation, Company Name, Star Rating, and quote.
3. **Bento Grid Feature Showcase (4 Asymmetric Cards):**
   - **Card 1 (Large):** Hyperlocal Pincode Heatmap visual.
   - **Card 2:** Instant OOS Alert simulation (Slack/Email/In-App toast animation).
   - **Card 3:** Price & Discount Variance sparkline chart across platforms.
   - **Card 4:** Automated Cron Campaign Scheduler preview.
4. **Canonical Interactive FAQ Accordion (`components/sections/faq.tsx`):**
   - Universal animated accordion component exporting `UNIFIED_FAQS` (9 comprehensive questions on 30-day passes, pincode coverage, Razorpay payment methods, scan frequencies, coupons, GST invoices, scan quotas, multi-brand tracking, and OOS notifications).
   - Reused across both Landing Page (`/`) and Pricing Page (`/pricing`) to guarantee 100% visual and content consistency.

### Page 2: How It Works (`/how-it-works`)
- **Sticky Scroll Storytelling:** 3-step vertical timeline on the left (`1. Configure Brands & Pincodes` -> `2. Automated Dark-Store Scraping` -> `3. Real-Time Intelligence & Alerts`) with a sticky interactive visual stage on the right that morphs as the user scrolls.

### Page 3: Pricing (`/pricing`)
- **Landing Page Design Inheritance:**
  - Must strictly mirror the Landing Page aesthetics: deep obsidian (`#09090B`) in dark mode, crisp `#F8FAFC` in light mode, ambient blur glow accents, pill badges (`rounded-full`), and `btn-primary` pill buttons.
- **30-Day Pass Model (No complex wallet clutter):**
  - Clean 3-tier cards: **Starter**, **Pro** (Highlighted with animated emerald border and popular pill), and **Enterprise**.
  - `JetBrains Mono` / `font-mono` tabular numbers for prices (`₹4,999`, `₹14,999`, `₹49,999`).
  - Direct checkout CTA triggering the Razorpay Standard flow with in-app coupon engine.
  - Reuses the canonical `<FAQSection />` component with shared `UNIFIED_FAQS` data.

### Page 4: Contact & Demo (`/contact`)
- Split layout: Left side shows direct enterprise support metrics & quick contact cards; Right side embeds a clean scheduling/inquiry card.

---

## 5. Post-Login Dashboard Architecture (`/dashboard/*`)

Prioritize **actionable intelligence at the top** and **granular exploration below**:

1. **Top Bar:** Brand Switcher dropdown (for multi-brand tenants), Plan Expiry Countdown pill (`22 days left on Pro Pass — Renew`), Notification Bell dropdown (connected to `/api/v1/notifications`), and Theme Toggle.
2. **Row 1 — Executive KPI Cards (Top Priority):**
   - **Overall Availability Rate:** Radial progress + percentage (e.g., `86.4%`) + delta badge.
   - **Active Dark Stores Monitored:** Count across all 4 platforms.
   - **Critical OOS Breaches:** Red highlight card showing SKUs currently out of stock.
   - **Daily Scan Quota:** Progress bar (`14 / 50 scans used today`).
3. **Row 2 — Visual Analytics (Charts):**
   - **Left (60%):** Platform-wise Availability Bar/Area Chart (Blinkit vs Zepto vs Instamart vs BigBasket).
   - **Right (40%):** Recent OOS & Price Drop Alert Stream.
4. **Row 3 — Live Stock Explorer Table (Connected to `/api/v1/inventory/live-stock`):**
   - Filters bar: Platform pills, Pincode search, Brand filter, and `In-Stock Only` switch.
   - Server-side pagination using `limit`, `offset`, and `full_count` from backend response.
5. **Campaign Manager (`/dashboard/campaigns`):**
   - Visual multi-select for Platforms (with logos), Pincode tag input, Manual `"Scan Now"` trigger button (`POST /api/v1/campaigns/{id}/trigger`), and visual Cron time picker (`9:00 AM`, `6:00 PM`).
6. **Submit Review Modal (`/dashboard/feedback`):**
   - Allows logged-in managers to submit a rating and testimonial to `POST /api/v1/reviews` (queued with `is_published=False` for admin approval).

---

## 6. Micro-Interaction & Animation Rules
- Keep all transitions fast (`150ms–300ms`) using spring physics (`type: "spring", stiffness: 300, damping: 25`).
- Never block user input with heavy animations.
- Use skeleton shimmer loaders matching the exact card dimensions while fetching from FastAPI endpoints.