# Stoki Frontend Architecture & Engineering Guidelines (`apps/stoki_frontend`)

This document defines the definitive frontend architecture, styling standards, component hierarchy, design tokens, and engineering constraints for **Stoki** — Hyperlocal Q-Commerce Stock Intelligence SaaS.

---

## 1. Core Technology Stack

- **Framework:** Next.js 15+ (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4, Vanilla CSS tokens in `globals.css`
- **Class-Based Dark Mode:** Tailwind v4 requires `@variant dark (&:where(.dark, .dark *));` in `app/globals.css`. Never rely on media queries alone.
- **Typography:**
  - `font-sans`: Geist Sans (`var(--font-geist-sans)`)
  - `font-mono`: Geist Mono (`var(--font-geist-mono)`)
  - Loaded via `next/font/google` in `app/layout.tsx`.
- **Icons:** `lucide-react` for UI symbols + bespoke vector SVGs in `components/ui/platform-logos.tsx` for platform logos.
- **Animation:** `framer-motion` for intentional, purposeful micro-animations.

---

## 2. Design System & Visual Strategy

### 2.1 Thematic Tone: High-Contrast Minimalist
- **Light Mode Foundation:** Crisp `#F8FAFC` page background with pure white cards (`bg-white/95`), slate borders (`border-slate-200/90`), and deep charcoal/zinc text (`text-zinc-900`, `text-slate-700`). **Never use dark grey terminal cards or washed-out white text in light mode.**
- **Dark Mode Foundation:** Obsidian `#09090B` page background with deep zinc surfaces (`bg-zinc-900/90`, `bg-zinc-950/70`), subtle borders (`border-zinc-800`), and bright text (`text-zinc-100`, `text-zinc-400`).
- **AI Purple Ban:** The generic saturated indigo/purple palette (`#6366F1`) is strictly banned. The primary brand identity is High-Contrast Monochrome paired with Electric Emerald (`#10B981`) and Warm Amber (`#F59E0B`).

### 2.2 Color Tokens & Semantic Meanings
| Token | Hex | Semantic Role |
| :--- | :--- | :--- |
| **Emerald Primary** | `#10B981` | Live telemetry, healthy stock, verified badges, active signals |
| **Amber Warning** | `#F59E0B` | High velocity, low-stock warnings, price fluctuation alerts |
| **Rose Danger** | `#F43F5E` | Out-of-stock (OOS), scraping error blackout |
| **Blinkit** | `#F8CB46` | Blinkit platform brand accent |
| **Zepto** | `#8B5CF6` | Zepto platform brand accent |
| **Instamart** | `#FC8019` | Swiggy Instamart platform brand accent |
| **BigBasket** | `#84C225` | BigBasket platform brand accent |

---

## 3. Component Hierarchy & Page Architecture

### 3.1 Public Landing Page (`app/(public)/page.tsx`)
1. **`Navbar` (`components/ui/navbar.tsx`):**
   - Sticky floating glass navigation with responsive mobile menu and light/dark theme toggle.
2. **`HeroSection` (`components/sections/hero.tsx`):**
   - Side-by-side desktop layout (`grid lg:grid-cols-2`).
   - Left Column: Enterprise status pill with platform logos, headline, subtitle, dual CTAs (`btn-primary`, `btn-ghost`), trust badges, and 4-metric stats grid.
   - Right Column: `ScannerWidget`.
3. **`ScannerWidget` (`components/sections/hero.tsx`):**
   - Fixed dimensions (`min-h-[585px]`) to ensure 0 layout shift.
   - **Interactive 3D SKU Stage:** Elevated showcase (~126px height) with 3D vector beverage/snack illustrations (`Product3DIllustration`), left/right swap controls (`<` and `>`), and 3 pagination dots.
   - **Animated Pincode Roller:** Cycles between top Indian metro pincodes (Mumbai, Delhi, Bengaluru, Hyderabad) with manual pincode override.
   - **4-Platform Live Matrix:** 2x2 grid displaying real-time dark store IDs, stock status badges, and discount pricing across Blinkit, Zepto, Swiggy Instamart, and BigBasket.
4. **`CityRadar` (`components/sections/city-radar.tsx`):**
   - Multi-platform geographic fulfillment radar matrix.
   - Clean minimal white canvas in light mode (`bg-white border-slate-200/90`), deep obsidian in dark mode (`bg-zinc-950 border-zinc-800`).
   - Realistic Indian metro dark store coordinates with real-time stock velocity indicators.
5. **`BentoGrid` (`components/sections/bento.tsx`):**
   - Interactive feature cards: Real-time OOS alerts, velocity analytics sparklines, scraping queue Redis telemetry, and cross-platform catalog normalization.
6. **`ReviewsMarquee` (`components/sections/reviews-marquee.tsx`):**
   - Verified FMCG category managers reviews in dual-row infinite marquee.
   - Curated brand partner strip (`Paper Boat`, `Epigamia`, `Sleepy Owl`, `Chaayos`, `Blue Tokai`, `Slurrp Farm`, `The Whole Truth`, `Yoga Bar`) with category tags and color accents.
7. **`Footer` (`components/ui/footer.tsx`):**
   - Aesthetic minimal footer with platform coverage badges, navigation links, and subtle top accent divider.

---

## 4. Animation & Layout Stability Standards

1. **Zero Cumulative Layout Shift (CLS = 0):**
   - Always define fixed or minimum heights on animated containers (e.g. `h-[50px]`, `h-[126px]`, `min-h-[585px]`).
   - Use `overflow-hidden` on parent wrappers to prevent scroll jumps during transitions.
2. **Subtle & Calm Motion:**
   - Avoid frantic `animate-ping` effects.
   - Use calm, slow breathing keyframes (>= 3.5s) for live indicators.
   - Wrap animated elements in `AnimatePresence mode="wait"` with short duration (0.2s - 0.25s) for clean transitions.
3. **Hardware Acceleration:**
   - Use `transform` and `opacity` for Framer Motion transitions. Avoid animating `height` or `width` dynamically where possible.

---

## 5. Platform Logos & Asset Hygiene

- **Rule:** Never use raster PNGs, low-res JPEGs, or emojis for platform brand identities.
- **Implementation:** Always use `PlatformLogo` from `components/ui/platform-logos.tsx`, which provides pixel-perfect vector SVGs for:
  - `blinkit` (`BlinkitIcon`)
  - `zepto` (`ZeptoIcon`)
  - `instamart` (`InstamartIcon`)
  - `bigbasket` (`BigBasketIcon`)

---

## 6. Impeccable Quality Checklist

Before completing any frontend task:
1. **Light & Dark Mode Parity:** Toggle themes in the browser to ensure contrast is high, cards are crisp white in light mode, text is never washed out, and no dark-grey blocks appear in light mode.
2. **Run Lint & Build Verification:** Ensure `npm run dev` compiles with 0 errors and 0 hydration warnings.
3. **Check Canonical Specs:** Verify tokens against `d:\stoki\DESIGN.md` and product goals in `d:\stoki\PRODUCT.md`.
