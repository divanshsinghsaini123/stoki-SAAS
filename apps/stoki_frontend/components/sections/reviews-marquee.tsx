"use client";

import { useEffect, useState } from "react";
import { Star, ShieldCheck, Sparkles, Quote } from "lucide-react";
import { cn } from "@/lib/utils";

interface Review {
  id: string;
  name: string;
  handle: string;
  designation: string;
  company: string;
  quote: string;
  rating: number;
  avatarColor: string;
  initials: string;
  tag?: string;
}

const BRAND_LOGOS = [
  "RED BULL",
  "COCA-COLA ZERO",
  "PAPER BOAT",
  "EPIGAMIA",
  "SLEEPY OWL",
  "CHAAYOS",
  "BLUE TOKAI",
  "SLURRP FARM",
  "BEWAKOOF",
  "THE WHOLE TRUTH",
];

const FALLBACK_REVIEWS_ROW_1: Review[] = [
  {
    id: "rev-1",
    name: "Aarav Mehta",
    handle: "@aarav_m",
    designation: "Key Account Manager",
    company: "Beverage Brands India",
    quote: "We caught a 42-pincode OOS blackout across South Delhi dark stores in under 15 minutes. Saved ₹3.8L in revenue on day one.",
    rating: 5,
    avatarColor: "#10B981",
    initials: "AM",
    tag: "Beverages",
  },
  {
    id: "rev-2",
    name: "Pooja Sundaram",
    handle: "@pooja_qcom",
    designation: "Head of Q-Commerce",
    company: "SnackWell Foods",
    quote: "The automated cron campaigns trigger our Blinkit & Zepto scrape at 9 AM and 6 PM like clockwork. We haven't looked back.",
    rating: 5,
    avatarColor: "#F59E0B",
    initials: "PS",
    tag: "Snacks",
  },
  {
    id: "rev-3",
    name: "Vikramaditya Sen",
    handle: "@vikram_sen",
    designation: "Growth & Ecommerce Lead",
    company: "Artisan D2C",
    quote: "Tracking dark-store level inventory across all 4 platforms in one single dashboard. This is literally the Linear of Q-Commerce.",
    rating: 5,
    avatarColor: "#38BDF8",
    initials: "VS",
    tag: "D2C",
  },
  {
    id: "rev-4",
    name: "Rohan Deshmukh",
    handle: "@rohan_bev",
    designation: "Q-Commerce Channel Head",
    company: "Cold Brew Co.",
    quote: "Before Stoki, we manually typed pincodes into Blinkit to check if our cans were live. The instant OOS webhook is a game-changer.",
    rating: 5,
    avatarColor: "#8B5CF6",
    initials: "RD",
    tag: "Ready-To-Drink",
  },
];

const FALLBACK_REVIEWS_ROW_2: Review[] = [
  {
    id: "rev-5",
    name: "Ananya Roy",
    handle: "@ananya_d2c",
    designation: "Director of Supply Chain",
    company: "Organic Pantry",
    quote: "Zero fluff. Exact stock numbers, dark store IDs like POD-402, and price variance tracking. Essential for any serious FMCG brand.",
    rating: 5,
    avatarColor: "#EC4899",
    initials: "AR",
    tag: "Organic Foods",
  },
  {
    id: "rev-6",
    name: "Karthik Nair",
    handle: "@karthik_ops",
    designation: "VP Logistics & Operations",
    company: "Urban Daily Goods",
    quote: "The Redis queue prioritization means our Enterprise tier scans finish in 38 milliseconds. Best stock intelligence engine we've tested.",
    rating: 5,
    avatarColor: "#10B981",
    initials: "KN",
    tag: "Enterprise",
  },
  {
    id: "rev-7",
    name: "Tanvi Kapoor",
    handle: "@tanvik_fmcg",
    designation: "National Brand Manager",
    company: "Pure Harvest Juices",
    quote: "Instamart and BigBasket pricing discrepancies used to slip past us every weekend. Stoki flags every single price variance in real time.",
    rating: 5,
    avatarColor: "#F97316",
    initials: "TK",
    tag: "Packaged Juices",
  },
  {
    id: "rev-8",
    name: "Sameer Joshi",
    handle: "@sameer_ecom",
    designation: "Head of Digital Retail",
    company: "Apex Consumer Health",
    quote: "The 30-Day pass model is so straightforward. No weird wallet locks. Just crisp dark-store intelligence and immediate ROI.",
    rating: 5,
    avatarColor: "#6366F1",
    initials: "SJ",
    tag: "Health & Wellness",
  },
];

function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="w-[360px] shrink-0 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-emerald-500/40 transition-all duration-200 flex flex-col justify-between">
      <div>
        {/* Top Header: Rating Stars + Category Tag */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1">
            {Array.from({ length: review.rating }).map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            ))}
            <span className="ml-1.5 text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              Verified Brand
            </span>
          </div>

          {review.tag && (
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
              {review.tag}
            </span>
          )}
        </div>

        {/* Quote - High contrast in both Light & Dark */}
        <p className="text-xs md:text-sm text-slate-700 dark:text-zinc-200 leading-relaxed font-normal">
          &ldquo;{review.quote}&rdquo;
        </p>
      </div>

      {/* Author Footer */}
      <div className="flex items-center gap-3 pt-3.5 mt-4 border-t border-slate-100 dark:border-zinc-800">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-xs"
          style={{ background: review.avatarColor }}
        >
          {review.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <h5 className="font-bold text-xs text-slate-900 dark:text-zinc-100 truncate">
              {review.name}
            </h5>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono shrink-0">
              {review.handle}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">
            {review.designation} · <strong className="text-slate-800 dark:text-zinc-200 font-semibold">{review.company}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

export function ReviewsMarqueeSection() {
  const [row1, setRow1] = useState<Review[]>(FALLBACK_REVIEWS_ROW_1);
  const [row2, setRow2] = useState<Review[]>(FALLBACK_REVIEWS_ROW_2);

  // Optional: Try fetching published reviews from backend API
  useEffect(() => {
    fetch("http://localhost:8000/api/v1/reviews?is_published=true")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data) && data.length >= 4) {
          const formatted: Review[] = data.map((d: any) => ({
            id: d.id || String(Math.random()),
            name: d.manager_name || d.name,
            handle: d.handle || `@${d.company_name?.toLowerCase().replace(/\s+/g, "_") || "user"}`,
            designation: d.designation || "Brand Manager",
            company: d.company_name || d.brand || "FMCG Brand",
            quote: d.quote || d.content,
            rating: d.rating || 5,
            avatarColor: "#10B981",
            initials: (d.manager_name || "BM").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
            tag: d.category || "FMCG",
          }));
          const half = Math.ceil(formatted.length / 2);
          setRow1(formatted.slice(0, half));
          setRow2(formatted.slice(half));
        }
      })
      .catch(() => {
        // Fallback reviews stay active
      });
  }, []);

  return (
    <section className="relative w-full py-20 overflow-hidden border-y border-slate-200/80 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40">
      {/* Edge gradient fade masks */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-slate-50 via-slate-50/80 to-transparent dark:from-zinc-950 dark:via-zinc-950/80 dark:to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-slate-50 via-slate-50/80 to-transparent dark:from-zinc-950 dark:via-zinc-950/80 dark:to-transparent z-10" />

      <div className="max-w-6xl mx-auto px-6 mb-10 text-center">
        {/* <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          Trusted by Q-Commerce Leaders
        </span> */}
        <div className="relative inline-block py-2 px-5 transition-transform duration-300 hover:-translate-y-1">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 rounded-2xl blur-lg -z-10" />
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-zinc-50 drop-shadow-sm">
            Loved by brand managers tracking{" "}
            <span className="gradient-text">100,000+ dark stores daily.</span>
          </h1>
        </div>
      </div>

      {/* Brand Logos Strip */}
      <div className="relative w-full overflow-hidden mb-10 py-3.5 border-y border-slate-200/80 dark:border-zinc-800 bg-slate-100/60 dark:bg-black/30">
        <div className="flex w-max gap-12 animate-marquee-left whitespace-nowrap">
          {[...BRAND_LOGOS, ...BRAND_LOGOS].map((brand, i) => (
            <span
              key={`${brand}-${i}`}
              className="text-xs font-mono font-bold tracking-widest text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors uppercase cursor-default"
            >
              {brand}
            </span>
          ))}
        </div>
      </div>

      {/* Marquee Row 1 (Scrolls Left) */}
      <div className="relative w-full overflow-hidden mb-4">
        <div className="flex w-max gap-4 animate-marquee-left">
          {[...row1, ...row1, ...row1].map((review, i) => (
            <ReviewCard key={`r1-${review.id}-${i}`} review={review} />
          ))}
        </div>
      </div>

      {/* Marquee Row 2 (Scrolls Right) */}
      <div className="relative w-full overflow-hidden">
        <div className="flex w-max gap-4 animate-marquee-right">
          {[...row2, ...row2, ...row2].map((review, i) => (
            <ReviewCard key={`r2-${review.id}-${i}`} review={review} />
          ))}
        </div>
      </div>
    </section>
  );
}
