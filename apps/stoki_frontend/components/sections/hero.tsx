"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, ChevronRight, ChevronLeft, ArrowRight, Zap, ShieldCheck, Bell, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PlatformLogo, BlinkitIcon, ZeptoIcon, InstamartIcon, BigBasketIcon } from "@/components/ui/platform-logos";

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

// ─── Bespoke 3D Product Vector Illustrations ─────────────────────────────────

function Product3DIllustration({ skuId }: { skuId: string }) {
  if (skuId === "redbull") {
    return (
      <svg className="w-14 h-22 drop-shadow-md shrink-0" viewBox="0 0 56 88" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="rb-can-3d" x1="0" y1="0" x2="56" y2="88" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E3A8A" />
            <stop offset="45%" stopColor="#2563EB" />
            <stop offset="75%" stopColor="#1D4ED8" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
          <linearGradient id="rb-metal-top" x1="0" y1="0" x2="56" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#64748B" />
            <stop offset="25%" stopColor="#E2E8F0" />
            <stop offset="50%" stopColor="#FFFFFF" />
            <stop offset="75%" stopColor="#94A3B8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
          <linearGradient id="rb-sheen" x1="0" y1="0" x2="56" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
            <stop offset="20%" stopColor="#FFFFFF" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
          </linearGradient>
          <radialGradient id="rb-floor-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Floor drop shadow */}
        <ellipse cx="28" cy="84" rx="18" ry="3.5" fill="url(#rb-floor-shadow)" />
        {/* Can Body */}
        <rect x="9" y="11" width="38" height="69" rx="5" fill="url(#rb-can-3d)" />
        {/* Silver Can Neck / Taper */}
        <path d="M12 11C12 7 14 5 18 5H38C42 5 44 7 44 11H12Z" fill="url(#rb-metal-top)" />
        {/* Top Rim Lip */}
        <ellipse cx="28" cy="5" rx="14" ry="2.5" fill="url(#rb-metal-top)" />
        <ellipse cx="28" cy="4.5" rx="11" ry="2" fill="#475569" />
        {/* Pull Tab */}
        <rect x="25" y="3" width="6" height="4" rx="1" fill="#E2E8F0" />
        {/* Geometric Quad Split */}
        <path d="M9 11L47 45V80H9V11Z" fill="#1D4ED8" fillOpacity="0.85" />
        <path d="M9 45L47 11V45H9Z" fill="#E2E8F0" fillOpacity="0.45" />
        {/* Red Bull Sunburst Graphic */}
        <circle cx="28" cy="45" r="8.5" fill="#F59E0B" />
        <path d="M21 45C24 41 32 41 35 45" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
        <text x="28" y="58" textAnchor="middle" fill="#FFFFFF" fontSize="6.5" fontWeight="bold" fontFamily="system-ui" letterSpacing="0.5">ENERGY</text>
        {/* Specular White Stripe */}
        <rect x="13" y="12" width="3.5" height="67" rx="1.75" fill="#FFFFFF" fillOpacity="0.32" />
        {/* Curved 3D Sheen overlay */}
        <rect x="9" y="11" width="38" height="69" rx="5" fill="url(#rb-sheen)" pointerEvents="none" />
        {/* Bottom Rim */}
        <path d="M12 78C14 81 18 82 28 82C38 82 42 81 44 78H12Z" fill="url(#rb-metal-top)" />
      </svg>
    );
  }

  if (skuId === "cocacola") {
    return (
      <svg className="w-14 h-22 drop-shadow-md shrink-0" viewBox="0 0 56 88" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="coke-can-3d" x1="0" y1="0" x2="56" y2="88" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#18181B" />
            <stop offset="35%" stopColor="#27272A" />
            <stop offset="70%" stopColor="#09090B" />
            <stop offset="100%" stopColor="#000000" />
          </linearGradient>
          <linearGradient id="coke-metal-top" x1="0" y1="0" x2="56" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#71717A" />
            <stop offset="30%" stopColor="#E4E4E7" />
            <stop offset="50%" stopColor="#FFFFFF" />
            <stop offset="70%" stopColor="#A1A1AA" />
            <stop offset="100%" stopColor="#52525B" />
          </linearGradient>
          <linearGradient id="coke-sheen" x1="0" y1="0" x2="56" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
            <stop offset="25%" stopColor="#FFFFFF" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
          </linearGradient>
          <radialGradient id="coke-floor-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Floor drop shadow */}
        <ellipse cx="28" cy="84" rx="18" ry="3.5" fill="url(#coke-floor-shadow)" />
        {/* Can Body */}
        <rect x="9" y="11" width="38" height="69" rx="5" fill="url(#coke-can-3d)" />
        {/* Silver Can Neck / Taper */}
        <path d="M12 11C12 7 14 5 18 5H38C42 5 44 7 44 11H12Z" fill="url(#coke-metal-top)" />
        {/* Top Rim Lip */}
        <ellipse cx="28" cy="5" rx="14" ry="2.5" fill="url(#coke-metal-top)" />
        <ellipse cx="28" cy="4.5" rx="11" ry="2" fill="#27272A" />
        {/* Pull Tab */}
        <rect x="25" y="3" width="6" height="4" rx="1" fill="#DC2626" />
        {/* Dynamic Crimson Ribbon Wave */}
        <path d="M9 52C16 46 32 60 47 54V64C32 70 16 56 9 62V52Z" fill="#DC2626" />
        {/* ZERO Wordmark */}
        <text x="28" y="38" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="900" fontFamily="system-ui" letterSpacing="0.8">ZERO</text>
        <text x="28" y="46" textAnchor="middle" fill="#A1A1AA" fontSize="5" fontWeight="bold" fontFamily="system-ui" letterSpacing="0.8">SUGAR</text>
        {/* Condensation ice beads */}
        <circle cx="16" cy="24" r="1" fill="#FFFFFF" fillOpacity="0.5" />
        <circle cx="38" cy="30" r="1.2" fill="#FFFFFF" fillOpacity="0.4" />
        <circle cx="20" cy="68" r="0.8" fill="#FFFFFF" fillOpacity="0.5" />
        {/* Specular White Stripe */}
        <rect x="13" y="12" width="3.5" height="67" rx="1.75" fill="#FFFFFF" fillOpacity="0.22" />
        {/* Curved 3D Sheen overlay */}
        <rect x="9" y="11" width="38" height="69" rx="5" fill="url(#coke-sheen)" pointerEvents="none" />
        {/* Bottom Rim */}
        <path d="M12 78C14 81 18 82 28 82C38 82 42 81 44 78H12Z" fill="url(#coke-metal-top)" />
      </svg>
    );
  }

  // Lay's Classic Salted 52g 3D Pouch
  return (
    <svg className="w-18 h-22 drop-shadow-md shrink-0" viewBox="0 0 72 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lays-pouch-3d" x1="10" y1="5" x2="62" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="40%" stopColor="#FBBF24" />
          <stop offset="70%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id="lays-crimp" x1="0" y1="0" x2="72" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#92400E" />
          <stop offset="50%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>
        <radialGradient id="lays-puff" cx="45%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.6" />
          <stop offset="60%" stopColor="#FBBF24" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#B45309" stopOpacity="0.4" />
        </radialGradient>
        <radialGradient id="lays-floor-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Floor drop shadow */}
      <ellipse cx="36" cy="85" rx="24" ry="3.5" fill="url(#lays-floor-shadow)" />
      {/* Top Crimped Seal */}
      <path d="M12 6L15 11H57L60 6H12Z" fill="url(#lays-crimp)" />
      <path d="M12 6H60" stroke="#FDE68A" strokeWidth="0.8" strokeDasharray="2 2" />
      {/* Puffed Foil Body (Pillow shape) */}
      <path d="M15 11C8 28 8 58 15 76H57C64 58 64 28 57 11H15Z" fill="url(#lays-pouch-3d)" />
      {/* Puffed 3D radial depth highlight */}
      <path d="M15 11C8 28 8 58 15 76H57C64 58 64 28 57 11H15Z" fill="url(#lays-puff)" />
      {/* Red Lay's Brand Banner */}
      <path d="M10 33C24 31 48 31 62 33V51C48 49 24 49 10 51V33Z" fill="#DC2626" />
      {/* Sunburst Emblem */}
      <circle cx="36" cy="42" r="10.5" fill="#FEF08A" />
      <text x="36" y="45" textAnchor="middle" fill="#B45309" fontSize="10" fontWeight="900" fontFamily="system-ui">Lay&apos;s</text>
      {/* Classic Subtitle */}
      <text x="36" y="61" textAnchor="middle" fill="#78350F" fontSize="6.5" fontWeight="bold" fontFamily="system-ui" letterSpacing="0.8">CLASSIC</text>
      <text x="36" y="68" textAnchor="middle" fill="#92400E" fontSize="5" fontWeight="semibold" fontFamily="system-ui">SALTED</text>
      {/* Specular Curved Foil Sheen */}
      <path d="M16 16C24 22 22 62 16 72" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.45" />
      {/* Bottom Crimped Seal */}
      <path d="M15 76L12 81H60L57 76H15Z" fill="url(#lays-crimp)" />
      <path d="M12 81H60" stroke="#FDE68A" strokeWidth="0.8" strokeDasharray="2 2" />
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
      className="relative rounded-xl bg-slate-50/90 dark:bg-zinc-950/70 border border-slate-200/90 dark:border-zinc-800/90 p-3 flex flex-col justify-between h-[142px] overflow-hidden shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-200"
    >
      <div>
        {/* Platform logo + name */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <PlatformLogo platform={platform.id} className="w-4 h-4 rounded shrink-0" />
            <span className="text-xs font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {platform.name}
            </span>
          </div>
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              isInStock ? "bg-emerald-500" : "bg-rose-500"
            )}
          />
        </div>

        {/* Dark Store ID */}
        <p className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 font-semibold tracking-wider">
          {platform.stores[pincodeIdx]}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        {/* Stock Status Badge */}
        <div
          className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-md h-6 flex items-center transition-colors duration-200",
            isInStock
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
              : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
          )}
        >
          {isInStock
            ? `IN STOCK · Max ${platform.maxQty[pincodeIdx]} units`
            : "OUT OF STOCK"}
        </div>

        {/* Price & Discount */}
        <div className="h-6 flex items-baseline gap-1.5">
          {hasPrice ? (
            <>
              <span className="text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-100 font-mono">
                ₹{price[0]}
              </span>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 line-through tabular-nums font-mono">
                ₹{price[1]}
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold font-mono">
                {Math.round(((price[1]! - price[0]!) / price[1]!) * 100)}% off
              </span>
            </>
          ) : (
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
              Temporarily unavailable
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

  const handlePrevSku = () => {
    setActiveSku((prev) => (prev === 0 ? SKUS.length - 1 : prev - 1));
  };

  const handleNextSku = () => {
    setActiveSku((prev) => (prev === SKUS.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="relative rounded-2xl bg-white/95 dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 p-5 w-full max-w-lg min-h-[585px] flex flex-col justify-between overflow-hidden shadow-xl dark:shadow-2xl">
      {/* Glow orb behind widget - Emerald/Amber */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
            Live SKU Telemetry
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 font-medium">
          <Zap className="w-3 h-3 text-emerald-500" />
          Active Feed
        </div>
      </div>

      {/* 3D Product Showcase Stage with Left/Right Swap Carousel (Height: ~126px) */}
      <div className="relative rounded-xl bg-slate-50 dark:bg-zinc-950/70 border border-slate-200/90 dark:border-zinc-800/90 p-3 mb-3 shadow-xs h-[126px] overflow-hidden flex items-center justify-between">
        {/* Left & Center: 3D Product Mockup + Live Info with Animated Swap */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeProduct.id}
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -14 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="flex items-center gap-3.5 flex-1 min-w-0"
          >
            {/* 3D Product Stage Pedestal Container */}
            <div className="w-20 h-24 shrink-0 rounded-xl bg-gradient-to-b from-white to-slate-100 dark:from-zinc-900 dark:to-zinc-950 border border-slate-200/80 dark:border-zinc-800 flex items-center justify-center relative overflow-hidden shadow-inner">
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />
              <Product3DIllustration skuId={activeProduct.id} />
            </div>

            {/* Product Meta */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-bold shrink-0">
                  {activeProduct.skuCode}
                </span>
                <span className="text-[9px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider truncate">
                  {activeProduct.category}
                </span>
              </div>

              <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate mb-1">
                {activeProduct.name}
              </h4>

              <div className="flex items-center gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                <span className="font-mono text-zinc-800 dark:text-zinc-300 font-medium">{activeProduct.packSize}</span>
                <span>•</span>
                <span>MRP <strong className="font-mono text-zinc-900 dark:text-zinc-200 font-bold">{activeProduct.mrp}</strong></span>
              </div>

              {/* Platform coverage dots */}
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className="flex items-center -space-x-1">
                  <PlatformLogo platform="blinkit" className="w-3.5 h-3.5 rounded-full ring-1 ring-white dark:ring-zinc-900" />
                  <PlatformLogo platform="zepto" className="w-3.5 h-3.5 rounded-full ring-1 ring-white dark:ring-zinc-900" />
                  <PlatformLogo platform="instamart" className="w-3.5 h-3.5 rounded-full ring-1 ring-white dark:ring-zinc-900" />
                  <PlatformLogo platform="bigbasket" className="w-3.5 h-3.5 rounded-full ring-1 ring-white dark:ring-zinc-900" />
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  4 Platforms Live
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Right: Swap Controls (< and >) + Pagination Indicators */}
        <div className="flex flex-col items-center justify-between h-full pl-2 shrink-0 border-l border-slate-200/80 dark:border-zinc-800/80">
          <div className="flex flex-col gap-1.5">
            <button
              onClick={handlePrevSku}
              className="w-7 h-7 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:border-emerald-500/40 transition-all shadow-xs"
              aria-label="Previous SKU"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleNextSku}
              className="w-7 h-7 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:border-emerald-500/40 transition-all shadow-xs"
              aria-label="Next SKU"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 3 Clickable Dots for Direct Switching */}
          <div className="flex items-center gap-1 pt-1">
            {SKUS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveSku(i)}
                aria-label={`Select product ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-200",
                  activeSku === i
                    ? "w-4 bg-emerald-500"
                    : "w-1.5 bg-slate-300 dark:bg-zinc-700 hover:bg-slate-400 dark:hover:bg-zinc-600"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Pincode Roller - Fixed Height */}
      <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200/90 dark:border-zinc-800/90 h-[50px] overflow-hidden">
        <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
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
                <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {PINCODES[pinIdx].code}
                </span>
                <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium truncate">
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
              className="w-full bg-transparent font-mono text-sm text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400"
            />
          )}
        </div>
        <button
          onClick={() => {
            setIsTyping(!isTyping);
            if (isTyping) setManualPin("");
          }}
          className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold shrink-0"
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
      <p className="text-center text-[10px] text-zinc-500 dark:text-zinc-400 font-medium mt-3">
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
    <section className="relative min-h-[calc(100vh-80px)] flex items-center pt-32 pb-20 overflow-hidden noise">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-emerald-500/10 opacity-[0.06] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-amber-500/10 opacity-[0.05] blur-[100px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column — Content & Positioning */}
          <div className="flex flex-col gap-6">
            {/* Enterprise Status Pill */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Link
                href="/how-it-works"
                className="group inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700 transition-all shadow-xs"
              >
                <div className="flex items-center -space-x-1">
                  <BlinkitIcon className="w-4 h-4 rounded ring-2 ring-white dark:ring-zinc-900" />
                  <ZeptoIcon className="w-4 h-4 rounded ring-2 ring-white dark:ring-zinc-900" />
                  <InstamartIcon className="w-4 h-4 rounded ring-2 ring-white dark:ring-zinc-900" />
                  <BigBasketIcon className="w-4 h-4 rounded ring-2 ring-white dark:ring-zinc-900" />
                </div>
                <span className="w-[1px] h-3 bg-zinc-300 dark:bg-zinc-700" />
                <span className="text-zinc-800 dark:text-zinc-200 font-medium">
                  Tracking 500+ dark stores in real time
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              </Link>
            </motion.div>

            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="flex flex-col gap-4"
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08] text-zinc-900 dark:text-zinc-50">
                Track Your Brand&apos;s Stock{" "}
                <span className="gradient-text">Across Every Pincode</span>{" "}
                &amp; Dark Store.
              </h1>
              <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xl">
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
              className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 font-medium"
            >
              {[
                { icon: ShieldCheck, text: "No credit card required" },
                { icon: Zap, text: "Setup in under 5 minutes" },
                { icon: Bell, text: "Real-time OOS alerts" },
              ].map(({ icon: Icon, text }) => (
                <span key={text} className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-emerald-500" />
                  {text}
                </span>
              ))}
            </motion.div>

            {/* Stats Row */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="grid grid-cols-4 gap-4 pt-6 border-t border-slate-200 dark:border-zinc-800"
            >
              {STATS.map((stat) => (
                <div key={stat.label} className="flex flex-col gap-0.5">
                  <span className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100 font-mono">
                    {stat.value}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{stat.label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right Column — Scanner Widget */}
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

