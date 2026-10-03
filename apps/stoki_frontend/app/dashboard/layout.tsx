"use client";

import React, { useState, useEffect, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { API_ENDPOINTS, getAuthHeaders } from "@/lib/api";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { OnboardingBanner } from "@/components/dashboard/onboarding-banner";
import { OnboardingModal } from "@/components/dashboard/onboarding-modal";

interface TenantContextType {
  tenant: any;
  user: any;
  loading: boolean;
  refreshTenant: () => Promise<void>;
  openOnboardingModal: () => void;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  user: null,
  loading: true,
  refreshTenant: async () => {},
  openOnboardingModal: () => {},
});

export const useTenant = () => useContext(TenantContext);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [tenant, setTenant] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const fetchTenantData = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("stoki_auth_token") : null;
      if (!token) {
        if (typeof window !== "undefined") {
          window.location.replace("/login");
        }
        return;
      }

      // First try /api/v1/tenants/me
      const res = await fetch(API_ENDPOINTS.tenantsMe, {
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (res.ok) {
        const tenantData = await res.json();
        setTenant(tenantData);

        if (typeof window !== "undefined") {
          localStorage.setItem("stoki_tenant_name", tenantData.company_name);
          localStorage.setItem("stoki_is_onboarded", String(tenantData.is_onboarded));
        }

        // Auto-show modal if not onboarded and not skipped in this session
        if (!tenantData.is_onboarded) {
          const skipped = sessionStorage.getItem("stoki_onboarding_skipped");
          if (!skipped) {
            setShowOnboarding(true);
          }
        }
      } else if (res.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.clear();
          sessionStorage.clear();
          window.location.replace("/login");
        }
      } else {
        const localTenantName = localStorage.getItem("stoki_tenant_name") || "Acme Brands";
        const localIsOnboarded = localStorage.getItem("stoki_is_onboarded") === "true";
        setTenant({
          company_name: localTenantName,
          is_onboarded: localIsOnboarded,
          plan_name: "Pro Pass",
        });
      }
    } catch {
      const token = typeof window !== "undefined" ? localStorage.getItem("stoki_auth_token") : null;
      if (!token) {
        window.location.replace("/login");
        return;
      }
      const localTenantName = typeof window !== "undefined" ? localStorage.getItem("stoki_tenant_name") || "Acme Brands" : "Acme Brands";
      const localIsOnboarded = typeof window !== "undefined" ? localStorage.getItem("stoki_is_onboarded") === "true" : false;
      setTenant({
        company_name: localTenantName,
        is_onboarded: localIsOnboarded,
        plan_name: "Pro Pass",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantData();
  }, []);

  const handleOnboardingComplete = (updatedTenant: any) => {
    setTenant(updatedTenant);
    setShowOnboarding(false);
  };

  if (loading || !tenant) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center text-xs text-zinc-500 font-mono">
        Loading workspace...
      </div>
    );
  }

  return (
    <TenantContext.Provider
      value={{
        tenant,
        user,
        loading,
        refreshTenant: fetchTenantData,
        openOnboardingModal: () => setShowOnboarding(true),
      }}
    >
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#09090B] text-zinc-900 dark:text-zinc-50 flex flex-col font-sans transition-colors duration-200">
        {/* Persistent Top Onboarding Banner if not onboarded */}
        {tenant && !tenant.is_onboarded && (
          <OnboardingBanner
            isOnboarded={false}
            onOpenModal={() => setShowOnboarding(true)}
          />
        )}

        {/* Dashboard Header */}
        <DashboardHeader
          tenant={tenant}
          onOpenOnboarding={() => setShowOnboarding(true)}
        />

        {/* Page Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>

        {/* Multi-Step Onboarding Modal */}
        <OnboardingModal
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onComplete={handleOnboardingComplete}
          initialTenant={tenant}
        />
      </div>
    </TenantContext.Provider>
  );
}
