import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata: Metadata = {
  title: "Create Account — Stoki Intelligence",
  description: "Start tracking dark-store presence and price disparities across Blinkit, Zepto, Instamart & BigBasket.",
};

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[#09090B] text-zinc-400 text-xs">
          Loading authentication gateway...
        </div>
      }
    >
      <AuthCard initialMode="signup" />
    </Suspense>
  );
}
