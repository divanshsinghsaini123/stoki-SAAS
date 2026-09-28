"use client";

import Link from "next/link";
import { Zap, Globe, MessageCircle, Briefcase } from "lucide-react";
import { PlatformLogo } from "@/components/ui/platform-logos";

const FOOTER_LINKS = {
  Product: [
    { label: "How It Works", href: "/how-it-works" },
    { label: "Pricing", href: "/pricing" },
    { label: "Changelog", href: "#" },
  ],
  Platforms: [
    { label: "Blinkit", href: "#" },
    { label: "Zepto", href: "#" },
    { label: "Instamart", href: "#" },
    { label: "BigBasket", href: "#" },
  ],
  Company: [
    { label: "Contact", href: "/contact" },
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
  ],
};

const PLATFORM_DOTS = [
  { color: "#F8CB46", label: "Blinkit" },
  { color: "#8B5CF6", label: "Zepto" },
  { color: "#FC8019", label: "Instamart" },
  { color: "#84C225", label: "BigBasket" },
];

export function Footer() {
  return (
    <footer className="relative border-t border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/60 dark:bg-zinc-950/60 mt-24">
      {/* Subtle top accent divider */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

      <div className="max-w-6xl mx-auto px-6 pt-16 pb-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-14">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-3.5">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="font-bold text-base tracking-tight text-zinc-900 dark:text-zinc-50">Stoki</span>
            </Link>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xs mb-5 font-normal">
              Hyperlocal Q-Commerce stock intelligence for FMCG brands. Track every SKU across 500+ dark stores in real time.
            </p>
            {/* Platform coverage logos */}
            <div className="flex flex-wrap items-center gap-3">
              {["blinkit", "zepto", "instamart", "bigbasket"].map((platform) => (
                <div
                  key={platform}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xs"
                >
                  <PlatformLogo platform={platform} className="w-3.5 h-3.5 rounded shrink-0" />
                  <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 capitalize">
                    {platform === "bigbasket" ? "BigBasket" : platform}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-200 mb-4 font-mono">
                {section}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-slate-200/80 dark:border-zinc-800/80">
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            © {new Date().getFullYear()} Stoki SaaS Inc. Built for FMCG Brand &amp; Category Managers.
          </p>
          <div className="flex items-center gap-2">
            {[
              { icon: Globe, href: "#", label: "Website" },
              { icon: MessageCircle, href: "#", label: "Twitter" },
              { icon: Briefcase, href: "#", label: "LinkedIn" },
            ].map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-slate-200/60 dark:hover:bg-zinc-900 transition-colors"
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
