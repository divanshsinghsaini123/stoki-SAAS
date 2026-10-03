import { Suspense } from "react";
import type { Metadata } from "next";
import { PricingView } from "@/components/pricing/pricing-view";

export const metadata: Metadata = {
  title: "Pricing & Intelligence Passes — Stoki",
  description:
    "Zero lock-in 30-day and annual passes for FMCG brands to track real-time stockouts, dark stores, and price parity across Blinkit, Zepto, Instamart & BigBasket.",
};

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[#09090B] text-zinc-400 text-xs">
          Loading intelligence passes...
        </div>
      }
    >
      <PricingView />
    </Suspense>
  );
}
