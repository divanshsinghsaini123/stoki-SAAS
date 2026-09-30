"use client";

import { motion } from "framer-motion";
import { MapPin, BellRing, TrendingUp, CalendarClock, ArrowUpRight, Cpu, Layers, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Data: Real Pincode Intelligence Matrix ──────────────────────────────────

interface PincodeCell {
  code: string;
  city: string;
  pod: string;
  stockPercent: number;
  status: "optimal" | "warning" | "critical";
}

const PINCODE_CELLS: PincodeCell[] = [
  { code: "400001", city: "Colaba, MUM", pod: "POD-402", stockPercent: 98, status: "optimal" },
  { code: "110001", city: "Connaught, DEL", pod: "POD-11", stockPercent: 94, status: "optimal" },
  { code: "560001", city: "MG Road, BLR", pod: "POD-07", stockPercent: 42, status: "warning" },
  { code: "122002", city: "Cyber City, GGN", pod: "ZPT-GGN", stockPercent: 12, status: "critical" },
  { code: "400050", city: "Bandra W, MUM", pod: "DS-402A", stockPercent: 96, status: "optimal" },
  { code: "500081", city: "HITEC, HYD", pod: "IM-HYD-03", stockPercent: 88, status: "optimal" },
  { code: "600028", city: "Adyar, CHN", pod: "BB-CHN-01", stockPercent: 28, status: "critical" },
  { code: "700016", city: "Park St, KOL", pod: "BLK-KOL", stockPercent: 91, status: "optimal" },
];

function PincodeIntelligenceGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full mt-4">
      {PINCODE_CELLS.map((cell) => {
        const isOptimal = cell.status === "optimal";
        const isWarning = cell.status === "warning";
        const isCritical = cell.status === "critical";

        return (
          <motion.div
            key={cell.code}
            whileHover={{ y: -2, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={cn(
              "p-3 rounded-xl border flex flex-col justify-between transition-all",
              isOptimal && "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
              isWarning && "bg-amber-500/10 border-amber-500/25 text-amber-400",
              isCritical && "bg-rose-500/10 border-rose-500/25 text-rose-400"
            )}
          >
            {/* Top row: Pincode + Dot */}
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="font-mono text-xs font-bold tracking-tight text-zinc-100">
                {cell.code}
              </span>
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  isOptimal && "pulse-emerald",
                  isWarning && "pulse-amber",
                  isCritical && "pulse-red"
                )}
              />
            </div>

            {/* Middle: Big Stock Availability % */}
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-xl font-mono font-bold tracking-tight tabular-nums">
                {cell.stockPercent}%
              </span>
              <span className="text-[9px] uppercase font-semibold opacity-80">
                {isCritical ? "OOS" : isWarning ? "LOW" : "STOCKED"}
              </span>
            </div>

            {/* Bottom: Locality & POD ID */}
            <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-white/5 font-mono">
              <span className="truncate">{cell.city}</span>
              <span className="text-zinc-500 font-medium shrink-0 ml-1">{cell.pod}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Alerts Visual ───────────────────────────────────────────────────────────

function AlertVisual() {
  const alerts = [
    { platform: "Blinkit", sku: "Red Bull 250ml", pin: "400001", color: "#F8CB46" },
    { platform: "Zepto", sku: "Coke Zero 300ml", pin: "110001", color: "#8B5CF6" },
    { platform: "Instamart", sku: "Lay's 52g", pin: "560001", color: "#FC8019" },
  ];

  return (
    <div className="flex flex-col gap-2 mt-3">
      {alerts.map((alert, i) => (
        <motion.div
          key={i}
          initial={{ x: -10, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: i * 0.15 + 0.3 }}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20"
        >
          <BellRing className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-rose-300 truncate">
              OOS Spike — {alert.sku}
            </p>
            <p className="text-[10px] text-zinc-400 font-mono">
              PIN {alert.pin} · {alert.platform}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Sparkline Visual ────────────────────────────────────────────────────────

function SparklineVisual() {
  const platforms = [
    { name: "Blinkit", price: 115, color: "#F8CB46", width: "92%" },
    { name: "Zepto", price: 120, color: "#8B5CF6", width: "96%" },
    { name: "Instamart", price: 108, color: "#FC8019", width: "86%" },
    { name: "BigBasket", price: 112, color: "#84C225", width: "90%" },
  ];

  return (
    <div className="flex flex-col gap-2 mt-3">
      {platforms.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-400 w-16 shrink-0 font-medium">{p.name}</span>
          <div className="flex-1 h-1.5 rounded-full bg-zinc-800">
            <motion.div
              className="h-full rounded-full"
              style={{ background: p.color }}
              initial={{ width: 0 }}
              animate={{ width: p.width }}
              transition={{ duration: 0.8, delay: 0.4 }}
            />
          </div>
          <span className="text-[10px] font-mono text-zinc-200 tabular-nums w-10 text-right font-bold">
            ₹{p.price}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Campaign Timeline Visual ────────────────────────────────────────────────

const CAMPAIGN_OPACITIES = [
  [0.9, 0.2, 0.9],
  [0.2, 0.9, 0.9],
  [0.9, 0.9, 0.2],
  [0.9, 0.2, 0.9],
  [0.2, 0.9, 0.9],
];

function CampaignTimelineVisual() {
  const times = ["9:00 AM", "12:00 PM", "3:00 PM", "6:00 PM", "9:00 PM"];
  const platforms = [
    { name: "Blinkit", color: "#F8CB46" },
    { name: "Zepto", color: "#8B5CF6" },
    { name: "Instamart", color: "#FC8019" },
  ];

  return (
    <div className="flex flex-col gap-1.5 mt-3">
      {times.map((t, idx) => (
        <div key={t} className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-400 w-16 font-medium">{t}</span>
          <div className="flex gap-1.5">
            {platforms.map((p, j) => (
              <motion.div
                key={p.name}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: j * 0.1 + 0.3 }}
                className="w-2 h-4 rounded-sm origin-bottom"
                style={{
                  background: p.color,
                  opacity: CAMPAIGN_OPACITIES[idx]?.[j] ?? 0.8,
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Live Queue Telemetry Panel ──────────────────────────────────────────────

interface QueueTelemetry {
  queueName: string;
  platform: string;
  activeJobs: number;
  latency: string;
  tier: "Enterprise (lpush)" | "Pro (rpush)" | "Standard";
  color: string;
}

const QUEUES: QueueTelemetry[] = [
  { queueName: "blinkit_tasks", platform: "Blinkit", activeJobs: 28, latency: "38ms", tier: "Enterprise (lpush)", color: "#F8CB46" },
  { queueName: "zepto_tasks", platform: "Zepto", activeJobs: 19, latency: "42ms", tier: "Pro (rpush)", color: "#8B5CF6" },
  { queueName: "instamart_tasks", platform: "Instamart", activeJobs: 34, latency: "49ms", tier: "Pro (rpush)", color: "#FC8019" },
  { queueName: "bigbasket_tasks", platform: "BigBasket", activeJobs: 14, latency: "55ms", tier: "Standard", color: "#84C225" },
];

function LiveQueueTelemetryPanel() {
  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl bg-zinc-900/90 border border-zinc-800/90 w-full">
      <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-200">
            Live Queue Telemetry
          </span>
        </div>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
          16 Queues Live
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {QUEUES.map((q) => (
          <div
            key={q.queueName}
            className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-black/40 border border-zinc-800/50 text-[10px] font-mono"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: q.color }} />
              <span className="text-zinc-300 font-semibold truncate">{q.queueName}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-emerald-400 font-bold">{q.activeJobs} jobs</span>
              <span className="text-zinc-500">|</span>
              <span className="text-zinc-400">{q.latency}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 text-[9px] font-mono text-zinc-400">
        <span className="flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-emerald-400 pulse-emerald" />
          Throughput: 1,420 scans/min
        </span>
        <span className="text-emerald-400 font-semibold">Priority: Enterprise First</span>
      </div>
    </div>
  );
}

// ─── Bento Grid ──────────────────────────────────────────────────────────────

export function BentoSection() {
  return (
    <section className="relative max-w-6xl mx-auto px-6 py-24">
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="flex flex-col gap-3 mb-12"
      >
        <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
          Feature Suite
        </span>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)]">
          Everything your brand needs to{" "}
          <span className="gradient-text">dominate Q-Commerce.</span>
        </h2>
        <p className="text-lg text-[var(--text-muted)] max-w-xl">
          From dark-store level pincode heatmaps to automated Redis priority queues — built for FMCG brand managers who demand precision.
        </p>
      </motion.div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1 — Large: Hyperlocal Pincode Intelligence */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="md:col-span-2 glass border rounded-2xl p-6 group hover:border-[var(--border-strong)] transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
                <MapPin className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Hyperlocal Pincode Intelligence
              </h3>
              <p className="text-sm text-[var(--text-muted)] max-w-sm leading-relaxed">
                Know exactly which pincodes are stocked and which are depleted — at the dark-store level across Blinkit, Zepto, Instamart &amp; BigBasket.
              </p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Real Pincode Matrix Cells */}
          <PincodeIntelligenceGrid />
        </motion.div>

        {/* Card 2 — Small: Instant OOS Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass border rounded-2xl p-6 group hover:border-[var(--border-strong)] transition-colors"
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-500/10 border border-rose-500/20 mb-3">
            <BellRing className="w-4 h-4 text-rose-400" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
            Instant OOS Alerts
          </h3>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Get notified the moment your SKU drops to zero units — before your customers notice.
          </p>
          <AlertVisual />
        </motion.div>

        {/* Card 3 — Small: Price & Discount Variance */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="glass border rounded-2xl p-6 group hover:border-[var(--border-strong)] transition-colors"
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/20 mb-3">
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
            Price &amp; Discount Variance
          </h3>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Track how your pricing compares across all platforms simultaneously.
          </p>
          <SparklineVisual />
        </motion.div>

        {/* Card 4 — Medium: Automated Scan Campaigns + Live Queue Telemetry */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="md:col-span-2 glass border rounded-2xl p-6 group hover:border-[var(--border-strong)] transition-colors"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left side: Scan Campaign Details */}
            <div className="flex flex-col gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
                <CalendarClock className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Automated Scan Campaigns
              </h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Schedule recurring scans with cron expressions. Set it once, get stock intelligence forever with multi-pincode fan-out across all 4 platforms.
              </p>
              
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono px-2.5 py-1 rounded-lg bg-[var(--background)] border border-[var(--border)] text-emerald-400 font-bold w-fit">
                  0 9,18 * * *
                </code>
                <span className="text-[11px] text-zinc-400 font-medium">Twice daily automated run</span>
              </div>

              {/* Timeline graphic */}
              <CampaignTimelineVisual />
            </div>

            {/* Right side: Live Queue Telemetry Panel */}
            <div className="flex flex-col gap-2">
              <LiveQueueTelemetryPanel />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
