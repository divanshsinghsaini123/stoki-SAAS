"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  Settings,
  LogOut,
  LayoutDashboard,
  Sun,
  Moon,
  ChevronDown,
  Sparkles,
  Bell,
  ShieldAlert,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { API_ENDPOINTS } from "@/lib/api";

interface DashboardHeaderProps {
  tenant?: {
    id?: string;
    company_name?: string;
    logo_url?: string;
    is_onboarded?: boolean;
    plan_name?: string;
  };
  onOpenOnboarding?: () => void;
}

export function DashboardHeader({ tenant, onOpenOnboarding }: DashboardHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(API_ENDPOINTS.logout, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore
    } finally {
      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace("/login");
      }
    }
  };

  const companyName = tenant?.company_name || "My Workspace";
  const initials = companyName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "SK";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800/80 bg-white/80 dark:bg-[#09090B]/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: Brand & Workspace Switcher */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="relative w-7 h-7 rounded-lg overflow-hidden shrink-0">
              <Image
                src="/stoki_v2.png"
                alt="Stoki Logo"
                width={28}
                height={28}
                priority
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-extrabold text-base tracking-tight text-zinc-950 dark:text-zinc-50">
              Stoki
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
            <Link
              href="/dashboard"
              className={cn(
                "px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5",
                pathname === "/dashboard"
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
              )}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Overview
            </Link>
            <Link
              href="/dashboard/settings"
              className={cn(
                "px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5",
                pathname === "/dashboard/settings"
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
              )}
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </Link>
          </nav>
        </div>

        {/* Right: Actions & User Dropdown */}
        <div className="flex items-center gap-3">
          {/* Quick Setup Pill if not onboarded */}
          {tenant && !tenant.is_onboarded && onOpenOnboarding && (
            <button
              type="button"
              onClick={onOpenOnboarding}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors font-mono"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Setup Incomplete
            </button>
          )}

          {/* Plan badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{tenant?.plan_name ? `${tenant.plan_name} Pass` : "30-Day Pass"}</span>
          </div>

          {/* Theme Toggle */}
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Toggle Theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}

          {/* User / Workspace Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors text-left"
            >
              {tenant?.logo_url ? (
                <img
                  src={tenant.logo_url}
                  alt={companyName}
                  className="w-6 h-6 rounded-md object-cover border border-zinc-200 dark:border-zinc-700"
                />
              ) : (
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 text-zinc-950 font-bold text-[10px] flex items-center justify-center">
                  {initials}
                </div>
              )}
              <span className="hidden sm:inline text-xs font-semibold text-zinc-800 dark:text-zinc-200 max-w-[120px] truncate">
                {companyName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {/* Menu Popover */}
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1 w-52 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {companyName}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                      {tenant?.is_onboarded ? "Status: Ready" : "Status: Needs Onboarding"}
                    </div>
                  </div>

                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Dashboard Overview
                  </Link>

                  <Link
                    href="/dashboard/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Workspace Settings
                  </Link>

                  {tenant && !tenant.is_onboarded && onOpenOnboarding && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenOnboarding();
                      }}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Run Setup Wizard
                    </button>
                  )}

                  <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
