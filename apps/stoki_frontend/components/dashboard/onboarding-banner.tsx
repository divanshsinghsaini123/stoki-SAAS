"use client";

import React from "react";
import { Sparkles, ArrowRight, ShieldAlert, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingBannerProps {
  isOnboarded: boolean;
  onOpenModal: () => void;
  className?: string;
}

export function OnboardingBanner({
  isOnboarded,
  onOpenModal,
  className,
}: OnboardingBannerProps) {
  if (isOnboarded) return null;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden border-b transition-all select-none",
        "bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20 text-zinc-900 dark:text-zinc-100",
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
        {/* Left: Indicator & Message */}
        <div className="flex items-center gap-2.5 text-xs">
          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-amber-700 dark:text-amber-400">
              Workspace profile incomplete
            </span>
            <span className="text-zinc-400 hidden sm:inline">—</span>
            <span className="text-zinc-600 dark:text-zinc-300">
              Finish setup to personalize your dark-store alerts and platform scrapers.
            </span>
          </div>
        </div>

        {/* Right: CTA Trigger */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenModal}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-xs transition-colors"
          >
            <span>Complete Setup</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
