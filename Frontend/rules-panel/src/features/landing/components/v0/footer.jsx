import { Shield } from "lucide-react"

export function Footer({ onPrivacyPolicy }) {
    return (
        <footer className="border-t border-border bg-card">
            <div className="container mx-auto max-w-7xl px-4 py-12">
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                    {/* Brand */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                                <Shield className="h-5 w-5 text-primary-foreground" />
                            </div>
                            <span className="text-xl font-bold">Vidria</span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Transforma tus cámaras de seguridad en cámaras inteligentes con IA.
                        </p>
                        <p className="text-xs text-muted-foreground font-medium">
                            Vidria S.A.S. - NIT: 90219259<br />
                            Bogotá, Colombia.<br />
                            Teléfono: +57 3017797856
                        </p>
                    </div>

                </div>

                <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <p className="text-sm text-muted-foreground">© 2025 Vidria. Todos los derechos reservados.</p>
                        <button
                            onClick={onPrivacyPolicy}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors hover:underline"
                        >
                            Política de Privacidad
                        </button>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Shield className="h-4 w-4 text-primary" />
                        <span>Procesamiento local seguro</span>
                    </div>
                </div>
            </div>
        </footer>
    )
}
