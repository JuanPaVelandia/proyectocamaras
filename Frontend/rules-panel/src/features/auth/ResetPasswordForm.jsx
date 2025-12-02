import React, { useState } from "react";
import { api } from "../../services/api";
import { Button } from "../landing/components/v0/ui/button";
import { Input } from "../landing/components/v0/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../landing/components/v0/ui/card";
import { useToast } from "../../context/ToastContext";
import { ShieldCheck, ArrowLeft, Loader2, Lock } from "lucide-react";

export function ResetPasswordForm({ token, onResetSuccess, onBackToLogin }) {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const { addToast } = useToast();

    const handleSubmit = async () => {
        if (!newPassword || !confirmPassword) {
            addToast("Por favor completa todos los campos", "error");
            return;
        }

        if (newPassword !== confirmPassword) {
            addToast("Las contraseñas no coinciden", "error");
            return;
        }

        if (newPassword.length < 8) {
            addToast("La contraseña debe tener al menos 8 caracteres", "error");
            return;
        }

        setLoading(true);
        try {
            await api.post("/api/auth/reset-password", {
                token,
                new_password: newPassword
            });
            setSuccess(true);
            addToast("Contraseña restablecida exitosamente", "success");
        } catch (err) {
            console.error("Error resetting password:", err);
            addToast(err.response?.data?.detail || "Error al restablecer la contraseña", "error");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-4 animate-in fade-in duration-700">
                <Card className="w-full max-w-md shadow-2xl border-border/50 bg-card/95 backdrop-blur-sm">
                    <CardHeader className="space-y-1 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                            <ShieldCheck className="h-8 w-8" />
                        </div>
                        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                            ¡Contraseña Actualizada!
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                            Tu contraseña ha sido restablecida correctamente.
                            Ya puedes iniciar sesión con tu nueva contraseña.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button
                            onClick={onResetSuccess}
                            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:shadow-emerald-500/25"
                            size="lg"
                        >
                            Ir al Inicio de Sesión
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
                        <Lock className="h-8 w-8" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                        Nueva Contraseña
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Ingresa tu nueva contraseña segura
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground ml-1">
                            NUEVA CONTRASEÑA
                        </label>
                        <Input
                            type="password"
                            placeholder="Mínimo 8 caracteres"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="bg-secondary/50"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground ml-1">
                            CONFIRMAR CONTRASEÑA
                        </label>
                        <Input
                            type="password"
                            placeholder="Repite la contraseña"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="bg-secondary/50"
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
                        size="lg"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Actualizando...
                            </>
                        ) : (
                            "Restablecer Contraseña"
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
