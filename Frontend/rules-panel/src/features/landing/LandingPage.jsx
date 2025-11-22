import React, { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { api, getApiBase } from "../../services/api";

function OAuthButton({ provider }) {
    const [available, setAvailable] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkOAuthProviders();
    }, []);

    const checkOAuthProviders = async () => {
        try {
            const res = await api.get("/api/auth/providers");
            const providers = res.data.providers || [];
            setAvailable(providers.some(p => p.name === provider));
        } catch (err) {
            console.error("Error checking OAuth providers:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleOAuthLogin = () => {
        // Usar la función helper para asegurar HTTPS en producción
        const apiBase = getApiBase();
        window.location.href = `${apiBase}/api/auth/${provider}`;
    };

    if (loading || !available) {
        return null;
    }

    const providerInfo = {
        google: { icon: "🔵", name: "Google", color: "#4285F4" },
        facebook: { icon: "🔵", name: "Facebook", color: "#1877F2" },
    }[provider] || { icon: "🔐", name: provider, color: "#667eea" };

    return (
        <button
            onClick={handleOAuthLogin}
            style={{
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 600,
                background: providerInfo.color,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                transition: "transform 0.1s",
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
        >
            <span>{providerInfo.icon}</span>
            {providerInfo.name}
        </button>
    );
}

export function LandingPage({ onGetStarted }) {
    return (
        <div style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            minHeight: "100vh",
            width: "100%",
            maxWidth: "100%",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "40px clamp(20px, 4vw, 60px)",
            boxSizing: "border-box",
        }}>
            {/* Hero Section */}
            <div style={{
                maxWidth: "min(100%, 1400px)",
                width: "100%",
                margin: "0 auto",
                textAlign: "center",
                paddingTop: 60,
                paddingBottom: 40,
                boxSizing: "border-box",
            }}>
                <h1 style={{
                    fontSize: "clamp(2.5rem, 5vw, 4rem)",
                    fontWeight: 800,
                    color: "#fff",
                    marginBottom: 20,
                    lineHeight: 1.2,
                }}>
                    🎥 Sistema de Monitoreo Inteligente
                </h1>
                <p style={{
                    fontSize: "clamp(1.1rem, 2vw, 1.5rem)",
                    color: "rgba(255, 255, 255, 0.9)",
                    marginBottom: 40,
                    maxWidth: 700,
                    margin: "0 auto 40px",
                    lineHeight: 1.6,
                }}>
                    Detecta objetos en tiempo real con IA, recibe alertas por WhatsApp
                    y gestiona todas tus cámaras desde un panel web intuitivo.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
                    <Button
                        onClick={onGetStarted}
                        style={{
                            padding: "16px 48px",
                            fontSize: 18,
                            fontWeight: 600,
                            background: "#fff",
                            color: "#667eea",
                            border: "none",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                        }}
                    >
                        🚀 Comenzar Ahora
                    </Button>
                    <div style={{ 
                        display: "flex", 
                        gap: 12, 
                        marginTop: 8,
                        flexWrap: "wrap",
                        justifyContent: "center"
                    }}>
                        <OAuthButton provider="google" />
                        <OAuthButton provider="facebook" />
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div style={{
                maxWidth: "min(100%, 1400px)",
                width: "100%",
                margin: "60px auto",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 24,
                boxSizing: "border-box",
            }}>
                <Card style={{ textAlign: "center", padding: 32 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
                    <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: "#1e293b" }}>
                        Detección Inteligente
                    </h3>
                    <p style={{ color: "#64748b", lineHeight: 1.6 }}>
                        Detecta más de 80 tipos de objetos (personas, vehículos, animales) usando
                        inteligencia artificial avanzada.
                    </p>
                </Card>

                <Card style={{ textAlign: "center", padding: 32 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
                    <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: "#1e293b" }}>
                        Alertas por WhatsApp
                    </h3>
                    <p style={{ color: "#64748b", lineHeight: 1.6 }}>
                        Recibe notificaciones instantáneas con imágenes cuando se detecten objetos
                        según tus reglas personalizadas.
                    </p>
                </Card>

                <Card style={{ textAlign: "center", padding: 32 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>⚙️</div>
                    <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: "#1e293b" }}>
                        Reglas Personalizables
                    </h3>
                    <p style={{ color: "#64748b", lineHeight: 1.6 }}>
                        Crea reglas flexibles: selecciona cámaras, objetos, horarios y condiciones
                        de detección.
                    </p>
                </Card>

                <Card style={{ textAlign: "center", padding: 32 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
                    <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: "#1e293b" }}>
                        Panel de Control
                    </h3>
                    <p style={{ color: "#64748b", lineHeight: 1.6 }}>
                        Gestiona cámaras, visualiza eventos y activaciones desde una interfaz
                        web moderna e intuitiva.
                    </p>
                </Card>
            </div>

            {/* How It Works Section */}
            <div style={{
                maxWidth: "min(100%, 1400px)",
                width: "100%",
                margin: "60px auto",
                background: "rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(10px)",
                borderRadius: 24,
                padding: "48px clamp(24px, 4vw, 48px)",
                boxSizing: "border-box",
            }}>
                <h2 style={{
                    fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
                    fontWeight: 700,
                    color: "#fff",
                    textAlign: "center",
                    marginBottom: 40,
                }}>
                    ¿Cómo Funciona?
                </h2>
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: 32,
                }}>
                    <div style={{ textAlign: "center" }}>
                        <div style={{
                            width: 80,
                            height: 80,
                            borderRadius: "50%",
                            background: "rgba(255, 255, 255, 0.2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 36,
                            margin: "0 auto 20px",
                        }}>1️⃣</div>
                        <h3 style={{ color: "#fff", fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
                            Instala el Sistema
                        </h3>
                        <p style={{ color: "rgba(255, 255, 255, 0.9)", lineHeight: 1.6 }}>
                            Descarga el ZIP, ejecuta el instalador y en minutos tendrás todo funcionando.
                        </p>
                    </div>

                    <div style={{ textAlign: "center" }}>
                        <div style={{
                            width: 80,
                            height: 80,
                            borderRadius: "50%",
                            background: "rgba(255, 255, 255, 0.2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 36,
                            margin: "0 auto 20px",
                        }}>2️⃣</div>
                        <h3 style={{ color: "#fff", fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
                            Agrega tus Cámaras
                        </h3>
                        <p style={{ color: "rgba(255, 255, 255, 0.9)", lineHeight: 1.6 }}>
                            Conecta tus cámaras IP desde el panel web. Soporta Hikvision, Dahua y más.
                        </p>
                    </div>

                    <div style={{ textAlign: "center" }}>
                        <div style={{
                            width: 80,
                            height: 80,
                            borderRadius: "50%",
                            background: "rgba(255, 255, 255, 0.2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 36,
                            margin: "0 auto 20px",
                        }}>3️⃣</div>
                        <h3 style={{ color: "#fff", fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
                            Crea Reglas
                        </h3>
                        <p style={{ color: "rgba(255, 255, 255, 0.9)", lineHeight: 1.6 }}>
                            Define qué objetos detectar, en qué horarios y recibe alertas por WhatsApp.
                        </p>
                    </div>

                    <div style={{ textAlign: "center" }}>
                        <div style={{
                            width: 80,
                            height: 80,
                            borderRadius: "50%",
                            background: "rgba(255, 255, 255, 0.2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 36,
                            margin: "0 auto 20px",
                        }}>4️⃣</div>
                        <h3 style={{ color: "#fff", fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
                            Recibe Alertas
                        </h3>
                        <p style={{ color: "rgba(255, 255, 255, 0.9)", lineHeight: 1.6 }}>
                            El sistema detecta objetos automáticamente y te envía notificaciones
                            con imágenes.
                        </p>
                    </div>
                </div>
            </div>

            {/* Download Section */}
            <div style={{
                maxWidth: "min(100%, 1400px)",
                width: "100%",
                margin: "60px auto",
                boxSizing: "border-box",
            }}>
                <Card style={{ padding: 48, textAlign: "center" }}>
                    <h2 style={{
                        fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
                        fontWeight: 700,
                        color: "#1e293b",
                        marginBottom: 16,
                    }}>
                        📦 Descarga e Instalación
                    </h2>
                    <p style={{
                        fontSize: 18,
                        color: "#64748b",
                        marginBottom: 24,
                        maxWidth: 700,
                        margin: "0 auto 24px",
                    }}>
                        Instalación completamente automática. Solo necesitas ejecutar el instalador y el sistema estará listo en minutos.
                    </p>
                    <div style={{
                        background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                        border: "2px solid #86efac",
                        padding: 20,
                        borderRadius: 12,
                        marginBottom: 40,
                        maxWidth: 800,
                        margin: "0 auto 40px",
                    }}>
                        <p style={{ margin: 0, fontSize: 15, color: "#166534", lineHeight: 1.6 }}>
                            ✅ <strong>Instalación Automática:</strong> El instalador configura todo por ti: servicios Docker, base de datos, backend y frontend. No necesitas ejecutar comandos manuales.
                        </p>
                    </div>

                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                        gap: 24,
                        marginBottom: 40,
                        textAlign: "left",
                    }}>
                        <div style={{
                            background: "#f8fafc",
                            padding: 24,
                            borderRadius: 12,
                            border: "2px solid #e2e8f0",
                        }}>
                            <div style={{
                                fontSize: 32,
                                marginBottom: 12,
                            }}>📥</div>
                            <h3 style={{
                                fontSize: 20,
                                fontWeight: 700,
                                marginBottom: 12,
                                color: "#1e293b",
                            }}>
                                Paso 1: Descargar y Extraer
                            </h3>
                            <p style={{ color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
                                Descarga el archivo ZIP del sistema completo y extrae su contenido en una carpeta de tu elección.
                            </p>
                            <div style={{
                                background: "#1e293b",
                                color: "#fff",
                                padding: 12,
                                borderRadius: 8,
                                fontFamily: "monospace",
                                fontSize: 14,
                                marginBottom: 12,
                                textAlign: "center",
                            }}>
                                📦 frigate-monitoring-v1.0.0.zip
                            </div>
                            <div style={{
                                background: "#f1f5f9",
                                padding: 12,
                                borderRadius: 8,
                                fontFamily: "monospace",
                                fontSize: 13,
                            }}>
                                <strong>Ejemplos de carpeta:</strong><br />
                                Windows: <code style={{ background: "#e2e8f0", padding: "2px 4px", borderRadius: 4 }}>C:\frigate-monitoring</code><br />
                                Linux/Mac: <code style={{ background: "#e2e8f0", padding: "2px 4px", borderRadius: 4 }}>~/frigate-monitoring</code>
                            </div>
                            <p style={{ color: "#64748b", marginTop: 12, fontSize: 13, lineHeight: 1.5 }}>
                                <strong>Tamaño:</strong> ~50 MB (las imágenes Docker se descargan automáticamente)
                            </p>
                        </div>

                        <div style={{
                            background: "#f8fafc",
                            padding: 24,
                            borderRadius: 12,
                            border: "2px solid #e2e8f0",
                        }}>
                            <div style={{
                                fontSize: 32,
                                marginBottom: 12,
                            }}>🐳</div>
                            <h3 style={{
                                fontSize: 20,
                                fontWeight: 700,
                                marginBottom: 12,
                                color: "#1e293b",
                            }}>
                                Paso 2: Instalar Docker
                            </h3>
                            <p style={{ color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
                                Si no tienes Docker instalado, descárgalo e instálalo desde{" "}
                                <a
                                    href="https://www.docker.com/products/docker-desktop/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: "#2563eb", textDecoration: "underline", fontWeight: 600 }}
                                >
                                    docker.com
                                </a>
                                . Es gratuito y solo necesitas hacerlo una vez.
                            </p>
                            <div style={{
                                background: "#fef3c7",
                                padding: 12,
                                borderRadius: 8,
                                marginTop: 12,
                                border: "1px solid #fcd34d",
                            }}>
                                <p style={{ margin: 0, fontSize: 13, color: "#92400e", lineHeight: 1.5 }}>
                                    ⚠️ <strong>Después de instalar:</strong> Reinicia tu computadora, luego abre Docker Desktop y espera a que esté listo (verás el ícono de Docker en la barra de tareas).
                                </p>
                            </div>
                            <div style={{
                                background: "#f0fdf4",
                                padding: 16,
                                borderRadius: 8,
                                marginTop: 16,
                                border: "1px solid #86efac",
                            }}>
                                <p style={{ margin: "0 0 8px 0", fontSize: 14, fontWeight: 600, color: "#166534" }}>
                                    ✅ ¿Qué sigue?
                                </p>
                                <p style={{ margin: 0, fontSize: 13, color: "#166534", lineHeight: 1.6 }}>
                                    Una vez que Docker esté funcionando, simplemente haz doble clic en el archivo <strong>install.ps1</strong> (Windows) o <strong>install.sh</strong> (Mac/Linux) dentro de la carpeta que extrajiste. El instalador hará todo el resto automáticamente.
                                </p>
                                <p style={{ margin: "12px 0 0 0", fontSize: 12, color: "#166534", fontStyle: "italic" }}>
                                    ⏱️ La instalación automática puede tardar 10-20 minutos la primera vez
                                </p>
                            </div>
                        </div>

                        <div style={{
                            background: "#f0fdf4",
                            padding: 24,
                            borderRadius: 12,
                            border: "2px solid #86efac",
                        }}>
                            <div style={{
                                fontSize: 32,
                                marginBottom: 12,
                            }}>🌐</div>
                            <h3 style={{
                                fontSize: 20,
                                fontWeight: 700,
                                marginBottom: 12,
                                color: "#1e293b",
                            }}>
                                Paso 3: Ingresar a localhost:5173
                            </h3>
                            <p style={{ color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
                                Una vez que el instalador termine, abre tu navegador y accede a:
                            </p>
                            <div style={{
                                background: "#1e293b",
                                color: "#fff",
                                padding: 16,
                                borderRadius: 8,
                                fontFamily: "monospace",
                                fontSize: 16,
                                textAlign: "center",
                                marginBottom: 16,
                                fontWeight: 600,
                            }}>
                                http://localhost:5173
                            </div>
                            <div style={{
                                background: "#f1f5f9",
                                padding: 16,
                                borderRadius: 8,
                                marginTop: 12,
                                border: "1px solid #e2e8f0",
                            }}>
                                <p style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
                                    🔐 Credenciales por defecto:
                                </p>
                                <div style={{
                                    background: "#fff",
                                    padding: 12,
                                    borderRadius: 6,
                                    fontFamily: "monospace",
                                    fontSize: 13,
                                }}>
                                    Usuario: <strong style={{ color: "#2563eb" }}>admin</strong><br />
                                    Contraseña: <strong style={{ color: "#2563eb" }}>admin123</strong>
                                </div>
                                <p style={{ margin: "12px 0 0 0", fontSize: 12, color: "#64748b", fontStyle: "italic" }}>
                                    💡 Cambia estas credenciales después del primer acceso
                                </p>
                            </div>
                            <div style={{
                                background: "#dcfce7",
                                padding: 12,
                                borderRadius: 8,
                                marginTop: 12,
                                border: "1px solid #86efac",
                            }}>
                                <p style={{ margin: 0, fontSize: 13, color: "#166534", lineHeight: 1.5 }}>
                                    ✅ <strong>¡Listo!</strong> El sistema está completamente operativo. Sigue el asistente de configuración inicial.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div style={{
                        background: "#fef3c7",
                        border: "2px solid #fcd34d",
                        padding: 24,
                        borderRadius: 12,
                        marginTop: 32,
                    }}>
                        <h3 style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: "#92400e",
                            marginBottom: 16,
                        }}>
                            💡 Requisitos del Sistema
                        </h3>
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                            gap: 16,
                            textAlign: "left",
                        }}>
                            <div>
                                <p style={{ margin: "0 0 8px 0", fontSize: 14, fontWeight: 600, color: "#92400e" }}>
                                    ✅ Requisitos Obligatorios:
                                </p>
                                <ul style={{
                                    color: "#92400e",
                                    lineHeight: 1.8,
                                    margin: 0,
                                    paddingLeft: 20,
                                    fontSize: 14,
                                }}>
                                    <li>Docker Desktop instalado y corriendo</li>
                                    <li>Al menos 5-10 GB de espacio en disco</li>
                                    <li>Conexión a internet (primera vez)</li>
                                </ul>
                            </div>
                            <div>
                                <p style={{ margin: "0 0 8px 0", fontSize: 14, fontWeight: 600, color: "#92400e" }}>
                                    📋 Recomendado:
                                </p>
                                <ul style={{
                                    color: "#92400e",
                                    lineHeight: 1.8,
                                    margin: 0,
                                    paddingLeft: 20,
                                    fontSize: 14,
                                }}>
                                    <li>4 GB de RAM disponibles</li>
                                    <li>Procesador de 2+ núcleos</li>
                                    <li>Windows 10/11, Linux o macOS</li>
                                </ul>
                            </div>
                        </div>
                        <div style={{
                            background: "#fef3c7",
                            padding: 12,
                            borderRadius: 8,
                            marginTop: 16,
                            border: "1px solid #fcd34d",
                        }}>
                            <p style={{ margin: 0, fontSize: 13, color: "#92400e" }}>
                                ✅ <strong>No necesitas Node.js:</strong> El frontend se construye y ejecuta automáticamente dentro de Docker. Todo está incluido.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* CTA Section */}
            <div style={{
                maxWidth: "min(100%, 1400px)",
                width: "100%",
                margin: "60px auto",
                textAlign: "center",
                boxSizing: "border-box",
            }}>
                <Card style={{
                    padding: 48,
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "#fff",
                }}>
                    <h2 style={{
                        fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
                        fontWeight: 700,
                        marginBottom: 20,
                    }}>
                        ¿Listo para comenzar?
                    </h2>
                    <p style={{
                        fontSize: 18,
                        marginBottom: 32,
                        opacity: 0.9,
                    }}>
                        Accede al panel de administración y configura tu sistema en minutos.
                    </p>
                    <Button
                        onClick={onGetStarted}
                        style={{
                            padding: "16px 48px",
                            fontSize: 18,
                            fontWeight: 600,
                            background: "#fff",
                            color: "#667eea",
                            border: "none",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                        }}
                    >
                        Acceder al Panel →
                    </Button>
                </Card>
            </div>

            {/* Footer */}
            <div style={{
                maxWidth: "min(100%, 1400px)",
                width: "100%",
                margin: "60px auto 20px",
                textAlign: "center",
                color: "rgba(255, 255, 255, 0.8)",
                fontSize: 14,
                boxSizing: "border-box",
            }}>
                <p>Sistema de Monitoreo Inteligente con Frigate + IA</p>
                <p style={{ marginTop: 8, opacity: 0.7 }}>
                    Detección de objetos en tiempo real • Alertas por WhatsApp • Panel web intuitivo
                </p>
            </div>
        </div>
    );
}

