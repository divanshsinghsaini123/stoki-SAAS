import type { Metadata } from "next";
import { HeroSection } from "@/components/sections/hero";
import { CityRadarSection } from "@/components/sections/city-radar";
import { BentoSection } from "@/components/sections/bento";
import { FAQSection } from "@/components/sections/faq";
import { CTABanner } from "@/components/sections/cta-banner";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";

export const metadata: Metadata = {
  title: "Stoki — Hyperlocal Q-Commerce Stock Intelligence",
  description:
    "Track your brand's availability, pricing, and dark-store presence across Blinkit, Zepto, Instamart & BigBasket in real time.",
};

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <HeroSection />
        <CityRadarSection />
        <BentoSection />
        <FAQSection />
        <CTABanner />
      </main>
      <Footer />
    </>
  );
}
