import type { Metadata } from "next";
import { HeroSection } from "@/components/sections/hero";
import { BentoSection } from "@/components/sections/bento";
import { FAQSection } from "@/components/sections/faq";
import { CTABanner } from "@/components/sections/cta-banner";

export const metadata: Metadata = {
  title: "Stoki — Hyperlocal Q-Commerce Stock Intelligence",
  description:
    "Track your brand's availability, pricing, and dark-store presence across Blinkit, Zepto, Instamart & BigBasket in real time.",
};

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <BentoSection />
      <FAQSection />
      <CTABanner />
    </>
  );
}
