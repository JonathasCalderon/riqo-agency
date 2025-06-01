import { Navigation } from "@/components/navigation"
import { HeroSection } from "@/components/sections/hero"
import { ServicesSection } from "@/components/sections/services"
import { PricingSection } from "@/components/sections/pricing"
import { AboutSection } from "@/components/sections/about"
import { ClientsSection } from "@/components/sections/clients"
import { ContactSection } from "@/components/sections/contact"
import { Footer } from "@/components/footer"
import { routing } from '@/i18n/routing'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <HeroSection />
        <ServicesSection />
        <PricingSection />
        <AboutSection />
        <ClientsSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  )
}
