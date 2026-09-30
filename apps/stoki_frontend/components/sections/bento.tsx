"use client";

import { motion } from "framer-motion";
import { MapPin, BellRing, TrendingUp, CalendarClock, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const BENTO_CARDS = [
  {
    id: "heatmap",
    size: "large",
    icon: MapPin,
    title: "Hyperlocal Pincode Intelligence",
    description: "Know exactly which pincodes are stocked and which are missing out — at the dark-store level.",
    accent: "var(--accent)",
    visual: <HeatmapVisual />,
  },
  {
    id: "alerts",
    size: "small",
    icon: BellRing,
    title: "Instant OOS Alerts",
    description: "Get notified the moment your SKU goes out of stock — before your customers notice.",
    accent: "#F43F5E",
    visual: <AlertVisual />,
  },
  {
    id: "price",
    size: "small",
    icon: TrendingUp,
    title: "Price & Discount Variance",
    description: "Track how your pricing compares across Blinkit, Zepto, Instamart & BigBasket.",
    accent: "#10B981",
    visual: <SparklineVisual />,
  },
  {
    id: "campaigns",
    size: "medium",
    icon: CalendarClock,
    title: "Automated Scan Campaigns",
    description: "Schedule recurring scans with a cron expression. Set it once, get intelligence forever.",
    accent: "#8B5CF6",
    visual: <CampaignVisual />,
  },
];

// ─── Mini Visuals ────────────────────────────────────────────────────────────

function HeatmapVisual() {
  const cells = Array.from({ length: 48 }, (_, i) => {
    const intensity = Math.random();
    return intensity;
  });

  return (
    <div className="grid grid-cols-8 gap-1 w-full mt-4">
      {cells.map((intensity, i) => (
        <div
          key={i}
          className="aspect-square rounded-sm"
          style={{
            background:
              intensity > 0.7
                ? `rgba(99,102,241,${0.6 + intensity * 0.4})`
                : intensity > 0.4
                ? `rgba(99,102,241,${0.2 + intensity * 0.3})`
                : `rgba(99,102,241,0.06)`,
          }}
        />
      ))}
    </div>
  );
}

function AlertVisual() {
  const alerts = [
    { platform: "Blinkit", sku: "Red Bull 250ml", pin: "400001", color: "#F8CB46" },
    { platform: "Zepto", sku: "Cloud9 Can", pin: "110001", color: "#8B5CF6" },
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
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--oos-bg)] border border-[var(--oos)]/20"
        >
          <BellRing className="w-3 h-3 text-[var(--oos)] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-[var(--oos)] truncate">OOS — {alert.sku}</p>
            <p className="text-[9px] text-[var(--text-subtle)] font-mono">{alert.pin} · {alert.platform}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

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
          <span className="text-[10px] text-[var(--text-muted)] w-16 shrink-0">{p.name}</span>
          <div className="flex-1 h-1.5 rounded-full bg-[var(--border)]">
            <motion.div
              className="h-full rounded-full"
              style={{ background: p.color }}
              initial={{ width: 0 }}
              animate={{ width: p.width }}
              transition={{ duration: 0.8, delay: 0.4 }}
            />
          </div>
          <span className="text-[10px] font-mono text-[var(--text-primary)] tabular-nums w-10 text-right">₹{p.price}</span>
        </div>
      ))}
    </div>
  );
}

function CampaignVisual() {
  const times = ["9:00 AM", "12:00 PM", "3:00 PM", "6:00 PM", "9:00 PM"];
  const platforms = [
    { name: "Blinkit", color: "#F8CB46" },
    { name: "Zepto", color: "#8B5CF6" },
    { name: "Instamart", color: "#FC8019" },
  ];
  return (
    <div className="flex gap-6 mt-3">
      <div className="flex flex-col gap-1.5">
        {times.map((t) => (
          <div key={t} className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[var(--text-subtle)] w-16">{t}</span>
            <div className="flex gap-1">
              {platforms.map((p, j) => (
                <motion.div
                  key={p.name}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: j * 0.1 + 0.3 }}
                  className="w-1.5 h-4 rounded-sm origin-bottom"
                  style={{
                    background: p.color,
                    opacity: Math.random() > 0.3 ? 0.8 : 0.15,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1 pt-0.5">
        {platforms.map((p) => (
          <div key={p.name} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ background: p.color }} />
            <span className="text-[10px] text-[var(--text-muted)]">{p.name}</span>
          </div>
        ))}
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
        <span className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
          Feature Suite
        </span>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)]">
          Everything your brand needs to{" "}
          <span className="gradient-text">dominate Q-Commerce.</span>
        </h2>
        <p className="text-lg text-[var(--text-muted)] max-w-xl">
          From hyperlocal heatmaps to automated cron campaigns — built for brand managers who demand precision.
        </p>
      </motion.div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1 — Large */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="md:col-span-2 glass border rounded-2xl p-6 group hover:border-[var(--border-strong)] transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--accent-subtle)] border border-[var(--accent)]/20">
                <MapPin className="w-4 h-4 text-[var(--accent)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Hyperlocal Pincode Intelligence</h3>
              <p className="text-sm text-[var(--text-muted)] max-w-sm leading-relaxed">
                Know exactly which pincodes are stocked and which are missing — at the dark-store level across all 4 platforms.
              </p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-[var(--text-subtle)] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <HeatmapVisual />
        </motion.div>

        {/* Card 2 — Small */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass border rounded-2xl p-6 group hover:border-[var(--border-strong)] transition-colors"
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--oos-bg)] border border-[var(--oos)]/20 mb-3">
            <BellRing className="w-4 h-4 text-[var(--oos)]" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">Instant OOS Alerts</h3>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Get notified the moment your SKU goes out of stock — before your customers notice.
          </p>
          <AlertVisual />
        </motion.div>

        {/* Card 3 — Small */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="glass border rounded-2xl p-6 group hover:border-[var(--border-strong)] transition-colors"
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">Price &amp; Discount Variance</h3>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Track how your pricing compares across all platforms simultaneously.
          </p>
          <SparklineVisual />
        </motion.div>

        {/* Card 4 — Medium */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="md:col-span-2 glass border rounded-2xl p-6 group hover:border-[var(--border-strong)] transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-2 max-w-sm">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-purple-500/10 border border-purple-500/20">
                <CalendarClock className="w-4 h-4 text-purple-500" />
              </div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Automated Scan Campaigns</h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Schedule recurring scans with cron expressions. Set it once, get stock intelligence forever. Supports multi-pincode fan-out across all platforms.
              </p>
              <code className="text-xs font-mono px-2 py-1 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--accent)] w-fit">
                0 9,18 * * *
              </code>
            </div>
            <ArrowUpRight className="w-4 h-4 text-[var(--text-subtle)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </div>
          <CampaignVisual />
        </motion.div>
      </div>
    </section>
  );
}
