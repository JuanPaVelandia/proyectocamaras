import React, { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { api } from "../../services/api";
import { Button } from "../landing/components/v0/ui/button";
import { Input } from "../landing/components/v0/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../landing/components/v0/ui/card";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { useToast } from "../../context/ToastContext";
import { isValidPhoneNumber } from "react-phone-number-input";

export function RegisterForm({ onRegisterSuccess, onBackToLogin, onBackToLanding }) {
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        whatsapp_number: "",
        whatsapp_notifications_enabled: false,
    });
    const [loading, setLoading] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [phoneError, setPhoneError] = useState("");
    const { addToast } = useToast();

    const calculatePasswordStrength = (password) => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;
        return Math.min(strength, 5);
    };

    const handlePasswordChange = (value) => {
        setFormData({ ...formData, password: value });
        setPasswordStrength(calculatePasswordStrength(value));
    };

    const handlePhoneChange = (value) => {
        setFormData({ ...formData, whatsapp_number: value || "" });
        setPhoneError("");

        if (value && !isValidPhoneNumber(value)) {
            setPhoneError("Número de teléfono inválido");
        }
    };

    const getStrengthColor = () => {
        if (passwordStrength <= 2) return "bg-red-500";
        if (passwordStrength <= 3) return "bg-yellow-500";
        return "bg-emerald-500";
    };

    const getStrengthText = () => {
        if (passwordStrength <= 2) return "Débil";
        if (passwordStrength <= 3) return "Media";
        return "Fuerte";
    };

    const handleRegister = async () => {
        if (!formData.username || !formData.email || !formData.password) {
            addToast("Por favor completa todos los campos obligatorios", "error");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            addToast("Las contraseñas no coinciden", "error");
            return;
        }

        if (passwordStrength < 3) {
            addToast("La contraseña es muy débil. Usa al menos 8 caracteres, una mayúscula y un número", "error");
            return;
        }

        if (formData.whatsapp_number && !isValidPhoneNumber(formData.whatsapp_number)) {
            addToast("Número de WhatsApp inválido. Verifica el formato", "error");
            setPhoneError("Número de teléfono inválido");
            return;
        }

        setLoading(true);
        try {
            const res = await api.post("/api/auth/register", {
                username: formData.username,
                email: formData.email,
                password: formData.password,
                whatsapp_number: formData.whatsapp_number || null,
                whatsapp_notifications_enabled: formData.whatsapp_notifications_enabled,
            });

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

            addToast(`¡Bienvenido, ${user.username}!`, "success");

            setTimeout(() => {
                onRegisterSuccess(token);
            }, 500);
        } catch (err) {
            console.error("❌ Error en registro:", err);
            let errorMsg = "Error al registrar usuario";

            if (err.response?.data?.detail) {
                const detail = err.response.data.detail;
                if (Array.isArray(detail)) {
                    errorMsg = detail.map(e => `${e.loc[1]}: ${e.msg}`).join(". ");
                } else if (typeof detail === 'object') {
                    errorMsg = JSON.stringify(detail);
                } else {
                    errorMsg = detail;
                }
            }

            addToast(errorMsg, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4 animate-in fade-in duration-700 relative">
            {onBackToLanding && (
                <Button
                    onClick={onBackToLanding}
                    variant="ghost"
                    className="absolute top-4 left-4 md:top-8 md:left-8 text-muted-foreground hover:bg-white hover:shadow-md hover:text-emerald-600 text-lg px-6 py-3 h-auto"
                >
                    ← Volver
                </Button>
            )}
            <Card className="w-full max-w-lg shadow-2xl border-border/50 bg-card/95 backdrop-blur-sm">
                <CardHeader className="space-y-1 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-3xl text-white shadow-lg shadow-emerald-500/30">
                        <ShieldCheck className="h-8 w-8" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                        Crear Cuenta
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Únete a Vidria
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground ml-1">
                            USUARIO *
                        </label>
                        <Input
                            placeholder="usuario123"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                            className="bg-secondary/50"
                        />
                        <p className="text-[11px] text-muted-foreground ml-1">
                            Solo letras, números, guiones y guiones bajos
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground ml-1">
                            EMAIL *
                        </label>
                        <Input
                            placeholder="tu@email.com"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="bg-secondary/50"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground ml-1">
                            CONTRASEÑA *
                        </label>
                        <Input
                            placeholder="••••••••"
                            type="password"
                            value={formData.password}
                            onChange={(e) => handlePasswordChange(e.target.value)}
                            className="bg-secondary/50"
                        />
                        {formData.password && (
                            <div className="mt-2 space-y-2">
                                <div className="flex gap-1 h-1">
                                    {[...Array(5)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`flex-1 rounded-full transition-all duration-300 ${i < passwordStrength ? getStrengthColor() : "bg-secondary"
                                                }`}
                                        />
                                    ))}
                                </div>
                                <p className={`text-[11px] font-medium ${passwordStrength <= 2 ? "text-red-500" :
                                    passwordStrength <= 3 ? "text-yellow-500" : "text-emerald-500"
                                    }`}>
                                    Fortaleza: {getStrengthText()}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground ml-1">
                            CONFIRMAR CONTRASEÑA *
                        </label>
                        <Input
                            placeholder="••••••••"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            className="bg-secondary/50"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground ml-1">
                            WHATSAPP (Opcional)
                        </label>
                        <div className="bg-secondary/50 rounded-md border border-input">
                            <PhoneInput
                                value={formData.whatsapp_number}
                                onChange={handlePhoneChange}
                                placeholder="311 226 4829"
                                error={phoneError}
                            />
                        </div>
                        <p className="text-[11px] text-muted-foreground ml-1">
                            Selecciona tu país e ingresa tu número para recibir alertas
                        </p>
                    </div>

                    {formData.whatsapp_number && (
                        <div className="flex items-center gap-2 p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-900/50">
                            <input
                                type="checkbox"
                                id="whatsapp_notifications"
                                checked={formData.whatsapp_notifications_enabled}
                                onChange={(e) => setFormData({ ...formData, whatsapp_notifications_enabled: e.target.checked })}
                                className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <label
                                htmlFor="whatsapp_notifications"
                                className="text-sm font-medium text-emerald-700 dark:text-emerald-400 cursor-pointer select-none"
                            >
                                ✅ Recibir alertas por WhatsApp
                            </label>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button
                        onClick={handleRegister}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-600 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
                        size="lg"
                    >
                        {loading ? "Creando cuenta..." : "Crear Cuenta"}
                    </Button>

                    <Button
                        onClick={onBackToLogin}
                        variant="ghost"
                        className="w-full bg-transparent text-muted-foreground transition-colors hover:bg-transparent hover:text-emerald-600 active:text-emerald-700"
                        size="sm"
                    >
                        ¿Ya tienes cuenta? Inicia sesión
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
