import { HeaderSection } from "@/components/features/landing/HeaderSection";
import { HeroSection } from "@/components/features/landing/HeroSection";
import { FeaturesSection } from "@/components/features/landing/FeaturesSection";
import { PricingSection } from "@/components/features/landing/PricingSection";
import { FaqSection } from "@/components/features/landing/FaqSection";
import { FooterSection } from "@/components/features/landing/FooterSection";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <HeaderSection />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <PricingSection />
        <FaqSection />
      </main>
      
      <FooterSection />
    </div>
  );
}

