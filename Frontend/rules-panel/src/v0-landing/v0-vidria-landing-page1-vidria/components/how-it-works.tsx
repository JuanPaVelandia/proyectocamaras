import { Download, Camera, Bell } from "lucide-react"

const steps = [
  {
    number: "1",
    icon: Download,
    title: "Descarga el agente Vidria",
    description: "Instala el software en tu computador",
  },
  {
    number: "2",
    icon: Camera,
    title: "Detecta tus cámaras",
    description: "Vincula las cámaras que ya tienes",
  },
  {
    number: "3",
    icon: Bell,
    title: "Recibe alertas en WhatsApp",
    description: "Obtén notificaciones inteligentes al instante",
  },
]

export function HowItWorks() {
  return (
    <section className="px-4 py-16 md:py-24">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-balance">Tan fácil como 1, 2, 3.</h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center text-center gap-4">
              {/* Step number and icon */}
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
                  <step.icon className="h-10 w-10 text-primary-foreground" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent flex items-center justify-center shadow-md">
                  <span className="text-sm font-bold text-accent-foreground">{step.number}</span>
                </div>
              </div>

              {/* Step content */}
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-semibold">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>

              {/* Connector line (except for last item) */}
              {index < steps.length - 1 && (
                <div
                  className="hidden md:block absolute top-10 left-[calc(50%+2.5rem)] w-[calc(100%-5rem)] h-0.5 bg-border"
                  style={{ transform: "translateX(0)" }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
