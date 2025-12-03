import React, { useState, useEffect } from "react";
import { api, getApiBase } from "../../services/api";
import { Button } from "../landing/components/v0/ui/button";
import { Input } from "../landing/components/v0/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../landing/components/v0/ui/card";
import { useToast } from "../../context/ToastContext";
import { ShieldCheck } from "lucide-react";

export function LoginForm({ onLoginSuccess, onBackToLanding, onNavigateToRegister, onForgotPassword }) {
    // ... existing code ...



    const [username, setUsername] = useState("");
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
        const apiBase = getApiBase();
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
            console.log("📡 Enviando petición a /api/auth/login");
            const res = await api.post("/api/auth/login", {
                username,
                password,
            });

            console.log("✅ Respuesta recibida:", res.data);
            
            // El backend devuelve access_token, no token
            const token = res.data.access_token || res.data.token;
            if (!token) {
                throw new Error("No se recibió token en la respuesta");
            }
            
            localStorage.setItem("adminToken", token);

            // El backend devuelve los datos del usuario en res.data.user
            const user = res.data.user || res.data;
            const userData = {
                username: user.username,
                email: user.email,
                whatsapp_number: user.whatsapp_number || ""
            };
            localStorage.setItem("userData", JSON.stringify(userData));

            addToast(`Bienvenido, ${user.username}!`, "success");

            setTimeout(() => {
                onLoginSuccess(token);
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
        <div className="flex min-h-screen items-center justify-center bg-background p-4 animate-in fade-in duration-700 relative">
            {onBackToLanding && (
                <Button
                    onClick={onBackToLanding}
                    variant="ghost"
                    className=" absolute top-4 left-4 md:top-8 md:left-8 text-muted-foreground hover:bg-white hover:shadow-md hover:text-emerald-600 text-lg px-6 py-3 h-auto"
                >
                    ← Volver
                </Button>
            )}
            <Card className="w-full max-w-md shadow-2xl border-border/50 bg-card/95 backdrop-blur-sm">
                <CardHeader className="space-y-1 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30">
                        <ShieldCheck className="h-8 w-8" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                        Bienvenido de nuevo
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Ingresa tus credenciales para continuar
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground ml-1">
                            USUARIO
                        </label>
                        <Input
                            placeholder="Ingresa tu usuario"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="bg-secondary/50"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground ml-1">
                            CONTRASEÑA
                        </label>
                        <Input
                            placeholder="*******"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === "Enter") {
                                    handleLogin();
                                }
                            }}
                            className="bg-secondary/50"
                        />
                        <div className="flex justify-end">
                            <Button
                                variant="link"
                                className="px-0 text-xs font-medium text-muted-foreground hover:text-emerald-600 h-auto py-1"
                                onClick={onForgotPassword}
                            >
                                ¿Olvidaste tu contraseña?
                            </Button>
                        </div>
                    </div>

                    {oauthProviders.length > 0 && (
                        <div className="mt-6">
                            <div className="relative mb-4">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-border" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-card px-2 text-muted-foreground">O</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                {oauthProviders.map((provider) => {
                                    const providerInfo = {
                                        google: { icon: "🔵", name: "Continuar con Google", className: "bg-[#4285F4] hover:bg-[#4285F4]/90 text-white" },
                                        facebook: { icon: "🔵", name: "Continuar con Facebook", className: "bg-[#1877F2] hover:bg-[#1877F2]/90 text-white" },
                                    }[provider.name] || { icon: "🔐", name: `Continuar con ${provider.display_name}`, className: "bg-indigo-600 hover:bg-indigo-700 text-white" };

                                    return (
                                        <Button
                                            key={provider.name}
                                            onClick={() => handleOAuthLogin(provider.name)}
                                            className={`w-full ${providerInfo.className}`}
                                        >
                                            <span className="mr-2">{providerInfo.icon}</span>
                                            {providerInfo.name}
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button
                        onClick={handleLogin}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
                        size="lg"
                    >
                        {loading ? "Iniciando sesión..." : "Ingresar"}
                    </Button>

                    {onBackToLanding && (
                        <Button
                            onClick={onBackToLanding}
                            variant="ghost"
                            className="w-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-all font-medium"
                            size="lg"
                        >
                            Volver al inicio
                        </Button>
                    )}

                    {onNavigateToRegister && (
                        <div className="text-center text-sm text-muted-foreground">
                            ¿No tienes cuenta?{" "}
                            <button
                                onClick={onNavigateToRegister}
                                className="font-semibold text-primary hover:underline underline-offset-4"
                            >
                                Regístrate aquí
                            </button>
                        </div>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
