import { useState } from "react"
import { PhoneMockup } from "./phone-mockup"
import { ChevronLeft, ChevronRight } from "lucide-react"

export function DemoSection() {
    const [currentIndex, setCurrentIndex] = useState(0)

    const demoItems = [
        {
            imageUrl:
                "/Imagen de WhatsApp 2025-11-25 a las 14.35.06_5f056524.jpg",
            altText: "Rancherita está en la puerta",
            alertMessage: "Rancherita se asomó 🐕‍🦺",
        },
        {
            imageUrl:
                "/Imagen de WhatsApp 2025-11-29 a las 12.38.03_a7be149f.jpg",
            altText: "Vehículo detectado en entrada durante la noche",
            alertMessage: "Llegó un camión 🚚",
        },
        {
            imageUrl:
                "/Imagen de WhatsApp 2025-11-29 a las 13.14.30_e58169ba.jpg",
            altText: "Entrega de paquete detectada",
            alertMessage: "Alguien está por ahí 🚶🏼",
        },
    ]

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % demoItems.length)
    }

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + demoItems.length) % demoItems.length)
    }

    return (
        <section className="px-4 py-16 md:py-24 bg-secondary/30">
            <div className="container mx-auto max-w-6xl">
                <div className="text-center mb-12 md:mb-16">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-balance leading-tight">Así se ve la tranquilidad.</h2>
                    <p className="text-lg text-muted-foreground text-pretty leading-relaxed">
                        Ejemplos reales de alertas inteligentes en acción
                    </p>
                </div>

                <div className="relative flex items-center justify-center min-h-[600px] w-full max-w-5xl mx-auto">
                    {/* Previous Item (Left, Blurred) */}
                    <div className="absolute left-0 md:left-12 z-10 opacity-40 blur-sm scale-75 md:scale-90 transition-all duration-500 hidden md:block">
                        <PhoneMockup
                            imageUrl={demoItems[(currentIndex - 1 + demoItems.length) % demoItems.length].imageUrl}
                            altText={demoItems[(currentIndex - 1 + demoItems.length) % demoItems.length].altText}
                            alertMessage={demoItems[(currentIndex - 1 + demoItems.length) % demoItems.length].alertMessage}
                            className="max-w-[280px]"
                        />
                    </div>

                    {/* Navigation Button Left */}
                    <button
                        onClick={prevSlide}
                        className="absolute left-4 z-30 p-3 rounded-full bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background transition-colors border"
                        aria-label="Anterior ejemplo"
                    >
                        <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
                    </button>

                    {/* Current Item (Center, Large, Clear) */}
                    <div className="relative z-20 scale-100 md:scale-110 transition-all duration-500 shadow-2xl rounded-[2.5rem]">
                        <PhoneMockup
                            imageUrl={demoItems[currentIndex].imageUrl}
                            altText={demoItems[currentIndex].altText}
                            alertMessage={demoItems[currentIndex].alertMessage}
                            className="max-w-[300px] md:max-w-[340px]"
                        />
                    </div>

                    {/* Navigation Button Right */}
                    <button
                        onClick={nextSlide}
                        className="absolute right-4 z-30 p-3 rounded-full bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background transition-colors border"
                        aria-label="Siguiente ejemplo"
                    >
                        <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
                    </button>

                    {/* Next Item (Right, Blurred) */}
                    <div className="absolute right-0 md:right-12 z-10 opacity-40 blur-sm scale-75 md:scale-90 transition-all duration-500 hidden md:block">
                        <PhoneMockup
                            imageUrl={demoItems[(currentIndex + 1) % demoItems.length].imageUrl}
                            altText={demoItems[(currentIndex + 1) % demoItems.length].altText}
                            alertMessage={demoItems[(currentIndex + 1) % demoItems.length].alertMessage}
                            className="max-w-[280px]"
                        />
                    </div>

                </div>

                <div className="flex justify-center gap-2 mt-8">
                    {demoItems.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            className={`w-2.5 h-2.5 rounded-full transition-colors ${index === currentIndex ? "bg-primary" : "bg-primary/20"
                                }`}
                            aria-label={`Ir al ejemplo ${index + 1}`}
                        />
                    ))}
                </div>
            </div>
        </section>
    )
}
