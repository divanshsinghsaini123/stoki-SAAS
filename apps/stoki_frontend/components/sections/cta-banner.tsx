"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";

export function CTABanner() {
  return (
    <section className="max-w-6xl mx-auto px-6 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative rounded-3xl overflow-hidden glass-strong border p-12 md:p-16 text-center"
      >
        {/* Background accent */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/10 via-transparent to-purple-600/10 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-1 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-60" />

        <div className="relative flex flex-col items-center gap-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[var(--accent-subtle)] border border-[var(--accent)]/20">
            <Zap className="w-6 h-6 text-[var(--accent)]" />
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)]">
              Ready to see your brand&apos;s{" "}
              <span className="gradient-text">true Q-Commerce health?</span>
            </h2>
            <p className="text-lg text-[var(--text-muted)] max-w-xl mx-auto">
              Join FMCG brand managers who track stock, price, and availability across every dark store — in real time.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold btn-primary"
            >
              Get Started — It&apos;s Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-medium btn-ghost"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
