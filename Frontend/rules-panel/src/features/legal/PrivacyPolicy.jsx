import React, { useEffect } from "react";
import { Button } from "../../components/ui/Button";

export function PrivacyPolicy({ onBack }) {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-background text-foreground py-12 px-4 md:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="mb-8">
                    <Button variant="outline" onClick={onBack}>
                        ← Volver al inicio
                    </Button>
                </div>

                <h1 className="text-3xl font-bold mb-6">Política de Privacidad</h1>

                <div className="prose prose-blue max-w-none space-y-6 text-slate-700">
                    <p>
                        En <strong>Vidria</strong>, nos tomamos muy en serio la privacidad de sus datos.
                        Esta Política de Privacidad describe cómo recopilamos, usamos y protegemos su información
                        cuando utiliza nuestra plataforma de gestión de video vigilancia inteligente.
                    </p>

                    <h2 className="text-xl font-semibold text-slate-900">1. Información que recopilamos</h2>
                    <p>
                        Podemos recopilar dos tipos de información:
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li><strong>Datos de la Cuenta:</strong> Nombre, correo electrónico y número de teléfono para notificaciones.</li>
                            <li><strong>Datos de Video:</strong> Transmisiones de video RTSP e imágenes (snapshots) procesadas localmente por su servidor Frigate.</li>
                        </ul>
                    </p>

                    <h2 className="text-xl font-semibold text-slate-900">2. Uso de la Información</h2>
                    <p>
                        Utilizamos su información exclusivamente para:
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>Proporcionar el servicio de detección de objetos y notificaciones.</li>
                            <li>Alertarle vía WhatsApp o Email sobre eventos de seguridad configurados por usted.</li>
                            <li>Mejorar la precisión y rendimiento de nuestro sistema.</li>
                        </ul>
                    </p>

                    <h2 className="text-xl font-semibold text-slate-900">3. Procesamiento Local (Edge Computing)</h2>
                    <p>
                        Vidria está diseñado con una arquitectura "Privacy-First".
                        El análisis de video se realiza <strong>localmente en su servidor (Edge)</strong>.
                        Sus videos continuos <strong>NO se suben a la nube</strong>.
                        Solo se envían a nuestros servidores los metadatos de los eventos (ej: "persona detectada") y una imagen (snapshot) para la notificación, si así lo configura.
                    </p>

                    <h2 className="text-xl font-semibold text-slate-900">4. Compartir Información</h2>
                    <p>
                        No vendemos, alquilamos ni compartimos su información personal con terceros, excepto cuando sea necesario para:
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>Cumplir con la ley o procesos legales.</li>
                            <li>Proteger los derechos o la seguridad de Vidria, nuestros usuarios o el público.</li>
                        </ul>
                    </p>

                    <h2 className="text-xl font-semibold text-slate-900">5. Seguridad</h2>
                    <p>
                        Implementamos medidas de seguridad estándar de la industria, incluyendo encriptación en tránsito (HTTPS/TLS)
                        y autenticación robusta mediante API Keys y Tokens OAuth.
                    </p>

                    <h2 className="text-xl font-semibold text-slate-900">6. Contacto</h2>
                    <p>
                        Si tiene preguntas sobre esta política, contáctenos en <a href="mailto:soporte@vidria.co" className="text-blue-600 hover:underline">soporte@vidria.co</a>.
                    </p>

                    <p className="text-sm text-slate-500 mt-8">
                        Última actualización: Diciembre 2025
                    </p>
                </div>
            </div>
        </div>
    );
}
