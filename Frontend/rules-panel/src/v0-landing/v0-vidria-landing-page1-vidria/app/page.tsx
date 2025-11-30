import { HeroSection } from "@/components/hero-section"
import { ValueProposition } from "@/components/value-proposition"
import { HowItWorks } from "@/components/how-it-works"
import { DemoSection } from "@/components/demo-section"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <DemoSection />
      <ValueProposition />
      <HowItWorks />
      <Footer />
    </main>
  )
}
