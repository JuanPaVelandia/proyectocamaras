import React from 'react';
import { Header } from "./components/v0/header"
import { HeroSection } from "./components/v0/hero-section"
import { ValueProposition } from "./components/v0/value-proposition"
import { HowItWorks } from "./components/v0/how-it-works"
import { DemoSection } from "./components/v0/demo-section"
import { Footer } from "./components/v0/footer"

export function LandingPageV0({ onGetStarted, onLogin, onRegister }) {
    return (
        <main className="min-h-screen bg-background text-foreground">
            <Header onLogin={onLogin} onRegister={onRegister} />
            <HeroSection onGetStarted={onRegister} />
            <DemoSection />
            <ValueProposition />
            <HowItWorks />
            <Footer />
        </main>
    );
}
