---
name: Stoki Design System
description: Hyperlocal Q-Commerce Stock Intelligence & Dark-Store Telemetry
colors:
  primary: "#10B981"
  primary-hover: "#059669"
  amber: "#F59E0B"
  amber-glow: "rgba(245, 158, 11, 0.25)"
  dark-bg: "#09090B"
  dark-surface: "rgba(24, 24, 27, 0.7)"
  dark-border: "rgba(255, 255, 255, 0.1)"
  light-bg: "#F8FAFC"
  light-surface: "#FFFFFF"
  light-border: "#E2E8F0"
  text-primary-dark: "#FAFAFA"
  text-primary-light: "#0F172A"
  text-muted-dark: "#A1A1AA"
  text-muted-light: "#64748B"
  platform-blinkit: "#F8CB46"
  platform-zepto: "#8B5CF6"
  platform-instamart: "#FC8019"
  platform-bigbasket: "#84C225"
  status-in-stock: "#10B981"
  status-oos: "#F43F5E"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(2.5rem, 5vw, 3.75rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Plus Jakarta Sans, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Plus Jakarta Sans, system-ui, -apple-system, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  mono:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.01em"
rounded:
  sm: "6px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary-dark:
    backgroundColor: "#FFFFFF"
    textColor: "#09090B"
    rounded: "{rounded.full}"
    padding: "10px 24px"
  button-primary-light:
    backgroundColor: "#0F172A"
    textColor: "#FFFFFF"
    rounded: "{rounded.full}"
    padding: "10px 24px"
  card-glass:
    rounded: "{rounded.lg}"
    padding: "20px 24px"
---

# Stoki Design System

## Overview

Stoki's design language combines the clinical precision of **Linear.app** with the fintech polish of **Stripe** and **Vercel**, tailored specifically for India's high-speed quick-commerce supply chain.

The visual direction centers on **High-Contrast Monochrome with Electric Emerald and Amber accents**, replacing generic AI indigo/purple gradients with a disciplined, operational telemetry aesthetic.

## Colors

### Theme Dual Modes

- **Night Mode (Default):**
  - Background: `#09090B` (Deep Obsidian)
  - Surface: `rgba(24, 24, 27, 0.70)` with 24px backdrop-blur
  - Border: `rgba(255, 255, 255, 0.10)`
  - Primary Text: `#FAFAFA`
  - Muted Text: `#A1A1AA`

- **Daylight Mode:**
  - Background: `#F8FAFC` (Editorial Slate-50)
  - Surface: `#FFFFFF` (Pure white card pop)
  - Border: `#E2E8F0` / `#CBD5E1`
  - Primary Text: `#0F172A`
  - Muted Text: `#64748B`

### Brand Accents

- **Electric Emerald (`#10B981` / `#059669`):** Core telemetry, healthy dark-store nodes, 99%+ availability.
- **Amber Gold (`#F59E0B` / `#D97706`):** Velocity surge, pricing variance warnings, premium pass highlights.
- **Rose / Crimson (`#F43F5E` / `#E11D48`):** Out-of-stock (OOS) critical spikes.

### Platform Palette (Authentic Q-Commerce Identity)

- **Blinkit:** `#F8CB46` (Canary Yellow)
- **Zepto:** `#8B5CF6` (Vibrant Violet)
- **Swiggy Instamart:** `#FC8019` (Sunset Orange)
- **BigBasket Now:** `#84C225` (Lime Green)

## Typography

### Font Families

- **Primary UI & Copy:** `Plus Jakarta Sans` — Clean, modern, highly legible geometric sans-serif that eliminates the generic system/inter template look while remaining effortless on the eyes.
- **Data, Telemetry, SKUs & Crons:** `JetBrains Mono` — Crisp, developer-grade monospace with tabular figures for pincodes (`400001`), stock numbers, prices (`₹115.00`), and cron expressions (`0 9,18 * * *`).

### Scale

- **Display (Hero H1):** `text-4xl md:text-6xl font-bold tracking-tight leading-[1.08]`
- **Headline (Section H2):** `text-3xl md:text-5xl font-bold tracking-tight`
- **Sub-headline (Card H3):** `text-base md:text-lg font-semibold`
- **Body:** `text-sm md:text-base leading-relaxed`
- **Mono Subtext:** `text-[10px] md:text-xs font-mono font-medium`

## Layout

- **Max Container:** `max-w-6xl mx-auto px-6`
- **Vertical Section Rhythm:** `py-20` to `py-24` with subtle top and bottom borders (`border-y border-[var(--border)]`).
- **Zero Cumulative Layout Shift (CLS):** Real-time widgets (such as the Hero Live Scanner) maintain fixed container and matrix grid heights (`h-[565px]`, `h-[292px]`) to ensure zero layout shift during SKU switches or live polling updates.

## Elevation & Depth

- **Tonal Layering Over Heavy Shadows:** Depth is achieved using semi-transparent glass borders (`border border-zinc-200/90 dark:border-zinc-800`), 24px–40px backdrop blur, and subtle ambient glows (`emerald-500/5`, `amber-500/5`).
- **Cards:** Crisp white cards in light mode with subtle `shadow-sm`, obsidian glass cards in dark mode.

## Shapes

- **Corner Radius:**
  - Micro tags / pills: `rounded-full`
  - Small data cells: `rounded-xl` (12px)
  - Bento cards & product modules: `rounded-2xl` (16px)
  - Radar and stage containers: `rounded-3xl` (24px)
- **Form Controls:** Clean borderless inputs embedded in pill and rounded containers.

## Components

### Primary CTA Button

- **Dark Mode:** `#FFFFFF` background, `#09090B` text, white glow.
- **Light Mode:** `#0F172A` deep obsidian background, `#FFFFFF` text.
- **Hover:** Smooth scale (`transform: translateY(-1px)`) with expanded shadow.

### Enterprise Status Pill

- Pill container with 4 platform identity dots (`Blinkit`, `Zepto`, `Instamart`, `BigBasket`), divider line, and clear status copy: *"Tracking 500+ dark stores in real time"*.

### Platform Cards

- Compact fixed-height cards (`h-[142px]`) featuring platform badge, dark-store POD ID, in-stock badge with max purchase quota, and MRP vs platform price comparison.

### Review Cards

- Dual-theme testimonials with verified brand badges, 5-star ratings, author initials avatar, and high-contrast quote text (`text-zinc-700 dark:text-zinc-200`).

## Do's and Don'ts

### Do's

- **Do** preserve crisp light-mode contrast: always pair light backgrounds with dark text (`text-zinc-900`, `text-zinc-700`, `text-zinc-600`).
- **Do** use `JetBrains Mono` for all numbers, pincodes, latencies, and prices to ensure tabular alignment.
- **Do** use calm, purposeful status dots (solid or slow 3.5s breathing) rather than frantic pulsing.
- **Do** use realistic FMCG brands and products (e.g. Red Bull Energy 250ml, Coca-Cola Zero 300ml, Lay's 52g) rather than generic placeholders.

### Don'ts

- **Don't** use indigo/purple AI themes (`#6366F1`) as primary accents.
- **Don't** use robotic AI jargon like *"Live Dark-Store Mesh Telemetry Pinging every 60s"*. Use grounded B2B terms like *"Dark-Store Network Coverage • 60s Scan Cycles"*.
- **Don't** use rapid CSS `@keyframes animate-ping` across multiple grid elements.
- **Don't** allow client-side hydration mismatches or layout shifts during tab switching.
