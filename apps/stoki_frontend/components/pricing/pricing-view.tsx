"use client";

import { useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Check,
  Zap,
  Sparkles,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  Clock,
  HelpCircle,
} from "lucide-react";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { CheckoutModal, PlanItem } from "@/components/pricing/checkout-modal";
import { FAQSection } from "@/components/sections/faq";
import { cn } from "@/lib/utils";

const PLANS: PlanItem[] = [
  {
    id: "STARTER_30D",
    name: "Starter 30-Day Pass",
    badge: "Emerging D2C",
    basePrice: 4999,
    periodText: "for 30 days access",
    description: "Essential dark store stock telemetry for emerging consumer brands.",
    features: [
      "1 Tracked Brand Catalog",
      "100 Daily Automated Scans",
      "Blinkit, Zepto, Instamart & BigBasket",
      "5 Core Metro Pincodes",
      "Real-time Stockout & OOS Alerts",
      "Standard Scan Queue Priority",
      "Email & In-App Notification Feed",
    ],
  },
  {
    id: "PRO_30D",
    name: "Pro 30-Day Pass",
    badge: "Most Popular",
    basePrice: 14999,
    periodText: "for 30 days access",
    description: "High-frequency stockout and pricing radar for FMCG category leaders.",
    features: [
      "Up to 5 Tracked Brand Catalogs",
      "500 Daily Deep Scans (High Priority)",
      "All 4 Platforms + Regional Hubs",
      "Unlimited Dark Stores & Pincodes",
      "Price Disparity & Discount Tracking",
      "Cart Limit & Shadow Stock Alerts",
      "Slack Webhooks & Daily Executive Digest",
      "CSV & Excel Raw Telemetry Exports",
    ],
  },
  {
    id: "ANNUAL",
    name: "Enterprise Annual Pass",
    badge: "Save ₹15,000",
    basePrice: 49999,
    periodText: "billed annually (365 days)",
    description: "Maximum telemetry throughput & dedicated proxy capacity for conglomerates.",
    features: [
      "Up to 25 Brand Catalogs",
      "2,500 Daily Deep Scans (VIP Tier 1)",
      "Full National Pincode Grid Coverage",
      "Instant 60-Second Disparity Webhooks",
      "Dedicated Enterprise Scraper Pool",
      "Direct PostgreSQL / BigQuery Sync",
      "99.9% Telemetry Uptime SLA",
      "Dedicated Technical Account Manager",
    ],
  },
];

const pricingContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const pricingCardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

export function PricingView() {
  const [selectedPlan, setSelectedPlan] = useState<PlanItem>(PLANS[1]); // default to PRO_30D
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openCheckout = (plan: PlanItem) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  return (
    <>
      <Navbar />

      <main className="relative min-h-screen pt-32 pb-24 px-4 sm:px-6 max-w-7xl mx-auto overflow-hidden">
        {/* Ambient background glows matching landing page */}
        <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full bg-emerald-500/10 opacity-[0.06] blur-[120px] pointer-events-none" />
        <div className="absolute top-80 right-1/4 w-80 h-80 rounded-full bg-amber-500/10 opacity-[0.05] blur-[100px] pointer-events-none" />

        {/* Hero Header */}
        <div className="relative text-center max-w-3xl mx-auto mb-16 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 shadow-xs"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono tracking-wider">TRANSPARENT PASS-BASED PRICING</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] text-zinc-950 dark:text-zinc-50"
          >
            Zero Lock-In.{" "}
            <span className="gradient-text">
              Unlimited Intelligence.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-sm sm:text-base md:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed"
          >
            Prevent revenue leakage from dark-store stockouts. Activate instant 30-day or annual
            telemetry passes with official Razorpay Standard integration.
          </motion.p>
        </div>

        {/* Pricing Cards Grid */}
        <motion.div
          variants={pricingContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          className="relative grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 items-stretch"
        >
          {PLANS.map((plan) => {
            const isPopular = plan.id === "PRO_30D";

            return (
              <motion.div
                key={plan.id}
                variants={pricingCardVariants}
                className={cn(
                  "relative flex flex-col justify-between rounded-3xl p-8 transition-[border-color,box-shadow] duration-200",
                  "bg-white dark:bg-zinc-900/90 border",
                  isPopular
                    ? "border-emerald-500/80 dark:border-emerald-500 ring-2 ring-emerald-500/20 shadow-xl shadow-emerald-500/10"
                    : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 shadow-md"
                )}
              >
                {/* Popular Pill */}
                {plan.badge && (
                  <div
                    className={cn(
                      "absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase border",
                      isPopular
                        ? "bg-emerald-500 text-zinc-950 border-emerald-400 shadow-sm"
                        : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-700"
                    )}
                  >
                    {plan.badge}
                  </div>
                )}

                <div>
                  <div className="mb-6">
                    <h3 className="font-extrabold text-xl text-zinc-950 dark:text-zinc-50">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 min-h-[32px]">
                      {plan.description}
                    </p>
                  </div>

                  {/* Price Block */}
                  <div className="mb-6 pb-6 border-b border-slate-100 dark:border-zinc-800">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-4xl font-extrabold text-zinc-950 dark:text-zinc-50">
                        ₹{plan.basePrice.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 block mt-1">
                      {plan.periodText}
                    </span>
                  </div>

                  {/* Feature Checklist */}
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-xs text-zinc-700 dark:text-zinc-300">
                        <div className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Action */}
                <button
                  type="button"
                  onClick={() => openCheckout(plan)}
                  className={cn(
                    "w-full py-3.5 px-5 rounded-full font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 shadow-sm",
                    isPopular
                      ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/25 active:scale-[0.98]"
                      : "bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 active:scale-[0.98]"
                  )}
                >
                  <span>Activate Pass</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Security & Assurance Ribbon */}
        <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900/90 border border-slate-200/90 dark:border-zinc-800/90 shadow-sm mb-20">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  Razorpay Verified Gateway
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  PCI-DSS Level 1 & 256-Bit TLS Bank Encryption.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  Instant Dark Store Provisioning
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Queues activate automatically within 10 seconds of payment.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  GST Invoicing & Input Credit
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Formal tax invoices delivered automatically to accounting.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Unified Interactive FAQ Section (Shared with Landing Page) */}
        <FAQSection
          eyebrow="PASS & BILLING FAQ"
          title="Frequently asked questions."
          subtitle={
            <>
              Have questions regarding 30-day passes, scraping quotas, or payments?{" "}
              <a href="/contact" className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium">
                Talk to our engineering team →
              </a>
            </>
          }
          className="py-12 sm:py-16"
        />
      </main>

      {/* Razorpay Standard Modal Component with In-App Coupon Engine */}
      <AnimatePresence>
        {isModalOpen && (
          <CheckoutModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            selectedPlan={selectedPlan}
          />
        )}
      </AnimatePresence>

      <Footer />
    </>
  );
}
