"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Sun, Moon, Menu, X, ArrowRight } from "lucide-react";
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
          {/* Island 1: Brand Capsule */}
          <motion.div
            layout
            className={cn(
              "rounded-full flex items-center transition-all duration-300",
              "bg-white/95 dark:bg-zinc-900/95 border border-slate-300 dark:border-zinc-700 shadow-md shadow-black/5 dark:shadow-black/40 backdrop-blur-2xl ring-1 ring-black/5 dark:ring-white/10",
              scrolled ? "px-3.5 py-1.5" : "px-4 py-2 sm:py-2.5",
              "hover:border-slate-400 dark:hover:border-zinc-600"
            )}
          >
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden group-hover:scale-105 transition-transform shrink-0">
                <Image
                  src="/stoki_v2.png"
                  alt="Stoki Logo"
                  width={32}
                  height={32}
                  priority
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-extrabold text-base tracking-tight text-zinc-950 dark:text-zinc-50">
                Stoki
              </span>
            </Link>
          </motion.div>

          {/* Island 2: Navigation Links Capsule (Segmented Control Aesthetic) */}
          <motion.nav
            layout
            className={cn(
              "hidden md:flex items-center gap-1 rounded-full transition-all duration-300 p-1",
              "bg-white/95 dark:bg-zinc-900/95 border border-slate-300 dark:border-zinc-700 shadow-md shadow-black/5 dark:shadow-black/40 backdrop-blur-2xl ring-1 ring-black/5 dark:ring-white/10"
            )}
          >
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative px-4 py-2 text-xs transition-all duration-200",
                    isActive
                      ? "text-white dark:text-zinc-950 font-bold"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white font-medium"
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="segmented-pill-active"
                      className="absolute inset-0 rounded-full bg-zinc-950 dark:bg-white shadow-sm"
                      transition={{ type: "spring", stiffness: 420, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{link.label}</span>
                </Link>
              );
            })}
          </motion.nav>

          {/* Island 3: Actions & Quick Start Capsule (Enhanced Height & Standout CTA) */}
          <motion.div
            layout
            className={cn(
              "rounded-full flex items-center gap-2.5 transition-all duration-300",
              "bg-white/95 dark:bg-zinc-900/95 border border-slate-300 dark:border-zinc-700 shadow-md shadow-black/5 dark:shadow-black/40 backdrop-blur-2xl ring-1 ring-black/5 dark:ring-white/10",
              scrolled ? "px-3 py-1.5" : "px-3.5 py-2 sm:py-2.5"
            )}
          >
            {/* Theme Toggle */}
            {mounted && (
              <button
                onClick={toggleTheme}
                className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors"
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
                      <Sun className="w-4 h-4 text-amber-400" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="moon"
                      initial={{ scale: 0, rotate: 90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: -90 }}
                      transition={{ duration: 0.18 }}
                    >
                      <Moon className="w-4 h-4 text-zinc-700" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            )}

            {/* Login */}
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors"
            >
              Login
            </Link>

            {/* CTA Button with subtle hover arrow micro-interaction */}
            <Link
              href="/register"
              className="group inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-sm"
            >
              <span>Start Free</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-full text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
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
