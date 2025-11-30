import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { PhoneInput } from "../../components/ui/PhoneInput";
import { useToast } from "../../context/ToastContext";
import { isValidPhoneNumber } from "react-phone-number-input";

export function ProfilePage({ onBack }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [phoneError, setPhoneError] = useState("");
    const [formData, setFormData] = useState({
        email: "",
        whatsapp_number: "",
        whatsapp_notifications_enabled: false,
    });
    const [passwordData, setPasswordData] = useState({
        current_password: "",
        new_password: "",
        confirm_password: "",
    });
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        loadUserProfile();
    }, []);

    const loadUserProfile = async () => {
        try {
            const res = await api.get("/api/auth/me");
            setUser(res.data);
            setFormData({
                email: res.data.email || "",
                whatsapp_number: res.data.whatsapp_number || "",
                whatsapp_notifications_enabled: res.data.whatsapp_notifications_enabled || false,
            });
        } catch (err) {
            console.error("Error loading profile:", err);
            addToast("Error al cargar perfil", "error");
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneChange = (value) => {
        setFormData({ ...formData, whatsapp_number: value || "" });
        setPhoneError("");

        if (value && !isValidPhoneNumber(value)) {
            setPhoneError("Número de teléfono inválido");
        }
    };

    const handleSaveProfile = async () => {
        // Validar WhatsApp si está presente
        if (formData.whatsapp_number && !isValidPhoneNumber(formData.whatsapp_number)) {
            addToast("Número de WhatsApp inválido", "error");
            setPhoneError("Número de teléfono inválido");
            return;
        }

        setSaving(true);
        try {
            const res = await api.put("/api/auth/me", {
                email: formData.email,
                whatsapp_number: formData.whatsapp_number || null,
                whatsapp_notifications_enabled: formData.whatsapp_notifications_enabled,
            });

            setUser(res.data.user);
            addToast("✅ Perfil actualizado exitosamente", "success");
        } catch (err) {
            console.error("Error saving profile:", err);
            const errorMsg = err.response?.data?.detail || "Error al actualizar perfil";
            addToast(errorMsg, "error");
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!passwordData.current_password || !passwordData.new_password) {
            addToast("Completa todos los campos de contraseña", "error");
            return;
        }

        if (passwordData.new_password !== passwordData.confirm_password) {
            addToast("Las contraseñas nuevas no coinciden", "error");
            return;
        }

        if (passwordData.new_password.length < 8) {
            addToast("La contraseña debe tener al menos 8 caracteres", "error");
            return;
        }

        setSaving(true);
        try {
            await api.put("/api/auth/me", {
                current_password: passwordData.current_password,
                new_password: passwordData.new_password,
            });

            setPasswordData({
                current_password: "",
                new_password: "",
                confirm_password: "",
            });
            setShowPasswordSection(false);
            addToast("✅ Contraseña actualizada exitosamente", "success");
        } catch (err) {
            console.error("Error changing password:", err);
            const errorMsg = err.response?.data?.detail || "Error al cambiar contraseña";
            addToast(errorMsg, "error");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: 24, textAlign: "center" }}>
                <p style={{ color: "#64748b" }}>Cargando perfil...</p>
            </div>
        );
    }

    return (
        <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
            {/* Botón de volver */}
            {onBack && (
                <Button
                    onClick={onBack}
                    variant="secondary"
                    style={{
                        padding: "8px 16px",
                        marginBottom: 24,
                        background: "transparent",
                        color: "#64748b",
                        border: "1px solid #e2e8f0",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                    }}
                >
                    ← Volver
                </Button>
            )}

            <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>
                Mi Perfil
            </h1>
            <p style={{ color: "#64748b", marginBottom: 32 }}>
                Administra tu información personal y configuración de notificaciones
            </p>

            {/* Información de cuenta */}
            <Card style={{ padding: 24, marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1e293b", marginBottom: 16 }}>
                    Información de Cuenta
                </h2>

                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>USUARIO</label>
                    <Input
                        value={user?.username || ""}
                        disabled
                        style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed" }}
                    />
                    <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                        El nombre de usuario no se puede cambiar
                    </p>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>EMAIL</label>
                    <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        style={inputStyle}
                    />
                </div>

                <Button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    style={{
                        background: "linear-gradient(to right, #10b981, #059669)",
                        padding: "12px 24px",
                    }}
                >
                    {saving ? "Guardando..." : "Guardar Cambios"}
                </Button>
            </Card>

            {/* Notificaciones de WhatsApp */}
            <Card style={{ padding: 24, marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1e293b", marginBottom: 16 }}>
                    Notificaciones de WhatsApp
                </h2>

                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>NÚMERO DE WHATSAPP</label>
                    <PhoneInput
                        value={formData.whatsapp_number}
                        onChange={handlePhoneChange}
                        placeholder="311 226 4829"
                        error={phoneError}
                    />
                    <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                        Selecciona tu país e ingresa tu número para recibir alertas
                    </p>
                </div>

                {formData.whatsapp_number && (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: 12,
                            background: formData.whatsapp_notifications_enabled ? "#f0fdf4" : "#fef2f2",
                            borderRadius: 8,
                            border: formData.whatsapp_notifications_enabled
                                ? "1px solid #86efac"
                                : "1px solid #fecaca",
                            marginBottom: 16,
                        }}
                    >
                        <input
                            type="checkbox"
                            id="whatsapp_notifications"
                            checked={formData.whatsapp_notifications_enabled}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    whatsapp_notifications_enabled: e.target.checked,
                                })
                            }
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
                                color: formData.whatsapp_notifications_enabled ? "#166534" : "#991b1b",
                                cursor: "pointer",
                                userSelect: "none",
                                fontWeight: 500,
                            }}
                        >
                            {formData.whatsapp_notifications_enabled
                                ? "✅ Recibir alertas por WhatsApp"
                                : "❌ Alertas de WhatsApp desactivadas"}
                        </label>
                    </div>
                )}

                <Button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    style={{
                        background: "linear-gradient(to right, #10b981, #059669)",
                        padding: "12px 24px",
                    }}
                >
                    {saving ? "Guardando..." : "Guardar Cambios"}
                </Button>
            </Card>

            {/* Cambiar contraseña */}
            <Card style={{ padding: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1e293b", marginBottom: 16 }}>
                    Seguridad
                </h2>

                {!showPasswordSection ? (
                    <Button
                        onClick={() => setShowPasswordSection(true)}
                        variant="secondary"
                        style={{
                            padding: "12px 24px",
                            background: "#f8fafc",
                            color: "#475569",
                            border: "1px solid #e2e8f0",
                        }}
                    >
                        Cambiar Contraseña
                    </Button>
                ) : (
                    <div>
                        <div style={{ marginBottom: 16 }}>
                            <label style={labelStyle}>CONTRASEÑA ACTUAL</label>
                            <Input
                                type="password"
                                value={passwordData.current_password}
                                onChange={(e) =>
                                    setPasswordData({ ...passwordData, current_password: e.target.value })
                                }
                                style={inputStyle}
                                placeholder="••••••••"
                            />
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <label style={labelStyle}>NUEVA CONTRASEÑA</label>
                            <Input
                                type="password"
                                value={passwordData.new_password}
                                onChange={(e) =>
                                    setPasswordData({ ...passwordData, new_password: e.target.value })
                                }
                                style={inputStyle}
                                placeholder="••••••••"
                            />
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <label style={labelStyle}>CONFIRMAR NUEVA CONTRASEÑA</label>
                            <Input
                                type="password"
                                value={passwordData.confirm_password}
                                onChange={(e) =>
                                    setPasswordData({ ...passwordData, confirm_password: e.target.value })
                                }
                                style={inputStyle}
                                placeholder="••••••••"
                            />
                        </div>

                        <div style={{ display: "flex", gap: 12 }}>
                            <Button
                                onClick={handleChangePassword}
                                disabled={saving}
                                style={{
                                    background: "linear-gradient(to right, #10b981, #059669)",
                                    padding: "12px 24px",
                                }}
                            >
                                {saving ? "Guardando..." : "Cambiar Contraseña"}
                            </Button>
                            <Button
                                onClick={() => {
                                    setShowPasswordSection(false);
                                    setPasswordData({
                                        current_password: "",
                                        new_password: "",
                                        confirm_password: "",
                                    });
                                }}
                                variant="secondary"
                                style={{
                                    padding: "12px 24px",
                                    background: "transparent",
                                    color: "#64748b",
                                    border: "1px solid #e2e8f0",
                                }}
                            >
                                Cancelar
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
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
