"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, ChevronRight, ArrowRight, Zap, ShieldCheck, Bell, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ─── Demo Data & Product Renders ─────────────────────────────────────────────

interface SkuData {
  id: string;
  name: string;
  shortName: string;
  brand: string;
  skuCode: string;
  packSize: string;
  mrp: string;
  category: string;
  accent: string;
}

const SKUS: SkuData[] = [
  {
    id: "redbull",
    name: "Red Bull Energy 250ml",
    shortName: "Red Bull 250ml",
    brand: "Red Bull",
    skuCode: "SKU-RB-250",
    packSize: "250ml Slim Can",
    mrp: "₹125.00",
    category: "Functional Energy",
    accent: "#38BDF8",
  },
  {
    id: "cocacola",
    name: "Coca-Cola Zero 300ml",
    shortName: "Coke Zero 300ml",
    brand: "Coca-Cola",
    skuCode: "SKU-CCZ-300",
    packSize: "300ml Sleek Can",
    mrp: "₹40.00",
    category: "Zero Sugar Soda",
    accent: "#EF4444",
  },
  {
    id: "lays",
    name: "Lay's Classic Salted 52g",
    shortName: "Lay's Classic 52g",
    brand: "Lay's",
    skuCode: "SKU-LAY-052",
    packSize: "52g Nitrogen Pack",
    mrp: "₹20.00",
    category: "Savory Crisps",
    accent: "#F59E0B",
  },
];

const PINCODES = [
  { code: "400001", city: "Mumbai, Colaba" },
  { code: "110001", city: "Delhi, Connaught Place" },
  { code: "560001", city: "Bengaluru, MG Road" },
  { code: "136129", city: "Kurukshetra, Haryana" },
];

const PLATFORMS = [
  {
    id: "blinkit",
    name: "Blinkit",
    color: "#F8CB46",
    bgClass: "badge-blinkit",
    stores: ["POD-402", "BLK-MUM-09", "DS-402A", "POD-117"],
    prices: [
      [115, 125], [98, 110], [75, 85], [null, null],
    ],
    stocks: ["in", "in", "in", "oos"],
    maxQty: [12, 6, 8, 0],
  },
  {
    id: "zepto",
    name: "Zepto",
    color: "#8B5CF6",
    bgClass: "badge-zepto",
    stores: ["ZPT-CST", "ZPT-BKC", "ZPT-560", "ZPT-KUK"],
    prices: [
      [120, 125], [null, null], [78, 85], [95, 110],
    ],
    stocks: ["in", "oos", "in", "in"],
    maxQty: [4, 0, 10, 2],
  },
  {
    id: "instamart",
    name: "Instamart",
    color: "#FC8019",
    bgClass: "badge-instamart",
    stores: ["IM-MUM-01", "IM-DLH-04", "IM-BLR-07", "IM-KUK"],
    prices: [
      [null, null], [105, 110], [72, 85], [null, null],
    ],
    stocks: ["oos", "in", "in", "oos"],
    maxQty: [0, 3, 15, 0],
  },
  {
    id: "bigbasket",
    name: "BigBasket",
    color: "#84C225",
    bgClass: "badge-bigbasket",
    stores: ["BB-NOW-MUM", "BB-NOW-NDL", "BB-NOW-BLR", "BB-NOW-KUK"],
    prices: [
      [112, 125], [100, 110], [null, null], [90, 110],
    ],
    stocks: ["in", "in", "oos", "in"],
    maxQty: [9, 7, 0, 5],
  },
];

// ─── Bespoke Product Vector Illustrations ────────────────────────────────────

function ProductThumbnail({ skuId }: { skuId: string }) {
  if (skuId === "redbull") {
    return (
      <svg className="w-8 h-12 drop-shadow-md" viewBox="0 0 32 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="rb-can" x1="0" y1="0" x2="32" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E3A8A" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#CBD5E1" />
          </linearGradient>
          <linearGradient id="rb-top" x1="0" y1="0" x2="32" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#94A3B8" />
            <stop offset="50%" stopColor="#F1F5F9" />
            <stop offset="100%" stopColor="#64748B" />
          </linearGradient>
        </defs>
        {/* Can Rim */}
        <rect x="7" y="2" width="18" height="3" rx="1.5" fill="url(#rb-top)" />
        {/* Can Body */}
        <rect x="5" y="5" width="22" height="38" rx="3" fill="url(#rb-can)" />
        {/* Blue & Silver Quad Design */}
        <path d="M5 5L27 24V43H5V5Z" fill="#1D4ED8" fillOpacity="0.8" />
        <path d="M5 24L27 5V24H5Z" fill="#E2E8F0" fillOpacity="0.4" />
        {/* Yellow Sun & Red Bull Graphic */}
        <circle cx="16" cy="24" r="5" fill="#F59E0B" />
        <path d="M12 24C14 22 18 22 20 24" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
        {/* Metallic Highlight Sheen */}
        <rect x="7" y="6" width="3" height="36" rx="1.5" fill="#FFFFFF" fillOpacity="0.35" />
        {/* Base */}
        <rect x="7" y="43" width="18" height="2" rx="1" fill="url(#rb-top)" />
      </svg>
    );
  }

  if (skuId === "cocacola") {
    return (
      <svg className="w-8 h-12 drop-shadow-md" viewBox="0 0 32 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="coke-can" x1="0" y1="0" x2="32" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#18181B" />
            <stop offset="40%" stopColor="#27272A" />
            <stop offset="100%" stopColor="#09090B" />
          </linearGradient>
          <linearGradient id="coke-top" x1="0" y1="0" x2="32" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#71717A" />
            <stop offset="50%" stopColor="#E4E4E7" />
            <stop offset="100%" stopColor="#52525B" />
          </linearGradient>
        </defs>
        {/* Can Rim */}
        <rect x="7" y="2" width="18" height="3" rx="1.5" fill="url(#coke-top)" />
        {/* Can Body */}
        <rect x="5" y="5" width="22" height="38" rx="3" fill="url(#coke-can)" />
        {/* Crimson Ribbon Wave */}
        <path d="M5 28C10 26 18 34 27 30V36C18 40 10 32 5 34V28Z" fill="#DC2626" />
        {/* ZERO Wordmark */}
        <text x="16" y="22" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="bold" fontFamily="system-ui" letterSpacing="0.8">ZERO</text>
        {/* Metallic Highlight Sheen */}
        <rect x="7" y="6" width="3" height="36" rx="1.5" fill="#FFFFFF" fillOpacity="0.25" />
        {/* Base */}
        <rect x="7" y="43" width="18" height="2" rx="1" fill="url(#coke-top)" />
      </svg>
    );
  }

  // Lay's Classic Salted
  return (
    <svg className="w-9 h-12 drop-shadow-md" viewBox="0 0 34 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lays-pouch" x1="0" y1="0" x2="34" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      {/* Pouch Crimp Top */}
      <path d="M6 3H28L30 7H4L6 3Z" fill="#B45309" />
      {/* Pouch Main Foil Body */}
      <rect x="4" y="6" width="26" height="36" rx="4" fill="url(#lays-pouch)" />
      {/* Red Banner Stripe */}
      <path d="M4 18H30V28H4V18Z" fill="#DC2626" />
      {/* Sunburst Emblem */}
      <circle cx="17" cy="23" r="5.5" fill="#FEF08A" />
      <text x="17" y="25" textAnchor="middle" fill="#B45309" fontSize="6" fontWeight="900" fontFamily="system-ui">Lay&apos;s</text>
      {/* Salted Tag */}
      <text x="17" y="36" textAnchor="middle" fill="#78350F" fontSize="4.5" fontWeight="bold" fontFamily="system-ui">CLASSIC</text>
      {/* Foil Highlight */}
      <path d="M7 8C12 12 10 32 7 38" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4" />
      {/* Pouch Crimp Bottom */}
      <path d="M4 41L6 45H28L30 41H4Z" fill="#B45309" />
    </svg>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function PlatformCard({
  platform,
  pincodeIdx,
  skuIdx,
}: {
  platform: typeof PLATFORMS[0];
  pincodeIdx: number;
  skuIdx: number;
}) {
  const isInStock = platform.stocks[pincodeIdx] === "in";
  const price = platform.prices[pincodeIdx];
  const hasPrice = price[0] !== null;

  return (
    <div
      className="relative rounded-xl glass border p-3 flex flex-col justify-between h-[142px] overflow-hidden transition-all duration-200"
    >
      <div>
        {/* Platform badge */}
        <div className="flex items-center justify-between mb-1.5">
          <span
            className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider", platform.bgClass)}
          >
            {platform.name}
          </span>
          <div className="flex items-center gap-1">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-colors duration-200",
                isInStock ? "pulse-emerald" : "pulse-red"
              )}
            />
          </div>
        </div>

        {/* Dark Store ID - Brightened contrast for readability */}
        <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-400 font-medium tracking-wider">
          {platform.stores[pincodeIdx]}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        {/* Stock Status */}
        <div
          className={cn(
            "text-[11px] font-semibold px-2 py-0.5 rounded-lg h-6 flex items-center transition-colors duration-200",
            isInStock ? "badge-in-stock" : "badge-oos"
          )}
        >
          {isInStock
            ? `IN STOCK · Max ${platform.maxQty[pincodeIdx]}`
            : "OUT OF STOCK"}
        </div>

        {/* Price */}
        <div className="h-6 flex items-baseline gap-1.5">
          {hasPrice ? (
            <>
              <span className="text-sm font-bold tabular-nums text-[var(--text-primary)]">
                ₹{price[0]}
              </span>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-400 line-through tabular-nums font-medium">
                ₹{price[1]}
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">
                {Math.round(((price[1]! - price[0]!) / price[1]!) * 100)}% off
              </span>
            </>
          ) : (
            <span className="text-[11px] text-zinc-400 dark:text-zinc-400 font-medium">
              Price unavailable
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Scanner Widget ──────────────────────────────────────────────────────

export function ScannerWidget() {
  const [activeSku, setActiveSku] = useState(0);
  const [pinIdx, setPinIdx] = useState(0);
  const [manualPin, setManualPin] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-cycle pincodes every 3.5s
  useEffect(() => {
    if (isTyping) return;
    timerRef.current = setInterval(() => {
      setPinIdx((prev) => (prev + 1) % PINCODES.length);
    }, 3500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTyping]);

  const activeProduct = SKUS[activeSku];

  return (
    <div className="relative rounded-2xl glass-strong border p-5 w-full max-w-lg h-[565px] flex flex-col justify-between overflow-hidden">
      {/* Glow orb behind widget - Emerald/Amber */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full pulse-emerald" />
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Live Scanner
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1 text-[10px] font-mono text-zinc-400 font-medium">
          <Zap className="w-3 h-3 text-emerald-400" />
          REAL-TIME
        </div>
      </div>

      {/* SKU Tabs - Emojis removed, clean brand pills */}
      <div className="flex gap-1.5 mb-3 bg-[var(--background)] rounded-xl p-1 border border-[var(--border)]">
        {SKUS.map((sku, i) => (
          <button
            key={sku.id}
            onClick={() => setActiveSku(i)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-200",
              activeSku === i
                ? "bg-white text-zinc-950 dark:bg-zinc-100 dark:text-zinc-950 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 dark:text-zinc-400 dark:hover:text-zinc-200"
            )}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: sku.accent }}
            />
            <span className="truncate">{sku.shortName}</span>
          </button>
        ))}
      </div>

      {/* Selected Product Showcase Banner - Fixed Height */}
      <div className="flex items-center gap-3 p-3 mb-3 rounded-xl bg-zinc-900/80 border border-zinc-800/90 shadow-sm h-[68px] overflow-hidden">
        <div className="w-11 h-13 shrink-0 rounded-lg flex items-center justify-center bg-black/50 border border-zinc-800/80 shadow-inner">
          <ProductThumbnail skuId={activeProduct.id} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="font-semibold text-xs text-zinc-100 truncate">
              {activeProduct.name}
            </h4>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold shrink-0">
              {activeProduct.skuCode}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-zinc-400">
            <span className="font-mono text-zinc-300 font-medium">{activeProduct.packSize}</span>
            <span>•</span>
            <span>MRP <strong className="font-mono text-zinc-200 font-bold">{activeProduct.mrp}</strong></span>
            <span>•</span>
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-emerald-400" />
              4 Platforms Live
            </span>
          </div>
        </div>
      </div>

      {/* Pincode Roller - Fixed Height */}
      <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] h-[50px] overflow-hidden">
        <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
        <div className="flex-1 overflow-hidden h-6 flex items-center">
          {!isTyping ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={pinIdx}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-2 h-6"
              >
                <span className="font-mono text-sm font-bold text-[var(--text-primary)]">
                  {PINCODES[pinIdx].code}
                </span>
                <span className="text-xs text-zinc-300 dark:text-zinc-300 font-medium truncate">
                  {PINCODES[pinIdx].city}
                </span>
              </motion.div>
            </AnimatePresence>
          ) : (
            <input
              autoFocus
              value={manualPin}
              onChange={(e) => setManualPin(e.target.value.replace(/\D/, "").slice(0, 6))}
              placeholder="Enter 6-digit pincode..."
              className="w-full bg-transparent font-mono text-sm text-[var(--text-primary)] outline-none placeholder:text-zinc-500"
            />
          )}
        </div>
        <button
          onClick={() => {
            setIsTyping(!isTyping);
            if (isTyping) setManualPin("");
          }}
          className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold hover:underline shrink-0"
        >
          {isTyping ? "Auto" : "Edit"}
        </button>
      </div>

      {/* 4-Platform Matrix - Fixed 2x2 grid with stable keys */}
      <div className="grid grid-cols-2 gap-2 h-[292px]">
        {PLATFORMS.map((platform) => (
          <PlatformCard
            key={platform.id}
            platform={platform}
            pincodeIdx={pinIdx}
            skuIdx={activeSku}
          />
        ))}
      </div>

      {/* Footer note */}
      <p className="text-center text-[10px] text-zinc-400 dark:text-zinc-400 font-medium mt-3">
        Live telemetry snapshot · Connect your brand catalog for real-time alerts
      </p>
    </div>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

const STATS = [
  { value: "4", label: "Platforms" },
  { value: "500+", label: "Dark Stores" },
  { value: "60s", label: "Scan Cadence" },
  { value: "99.9%", label: "Uptime" },
];

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-28 pb-16 overflow-hidden noise">
      {/* Background glows - Emerald & Amber tones, NO purple */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-emerald-500/10 opacity-[0.06] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-amber-500/10 opacity-[0.05] blur-[100px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-start lg:pt-6">
          {/* Left — Copy */}
          <div className="flex flex-col gap-8">
            {/* Eyebrow badge */}
            {/* <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full pulse-emerald" />
                Now tracking 4 Q-Commerce Platforms in Real Time
              </span>
            </motion.div> */}

            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="flex flex-col gap-4"
            >
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.08] text-[var(--text-primary)]">
                Track Your Brand&apos;s Pulse{" "}
                <span className="gradient-text">Across Every Pincode</span>{" "}
                &amp; Dark Store.
              </h1>
              <p className="text-lg text-[var(--text-muted)] leading-relaxed max-w-xl">
                Real-time inventory intelligence for FMCG brands on Blinkit, Zepto,
                Instamart &amp; BigBasket. Know when you&apos;re out of stock before your
                customers do.
              </p>
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-wrap items-center gap-3"
            >
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold btn-primary"
              >
                Start Tracking Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium btn-ghost"
              >
                See How It Works
                <ChevronRight className="w-4 h-4" />
              </Link>
            </motion.div>

            {/* Trust signals */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 font-medium"
            >
              {[
                { icon: ShieldCheck, text: "No credit card required" },
                { icon: Zap, text: "Setup in under 5 minutes" },
                { icon: Bell, text: "Real-time OOS alerts" },
              ].map(({ icon: Icon, text }) => (
                <span key={text} className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-emerald-400" />
                  {text}
                </span>
              ))}
            </motion.div>

            {/* Stats Row */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="grid grid-cols-4 gap-4 pt-6 border-t border-[var(--border)]"
            >
              {STATS.map((stat) => (
                <div key={stat.label} className="flex flex-col gap-0.5">
                  <span className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                    {stat.value}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">{stat.label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — Scanner Widget */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center lg:justify-end"
          >
            <ScannerWidget />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

