import { Button } from "./ui/button"
import { WhatsAppMockup } from "./whatsapp-mockup"
import { Sparkles } from "lucide-react"

export function HeroSection({ onGetStarted }) {
    return (
        <section className="relative overflow-hidden px-4 py-16 md:py-24 lg:py-32">
            <div className="container mx-auto max-w-7xl">
                <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
                    {/* Left side - Text content */}
                    <div className="flex flex-col gap-6 lg:gap-8">
                        <div className="flex flex-col gap-4">
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance leading-none">
                                Inteligencia artificial para tus cámaras de seguridad.
                            </h1>
                            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed text-pretty">
                                Conecta tus cámaras actuales, procesa el video en tu propio computador y recibe alertas inteligentes
                                a tu WhatsApp. <br></br><strong>Sin comprar ningun equipo nuevo.</strong>
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <Button
                                size="lg"
                                onClick={onGetStarted}
                                className="text-lg px-8 py-6 rounded-2xl shadow-lg hover:shadow-xl transition-all bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                                <Sparkles className="mr-2 h-5 w-5" />
                                Empieza Gratis
                            </Button>
                            <Button size="lg" variant="outline" className="text-lg px-8 py-6 rounded-2xl border-2 bg-transparent hover:bg-transparent hover:text-emerald-600 hover:border-emerald-600 transition-colors">
                                Ver Demo
                            </Button>
                        </div>
                    </div>

                    {/* Right side - WhatsApp Mockup */}
                    <div className="flex justify-center lg:justify-end">
                        <WhatsAppMockup />
                    </div>
                </div>
            </div>
        </section>
    )
}
