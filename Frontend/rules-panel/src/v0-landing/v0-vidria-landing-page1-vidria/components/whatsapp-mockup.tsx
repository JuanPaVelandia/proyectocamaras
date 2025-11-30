import { Check } from "lucide-react"

export function WhatsAppMockup() {
  return (
    <div className="w-full max-w-md">
      {/* Phone frame */}
      <div className="bg-card rounded-[3rem] shadow-2xl p-3 border-8 border-secondary">
        {/* WhatsApp header */}
        <div className="bg-primary rounded-t-[2.5rem] px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center text-primary-foreground font-semibold">
            V
          </div>
          <div className="flex-1">
            <h3 className="text-primary-foreground font-semibold text-sm">Vidria Alerta</h3>
            <p className="text-primary-foreground/80 text-xs">en línea</p>
          </div>
        </div>

        {/* Chat background */}
        <div className="bg-[oklch(0.96_0.01_165)] min-h-[500px] px-3 py-4 rounded-b-[2.5rem] flex flex-col gap-3">
          {/* System message */}
          <div className="flex justify-center">
            <div className="bg-secondary/80 px-3 py-1 rounded-lg text-xs text-muted-foreground">
              Los mensajes están cifrados de extremo a extremo
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Alert message from Vidria */}
          <div className="flex justify-start">
            <div className="max-w-[85%]">
              {/* Message with image */}
              <div className="bg-card rounded-2xl rounded-tl-sm shadow-md overflow-hidden">
                {/* Placeholder image */}
                <div className="relative w-full aspect-video bg-muted">
                  <img
                    src="/Imagen de WhatsApp 2025-11-29 a las 13.15.27_ed5c7fc9.jpg"
                    alt="Captura de cámara"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-accent text-accent-foreground px-2 py-1 rounded-lg text-xs font-semibold">
                    ALERTA
                  </div>
                </div>

                {/* Message text */}
                <div className="p-3">
                  <p className="text-sm text-card-foreground font-medium leading-relaxed">
                    Hay una persona en la entrada principal
                  </p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-xs text-muted-foreground">10:42 AM</span>
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
