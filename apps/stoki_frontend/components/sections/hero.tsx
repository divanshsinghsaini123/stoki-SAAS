"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, ChevronRight, ArrowRight, Zap, ShieldCheck, Bell } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ─── Demo Data ──────────────────────────────────────────────────────────────

const SKUS = [
  { id: "redbull", name: "Red Bull Energy 250ml", brand: "Red Bull", emoji: "🐂" },
  { id: "cocacola", name: "Coca-Cola Zero 300ml", brand: "Coca-Cola", emoji: "🥤" },
  { id: "lays", name: "Lay's Classic Salted 52g", brand: "Lay's", emoji: "🥔" },
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
    <motion.div
      key={`${platform.id}-${pincodeIdx}-${skuIdx}`}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: "spring", stiffness: 300, damping: 25, delay: PLATFORMS.indexOf(platform) * 0.04 }}
      className="relative rounded-xl glass border p-3 flex flex-col gap-2 overflow-hidden"
    >
      {/* Platform badge */}
      <div className="flex items-center justify-between">
        <span
          className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider", platform.bgClass)}
        >
          {platform.name}
        </span>
        <div className="flex items-center gap-1">
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              isInStock ? "pulse-green" : "pulse-red"
            )}
          />
        </div>
      </div>

      {/* Dark Store ID */}
      <p className="text-[10px] font-mono text-[var(--text-subtle)] tracking-wider">
        {platform.stores[pincodeIdx]}
      </p>

      {/* Stock Status */}
      <div
        className={cn(
          "text-[11px] font-semibold px-2 py-1 rounded-lg",
          isInStock ? "badge-in-stock" : "badge-oos"
        )}
      >
        {isInStock
          ? `IN STOCK · Max ${platform.maxQty[pincodeIdx]}`
          : "OUT OF STOCK"}
      </div>

      {/* Price */}
      {hasPrice ? (
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-bold tabular-nums text-[var(--text-primary)]">
            ₹{price[0]}
          </span>
          <span className="text-[11px] text-[var(--text-subtle)] line-through tabular-nums">
            ₹{price[1]}
          </span>
          <span className="text-[10px] text-emerald-500 font-semibold">
            {Math.round(((price[1]! - price[0]!) / price[1]!) * 100)}% off
          </span>
        </div>
      ) : (
        <span className="text-[11px] text-[var(--text-subtle)]">Price unavailable</span>
      )}
    </motion.div>
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

  const currentPin = isTyping ? manualPin : PINCODES[pinIdx];

  return (
    <div className="relative rounded-2xl glass-strong border p-5 w-full max-w-lg">
      {/* Glow orb behind widget */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[var(--accent)] opacity-10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full pulse-green" />
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Live Scanner
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1 text-[10px] font-mono text-[var(--text-subtle)]">
          <Zap className="w-3 h-3 text-[var(--accent)]" />
          REAL-TIME
        </div>
      </div>

      {/* SKU Tabs */}
      <div className="flex gap-1 mb-4 bg-[var(--background)] rounded-xl p-1 border border-[var(--border)]">
        {SKUS.map((sku, i) => (
          <button
            key={sku.id}
            onClick={() => setActiveSku(i)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all duration-200",
              activeSku === i
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            <span>{sku.emoji}</span>
            <span className="hidden sm:block truncate">{sku.name.split(" ").slice(0, 2).join(" ")}</span>
          </button>
        ))}
      </div>

      {/* Pincode Roller */}
      <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]">
        <MapPin className="w-4 h-4 text-[var(--accent)] shrink-0" />
        <div className="flex-1 overflow-hidden">
          {!isTyping ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={pinIdx}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -12, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-2"
              >
                <span className="font-mono text-sm font-bold text-[var(--text-primary)]">
                  {PINCODES[pinIdx].code}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
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
              className="w-full bg-transparent font-mono text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-subtle)]"
            />
          )}
        </div>
        <button
          onClick={() => {
            setIsTyping(!isTyping);
            if (isTyping) setManualPin("");
          }}
          className="text-[10px] text-[var(--accent)] font-semibold hover:underline shrink-0"
        >
          {isTyping ? "Auto" : "Edit"}
        </button>
      </div>

      {/* 4-Platform Matrix */}
      <div className="grid grid-cols-2 gap-2">
        <AnimatePresence mode="wait">
          {PLATFORMS.map((platform) => (
            <PlatformCard
              key={`${platform.id}-${pinIdx}-${activeSku}`}
              platform={platform}
              pincodeIdx={pinIdx}
              skuIdx={activeSku}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Footer note */}
      <p className="text-center text-[10px] text-[var(--text-subtle)] mt-3">
        Demo data · Connect your brand for live intelligence
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
      {/* Background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[var(--accent)] opacity-[0.04] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-purple-600 opacity-[0.04] blur-[100px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — Copy */}
          <div className="flex flex-col gap-8">
            {/* Eyebrow badge */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent)]/20">
                <span className="w-1.5 h-1.5 rounded-full pulse-indigo" />
                Now tracking 4 Q-Commerce Platforms
              </span>
            </motion.div>

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
              className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-subtle)]"
            >
              {[
                { icon: ShieldCheck, text: "No credit card required" },
                { icon: Zap, text: "Setup in under 5 minutes" },
                { icon: Bell, text: "Real-time OOS alerts" },
              ].map(({ icon: Icon, text }) => (
                <span key={text} className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-[var(--accent)]" />
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
