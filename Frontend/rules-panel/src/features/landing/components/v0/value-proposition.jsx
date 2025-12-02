import { Brain, MessageSquare, Zap, Sliders } from "lucide-react"
import { Card } from "./ui/card"

const features = [
    {
        icon: Zap,
        title: "Sin comprar nuevo hardware",
        description: "Configuración rápida. Usa tus cámaras existentes. Descarga el agente y listo.",
    },
    {
        icon: Brain,
        title: "Inteligencia Artificial Local",
        description: "Privacidad total. Todo el procesamiento ocurre en tu computador.",
    },
    {
        icon: Sliders,
        title: "Tus reglas, no las nuestras",
        description: "Decide los horarios horarios y qué detectar (personas, vehículos, mascotas...).",
    },
    {
        icon: MessageSquare,
        title: "Eventos donde sí los ves",
        description: "Recibe notificaciones directamente en tu WhatsApp, al instante.",
    },
]

export function ValueProposition() {
    return (
        <section className="px-4 py-16 md:py-24 bg-secondary/30">
            <div className="container mx-auto max-w-7xl">
                <div className="text-center mb-12 md:mb-16">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-balance leading-tight">Tu seguridad, actualizada.</h2>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty leading-relaxed">
                        Integra inteligencia artificial en tus cámaras de seguridad
                    </p>
                </div>

                {/* Bento Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {/* Regular Feature Cards */}
                    {features.map((feature, index) => (
                        <Card
                            key={index}
                            className="p-6 rounded-2xl border-2 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-card"
                        >
                            <div className="flex flex-col gap-4">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <feature.icon className="h-6 w-6 text-primary" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <h3 className="text-lg font-semibold text-card-foreground">{feature.title}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    )
}
