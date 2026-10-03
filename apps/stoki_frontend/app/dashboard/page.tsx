"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  AlertTriangle,
  Radio,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTenant } from "./layout";
import { PlatformLogo, BlinkitIcon, ZeptoIcon, InstamartIcon } from "@/components/ui/platform-logos";

export default function DashboardOverviewPage() {
  const { tenant, openOnboardingModal } = useTenant();
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const sampleKpis = [
    {
      title: "Overall Availability Rate",
      value: "86.4%",
      change: "+2.1% vs yesterday",
      trend: "up",
      detail: "Across 542 monitored dark stores",
    },
    {
      title: "Active Dark Stores Monitored",
      value: "542",
      change: "4 platforms active",
      trend: "neutral",
      detail: "Blinkit, Zepto, Swiggy Instamart",
    },
    {
      title: "Critical OOS Breaches",
      value: "14 SKUs",
      change: "-3 recovered in last 1h",
      trend: "alert",
      detail: "Requires inventory replenishment",
    },
    {
      title: "Daily Scan Quota",
      value: "18 / 50",
      change: "32 scans remaining",
      trend: "neutral",
      detail: "Auto-resets at midnight IST",
    },
  ];

  const sampleStockStream = [
    {
      sku: "Red Bull Energy Drink 250ml",
      brand: "Red Bull",
      platform: "Blinkit",
      darkStore: "POD-MUM-402 (Bandra West)",
      pincode: "400050",
      price: "₹125",
      mrp: "₹125",
      status: "IN STOCK",
      qty: "18 units",
      lastScanned: "2 mins ago",
    },
    {
      sku: "Raw Pressery Cold Pressed Valencia Orange 1L",
      brand: "Raw Pressery",
      platform: "Zepto",
      darkStore: "ZEP-BLR-09 (Koramangala)",
      pincode: "560034",
      price: "₹190",
      mrp: "₹210",
      status: "OUT OF STOCK",
      qty: "0 units",
      lastScanned: "4 mins ago",
    },
    {
      sku: "Epigamia Greek Yogurt Strawberry 120g",
      brand: "Epigamia",
      platform: "Swiggy Instamart",
      darkStore: "SWM-DEL-18 (Hauz Khas)",
      pincode: "110016",
      price: "₹65",
      mrp: "₹70",
      status: "IN STOCK",
      qty: "7 units",
      lastScanned: "6 mins ago",
    },
    {
      sku: "Sleepy Owl French Vanilla Cold Coffee 200ml",
      brand: "Sleepy Owl",
      platform: "Blinkit",
      darkStore: "POD-GGN-12 (Cyber Hub)",
      pincode: "122002",
      price: "₹110",
      mrp: "₹120",
      status: "OUT OF STOCK",
      qty: "0 units",
      lastScanned: "9 mins ago",
    },
    {
      sku: "Yoga Bar Dark Chocolate Oats 400g",
      brand: "Yoga Bar",
      platform: "Zepto",
      darkStore: "ZEP-PUN-04 (Viman Nagar)",
      pincode: "411014",
      price: "₹175",
      mrp: "₹199",
      status: "IN STOCK",
      qty: "14 units",
      lastScanned: "11 mins ago",
    },
  ];

  const filteredItems = sampleStockStream.filter((item) => {
    const matchesPlatform =
      filterPlatform === "all" ||
      item.platform.toLowerCase().includes(filterPlatform.toLowerCase());
    const matchesSearch =
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.darkStore.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.pincode.includes(searchQuery);
    return matchesPlatform && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Banner / Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              {tenant?.company_name || "Workspace"} Stock Intelligence
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Live Radar
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Real-time stock availability, dark-store presence, and pricing variance across India.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {tenant && !tenant.is_onboarded && (
            <button
              type="button"
              onClick={openOnboardingModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Complete Setup</span>
            </button>
          )}

          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors"
          >
            <span>Manage Settings</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Row 1: Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {sampleKpis.map((kpi, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-1.5"
          >
            <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
              {kpi.title}
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
              {kpi.value}
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
              <span
                className={cn(
                  "font-medium",
                  kpi.trend === "up" && "text-emerald-600 dark:text-emerald-400",
                  kpi.trend === "alert" && "text-rose-600 dark:text-rose-400 font-semibold",
                  kpi.trend === "neutral" && "text-zinc-500 dark:text-zinc-400"
                )}
              >
                {kpi.change}
              </span>
              <span className="text-zinc-400 truncate max-w-[120px] text-right">
                {kpi.detail}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Platform Status Radar Matrix */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              Active Platform Scanners
            </h3>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono">
            Auto-refreshing every 30s
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Blinkit */}
          <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BlinkitIcon className="w-6 h-6" />
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Blinkit
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                91.2% Available
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 flex justify-between font-mono">
              <span>Dark Stores: 228</span>
              <span>Avg SLA: 11 mins</span>
            </div>
          </div>

          {/* Zepto */}
          <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ZeptoIcon className="w-6 h-6" />
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Zepto
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                84.8% Available
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 flex justify-between font-mono">
              <span>Dark Stores: 184</span>
              <span>Avg SLA: 10 mins</span>
            </div>
          </div>

          {/* Swiggy Instamart */}
          <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <InstamartIcon className="w-6 h-6" />
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Instamart
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                83.1% Available
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 flex justify-between font-mono">
              <span>Dark Stores: 130</span>
              <span>Avg SLA: 14 mins</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Live Dark-Store Stock Stream Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Live Dark Store Stream
            </h3>
            <p className="text-[11px] text-zinc-400">
              Telemetry feed updated across scanned pin-codes
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search SKU or pincode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="py-1.5 px-2.5 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none font-mono"
            >
              <option value="all">All Platforms</option>
              <option value="blinkit">Blinkit</option>
              <option value="zepto">Zepto</option>
              <option value="instamart">Instamart</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-mono text-[10px] uppercase">
              <tr>
                <th className="py-2.5 px-4">SKU / Product</th>
                <th className="py-2.5 px-3">Platform</th>
                <th className="py-2.5 px-3">Dark Store / Pincode</th>
                <th className="py-2.5 px-3">Price / MRP</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-4 text-right">Last Scan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {filteredItems.map((item, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {item.sku}
                    </div>
                    <div className="text-[10px] text-zinc-400">{item.brand}</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <PlatformLogo platform={item.platform} className="w-4 h-4" />
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {item.platform}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono">
                    <div className="text-zinc-700 dark:text-zinc-300">
                      {item.darkStore}
                    </div>
                    <div className="text-[10px] text-zinc-400">PIN: {item.pincode}</div>
                  </td>
                  <td className="py-3 px-3 font-mono">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100">
                      {item.price}
                    </div>
                    {item.price !== item.mrp && (
                      <div className="text-[10px] text-zinc-400 line-through">
                        {item.mrp}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {item.status === "IN STOCK" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        IN STOCK ({item.qty})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        OUT OF STOCK
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[11px] text-zinc-400">
                    {item.lastScanned}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
