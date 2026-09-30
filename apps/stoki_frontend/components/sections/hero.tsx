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
  { id: "blinkit", name: "Blinkit", color: "#F8CB46", bgClass: "badge-blinkit" },
  { id: "zepto", name: "Zepto", color: "#8B5CF6", bgClass: "badge-zepto" },
  { id: "instamart", name: "Instamart", color: "#FC8019", bgClass: "badge-instamart" },
  { id: "bigbasket", name: "BigBasket", color: "#84C225", bgClass: "badge-bigbasket" },
];

// Pincode order: [0: Mumbai Colaba, 1: Delhi CP, 2: Bengaluru MG, 3: Kurukshetra]
const PLATFORM_SKU_DATA: Record<
  string,
  Record<
    string,
    {
      stores: string[];
      prices: ([number, number] | [null, null])[];
      stocks: ("in" | "oos")[];
      maxQty: number[];
    }
  >
> = {
  redbull: {
    blinkit: {
      stores: ["POD-402", "BLK-DLH-02", "DS-BLR-09", "POD-117"],
      prices: [[115, 125], [118, 125], [115, 125], [null, null]],
      stocks: ["in", "in", "in", "oos"],
      maxQty: [12, 6, 8, 0],
    },
    zepto: {
      stores: ["ZPT-CST", "ZPT-CP", "ZPT-560", "ZPT-KUK"],
      prices: [[120, 125], [null, null], [119, 125], [120, 125]],
      stocks: ["in", "oos", "in", "in"],
      maxQty: [4, 0, 10, 2],
    },
    instamart: {
      stores: ["IM-MUM-01", "IM-DLH-04", "IM-BLR-07", "IM-KUK"],
      prices: [[null, null], [118, 125], [115, 125], [null, null]],
      stocks: ["oos", "in", "in", "oos"],
      maxQty: [0, 3, 15, 0],
    },
    bigbasket: {
      stores: ["BB-NOW-MUM", "BB-NOW-NDL", "BB-NOW-BLR", "BB-NOW-KUK"],
      prices: [[112, 125], [115, 125], [null, null], [114, 125]],
      stocks: ["in", "in", "oos", "in"],
      maxQty: [9, 7, 0, 5],
    },
  },
  cocacola: {
    blinkit: {
      stores: ["POD-402", "BLK-DLH-02", "DS-BLR-09", "POD-117"],
      prices: [[38, 40], [38, 40], [37, 40], [38, 40]],
      stocks: ["in", "in", "in", "in"],
      maxQty: [24, 12, 18, 6],
    },
    zepto: {
      stores: ["ZPT-CST", "ZPT-CP", "ZPT-560", "ZPT-KUK"],
      prices: [[39, 40], [null, null], [38, 40], [39, 40]],
      stocks: ["in", "oos", "in", "in"],
      maxQty: [10, 0, 15, 4],
    },
    instamart: {
      stores: ["IM-MUM-01", "IM-DLH-04", "IM-BLR-07", "IM-KUK"],
      prices: [[38, 40], [37, 40], [null, null], [null, null]],
      stocks: ["in", "in", "oos", "oos"],
      maxQty: [8, 6, 0, 0],
    },
    bigbasket: {
      stores: ["BB-NOW-MUM", "BB-NOW-NDL", "BB-NOW-BLR", "BB-NOW-KUK"],
      prices: [[36, 40], [37, 40], [36, 40], [38, 40]],
      stocks: ["in", "in", "in", "in"],
      maxQty: [18, 14, 12, 8],
    },
  },
  lays: {
    blinkit: {
      stores: ["POD-402", "BLK-DLH-02", "DS-BLR-09", "POD-117"],
      prices: [[19, 20], [19, 20], [18, 20], [null, null]],
      stocks: ["in", "in", "in", "oos"],
      maxQty: [30, 20, 25, 0],
    },
    zepto: {
      stores: ["ZPT-CST", "ZPT-CP", "ZPT-560", "ZPT-KUK"],
      prices: [[20, 20], [null, null], [19, 20], [19, 20]],
      stocks: ["in", "oos", "in", "in"],
      maxQty: [12, 0, 15, 8],
    },
    instamart: {
      stores: ["IM-MUM-01", "IM-DLH-04", "IM-BLR-07", "IM-KUK"],
      prices: [[19, 20], [19, 20], [18, 20], [null, null]],
      stocks: ["in", "in", "in", "oos"],
      maxQty: [10, 14, 18, 0],
    },
    bigbasket: {
      stores: ["BB-NOW-MUM", "BB-NOW-NDL", "BB-NOW-BLR", "BB-NOW-KUK"],
      prices: [[18, 20], [18, 20], [null, null], [18, 20]],
      stocks: ["in", "in", "oos", "in"],
      maxQty: [22, 16, 0, 10],
    },
  },
};

// ─── Bespoke 3D Product Vector Illustrations (Bigger & Realistic) ─────────────

function Product3DIllustration({ skuId }: { skuId: string }) {
  if (skuId === "redbull") {
    return (
      <svg className="w-24 h-34 sm:w-26 sm:h-38 drop-shadow-2xl shrink-0 transition-transform duration-300 hover:scale-105" viewBox="0 0 64 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="rb-can-3d" x1="0" y1="0" x2="64" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E3A8A" />
            <stop offset="35%" stopColor="#2563EB" />
            <stop offset="70%" stopColor="#1D4ED8" />
            <stop offset="100%" stopColor="#0B132B" />
          </linearGradient>
          <linearGradient id="rb-metal-top" x1="0" y1="0" x2="64" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#64748B" />
            <stop offset="25%" stopColor="#E2E8F0" />
            <stop offset="50%" stopColor="#FFFFFF" />
            <stop offset="75%" stopColor="#94A3B8" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
          <linearGradient id="rb-sheen" x1="0" y1="0" x2="64" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
            <stop offset="20%" stopColor="#FFFFFF" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.35" />
          </linearGradient>
          <radialGradient id="rb-floor-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Realistic Floor shadow */}
        <ellipse cx="32" cy="95" rx="22" ry="4" fill="url(#rb-floor-shadow)" />
        {/* Can Main Body */}
        <rect x="10" y="12" width="44" height="78" rx="6" fill="url(#rb-can-3d)" />
        {/* Silver Tapered Neck */}
        <path d="M14 12C14 7 17 5 22 5H42C47 5 50 7 50 12H14Z" fill="url(#rb-metal-top)" />
        {/* Top Rim Bevel */}
        <ellipse cx="32" cy="5" rx="16" ry="3" fill="url(#rb-metal-top)" />
        <ellipse cx="32" cy="4.5" rx="13" ry="2.2" fill="#334155" />
        {/* Pull Tab Ring */}
        <rect x="29" y="3" width="6" height="5" rx="1.5" fill="#E2E8F0" />
        <circle cx="32" cy="5.5" r="1.2" fill="#64748B" />
        {/* Quad Split Graphics */}
        <path d="M10 12L54 52V90H10V12Z" fill="#1D4ED8" fillOpacity="0.9" />
        <path d="M10 52L54 12V52H10Z" fill="#F1F5F9" fillOpacity="0.5" />
        {/* Red Bull Brand Wordmark (Bolder & Larger) */}
        <text x="32" y="42" textAnchor="middle" fill="#DC2626" stroke="#FFFFFF" strokeWidth="0.6" fontSize="7.5" fontWeight="900" fontFamily="system-ui" letterSpacing="0.8">RED BULL</text>
        {/* Charging Bulls & Golden Sun Emblem */}
        <circle cx="32" cy="55" r="11" fill="#F59E0B" />
        <path d="M22 55C25 49 39 49 42 55" stroke="#DC2626" strokeWidth="3.5" strokeLinecap="round" />
        {/* Energy Text */}
        <text x="32" y="72" textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="900" fontFamily="system-ui" letterSpacing="1">ENERGY</text>
        {/* Metallic Specular Reflection Highlight */}
        <rect x="14" y="13" width="4" height="76" rx="2" fill="#FFFFFF" fillOpacity="0.38" />
        {/* Curved 3D Sheen overlay */}
        <rect x="10" y="12" width="44" height="78" rx="6" fill="url(#rb-sheen)" pointerEvents="none" />
        {/* Bottom Rim */}
        <path d="M14 88C17 92 22 93 32 93C42 93 47 92 50 88H14Z" fill="url(#rb-metal-top)" />
      </svg>
    );
  }

  if (skuId === "cocacola") {
    return (
      <svg className="w-24 h-34 sm:w-26 sm:h-38 drop-shadow-2xl shrink-0 transition-transform duration-300 hover:scale-105" viewBox="0 0 64 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="coke-can-3d" x1="0" y1="0" x2="64" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#18181B" />
            <stop offset="35%" stopColor="#27272A" />
            <stop offset="70%" stopColor="#09090B" />
            <stop offset="100%" stopColor="#000000" />
          </linearGradient>
          <linearGradient id="coke-metal-top" x1="0" y1="0" x2="64" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#71717A" />
            <stop offset="30%" stopColor="#E4E4E7" />
            <stop offset="50%" stopColor="#FFFFFF" />
            <stop offset="70%" stopColor="#A1A1AA" />
            <stop offset="100%" stopColor="#3F3F46" />
          </linearGradient>
          <linearGradient id="coke-sheen" x1="0" y1="0" x2="64" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.3" />
            <stop offset="25%" stopColor="#FFFFFF" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.45" />
          </linearGradient>
          <radialGradient id="coke-floor-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Floor drop shadow */}
        <ellipse cx="32" cy="95" rx="22" ry="4" fill="url(#coke-floor-shadow)" />
        {/* Can Main Body */}
        <rect x="10" y="12" width="44" height="78" rx="6" fill="url(#coke-can-3d)" />
        {/* Silver Tapered Neck */}
        <path d="M14 12C14 7 17 5 22 5H42C47 5 50 7 50 12H14Z" fill="url(#coke-metal-top)" />
        {/* Top Rim Bevel */}
        <ellipse cx="32" cy="5" rx="16" ry="3" fill="url(#coke-metal-top)" />
        <ellipse cx="32" cy="4.5" rx="13" ry="2.2" fill="#27272A" />
        {/* Crimson Pull Tab */}
        <rect x="29" y="3" width="6" height="5" rx="1.5" fill="#DC2626" />
        {/* Dynamic Crimson Ribbon Wave */}
        <path d="M10 58C18 52 38 66 54 60V72C38 78 18 64 10 70V58Z" fill="#DC2626" />
        {/* Coca-Cola Script Brand Wordmark */}
        <text x="32" y="34" textAnchor="middle" fill="#FFFFFF" fontSize="7.5" fontStyle="italic" fontWeight="900" fontFamily="Georgia, serif" letterSpacing="0.5">Coca-Cola</text>
        {/* ZERO SUGAR Wordmark */}
        <text x="32" y="46" textAnchor="middle" fill="#FFFFFF" fontSize="13.5" fontWeight="900" fontFamily="system-ui" letterSpacing="1">ZERO</text>
        <text x="32" y="55" textAnchor="middle" fill="#A1A1AA" fontSize="6.5" fontWeight="bold" fontFamily="system-ui" letterSpacing="1">SUGAR</text>
        {/* Condensation Ice Droplets */}
        <circle cx="18" cy="28" r="1.3" fill="#FFFFFF" fillOpacity="0.6" />
        <circle cx="44" cy="36" r="1.5" fill="#FFFFFF" fillOpacity="0.5" />
        <circle cx="22" cy="76" r="1.1" fill="#FFFFFF" fillOpacity="0.6" />
        <circle cx="46" cy="80" r="1.2" fill="#FFFFFF" fillOpacity="0.5" />
        {/* Specular White Stripe */}
        <rect x="14" y="13" width="4" height="76" rx="2" fill="#FFFFFF" fillOpacity="0.25" />
        {/* Curved 3D Sheen overlay */}
        <rect x="10" y="12" width="44" height="78" rx="6" fill="url(#coke-sheen)" pointerEvents="none" />
        {/* Bottom Rim */}
        <path d="M14 88C17 92 22 93 32 93C42 93 47 92 50 88H14Z" fill="url(#coke-metal-top)" />
      </svg>
    );
  }

  // Lay's Classic Salted 52g 3D Pouch (Bigger, more realistic puffed foil)
  return (
    <svg className="w-26 h-34 sm:w-30 sm:h-38 drop-shadow-2xl shrink-0 transition-transform duration-300 hover:scale-105" viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lays-pouch-3d" x1="12" y1="6" x2="68" y2="94" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="35%" stopColor="#FBBF24" />
          <stop offset="65%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>
        <linearGradient id="lays-crimp" x1="0" y1="0" x2="80" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#78350F" />
          <stop offset="50%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>
        <radialGradient id="lays-puff" cx="45%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.65" />
          <stop offset="60%" stopColor="#FBBF24" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#92400E" stopOpacity="0.45" />
        </radialGradient>
        <radialGradient id="lays-floor-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Floor drop shadow */}
      <ellipse cx="40" cy="96" rx="28" ry="4" fill="url(#lays-floor-shadow)" />
      {/* Top Crimped Seal with Notch */}
      <path d="M14 6L18 12H62L66 6H14Z" fill="url(#lays-crimp)" />
      <path d="M14 6H66" stroke="#FEF08A" strokeWidth="1" strokeDasharray="3 2" />
      {/* Puffed Foil Body (Pillow contour) */}
      <path d="M18 12C9 32 9 66 18 86H62C71 66 71 32 62 12H18Z" fill="url(#lays-pouch-3d)" />
      {/* Puffed 3D radial depth highlight */}
      <path d="M18 12C9 32 9 66 18 86H62C71 66 71 32 62 12H18Z" fill="url(#lays-puff)" />
      {/* Red Lay's Brand Banner (Expanded) */}
      <path d="M8 32C28 29 52 29 72 32V60C52 58 28 58 8 60V32Z" fill="#DC2626" />
      {/* Sunburst Emblem & Iconic Lay's Brand Wordmark (Much Larger) */}
      <circle cx="40" cy="46" r="14" fill="#FEF08A" />
      <text x="40" y="50" textAnchor="middle" fill="#DC2626" stroke="#FFFFFF" strokeWidth="0.8" fontSize="14" fontWeight="900" fontFamily="system-ui" letterSpacing="-0.5">Lay&apos;s</text>
      {/* Classic Subtitle */}
      <text x="40" y="70" textAnchor="middle" fill="#78350F" fontSize="8" fontWeight="900" fontFamily="system-ui" letterSpacing="1">CLASSIC</text>
      <text x="40" y="78" textAnchor="middle" fill="#92400E" fontSize="6" fontWeight="bold" fontFamily="system-ui" letterSpacing="0.8">SALTED</text>
      {/* Specular Curved Foil Sheen Reflection */}
      <path d="M19 18C28 26 26 70 19 82" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeOpacity="0.5" />
      {/* Bottom Crimped Seal */}
      <path d="M18 86L14 92H66L62 86H18Z" fill="url(#lays-crimp)" />
      <path d="M14 92H66" stroke="#FEF08A" strokeWidth="1" strokeDasharray="3 2" />
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
  const currentSku = SKUS[skuIdx];
  const skuInfo = PLATFORM_SKU_DATA[currentSku.id]?.[platform.id];
  const isInStock = skuInfo?.stocks[pincodeIdx] === "in";
  const price = skuInfo?.prices[pincodeIdx] || [null, null];
  const storeId = skuInfo?.stores[pincodeIdx] || "STORE-01";
  const maxQty = skuInfo?.maxQty[pincodeIdx] || 0;
  const hasPrice = price[0] !== null;

  return (
    <div
      className="relative rounded-xl bg-slate-50/90 dark:bg-zinc-950/70 border border-slate-200/90 dark:border-zinc-800/90 p-3 flex flex-col justify-between h-[114px] overflow-hidden shadow-2xs hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-200"
    >
      {/* Top Row: Big Platform Logo + Name & Store ID + In Stock/Out of Stock badge (No dot) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <PlatformLogo platform={platform.id} className="w-7 h-7 rounded-lg shrink-0 shadow-xs" />
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
              {platform.name}
            </span>
            <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
              {storeId}
            </span>
          </div>
        </div>

        {/* In Stock / Out of Stock status placed in top right */}
        <span
          className={cn(
            "text-[9px] font-bold px-2 py-0.5 rounded-md transition-colors duration-200 shrink-0 font-mono tracking-tight",
            isInStock
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
              : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25"
          )}
        >
          {isInStock ? `IN STOCK (${maxQty})` : "OUT OF STOCK"}
        </span>
      </div>

      {/* Bottom Row: Live sync status on left, Bigger price in right part */}
      <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-slate-200/70 dark:border-zinc-800/70">
        <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
          {isInStock ? "Live Store Sync" : "Restocking"}
        </span>

        {/* Bigger Price in right part */}
        <div className="flex items-baseline gap-1.5">
          {hasPrice ? (
            <>
              <span className="text-base font-extrabold tabular-nums text-zinc-900 dark:text-zinc-100 font-mono">
                ₹{price[0]}
              </span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500 line-through tabular-nums font-mono">
                ₹{price[1]}
              </span>
              {price[1] && price[0] && price[1] > price[0] && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                  {Math.round(((price[1] - price[0]) / price[1]) * 100)}% off
                </span>
              )}
            </>
          ) : (
            <span className="text-xs font-semibold text-rose-500 dark:text-rose-400 font-mono">
              Unavailable
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
  const skuTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-cycle pincodes every 3.5s
  useEffect(() => {
    if (isTyping) return;
    timerRef.current = setInterval(() => {
      setPinIdx((prev) => (prev + 1) % PINCODES.length);
    }, 3500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTyping]);

  // Auto-cycle products with time (every 4.5s)
  useEffect(() => {
    skuTimerRef.current = setInterval(() => {
      setActiveSku((prev) => (prev + 1) % SKUS.length);
    }, 4500);
    return () => {
      if (skuTimerRef.current) clearInterval(skuTimerRef.current);
    };
  }, []);

  const activeProduct = SKUS[activeSku];

  const handlePrevSku = () => {
    setActiveSku((prev) => (prev === 0 ? SKUS.length - 1 : prev - 1));
  };

  const handleNextSku = () => {
    setActiveSku((prev) => (prev === SKUS.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="relative rounded-2xl bg-white/95 dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 p-4 sm:p-5 w-full max-w-lg flex flex-col justify-between overflow-hidden shadow-xl dark:shadow-2xl">
      {/* Glow orb behind widget - Emerald/Amber */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      {/* 3D Product Showcase Stage - Enlarged (Height: 188px) */}
      <div className="relative rounded-xl bg-slate-50 dark:bg-zinc-950/70 border border-slate-200/90 dark:border-zinc-800/90 p-3 sm:p-3.5 mb-3 shadow-xs h-[188px] overflow-hidden flex items-center justify-between">
        {/* Left & Center: 3D Product Mockup + Live Info with Animated Swap */}
        <AnimatePresence mode="sync" initial={false}>
          <motion.div
            key={activeProduct.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="flex items-center gap-3.5 flex-1 min-w-0"
          >
            {/* Enlarged 3D Product Stage Pedestal Container */}
            <div className="w-30 h-40 sm:w-34 sm:h-42 shrink-0 rounded-xl bg-gradient-to-b from-white to-slate-100 dark:from-zinc-900 dark:to-zinc-950 border border-slate-200/80 dark:border-zinc-800 flex items-center justify-center relative overflow-hidden shadow-inner">
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />
              <Product3DIllustration skuId={activeProduct.id} />
            </div>

            {/* Product Meta */}
            <div className="flex-1 min-w-0 flex flex-col justify-center pl-0.5">
              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-bold shrink-0">
                  {activeProduct.skuCode}
                </span>
                <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider truncate">
                  {activeProduct.category}
                </span>
              </div>

              <h4 className="font-bold text-base sm:text-lg text-zinc-900 dark:text-zinc-100 truncate mb-1">
                {activeProduct.name}
              </h4>

              <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mb-2.5">
                <span className="font-mono text-zinc-800 dark:text-zinc-300 font-medium">{activeProduct.packSize}</span>
                <span>•</span>
                <span>MRP <strong className="font-mono text-zinc-900 dark:text-zinc-200 font-bold">{activeProduct.mrp}</strong></span>
              </div>

              {/* Platform coverage badges */}
              <div className="flex items-center gap-2">
                <div className="flex items-center -space-x-1.5">
                  <PlatformLogo platform="blinkit" className="w-4 h-4 rounded-full ring-1 ring-white dark:ring-zinc-900 shadow-xs" />
                  <PlatformLogo platform="zepto" className="w-4 h-4 rounded-full ring-1 ring-white dark:ring-zinc-900 shadow-xs" />
                  <PlatformLogo platform="instamart" className="w-4 h-4 rounded-full ring-1 ring-white dark:ring-zinc-900 shadow-xs" />
                  <PlatformLogo platform="bigbasket" className="w-4 h-4 rounded-full ring-1 ring-white dark:ring-zinc-900 shadow-xs" />
                </div>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
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

      {/* Pincode Roller - Fixed Height (46px) */}
      <div className="flex items-center gap-2 mb-3 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200/90 dark:border-zinc-800/90 h-[46px] overflow-hidden">
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

      {/* 4-Platform Matrix - Fixed 2x2 grid with responsive compact cards */}
      <div className="grid grid-cols-2 gap-2">
        {PLATFORMS.map((platform) => (
          <PlatformCard
            key={platform.id}
            platform={platform}
            pincodeIdx={pinIdx}
            skuIdx={activeSku}
          />
        ))}
      </div>
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
    <section className="relative min-h-[calc(100vh-80px)] flex items-center pt-20 lg:pt-24 pb-16 overflow-hidden noise">
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
            className="flex justify-center lg:justify-end lg:-mt-10"
          >
            <ScannerWidget />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

