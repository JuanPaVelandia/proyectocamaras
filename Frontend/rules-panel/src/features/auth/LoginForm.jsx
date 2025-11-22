import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { useToast } from "../../context/ToastContext";

export function LoginForm({ onLoginSuccess, onBackToLanding }) {
    const [username, setUsername] = useState("admin");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [oauthProviders, setOauthProviders] = useState([]);
    const { addToast } = useToast();

    useEffect(() => {
        loadOAuthProviders();
    }, []);

    const loadOAuthProviders = async () => {
        try {
            const res = await api.get("/api/auth/providers");
            setOauthProviders(res.data.providers || []);
        } catch (err) {
            console.error("Error loading OAuth providers:", err);
        }
    };

    const handleOAuthLogin = (provider) => {
        const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8000";
        window.location.href = `${apiBase}/api/auth/${provider}`;
    };

    const handleLogin = async () => {
        if (!username || !password) {
            addToast("Por favor completa todos los campos", "error");
            return;
        }

        console.log("🔐 Intentando login...", { username, password: "***" });
        setLoading(true);
        try {
            console.log("📡 Enviando petición a /api/login");
            const res = await api.post("/api/login", {
                username,
                password,
            });

            console.log("✅ Respuesta recibida:", res.data);
            localStorage.setItem("adminToken", res.data.token);
            addToast(`Bienvenido, ${res.data.username}!`, "success");

            // Pequeño delay para ver la animación de éxito
            setTimeout(() => {
                onLoginSuccess(res.data.token);
            }, 500);
        } catch (err) {
            console.error("❌ Error en login:", err);
            console.error("❌ Error response:", err.response);
            addToast("Credenciales incorrectas. Intenta de nuevo.", "error");
            setLoading(false);
        } finally {
            setTimeout(() => setLoading(false), 600);
        }
    };

    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "100vh",
                animation: "fadeIn 0.8s ease-out",
            }}
        >
            <Card
                style={{
                    width: 380,
                    padding: 40,
                    textAlign: "center",
                    background: "rgba(255, 255, 255, 0.85)",
                    backdropFilter: "blur(20px)",
                    boxShadow: "0 20px 50px rgba(0,0,0,0.1)",
                    border: "1px solid rgba(255,255,255,0.5)",
                }}
            >
                <div style={{ marginBottom: 24 }}>
                    <div
                        style={{
                            width: 60,
                            height: 60,
                            background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                            borderRadius: 16,
                            margin: "0 auto 16px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: 28,
                            boxShadow: "0 10px 20px rgba(37, 99, 235, 0.3)",
                        }}
                    >
                        👁️
                    </div>
                    <h2
                        style={{
                            margin: 0,
                            fontSize: 24,
                            fontWeight: 700,
                            color: "#1e293b",
                            letterSpacing: "-0.5px",
                        }}
                    >
                        Frigate Panel
                    </h2>
                    <p style={{ color: "#64748b", fontSize: 14, marginTop: 8 }}>
                        Accede a tu centro de control inteligente
                    </p>
                </div>

                <div style={{ textAlign: "left" }}>
                    <label
                        style={{
                            display: "block",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#475569",
                            marginBottom: 6,
                            marginLeft: 4,
                        }}
                    >
                        USUARIO
                    </label>
                    <Input
                        placeholder="Ingresa tu usuario"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        style={{
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            padding: "12px",
                            fontSize: 15,
                            transition: "all 0.2s",
                        }}
                    />

                    <label
                        style={{
                            display: "block",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#475569",
                            marginBottom: 6,
                            marginLeft: 4,
                            marginTop: 16,
                        }}
                    >
                        CONTRASEÑA
                    </label>
                    <Input
                        placeholder="••••••••"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === "Enter") {
                                handleLogin();
                            }
                        }}
                        style={{
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            padding: "12px",
                            fontSize: 15,
                            transition: "all 0.2s",
                        }}
                    />
                </div>

                {oauthProviders.length > 0 && (
                    <div style={{ marginTop: 24 }}>
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            marginBottom: 16,
                        }}>
                            <div style={{
                                flex: 1,
                                height: 1,
                                background: "#e2e8f0",
                            }} />
                            <span style={{
                                padding: "0 12px",
                                fontSize: 12,
                                color: "#94a3b8",
                                textTransform: "uppercase",
                            }}>O</span>
                            <div style={{
                                flex: 1,
                                height: 1,
                                background: "#e2e8f0",
                            }} />
                        </div>
                        <div style={{
                            display: "flex",
                            gap: 8,
                            flexDirection: "column",
                        }}>
                            {oauthProviders.map((provider) => {
                                const providerInfo = {
                                    google: { icon: "🔵", name: "Continuar con Google", color: "#4285F4" },
                                    facebook: { icon: "🔵", name: "Continuar con Facebook", color: "#1877F2" },
                                }[provider.name] || { icon: "🔐", name: `Continuar con ${provider.display_name}`, color: "#667eea" };

                                return (
                                    <button
                                        key={provider.name}
                                        onClick={() => handleOAuthLogin(provider.name)}
                                        style={{
                                            padding: 12,
                                            fontSize: 14,
                                            fontWeight: 600,
                                            background: providerInfo.color,
                                            color: "#fff",
                                            border: "none",
                                            borderRadius: 8,
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: 8,
                                            width: "100%",
                                            transition: "opacity 0.2s",
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.opacity = "0.9"}
                                        onMouseOut={(e) => e.currentTarget.style.opacity = "1"}
                                    >
                                        <span>{providerInfo.icon}</span>
                                        {providerInfo.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div style={{ marginTop: 32 }}>
                    <Button
                        onClick={handleLogin}
                        disabled={loading}
                        style={{
                            padding: 14,
                            fontSize: 16,
                            background: "linear-gradient(to right, #2563eb, #3b82f6)",
                            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
                            transition: "transform 0.1s",
                            width: "100%",
                        }}
                    >
                        {loading ? "Iniciando sesión..." : "Ingresar con Usuario y Contraseña"}
                    </Button>
                    {onBackToLanding && (
                        <Button
                            onClick={onBackToLanding}
                            variant="secondary"
                            style={{
                                padding: 12,
                                fontSize: 14,
                                marginTop: 12,
                                width: "100%",
                                background: "transparent",
                                color: "#64748b",
                                border: "none",
                            }}
                        >
                            ← Volver a la página principal
                        </Button>
                    )}
                </div>
            </Card>
            <style>
                {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
            </style>
        </div>
    );
}
