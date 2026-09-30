"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Menu, X, Zap, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const pathname = usePathname();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <>
      {/* Floating Segmented Tri-Pill Navbar */}
      <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 sm:px-6 pointer-events-none">
        <motion.header
          layout
          className={cn(
            "w-full max-w-5xl flex items-center justify-between transition-all duration-300 pointer-events-auto",
            scrolled ? "gap-2 sm:gap-2.5" : "gap-3 sm:gap-4"
          )}
        >
          {/* Island 1: Brand & Live Telemetry Capsule */}
          <motion.div
            layout
            className={cn(
              "rounded-full flex items-center gap-2.5 transition-all duration-300",
              "glass border border-slate-200/90 dark:border-zinc-800/90 shadow-xs",
              scrolled ? "px-3.5 py-1.5" : "px-4 py-2",
              "hover:border-slate-300 dark:hover:border-zinc-700"
            )}
          >
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                <Zap className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              </div>
              <span className="font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">
                Stoki
              </span>
            </Link>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-zinc-700" />
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live</span>
            </div>
          </motion.div>

          {/* Island 2: Navigation Links Capsule */}
          <motion.nav
            layout
            className={cn(
              "hidden md:flex items-center gap-1 rounded-full transition-all duration-300",
              "glass border border-slate-200/90 dark:border-zinc-800/90 shadow-xs",
              scrolled ? "px-2 py-1" : "px-2.5 py-1.5"
            )}
          >
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative px-3.5 py-1 text-xs font-medium rounded-full transition-all duration-200",
                    isActive
                      ? "text-zinc-900 dark:text-zinc-100 font-semibold"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="segmented-pill-active"
                      className="absolute inset-0 rounded-full bg-slate-200/80 dark:bg-zinc-800/90 border border-slate-300/60 dark:border-zinc-700/60"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">{link.label}</span>
                </Link>
              );
            })}
          </motion.nav>

          {/* Island 3: Actions & Quick Start Capsule */}
          <motion.div
            layout
            className={cn(
              "rounded-full flex items-center gap-2 transition-all duration-300",
              "glass border border-slate-200/90 dark:border-zinc-800/90 shadow-xs",
              scrolled ? "px-2 py-1.5" : "px-2.5 py-2"
            )}
          >
            {/* Theme Toggle */}
            {mounted && (
              <button
                onClick={toggleTheme}
                className="w-7 h-7 flex items-center justify-center rounded-full text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-200/50 dark:hover:bg-zinc-800/60 transition-colors"
                aria-label="Toggle theme"
              >
                <AnimatePresence mode="wait">
                  {resolvedTheme === "dark" ? (
                    <motion.div
                      key="sun"
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 90 }}
                      transition={{ duration: 0.18 }}
                    >
                      <Sun className="w-3.5 h-3.5" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="moon"
                      initial={{ scale: 0, rotate: 90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: -90 }}
                      transition={{ duration: 0.18 }}
                    >
                      <Moon className="w-3.5 h-3.5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            )}

            {/* Login */}
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center px-3 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Login
            </Link>

            {/* CTA Button with subtle hover arrow micro-interaction */}
            <Link
              href="/register"
              className="group inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-xs"
            >
              <span>Start Free</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden w-7 h-7 flex items-center justify-center rounded-full text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              <AnimatePresence mode="wait">
                {mobileOpen ? (
                  <motion.div
                    key="close"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Menu className="w-4 h-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </motion.div>
        </motion.header>
      </div>

      {/* Mobile Dropdown Card */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed top-20 left-4 right-4 z-40 rounded-2xl glass border border-slate-200/90 dark:border-zinc-800/90 p-4 md:hidden shadow-xl"
          >
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800/60"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-zinc-800 flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-center text-zinc-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/60"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-center bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                >
                  Start Tracking Free
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
