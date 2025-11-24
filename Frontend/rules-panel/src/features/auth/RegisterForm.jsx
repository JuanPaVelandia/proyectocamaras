import React, { useState } from "react";
import { api } from "../../services/api";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { useToast } from "../../context/ToastContext";
import { isValidPhoneNumber } from "react-phone-number-input";

export function RegisterForm({ onRegisterSuccess, onBackToLogin }) {
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

        // Validar si el número es válido
        if (value && !isValidPhoneNumber(value)) {
            setPhoneError("Número de teléfono inválido");
        }
    };

    const getStrengthColor = () => {
        if (passwordStrength <= 2) return "#ef4444";
        if (passwordStrength <= 3) return "#f59e0b";
        return "#10b981";
    };

    const getStrengthText = () => {
        if (passwordStrength <= 2) return "Débil";
        if (passwordStrength <= 3) return "Media";
        return "Fuerte";
    };

    const handleRegister = async () => {
        // Validaciones
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

        // Validar WhatsApp si está presente
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

            localStorage.setItem("adminToken", res.data.token);

            // Guardar datos del usuario en localStorage
            const userData = {
                username: res.data.username,
                email: res.data.email,
                whatsapp_number: res.data.whatsapp_number
            };
            localStorage.setItem("userData", JSON.stringify(userData));

            addToast(`¡Bienvenido, ${res.data.username}!`, "success");

            setTimeout(() => {
                onRegisterSuccess(res.data.token);
            }, 500);
        } catch (err) {
            console.error("❌ Error en registro:", err);
            let errorMsg = "Error al registrar usuario";

            if (err.response?.data?.detail) {
                const detail = err.response.data.detail;
                if (Array.isArray(detail)) {
                    // Si es un error de validación de FastAPI (lista de errores)
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
                    width: 420,
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
                            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                            borderRadius: 16,
                            margin: "0 auto 16px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: 28,
                            boxShadow: "0 10px 20px rgba(16, 185, 129, 0.3)",
                        }}
                    >
                        ✨
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
                        Crear Cuenta
                    </h2>
                    <p style={{ color: "#64748b", fontSize: 14, marginTop: 8 }}>
                        Únete a Frigate Panel
                    </p>
                </div>

                <div style={{ textAlign: "left" }}>
                    <label style={labelStyle}>USUARIO *</label>
                    <Input
                        placeholder="usuario123"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                        style={inputStyle}
                    />
                    <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, marginBottom: 12 }}>
                        Solo letras, números, guiones y guiones bajos
                    </p>

                    <label style={labelStyle}>EMAIL *</label>
                    <Input
                        placeholder="tu@email.com"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        style={inputStyle}
                    />

                    <label style={{ ...labelStyle, marginTop: 16 }}>CONTRASEÑA *</label>
                    <Input
                        placeholder="••••••••"
                        type="password"
                        value={formData.password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        style={inputStyle}
                    />
                    {formData.password && (
                        <div style={{ marginTop: 8, marginBottom: 12 }}>
                            <div style={{
                                display: "flex",
                                gap: 4,
                                marginBottom: 4,
                            }}>
                                {[...Array(5)].map((_, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            flex: 1,
                                            height: 4,
                                            borderRadius: 2,
                                            background: i < passwordStrength ? getStrengthColor() : "#e2e8f0",
                                            transition: "all 0.3s",
                                        }}
                                    />
                                ))}
                            </div>
                            <p style={{ fontSize: 11, color: getStrengthColor(), margin: 0 }}>
                                Fortaleza: {getStrengthText()}
                            </p>
                        </div>
                    )}

                    <label style={labelStyle}>CONFIRMAR CONTRASEÑA *</label>
                    <Input
                        placeholder="••••••••"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        style={inputStyle}
                    />

                    <label style={{ ...labelStyle, marginTop: 16 }}>WHATSAPP (Opcional)</label>
                    <PhoneInput
                        value={formData.whatsapp_number}
                        onChange={handlePhoneChange}
                        placeholder="311 226 4829"
                        error={phoneError}
                    />
                    <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, marginBottom: phoneError ? 8 : 4 }}>
                        Selecciona tu país e ingresa tu número para recibir alertas
                    </p>

                    {formData.whatsapp_number && (
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginTop: 12,
                            marginBottom: 12,
                            padding: "12px",
                            background: "#f0fdf4",
                            borderRadius: 8,
                            border: "1px solid #86efac",
                        }}>
                            <input
                                type="checkbox"
                                id="whatsapp_notifications"
                                checked={formData.whatsapp_notifications_enabled}
                                onChange={(e) => setFormData({ ...formData, whatsapp_notifications_enabled: e.target.checked })}
                                style={{
                                    width: 18,
                                    height: 18,
                                    cursor: "pointer",
                                    accentColor: "#10b981",
                                }}
                            />
                            <label
                                htmlFor="whatsapp_notifications"
                                style={{
                                    fontSize: 13,
                                    color: "#166534",
                                    cursor: "pointer",
                                    userSelect: "none",
                                    fontWeight: 500,
                                }}
                            >
                                ✅ Recibir alertas por WhatsApp
                            </label>
                        </div>
                    )}
                </div>

                <div style={{ marginTop: 32 }}>
                    <Button
                        onClick={handleRegister}
                        disabled={loading}
                        style={{
                            padding: 14,
                            fontSize: 16,
                            background: "linear-gradient(to right, #10b981, #059669)",
                            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                            transition: "transform 0.1s",
                            width: "100%",
                        }}
                    >
                        {loading ? "Creando cuenta..." : "Crear Cuenta"}
                    </Button>

                    <Button
                        onClick={onBackToLogin}
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
                        ¿Ya tienes cuenta? Inicia sesión
                    </Button>
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

const labelStyle = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#475569",
    marginBottom: 6,
    marginLeft: 4,
};

const inputStyle = {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    padding: "12px",
    fontSize: 15,
    transition: "all 0.2s",
};
