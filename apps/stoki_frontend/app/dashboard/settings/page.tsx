"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Building2,
  Globe,
  Mail,
  Phone,
  Upload,
  Check,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Layers,
  Users,
  Briefcase,
  Bell,
  Clock,
  Send,
  Sparkles,
  ShieldCheck,
  ExternalLink,
  Save,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_ENDPOINTS, getAuthHeaders, PlatformItem } from "@/lib/api";
import { useTenant } from "../layout";
import { PlatformLogo, BlinkitIcon, ZeptoIcon, InstamartIcon } from "@/components/ui/platform-logos";

const INDUSTRY_OPTIONS = [
  "FMCG / F&B",
  "Beauty & Personal Care",
  "Health & Wellness",
  "Home & Essentials",
  "Electronics",
  "Other",
];

const ORG_SIZES = [
  { value: "1-10", label: "1–10", sub: "Seed / Startup" },
  { value: "11-50", label: "11–50", sub: "Growth Scale" },
  { value: "51-200", label: "51–200", sub: "Mid-Market" },
  { value: "200+", label: "200+", sub: "Enterprise" },
];

const BRAND_COUNTS = [
  { value: "1", label: "1 Brand", sub: "Single Flagship" },
  { value: "2-5", label: "2–5 Brands", sub: "Emerging House" },
  { value: "6-15", label: "6–15 Brands", sub: "Multi-Brand Portfolio" },
  { value: "15+", label: "15+ Brands", sub: "Conglomerate" },
];

const TEAM_SIZES = [
  { value: "Just me", label: "Just me", sub: "Solo Founder" },
  { value: "2-5", label: "2–5 members", sub: "Core Squad" },
  { value: "6-15", label: "6–15 members", sub: "Dedicated Ops" },
  { value: "15+", label: "15+ members", sub: "Enterprise Fleet" },
];

const DEFAULT_PLATFORMS: PlatformItem[] = [
  {
    id: "blinkit",
    display_name: "Blinkit",
    slug: "blinkit",
    tagline: "Instant 10-Min Delivery",
    brand_color: "#F8CB46",
    badge_bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    is_active: true,
    sort_order: 1,
  },
  {
    id: "zepto",
    display_name: "Zepto",
    slug: "zepto",
    tagline: "Ultra-Fast Dark Stores",
    brand_color: "#8B5CF6",
    badge_bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    is_active: true,
    sort_order: 2,
  },
  {
    id: "instamart",
    display_name: "Swiggy Instamart",
    slug: "instamart",
    tagline: "Hyperlocal Grocery Fleet",
    brand_color: "#FC8019",
    badge_bg: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    is_active: true,
    sort_order: 3,
  },
  {
    id: "bigbasket",
    display_name: "BigBasket (BB Now)",
    slug: "bigbasket",
    tagline: "Tata Hyperlocal Network",
    brand_color: "#84C225",
    badge_bg: "bg-lime-500/10 text-lime-600 dark:text-lime-400 border-lime-500/20",
    is_active: true,
    sort_order: 4,
  },
  {
    id: "flipkart_minutes",
    display_name: "Flipkart Minutes",
    slug: "flipkart_minutes",
    tagline: "10-Minute Rapid Delivery",
    brand_color: "#2874F0",
    badge_bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    is_active: true,
    sort_order: 5,
  },
];

const TIMEZONE_OPTIONS = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST — UTC+05:30)" },
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST — UTC+04:00)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT — UTC+08:00)" },
];

export default function TenantSettingsPage() {
  const { tenant, refreshTenant, openOnboardingModal } = useTenant();

  const [isLoading, setIsLoading] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Form Fields
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [industryCategory, setIndustryCategory] = useState("FMCG / F&B");
  const [organizationSize, setOrganizationSize] = useState("11-50");
  const [brandCount, setBrandCount] = useState("2-5");
  const [teamSize, setTeamSize] = useState("2-5");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "blinkit",
    "zepto",
    "instamart",
  ]);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [slackWebhook, setSlackWebhook] = useState("");

  // Dynamic Platforms from API Master Table
  const [availablePlatforms, setAvailablePlatforms] = useState<PlatformItem[]>(DEFAULT_PLATFORMS);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch dynamic platforms from DB master table
  useEffect(() => {
    async function loadPlatforms() {
      try {
        const res = await fetch(API_ENDPOINTS.platforms);
        if (res.ok) {
          const data: PlatformItem[] = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setAvailablePlatforms(data);
          }
        }
      } catch (err) {
        console.warn("Failed to load platforms from master table, using fallback:", err);
      }
    }
    loadPlatforms();
  }, []);

  // Populate from tenant context
  useEffect(() => {
    if (tenant) {
      setCompanyName(tenant.company_name || "");
      setLogoUrl(tenant.logo_url || "");
      setWebsiteUrl(tenant.website_url || "");
      setContactEmail(tenant.email || "");
      setPhoneNumber(tenant.phone_number || "");
      setIndustryCategory(tenant.industry_category || "FMCG / F&B");
      setOrganizationSize(tenant.organization_size || "11-50");
      setBrandCount(tenant.brand_count_estimate || "2-5");
      setTeamSize(tenant.team_size || "2-5");
      if (tenant.target_platforms && Array.isArray(tenant.target_platforms)) {
        setSelectedPlatforms(tenant.target_platforms);
      }
      if (tenant.settings) {
        setEmailAlerts(tenant.settings.email_alerts ?? true);
        setTimezone(tenant.settings.timezone || "Asia/Kolkata");
        setSlackWebhook(tenant.settings.slack_webhook || "");
      }
    }
  }, [tenant]);

  // Toggle platform
  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter((p) => p !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Image Upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorToast("Logo image must be under 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setLogoUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Changes
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorToast(null);
    setSuccessToast(null);

    const payload = {
      company_name: companyName.trim(),
      phone_number: phoneNumber.trim() || null,
      logo_url: logoUrl || null,
      website_url: websiteUrl.trim() || null,
      industry_category: industryCategory,
      organization_size: organizationSize,
      team_size: teamSize,
      brand_count_estimate: brandCount,
      target_platforms: selectedPlatforms,
      settings: {
        email_alerts: emailAlerts,
        timezone: timezone,
        slack_webhook: slackWebhook.trim() || null,
      },
    };

    try {
      const res = await fetch(API_ENDPOINTS.tenantsMe, {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to update workspace settings.");
      }

      setSuccessToast("Workspace settings saved successfully.");
      await refreshTenant();
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      setErrorToast(err.message || "Failed to save settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const isOnboarded = tenant?.is_onboarded ?? false;
  const initials = companyName
    ? companyName
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
    : "SK";

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Workspace & Organization Settings
            </h1>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Manage your organization profile, target dark-store platforms, and automated stockout alerts.
          </p>
        </div>

        {/* Setup Status Badge */}
        <div className="flex items-center gap-2.5 shrink-0">
          {isOnboarded ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Setup: Completed</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Setup: Incomplete</span>
              </div>
              <button
                type="button"
                onClick={openOnboardingModal}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors shadow-2xs"
              >
                Launch Wizard
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Notifications / Toasts */}
      {successToast && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}
      {errorToast && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorToast}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* -----------------------------------------------------------------
            SECTION 1: ORGANIZATION PROFILE
            ----------------------------------------------------------------- */}
        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <Building2 className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-bold tracking-tight text-zinc-950 dark:text-zinc-50 uppercase font-mono">
              Section 1: Organization Profile
            </h2>
          </div>

          {/* Logo Upload & Preview */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Workspace Avatar / Brand Logo
            </label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-2xs">
                  <img
                    src={logoUrl}
                    alt={companyName}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-zinc-950 font-black text-lg flex items-center justify-center shadow-inner">
                  {initials}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors inline-flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Change Logo
                  </button>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl("")}
                      className="px-2.5 py-1.5 rounded-lg text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="text-[11px] text-zinc-400">
                  Recommended size: 256x256 PNG or SVG (max 2MB)
                </div>
              </div>
            </div>
          </div>

          {/* Company Name & Website URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Company Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center">
                <Building2 className="absolute left-3 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Consumer Brands"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Website URL
              </label>
              <div className="relative flex items-center">
                <Globe className="absolute left-3 w-4 h-4 text-zinc-400" />
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://acmebrands.com"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Contact Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Primary Contact Email
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3 w-4 h-4 text-zinc-400" />
                <input
                  type="email"
                  disabled
                  value={contactEmail}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 cursor-not-allowed font-mono"
                />
              </div>
              <span className="text-[10px] text-zinc-400 mt-0.5 block">
                Primary account identifier (read-only).
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Contact Phone Number
              </label>
              <div className="relative flex items-center">
                <Phone className="absolute left-3 w-4 h-4 text-zinc-400" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Industry Category */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Industry Category
            </label>
            <div className="flex flex-wrap gap-2">
              {INDUSTRY_OPTIONS.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setIndustryCategory(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    industryCategory === cat
                      ? "bg-emerald-500 text-zinc-950 font-bold shadow-xs"
                      : "bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* -----------------------------------------------------------------
            SECTION 2: TEAM & PORTFOLIO SCALE
            ----------------------------------------------------------------- */}
        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <Layers className="w-4 h-4 text-purple-500" />
            <h2 className="text-sm font-bold tracking-tight text-zinc-950 dark:text-zinc-50 uppercase font-mono">
              Section 2: Team & Portfolio Scale
            </h2>
          </div>

          {/* Org Size */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Organization Size
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ORG_SIZES.map((size) => (
                <button
                  key={size.value}
                  type="button"
                  onClick={() => setOrganizationSize(size.value)}
                  className={cn(
                    "p-2.5 rounded-xl border text-left transition-all",
                    organizationSize === size.value
                      ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 shadow-2xs"
                      : "bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                  )}
                >
                  <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100 font-mono">
                    {size.label}
                  </div>
                  <div className="text-[10px] text-zinc-400">{size.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Brand Count */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Brands Managed in Portfolio
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BRAND_COUNTS.map((b) => (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => setBrandCount(b.value)}
                  className={cn(
                    "p-2.5 rounded-xl border text-left transition-all",
                    brandCount === b.value
                      ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 shadow-2xs"
                      : "bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                  )}
                >
                  <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100 font-mono">
                    {b.label}
                  </div>
                  <div className="text-[10px] text-zinc-400">{b.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Team Size */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Inventory & Analytics Operations Team Size
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TEAM_SIZES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTeamSize(t.value)}
                  className={cn(
                    "p-2.5 rounded-xl border text-left transition-all",
                    teamSize === t.value
                      ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 shadow-2xs"
                      : "bg-zinc-50 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                  )}
                >
                  <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100 font-mono">
                    {t.label}
                  </div>
                  <div className="text-[10px] text-zinc-400">{t.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Active Q-Commerce Platforms */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Active Q-Commerce Radar Platforms
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {availablePlatforms.map((platform) => {
                const isSelected = selectedPlatforms.includes(platform.id);
                return (
                  <div
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={cn(
                      "p-3 rounded-xl border cursor-pointer select-none transition-all flex items-center justify-between",
                      isSelected
                        ? "bg-zinc-50 dark:bg-zinc-800/90 border-zinc-900 dark:border-zinc-100 shadow-xs"
                        : "bg-zinc-50/40 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 opacity-60 hover:opacity-100"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PlatformLogo platform={platform.id} className="w-7 h-7 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {platform.display_name}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono truncate">
                          {isSelected ? "Active Radar" : "Inactive"}
                        </div>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "w-5 h-5 rounded-md flex items-center justify-center transition-colors",
                        isSelected
                          ? "bg-emerald-500 text-zinc-950"
                          : "border border-zinc-300 dark:border-zinc-700"
                      )}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* -----------------------------------------------------------------
            SECTION 3: TELEMETRY & ALERT PREFERENCES
            ----------------------------------------------------------------- */}
        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <Bell className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold tracking-tight text-zinc-950 dark:text-zinc-50 uppercase font-mono">
              Section 3: Telemetry & Alert Preferences
            </h2>
          </div>

          {/* Email Alerts Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Real-Time Out-of-Stock Email Alerts
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Sends high-priority email alerts whenever an SKU goes out of stock in any scanned dark store.
                </div>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* Timezone Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              Operational Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          {/* Slack Webhook Input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-zinc-400" />
              Slack Incoming Webhook URL <span className="text-zinc-400 font-normal">(Optional)</span>
            </label>
            <input
              type="url"
              value={slackWebhook}
              onChange={(e) => setSlackWebhook(e.target.value)}
              placeholder="https://your-slack-webhook-url"
              className="w-full py-2 px-3 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
            />
            <span className="text-[10px] text-zinc-400 mt-1 block">
              Direct webhook integration for instant Slack channel incident feeds.
            </span>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md transition-all flex items-center gap-2 disabled:opacity-60 active:scale-[0.99]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
