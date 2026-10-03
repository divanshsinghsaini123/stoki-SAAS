"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Building2,
  Globe,
  Upload,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
  Bell,
  Layers,
  Users,
  Briefcase,
  ArrowRight,
  Loader2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_ENDPOINTS, getAuthHeaders } from "@/lib/api";
import { BlinkitIcon, ZeptoIcon, InstamartIcon } from "@/components/ui/platform-logos";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (tenantData: any) => void;
  initialTenant?: {
    id?: string;
    company_name?: string;
    logo_url?: string;
    website_url?: string;
    industry_category?: string;
    organization_size?: string;
    team_size?: string;
    brand_count_estimate?: string;
    target_platforms?: string[];
    is_onboarded?: boolean;
    settings?: {
      email_alerts?: boolean;
      timezone?: string;
      slack_webhook?: string | null;
    };
  };
}

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

const PLATFORMS = [
  {
    id: "blinkit",
    name: "Blinkit",
    tagline: "Instant 10-Min Delivery",
    color: "#F8CB46",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    icon: BlinkitIcon,
  },
  {
    id: "zepto",
    name: "Zepto",
    tagline: "Ultra-Fast Dark Stores",
    color: "#8B5CF6",
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    icon: ZeptoIcon,
  },
  {
    id: "instamart",
    name: "Swiggy Instamart",
    tagline: "Hyperlocal Grocery Fleet",
    color: "#FC8019",
    badgeClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    icon: InstamartIcon,
  },
];

export function OnboardingModal({
  isOpen,
  onClose,
  onComplete,
  initialTenant,
}: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialized = useRef(false);

  // Initialize form strictly ONCE on mount
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      if (initialTenant?.company_name) {
        setCompanyName(initialTenant.company_name);
      } else if (typeof window !== "undefined") {
        const storedTenant = localStorage.getItem("stoki_tenant_name");
        const storedName = localStorage.getItem("stoki_user_name");
        if (storedTenant && storedTenant !== "Default Workspace") {
          setCompanyName(storedTenant);
        } else if (storedName) {
          setCompanyName(`${storedName}'s Workspace`);
        } else {
          setCompanyName("Acme Consumer Brands");
        }
      }

      if (initialTenant?.logo_url) setLogoUrl(initialTenant.logo_url);
      if (initialTenant?.website_url) setWebsiteUrl(initialTenant.website_url);
      if (initialTenant?.industry_category) setIndustryCategory(initialTenant.industry_category);
      if (initialTenant?.organization_size) setOrganizationSize(initialTenant.organization_size);
      if (initialTenant?.brand_count_estimate) setBrandCount(initialTenant.brand_count_estimate);
      if (initialTenant?.team_size) setTeamSize(initialTenant.team_size);
      if (initialTenant?.target_platforms && initialTenant.target_platforms.length > 0) {
        setSelectedPlatforms(initialTenant.target_platforms);
      }
      if (initialTenant?.settings?.email_alerts !== undefined) {
        setEmailAlerts(initialTenant.settings.email_alerts);
      }
      if (initialTenant?.settings?.timezone) {
        setTimezone(initialTenant.settings.timezone);
      }
    }
  }, [initialTenant]);

  if (!isOpen) return null;

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMsg("Logo image must be under 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setLogoUrl(event.target.result as string);
          setErrorMsg(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSkip = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("stoki_onboarding_skipped", "true");
    }
    onClose();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    const payload = {
      company_name: companyName.trim() || "My Workspace",
      logo_url: logoUrl || null,
      website_url: websiteUrl.trim() || null,
      industry_category: industryCategory,
      organization_size: organizationSize,
      team_size: teamSize,
      brand_count_estimate: brandCount,
      target_platforms: selectedPlatforms,
      mark_completed: true,
    };

    try {
      const res = await fetch(API_ENDPOINTS.tenantsOnboarding, {
        method: "PATCH",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to save workspace setup.");
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("stoki_is_onboarded", "true");
        localStorage.setItem("stoki_tenant_name", payload.company_name);
        sessionStorage.removeItem("stoki_onboarding_skipped");
      }

      onComplete(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    const clean = name.trim();
    if (!clean) return "SK";
    const parts = clean.split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      {/* Centered Modal Card */}
      <div className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-[#0C0D0E] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/40 shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-mono font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Workspace Setup
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
              Step {currentStep} of 3
            </span>
            <button
              type="button"
              onClick={handleSkip}
              title="Skip for now"
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Static, Clean Progress Line */}
        <div className="w-full bg-zinc-100 dark:bg-zinc-900/60 h-1 shrink-0">
          <div
            className="h-full bg-emerald-500 transition-all duration-200"
            style={{ width: `${(currentStep / 3) * 100}%` }}
          />
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 flex flex-col justify-between">
          <div>
            {/* Step Navigation Pill Indicator */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                {[1, 2, 3].map((stepNum) => (
                  <button
                    key={stepNum}
                    type="button"
                    onClick={() => {
                      if (stepNum < currentStep) setCurrentStep(stepNum as 1 | 2 | 3);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium transition-colors",
                      currentStep === stepNum
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : currentStep > stepNum
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "text-zinc-400 dark:text-zinc-600"
                    )}
                  >
                    {currentStep > stepNum ? (
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    ) : (
                      <span>0{stepNum}</span>
                    )}
                    <span className="hidden sm:inline">
                      {stepNum === 1
                        ? "Identity"
                        : stepNum === 2
                        ? "Scale"
                        : "Alerts"}
                    </span>
                  </button>
                ))}
              </div>

              <div className="text-[11px] text-zinc-400 font-mono">
                {currentStep === 1 && "Identity & Branding"}
                {currentStep === 2 && "Scale & Portfolio"}
                {currentStep === 3 && "Platforms & Alerts"}
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            {/* -----------------------------------------------------------
                STEP 1: ORGANIZATION IDENTITY
                ----------------------------------------------------------- */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
                    Organization Identity
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Name your workspace and personalize your brand's presence across Q-Commerce scanners.
                  </p>
                </div>

                {/* Company Name */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Company / Organization Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Building2 className="absolute left-3 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Acme Consumer Brands Pvt Ltd"
                      required
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Company Logo Upload */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Workspace Logo
                    </label>
                    <span className="text-[11px] text-zinc-400">Optional / Skippable</span>
                  </div>

                  <div className="flex items-center gap-3.5 p-3 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                    <div className="relative shrink-0">
                      {logoUrl ? (
                        <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
                          <img
                            src={logoUrl}
                            alt="Company Logo"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setLogoUrl("")}
                            className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-zinc-950 font-bold text-xs flex items-center justify-center">
                          {getInitials(companyName)}
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition-colors inline-flex items-center gap-1.5"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Upload Logo
                        </button>
                        <span className="text-[11px] text-zinc-400">
                          PNG, JPG, SVG up to 2MB
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Company Website URL */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Company Website URL <span className="text-zinc-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative flex items-center">
                    <Globe className="absolute left-3 w-4 h-4 text-zinc-400" />
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://acmebrands.com"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                {/* Industry Category Selector */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Primary Industry Category
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {INDUSTRY_OPTIONS.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setIndustryCategory(cat)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                          industryCategory === cat
                            ? "bg-emerald-500 text-zinc-950 font-bold"
                            : "bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* -----------------------------------------------------------
                STEP 2: SCALE & PORTFOLIO SIZE
                ----------------------------------------------------------- */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
                    Scale & Portfolio Architecture
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    We tune scanning frequencies and dark-store concurrency limits based on your catalog size.
                  </p>
                </div>

                {/* Organization Size */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
                    Organization Size (Employees)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {ORG_SIZES.map((size) => (
                      <button
                        key={size.value}
                        type="button"
                        onClick={() => setOrganizationSize(size.value)}
                        className={cn(
                          "p-2.5 rounded-xl border text-left transition-colors",
                          organizationSize === size.value
                            ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
                            : "bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
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

                {/* Brands Count */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-zinc-400" />
                    How Many Brands Do You Manage?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {BRAND_COUNTS.map((brand) => (
                      <button
                        key={brand.value}
                        type="button"
                        onClick={() => setBrandCount(brand.value)}
                        className={cn(
                          "p-2.5 rounded-xl border text-left transition-colors",
                          brandCount === brand.value
                            ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
                            : "bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                        )}
                      >
                        <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100 font-mono">
                          {brand.label}
                        </div>
                        <div className="text-[10px] text-zinc-400">{brand.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Team Size */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-zinc-400" />
                    Analytics & Inventory Ops Team Size
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {TEAM_SIZES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setTeamSize(t.value)}
                        className={cn(
                          "p-2.5 rounded-xl border text-left transition-colors",
                          teamSize === t.value
                            ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
                            : "bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
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
              </div>
            )}

            {/* -----------------------------------------------------------
                STEP 3: TARGET PLATFORMS & NOTIFICATIONS
                ----------------------------------------------------------- */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
                    Target Platforms & Notifications
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Select which platforms to monitor and configure your notification preferences.
                  </p>
                </div>

                {/* Active Q-Commerce Platforms */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    Active Platforms <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {PLATFORMS.map((platform) => {
                      const Icon = platform.icon;
                      const isSelected = selectedPlatforms.includes(platform.id);
                      return (
                        <div
                          key={platform.id}
                          onClick={() => togglePlatform(platform.id)}
                          className={cn(
                            "p-3 rounded-xl border cursor-pointer select-none transition-colors flex items-center justify-between",
                            isSelected
                              ? "bg-white dark:bg-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-sm"
                              : "bg-zinc-50/60 dark:bg-zinc-950/60 border-zinc-200 dark:border-zinc-800/80 opacity-70 hover:opacity-100"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="w-6 h-6" />
                            <div>
                              <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                                {platform.name}
                              </div>
                              <div className="text-[10px] text-zinc-400">
                                {platform.tagline}
                              </div>
                            </div>
                          </div>

                          <div
                            className={cn(
                              "w-4 h-4 rounded flex items-center justify-center transition-colors",
                              isSelected
                                ? "bg-emerald-500 text-zinc-950"
                                : "border border-zinc-300 dark:border-zinc-700"
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Email Notifications Toggle */}
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Bell className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          Email Notifications
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          Receive alerts and critical inventory updates directly in your inbox.
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
                      <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-zinc-500 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      Scan Timezone:
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                      {timezone} (IST)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-5 mt-5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 px-2 py-1.5 transition-colors"
            >
              Skip for now
            </button>

            <div className="flex items-center gap-2">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep((s) => (s - 1) as 1 | 2 | 3)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              )}

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (currentStep === 1 && !companyName.trim()) {
                      setErrorMsg("Please enter your company or workspace name.");
                      return;
                    }
                    setErrorMsg(null);
                    setCurrentStep((s) => (s + 1) as 1 | 2 | 3);
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition-colors flex items-center gap-1.5"
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors flex items-center gap-1.5 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Workspace...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Setup</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
