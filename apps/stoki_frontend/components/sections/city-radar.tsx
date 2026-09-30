"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, Zap, TrendingUp, AlertTriangle, Compass, ShieldCheck, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlatformLogo } from "@/components/ui/platform-logos";

// ─── Radar City Nodes Data ───────────────────────────────────────────────────

interface DarkStoreNode {
  id: string;
  name: string;
  platform: "blinkit" | "zepto" | "instamart" | "bigbasket";
  x: number; // percentage in SVG viewBox 0-100
  y: number;
  pincode: string;
  stockStatus: "in" | "oos" | "low";
  units: number;
  latency: string;
  color: string;
}

const METRO_CITIES = [
  { id: "mumbai", name: "Mumbai MMR", coords: "19.0760° N, 72.8777° E", storesCount: 142 },
  { id: "delhi", name: "Delhi NCR", coords: "28.6139° N, 77.2090° E", storesCount: 168 },
  { id: "bengaluru", name: "Bengaluru Tech Corridor", coords: "12.9716° N, 77.5946° E", storesCount: 119 },
];

const DARK_STORE_NODES: Record<string, DarkStoreNode[]> = {
  mumbai: [
    { id: "MUM-BLK-01", name: "Blinkit POD-402 Bandra", platform: "blinkit", x: 38, y: 32, pincode: "400050", stockStatus: "in", units: 24, latency: "28ms", color: "#F8CB46" },
    { id: "MUM-ZPT-02", name: "Zepto Hub BKC Central", platform: "zepto", x: 62, y: 44, pincode: "400051", stockStatus: "oos", units: 0, latency: "34ms", color: "#8B5CF6" },
    { id: "MUM-IM-03", name: "Instamart Pod Colaba", platform: "instamart", x: 45, y: 72, pincode: "400001", stockStatus: "in", units: 18, latency: "42ms", color: "#FC8019" },
    { id: "MUM-BB-04", name: "BB Now Worli Coastal", platform: "bigbasket", x: 30, y: 55, pincode: "400018", stockStatus: "in", units: 12, latency: "38ms", color: "#84C225" },
    { id: "MUM-BLK-05", name: "Blinkit POD-119 Andheri W", platform: "blinkit", x: 26, y: 22, pincode: "400053", stockStatus: "low", units: 3, latency: "31ms", color: "#F8CB46" },
    { id: "MUM-ZPT-06", name: "Zepto DarkStore Powai", platform: "zepto", x: 74, y: 28, pincode: "400076", stockStatus: "in", units: 31, latency: "26ms", color: "#8B5CF6" },
    { id: "MUM-IM-07", name: "Instamart Pod Lower Parel", platform: "instamart", x: 50, y: 58, pincode: "400013", stockStatus: "in", units: 15, latency: "39ms", color: "#FC8019" },
  ],
  delhi: [
    { id: "DLH-BLK-01", name: "Blinkit POD-11 Connaught Pl", platform: "blinkit", x: 50, y: 48, pincode: "110001", stockStatus: "in", units: 42, latency: "24ms", color: "#F8CB46" },
    { id: "DLH-ZPT-02", name: "Zepto Hub Cyber City GGN", platform: "zepto", x: 28, y: 72, pincode: "122002", stockStatus: "low", units: 4, latency: "36ms", color: "#8B5CF6" },
    { id: "DLH-IM-03", name: "Instamart Pod Hauz Khas", platform: "instamart", x: 55, y: 65, pincode: "110016", stockStatus: "oos", units: 0, latency: "45ms", color: "#FC8019" },
    { id: "DLH-BB-04", name: "BB Now Sector 62 Noida", platform: "bigbasket", x: 78, y: 52, pincode: "201301", stockStatus: "in", units: 19, latency: "40ms", color: "#84C225" },
    { id: "DLH-BLK-05", name: "Blinkit POD-88 Rohini W", platform: "blinkit", x: 32, y: 25, pincode: "110085", stockStatus: "in", units: 28, latency: "30ms", color: "#F8CB46" },
  ],
  bengaluru: [
    { id: "BLR-IM-01", name: "Instamart Pod Indiranagar", platform: "instamart", x: 65, y: 42, pincode: "560038", stockStatus: "in", units: 35, latency: "25ms", color: "#FC8019" },
    { id: "BLR-ZPT-02", name: "Zepto DarkStore Koramangala", platform: "zepto", x: 58, y: 62, pincode: "560034", stockStatus: "in", units: 22, latency: "29ms", color: "#8B5CF6" },
    { id: "BLR-BLK-03", name: "Blinkit POD-07 Whitefield", platform: "blinkit", x: 82, y: 48, pincode: "560066", stockStatus: "oos", units: 0, latency: "41ms", color: "#F8CB46" },
    { id: "BLR-BB-04", name: "BB Now Bellandur Hub", platform: "bigbasket", x: 70, y: 68, pincode: "560103", stockStatus: "in", units: 16, latency: "33ms", color: "#84C225" },
    { id: "BLR-ZPT-05", name: "Zepto Hub Malleshwaram", platform: "zepto", x: 32, y: 35, pincode: "560003", stockStatus: "in", units: 29, latency: "31ms", color: "#8B5CF6" },
  ],
};

// ─── Bespoke Mini Product Vectors for HUD Cards ──────────────────────────────

function RedBullMini() {
  return (
    <svg className="w-7 h-10 shrink-0 drop-shadow" viewBox="0 0 28 40" fill="none">
      <rect x="6" y="2" width="16" height="2" rx="1" fill="#94A3B8" />
      <rect x="4" y="4" width="20" height="32" rx="2.5" fill="#1E3A8A" />
      <path d="M4 4L24 20V36H4V4Z" fill="#2563EB" fillOpacity="0.9" />
      <circle cx="14" cy="20" r="4" fill="#F59E0B" />
      <rect x="6" y="5" width="2" height="30" rx="1" fill="#FFFFFF" fillOpacity="0.3" />
      <rect x="6" y="36" width="16" height="2" rx="1" fill="#94A3B8" />
    </svg>
  );
}

function CokeZeroMini() {
  return (
    <svg className="w-7 h-10 shrink-0 drop-shadow" viewBox="0 0 28 40" fill="none">
      <rect x="6" y="2" width="16" height="2" rx="1" fill="#71717A" />
      <rect x="4" y="4" width="20" height="32" rx="2.5" fill="#18181B" />
      <path d="M4 22C8 20 16 28 24 24V29C16 33 8 25 4 27V22Z" fill="#DC2626" />
      <text x="14" y="17" textAnchor="middle" fill="#FFFFFF" fontSize="5.5" fontWeight="bold" fontFamily="system-ui">ZERO</text>
      <rect x="6" y="5" width="2" height="30" rx="1" fill="#FFFFFF" fillOpacity="0.25" />
      <rect x="6" y="36" width="16" height="2" rx="1" fill="#71717A" />
    </svg>
  );
}

function LaysMini() {
  return (
    <svg className="w-8 h-10 shrink-0 drop-shadow" viewBox="0 0 30 40" fill="none">
      <path d="M5 2H25L27 5H3L5 2Z" fill="#B45309" />
      <rect x="3" y="5" width="24" height="30" rx="3" fill="#F59E0B" />
      <path d="M3 15H27V23H3V15Z" fill="#DC2626" />
      <circle cx="15" cy="19" r="4.5" fill="#FEF08A" />
      <text x="15" y="21" textAnchor="middle" fill="#B45309" fontSize="5" fontWeight="900" fontFamily="system-ui">Lay&apos;s</text>
      <path d="M3 35L5 38H25L27 35H3Z" fill="#B45309" />
    </svg>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function CityRadarSection() {
  const [activeCity, setActiveCity] = useState("mumbai");
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const nodes = DARK_STORE_NODES[activeCity] || [];

  return (
    <section className="relative w-full py-24 px-6 overflow-hidden border-y border-slate-200/80 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-emerald-500/5 blur-[160px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="flex flex-col gap-3">
            {/* <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Multi-Platform Dark-Store Network
              </span>
              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 hidden sm:inline">
                60s Verification Cycles
              </span>
            </div> */}

            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Store-Level Inventory{" "}
              <span className="gradient-text">Coverage Matrix</span>
            </h2>

            <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400 max-w-xl">
              Continuous stock visibility across 500+ Blinkit, Zepto, Instamart, and BigBasket fulfillment hubs. Spot localized stockouts before they affect sales.
            </p>
          </div>

          {/* City selector tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800">
            {METRO_CITIES.map((city) => (
              <button
                key={city.id}
                onClick={() => setActiveCity(city.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                  activeCity === city.id
                    ? "bg-white text-zinc-950 dark:bg-zinc-800 dark:text-white shadow-xs"
                    : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
                )}
              >
                {city.name}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Interactive Radar Stage ─── */}
        <div className="relative w-full min-h-[580px] lg:min-h-[620px] rounded-3xl bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 shadow-xl dark:shadow-2xl overflow-hidden p-6 flex flex-col justify-between">
          {/* Radar background grid & rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Radar Coordinates HUD */}
            <div className="absolute top-4 left-6 flex items-center gap-2 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
              <Compass className="w-3.5 h-3.5 text-emerald-500" />
              <span>RADAR COORDINATES:</span>
              <span className="text-zinc-900 dark:text-zinc-200 font-semibold">
                {METRO_CITIES.find((c) => c.id === activeCity)?.coords}
              </span>
            </div>

            <div className="absolute top-4 right-6 flex items-center gap-3 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                ACTIVE SCANNER
              </span>
              <span>•</span>
              <span>INTERVAL: <strong className="text-zinc-900 dark:text-zinc-200">60s</strong></span>
            </div>

            {/* Concentric radar range rings */}
            <div className="relative w-[500px] h-[500px] sm:w-[600px] sm:h-[600px] rounded-full border border-slate-200 dark:border-emerald-500/10 flex items-center justify-center">
              {/* Distance markers */}
              <span className="absolute top-2 text-[9px] font-mono text-slate-400 dark:text-emerald-500/50">15 KM RANGE</span>

              <div className="w-[380px] h-[380px] sm:w-[460px] sm:h-[460px] rounded-full border border-slate-200 dark:border-emerald-500/15 flex items-center justify-center">
                <span className="absolute top-2 text-[9px] font-mono text-slate-400 dark:text-emerald-500/50">10 KM RANGE</span>

                <div className="w-[260px] h-[260px] sm:w-[320px] sm:h-[320px] rounded-full border border-slate-300 dark:border-emerald-500/20 flex items-center justify-center">
                  <span className="absolute top-2 text-[9px] font-mono text-slate-400 dark:text-emerald-500/50">5 KM CORE</span>

                  <div className="w-[140px] h-[140px] sm:w-[180px] sm:h-[180px] rounded-full border border-dashed border-emerald-500/30 flex items-center justify-center">
                    <span className="text-[9px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold">DARK STORE HUB</span>
                  </div>
                </div>
              </div>

              {/* Crosshair axis lines */}
              <div className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-slate-200 dark:via-emerald-500/20 to-transparent" />
              <div className="absolute inset-y-0 w-[1px] bg-gradient-to-b from-transparent via-slate-200 dark:via-emerald-500/20 to-transparent" />

              {/* 360-degree rotating radar scanline */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 origin-center pointer-events-none"
              >
                <div className="w-1/2 h-1/2 origin-bottom-right bg-gradient-to-tl from-emerald-500/10 via-emerald-500/3 to-transparent dark:from-emerald-500/20 dark:via-emerald-500/5 to-transparent rounded-tl-full" />
              </motion.div>
            </div>
          </div>

          {/* SVG Overlay: Dynamic Connection Beams and Dark Store Nodes */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="beam-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Connection mesh lines */}
            {nodes.map((node, i) => {
              const nextNode = nodes[(i + 1) % nodes.length];
              return (
                <line
                  key={`line-${node.id}`}
                  x1={node.x}
                  y1={node.y}
                  x2={nextNode.x}
                  y2={nextNode.y}
                  stroke="url(#beam-grad)"
                  strokeWidth="0.3"
                  strokeDasharray="1 1.5"
                />
              );
            })}
          </svg>

          {/* Interactive Dark Store Nodes HTML Overlay */}
          <div className="absolute inset-0 pointer-events-auto">
            {nodes.map((node) => {
              const isHovered = hoveredNode === node.id;
              return (
                <div
                  key={node.id}
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-20"
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {/* Subtle node aura ring */}
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full absolute -top-1 -left-1 opacity-25 pointer-events-none transition-transform duration-200 group-hover:scale-125",
                      node.stockStatus === "oos" ? "bg-rose-500" : "bg-emerald-500"
                    )}
                  />

                  {/* Core node dot */}
                  <div
                    className={cn(
                      "relative w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-950 flex items-center justify-center shadow-md transition-transform duration-200 group-hover:scale-125",
                      node.stockStatus === "oos"
                        ? "bg-rose-500 ring-2 ring-rose-500/30"
                        : "bg-emerald-500 ring-2 ring-emerald-500/30"
                    )}
                  >
                    <div className="w-1 h-1 rounded-full bg-white" />
                  </div>

                  {/* Hover tooltip HUD */}
                  <div
                    className={cn(
                      "absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs z-30 pointer-events-none transition-all duration-200 shadow-xl",
                      isHovered ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <PlatformLogo platform={node.platform} className="w-3.5 h-3.5 rounded" />
                      <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">{node.name}</strong>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                      <span>PIN: <strong className="text-zinc-800 dark:text-zinc-200">{node.pincode}</strong></span>
                      <span>•</span>
                      <span>LATENCY: <strong className="text-emerald-600 dark:text-emerald-400">{node.latency}</strong></span>
                      <span>•</span>
                      <span className={node.stockStatus === "oos" ? "text-rose-600 dark:text-rose-400 font-bold" : "text-emerald-600 dark:text-emerald-400 font-bold"}>
                        {node.stockStatus === "oos" ? "OUT OF STOCK" : `${node.units} Units Live`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ─── 3 Floating Product Cards (Overlaid on Radar) ─── */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 my-auto pointer-events-auto">
            {/* Floating Card 1: Red Bull (High Velocity) */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              whileHover={{ y: -4 }}
              className="bg-white/95 dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-4 shadow-lg dark:shadow-xl backdrop-blur-xl relative overflow-hidden group hover:border-emerald-500/40 transition-all"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />

              <div className="flex items-start gap-3">
                <div className="w-12 h-14 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
                  <RedBullMini />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <PlatformLogo platform="blinkit" className="w-3.5 h-3.5 rounded shrink-0" />
                      <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 font-semibold truncate">
                        400001 · Bandra W
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                      <TrendingUp className="w-2.5 h-2.5" />
                      24 units/hr
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    Red Bull Energy 250ml
                  </h4>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                    Blinkit POD-402 · 1.4 km
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">18 Units In Stock</span>
                </div>
                <span className="font-mono text-zinc-900 dark:text-zinc-100 font-bold">₹115.00</span>
              </div>
            </motion.div>

            {/* Floating Card 2: Coca-Cola Zero (Critical OOS Spike) */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              whileHover={{ y: -4 }}
              className="bg-white/95 dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-4 shadow-lg dark:shadow-xl backdrop-blur-xl relative overflow-hidden group hover:border-rose-500/40 transition-all"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />

              <div className="flex items-start gap-3">
                <div className="w-12 h-14 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
                  <CokeZeroMini />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <PlatformLogo platform="zepto" className="w-3.5 h-3.5 rounded shrink-0" />
                      <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 font-semibold truncate">
                        110001 · Connaught Pl
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 shrink-0">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      OOS Spike
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    Coca-Cola Zero 300ml
                  </h4>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                    Zepto ZPT-CST · 0.8 km
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="font-semibold text-rose-700 dark:text-rose-400">0 Units (OUT OF STOCK)</span>
                </div>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">Restock ETA 45m</span>
              </div>
            </motion.div>

            {/* Floating Card 3: Lay's Classic Salted (Surge Velocity) */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ y: -4 }}
              className="bg-white/95 dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-4 shadow-lg dark:shadow-xl backdrop-blur-xl relative overflow-hidden group hover:border-amber-500/40 transition-all"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />

              <div className="flex items-start gap-3">
                <div className="w-12 h-14 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
                  <LaysMini />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <PlatformLogo platform="instamart" className="w-3.5 h-3.5 rounded shrink-0" />
                      <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 font-semibold truncate">
                        560001 · Indiranagar
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 shrink-0">
                      <Zap className="w-2.5 h-2.5" />
                      48 units/hr
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    Lay&apos;s Classic Salted 52g
                  </h4>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                    Instamart IM-BLR-07 · 2.1 km
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">35 Units In Stock</span>
                </div>
                <span className="font-mono text-zinc-900 dark:text-zinc-100 font-bold">₹20.00</span>
              </div>
            </motion.div>
          </div>

          {/* Bottom HUD Metrics Bar */}
          <div className="relative z-10 pt-4 border-t border-slate-200 dark:border-zinc-800 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Pincode Dark Stores</p>
                <p className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                  {METRO_CITIES.find((c) => c.id === activeCity)?.storesCount} Nodes Active
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Scan Latency</p>
                <p className="font-mono font-bold text-zinc-900 dark:text-zinc-100">32ms Median</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Cron Cadence</p>
                <p className="font-mono font-bold text-zinc-900 dark:text-zinc-100">Continuous 60s Polling</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Detection Accuracy</p>
                <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">99.8% Ground Truth</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
