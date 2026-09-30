"use client";

import Link from "next/link";
import { Zap, Github, Twitter, Linkedin } from "lucide-react";

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
    <footer className="relative border-t border-[var(--border)] mt-24">
      {/* Subtle top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-px bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-40" />

      <div className="max-w-6xl mx-auto px-6 pt-16 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-14">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--accent-subtle)] border border-[var(--accent)]/20">
                <Zap className="w-4 h-4 text-[var(--accent)]" />
              </div>
              <span className="font-bold text-base tracking-tight text-[var(--text-primary)]">Stoki</span>
            </Link>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-xs mb-5">
              Hyperlocal Q-Commerce stock intelligence for FMCG brands. Track every SKU across every dark store in real time.
            </p>
            {/* Platform coverage dots */}
            <div className="flex items-center gap-3">
              {PLATFORM_DOTS.map((p) => (
                <div key={p.label} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                  <span className="text-xs text-[var(--text-subtle)]">{p.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-subtle)] mb-4">
                {section}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-150"
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--text-subtle)]">
            © {new Date().getFullYear()} Stoki. All rights reserved. Built for FMCG Brand Managers.
          </p>
          <div className="flex items-center gap-3">
            {[
              { icon: Github, href: "#", label: "GitHub" },
              { icon: Twitter, href: "#", label: "Twitter" },
              { icon: Linkedin, href: "#", label: "LinkedIn" },
            ].map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="w-8 h-8 flex items-center justify-center rounded-full btn-ghost text-[var(--text-subtle)] hover:text-[var(--text-primary)]"
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
