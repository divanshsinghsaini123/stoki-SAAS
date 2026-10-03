"use client";

import { useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FAQItemType {
  q: string;
  a: string;
}

export const UNIFIED_FAQS: FAQItemType[] = [
  {
    q: "How does the 30-Day Intelligence Pass work?",
    a: "You purchase a 30-day pass for your chosen tier (Starter, Pro, or Enterprise). Your daily scan quota, dark store coverage, and disparity radar are live immediately for 30 full days. There are zero auto-debits or lock-ins — you actively choose when to renew.",
  },
  {
    q: "Which pincodes and platforms does Stoki cover?",
    a: "Stoki supports any valid 6-digit Indian pincode served by Blinkit, Zepto, Swiggy Instamart, or BigBasket Now. You set your own target pincodes and dark store pods during onboarding across all major Tier-1 and Tier-2 metros.",
  },
  {
    q: "What payment methods are supported via Razorpay?",
    a: "Through official Razorpay Standard integration with 256-bit encryption, we support all major UPI apps (Google Pay, PhonePe, Paytm, Cred), Credit & Debit cards (Visa, Mastercard, RuPay, Amex), Corporate Cards, and Net Banking across 50+ banks.",
  },
  {
    q: "How frequently does Stoki scan my products?",
    a: "Scan frequency depends on your pass tier. You can configure custom cron cadences (e.g., every 30 minutes, hourly, or twice daily during morning and evening rush hours). Our scraper pool dispatches with a 1-minute precision heartbeat.",
  },
  {
    q: "How do in-app promo coupons work?",
    a: "Select your desired pass tier and enter any active promo code (such as STOKI20 for 20% off) directly on the Checkout screen to apply immediate discounts before completing payment.",
  },
  {
    q: "Can I receive GST tax invoices for business expenses?",
    a: "Yes! Every successful pass activation automatically issues a GST-compliant tax invoice delivered directly to your billing email with full ITC input tax credit breakdown.",
  },
  {
    q: "What does '1 scan' mean exactly?",
    a: "One scan equals one complete execution cycle — capturing live stock status, cart limits, platform discounts, and delivery estimates for your catalog across your selected pincodes and platforms simultaneously.",
  },
  {
    q: "Can I track multiple brands or catalogs?",
    a: "Yes! Multi-brand tracking is fully supported. Starter tier includes 1 brand catalog, Pro tier tracks up to 5 brand catalogs, and Enterprise tier handles up to 25 brands with dedicated scraping capacity.",
  },
  {
    q: "Will I get notified when my product goes out of stock?",
    a: "The instant our crawler identifies a stockout at any dark store pod, Stoki triggers real-time in-app feed alerts. Slack webhooks and email digests are included on Pro and Enterprise tiers.",
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

function FAQItem({ faq }: { faq: FAQItemType }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        "border rounded-2xl overflow-hidden transition-[border-color,background-color,box-shadow] duration-200",
        open
          ? "border-emerald-500/40 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06] shadow-sm"
          : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-slate-300 dark:hover:border-zinc-700"
      )}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left transition-colors"
        aria-expanded={open}
      >
        <span className="text-sm md:text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {faq.q}
        </span>
        <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 transition-colors">
          <AnimatePresence mode="wait">
            {open ? (
              <motion.div
                key="minus"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Minus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </motion.div>
            ) : (
              <motion.div
                key="plus"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Plus className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              </motion.div>
            )}
          </AnimatePresence>
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-5 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {faq.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface FAQSectionProps {
  items?: FAQItemType[];
  eyebrow?: string;
  title?: string;
  subtitle?: React.ReactNode;
  className?: string;
}

export function FAQSection({
  items = UNIFIED_FAQS,
  eyebrow = "FAQ",
  title = "Everything you need to know.",
  subtitle,
  className,
}: FAQSectionProps) {
  return (
    <section className={cn("relative max-w-3xl mx-auto px-6 py-20 sm:py-24", className)}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col gap-3 mb-12 text-center"
      >
        <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-mono">
          {eyebrow}
        </span>
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
          {title}
        </h2>
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          {subtitle || (
            <>
              Still have questions?{" "}
              <a href="/contact" className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium">
                Talk to us →
              </a>
            </>
          )}
        </div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
        className="flex flex-col gap-3.5"
      >
        {items.map((faq, i) => (
          <FAQItem key={i} faq={faq} />
        ))}
      </motion.div>
    </section>
  );
}
