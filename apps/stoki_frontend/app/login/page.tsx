import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata: Metadata = {
  title: "Sign In — Stoki Intelligence",
  description: "Sign in to access your brand's real-time Q-Commerce stock intelligence radar.",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[#09090B] text-zinc-400 text-xs">
          Loading authentication gateway...
        </div>
      }
    >
      <AuthCard initialMode="signin" />
    </Suspense>
  );
}
