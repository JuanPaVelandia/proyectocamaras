import React, { useState } from "react";
import { api } from "../../services/api";
import { Button } from "../landing/components/v0/ui/button";
import { Input } from "../landing/components/v0/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../landing/components/v0/ui/card";
import { useToast } from "../../context/ToastContext";
import { ShieldCheck, Mail } from "lucide-react";

export function ForgotPasswordForm({ onBackToLogin }) {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const { addToast } = useToast();

    const handleSubmit = async () => {
        if (!email) {
            addToast("Por favor ingresa tu correo electrónico", "error");
            return;
        }

        setLoading(true);
        try {
            await api.post("/api/auth/forgot-password", { email });
            setSubmitted(true);
            addToast("Si el correo existe, recibirás instrucciones pronto", "success");
        } catch (err) {
            console.error("Error requesting password reset:", err);
            addToast("Ocurrió un error al procesar la solicitud", "error");
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-4 animate-in fade-in duration-700 relative">
                <Card className="w-full max-w-md shadow-2xl border-border/50 bg-card/95 backdrop-blur-sm">
                    <CardHeader className="space-y-1 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <Mail className="h-8 w-8" />
                        </div>
                        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                            ¡Revisa tu correo!
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                            Hemos enviado las instrucciones de recuperación a <strong>{email}</strong>
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button
                            onClick={onBackToLogin}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                            size="lg"
                        >
                            Volver al inicio de sesión
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4 animate-in fade-in duration-700 relative">
            <Button
                onClick={onBackToLogin}
                variant="ghost"
                className="absolute top-4 left-4 md:top-8 md:left-8 text-muted-foreground hover:bg-white hover:shadow-md hover:text-emerald-600 text-lg px-6 py-3 h-auto"
            >
                ← Volver
            </Button>

            <Card className="w-full max-w-md shadow-2xl border-border/50 bg-card/95 backdrop-blur-sm">
                <CardHeader className="space-y-1 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30">
                        <ShieldCheck className="h-8 w-8" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                        Recuperar Contraseña
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground ml-1">
                            EMAIL
                        </label>
                        <Input
                            placeholder="tu@email.com"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-secondary/50"
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
                        size="lg"
                    >
                        {loading ? "Enviando..." : "Enviar enlace"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
