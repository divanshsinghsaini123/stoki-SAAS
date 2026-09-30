"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "Which pincodes does Stoki cover?",
    a: "Stoki supports any valid 6-digit Indian pincode that is served by Blinkit, Zepto, Instamart, or BigBasket. You set your own target pincodes during onboarding — we don't restrict coverage to specific cities.",
  },
  {
    q: "How frequently does Stoki scan my products?",
    a: "Scan frequency depends on your plan. You can set a custom cron schedule (e.g., every hour, twice a day, or once a day). The minimum scan cadence is 30 minutes. Our dispatcher executes with a 1-minute heartbeat for precision timing.",
  },
  {
    q: "What does '1 scan' mean exactly?",
    a: "One scan equals one full execution of a campaign — covering your selected brand, all chosen pincodes, and all selected platforms. So if you scan 5 pincodes across 3 platforms, that counts as 1 scan from your daily quota.",
  },
  {
    q: "How does the 30-Day Pass model work?",
    a: "You purchase a 30-day pass for your chosen tier (Starter, Growth, or Enterprise). Your daily scan quota and extra scan credits are set by the plan. There are no auto-renewals — you actively renew when your pass expires.",
  },
  {
    q: "Can I track multiple brands?",
    a: "Yes! Multi-brand tracking is supported. The number of brands you can track simultaneously depends on your plan tier. Each brand can have its own set of target pincodes, platforms, and scan schedules.",
  },
  {
    q: "Will I get notified when my product goes out of stock?",
    a: "Absolutely. Stoki fires real-time OOS (Out of Stock) notifications the moment a scan detects a stockout — via in-app notifications. Slack and email webhooks are available on Growth and Enterprise plans.",
  },
];

function FAQItem({ faq, index }: { faq: typeof FAQS[0]; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      className={cn(
        "border rounded-xl overflow-hidden transition-colors duration-200",
        open ? "border-[var(--accent)]/30 bg-[var(--accent-subtle)]" : "border-[var(--border)] hover:border-[var(--border-strong)]"
      )}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
        aria-expanded={open}
      >
        <span className="text-sm md:text-base font-medium text-[var(--text-primary)]">
          {faq.q}
        </span>
        <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center border border-[var(--border)] bg-[var(--surface-solid)]">
          <AnimatePresence mode="wait">
            {open ? (
              <motion.div key="minus" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <Minus className="w-3 h-3 text-[var(--accent)]" />
              </motion.div>
            ) : (
              <motion.div key="plus" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <Plus className="w-3 h-3 text-[var(--text-muted)]" />
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
            <p className="px-6 pb-5 text-sm text-[var(--text-muted)] leading-relaxed">
              {faq.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FAQSection() {
  return (
    <section className="relative max-w-3xl mx-auto px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="flex flex-col gap-3 mb-12 text-center"
      >
        <span className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
          FAQ
        </span>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)]">
          Everything you need to know.
        </h2>
        <p className="text-[var(--text-muted)]">
          Still have questions?{" "}
          <a href="/contact" className="text-[var(--accent)] hover:underline">
            Talk to us →
          </a>
        </p>
      </motion.div>

      <div className="flex flex-col gap-3">
        {FAQS.map((faq, i) => (
          <FAQItem key={i} faq={faq} index={i} />
        ))}
      </div>
    </section>
  );
}
