import React, { useState, useEffect } from "react";
import { api, frigateProxy, IS_DEVELOPMENT } from "../../services/api";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { useToast } from "../../context/ToastContext";

const STEPS = [
    { id: 1, title: "Bienvenido", description: "Configuración inicial del sistema" },
    { id: 2, title: "Agregar Cámara", description: "Configura tu primera cámara" },
    { id: 3, title: "Configurar WhatsApp", description: "Conecta con WhatsApp Business" },
    { id: 4, title: "Crear Primera Regla", description: "Define cuándo recibir alertas" },
    { id: 5, title: "¡Listo!", description: "Tu sistema está configurado" },
];

export function OnboardingWizard({ onComplete }) {
    const [currentStep, setCurrentStep] = useState(1);
    const [cameras, setCameras] = useState([]);
    const [objects, setObjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();

    // Formulario de cámara
    const [cameraForm, setCameraForm] = useState({
        name: "",
        ip: "",
        port: "554",
        username: "",
        password: "",
        stream_path: "/Streaming/Channels/101",
    });

    // Formulario de WhatsApp
    const [whatsappForm, setWhatsappForm] = useState({
        token: "",
        phone_id: "",
        phone_number: "",
    });

    // Formulario de regla
    const [ruleForm, setRuleForm] = useState({
        name: "",
        camera: "",
        label: [],
        min_score: "0.7",
    });

    useEffect(() => {
        checkSystemStatus();
        loadObjects();
    }, []);

    const checkSystemStatus = async () => {
        try {
            // Verificar si hay cámaras
            const camerasRes = await api.get("/api/cameras/");
            setCameras(camerasRes.data.cameras || []);
            
            // Si ya hay cámaras, saltar al paso 3
            if (camerasRes.data.cameras && camerasRes.data.cameras.length > 0) {
                setCurrentStep(3);
            }
        } catch (err) {
            console.error("Error verificando estado:", err);
        }
    };

    const loadObjects = async () => {
        try {
            let objectsRes;
            
            // Solo intentar usar el proxy local si estamos en desarrollo (localhost)
            if (IS_DEVELOPMENT) {
                try {
                    objectsRes = await frigateProxy.get("/api/frigate/objects");
                } catch (proxyError) {
                    objectsRes = await api.get("/api/frigate/objects");
                }
            } else {
                // En producción (Vercel), siempre usar el backend de Railway
                objectsRes = await api.get("/api/frigate/objects");
            }
            
            setObjects(objectsRes.data.objects || []);
        } catch (err) {
            console.error("Error cargando objetos:", err);
        }
    };

    const handleAddCamera = async () => {
        if (!cameraForm.name || !cameraForm.ip) {
            addToast("El nombre y la IP son obligatorios", "error");
            return;
        }

        setLoading(true);
        try {
            await api.post("/api/cameras/", {
                ...cameraForm,
                width: 1920,
                height: 1080,
                fps: 5,
                record_enabled: true,
                retain_days: 1,
            });
            
            // Reiniciar Frigate
            try {
                await api.post("/api/cameras/restart-frigate");
            } catch (e) {
                // Ignorar error de reinicio
            }
            
            addToast("Cámara agregada correctamente", "success");
            await checkSystemStatus();
            setCurrentStep(3);
        } catch (err) {
            addToast("Error agregando cámara", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSkipCamera = () => {
        setCurrentStep(3);
    };

    const handleSkipWhatsApp = () => {
        setCurrentStep(4);
    };

    const handleCreateRule = async () => {
        if (!ruleForm.name) {
            addToast("El nombre de la regla es obligatorio", "error");
            return;
        }

        setLoading(true);
        try {
            await api.post("/api/rules", {
                name: ruleForm.name,
                camera: ruleForm.camera || null,
                label: ruleForm.label.length > 0 ? ruleForm.label.join(",") : null,
                min_score: ruleForm.min_score ? parseFloat(ruleForm.min_score) : null,
                enabled: true,
            });
            addToast("Regla creada correctamente", "success");
            setCurrentStep(5);
        } catch (err) {
            addToast("Error creando regla", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSkipRule = () => {
        setCurrentStep(5);
    };

    const handleComplete = () => {
        localStorage.setItem("onboarding_completed", "true");
        if (onComplete) {
            onComplete();
        }
    };

    return (
        <div style={{
            minHeight: "100vh",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "40px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
        }}>
            <Card style={{ maxWidth: 800, width: "100%", padding: 40 }}>
                {/* Progress Bar */}
                <div style={{ marginBottom: 40 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                        {STEPS.map((step) => (
                            <div
                                key={step.id}
                                style={{
                                    flex: 1,
                                    textAlign: "center",
                                    padding: "0 5px",
                                }}
                            >
                                <div
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: "50%",
                                        background: currentStep >= step.id ? "#2563eb" : "#e2e8f0",
                                        color: currentStep >= step.id ? "#fff" : "#64748b",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        margin: "0 auto 8px",
                                        fontWeight: "bold",
                                        transition: "all 0.3s",
                                    }}
                                >
                                    {currentStep > step.id ? "✓" : step.id}
                                </div>
                                <div style={{ fontSize: 11, color: currentStep >= step.id ? "#2563eb" : "#64748b" }}>
                                    {step.title}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{
                        height: 4,
                        background: "#e2e8f0",
                        borderRadius: 2,
                        position: "relative",
                    }}>
                        <div style={{
                            height: "100%",
                            width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`,
                            background: "#2563eb",
                            borderRadius: 2,
                            transition: "width 0.3s",
                        }} />
                    </div>
                </div>

                {/* Step Content */}
                <div style={{ minHeight: 400 }}>
                    {currentStep === 1 && (
                        <div style={{ textAlign: "center" }}>
                            <h2 style={{ fontSize: 28, marginBottom: 16, color: "#1e293b" }}>
                                ¡Bienvenido al Sistema de Monitoreo! 🎉
                            </h2>
                            <p style={{ fontSize: 16, color: "#64748b", marginBottom: 32, lineHeight: 1.6 }}>
                                Este asistente te guiará paso a paso para configurar tu sistema de monitoreo
                                con detección inteligente y alertas por WhatsApp.
                            </p>
                            <div style={{ background: "#f1f5f9", padding: 24, borderRadius: 12, marginBottom: 32, textAlign: "left" }}>
                                <h3 style={{ fontSize: 18, marginBottom: 16 }}>¿Qué vamos a configurar?</h3>
                                <ul style={{ margin: 0, paddingLeft: 20, color: "#475569" }}>
                                    <li style={{ marginBottom: 8 }}>📷 Agregar tu primera cámara</li>
                                    <li style={{ marginBottom: 8 }}>💬 Conectar con WhatsApp Business</li>
                                    <li style={{ marginBottom: 8 }}>⚙️ Crear tu primera regla de alerta</li>
                                </ul>
                            </div>
                            <Button onClick={() => setCurrentStep(2)} style={{ padding: "12px 32px", fontSize: 16 }}>
                                Comenzar Configuración
                            </Button>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div>
                            <h2 style={{ fontSize: 24, marginBottom: 8, color: "#1e293b" }}>Agregar Primera Cámara</h2>
                            <p style={{ color: "#64748b", marginBottom: 24 }}>
                                Configura tu primera cámara IP. Necesitarás la IP, usuario y contraseña.
                            </p>
                            
                            <label style={labelStyle}>NOMBRE DE LA CÁMARA</label>
                            <Input
                                placeholder="Ej. cam_entrada"
                                value={cameraForm.name}
                                onChange={(e) => setCameraForm({ ...cameraForm, name: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                            />

                            <label style={labelStyle}>IP DE LA CÁMARA</label>
                            <Input
                                placeholder="Ej. 192.168.1.100"
                                value={cameraForm.ip}
                                onChange={(e) => setCameraForm({ ...cameraForm, ip: e.target.value })}
                            />

                            <div style={{ display: "flex", gap: 10 }}>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>USUARIO</label>
                                    <Input
                                        placeholder="admin"
                                        value={cameraForm.username}
                                        onChange={(e) => setCameraForm({ ...cameraForm, username: e.target.value })}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>CONTRASEÑA</label>
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        value={cameraForm.password}
                                        onChange={(e) => setCameraForm({ ...cameraForm, password: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                                <Button
                                    variant="secondary"
                                    onClick={handleSkipCamera}
                                    style={{ flex: 1 }}
                                >
                                    Saltar por ahora
                                </Button>
                                <Button
                                    onClick={handleAddCamera}
                                    disabled={loading || !cameraForm.name || !cameraForm.ip}
                                    style={{ flex: 1 }}
                                >
                                    {loading ? "Agregando..." : "Agregar Cámara"}
                                </Button>
                            </div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div>
                            <h2 style={{ fontSize: 24, marginBottom: 8, color: "#1e293b" }}>Configurar WhatsApp</h2>
                            <p style={{ color: "#64748b", marginBottom: 24 }}>
                                Conecta con WhatsApp Business API para recibir alertas. Puedes configurarlo más tarde desde la configuración.
                            </p>
                            
                            <div style={{ background: "#fef3c7", padding: 16, borderRadius: 8, marginBottom: 24, border: "1px solid #fcd34d" }}>
                                <p style={{ margin: 0, fontSize: 14, color: "#92400e" }}>
                                    <strong>💡 Nota:</strong> Necesitas tener una cuenta de WhatsApp Business API.
                                    Puedes obtener las credenciales desde{" "}
                                    <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb" }}>
                                        Facebook Developers
                                    </a>
                                </p>
                            </div>

                            <label style={labelStyle}>WHATSAPP TOKEN</label>
                            <Input
                                type="password"
                                placeholder="Tu token de WhatsApp Business API"
                                value={whatsappForm.token}
                                onChange={(e) => setWhatsappForm({ ...whatsappForm, token: e.target.value })}
                            />

                            <label style={labelStyle}>PHONE NUMBER ID</label>
                            <Input
                                placeholder="Tu Phone Number ID"
                                value={whatsappForm.phone_id}
                                onChange={(e) => setWhatsappForm({ ...whatsappForm, phone_id: e.target.value })}
                            />

                            <label style={labelStyle}>NÚMERO DE TELÉFONO</label>
                            <Input
                                placeholder="+521234567890"
                                value={whatsappForm.phone_number}
                                onChange={(e) => setWhatsappForm({ ...whatsappForm, phone_number: e.target.value })}
                            />

                            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                                <Button
                                    variant="secondary"
                                    onClick={handleSkipWhatsApp}
                                    style={{ flex: 1 }}
                                >
                                    Configurar más tarde
                                </Button>
                                <Button
                                    onClick={() => {
                                        // Guardar en .env (esto requeriría un endpoint adicional)
                                        addToast("Configura WhatsApp desde backend/.env", "info");
                                        setCurrentStep(4);
                                    }}
                                    style={{ flex: 1 }}
                                >
                                    Guardar
                                </Button>
                            </div>
                        </div>
                    )}

                    {currentStep === 4 && (
                        <div>
                            <h2 style={{ fontSize: 24, marginBottom: 8, color: "#1e293b" }}>Crear Primera Regla</h2>
                            <p style={{ color: "#64748b", marginBottom: 24 }}>
                                Crea una regla para recibir alertas cuando se detecten objetos en tus cámaras.
                            </p>
                            
                            <label style={labelStyle}>NOMBRE DE LA REGLA</label>
                            <Input
                                placeholder="Ej. Persona en Entrada"
                                value={ruleForm.name}
                                onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                            />

                            {cameras.length > 0 && (
                                <>
                                    <label style={labelStyle}>CÁMARA</label>
                                    <select
                                        value={ruleForm.camera}
                                        onChange={(e) => setRuleForm({ ...ruleForm, camera: e.target.value })}
                                        style={{
                                            width: "100%",
                                            padding: "8px 12px",
                                            marginBottom: 12,
                                            borderRadius: 8,
                                            border: "1px solid #cbd5e1",
                                            fontSize: "14px",
                                        }}
                                    >
                                        <option value="">Todas las cámaras</option>
                                        {cameras.map((cam) => (
                                            <option key={cam.name} value={cam.name}>
                                                {cam.name}
                                            </option>
                                        ))}
                                    </select>
                                </>
                            )}

                            <label style={labelStyle}>OBJETO A DETECTAR</label>
                            <select
                                value={ruleForm.label[0] || ""}
                                onChange={(e) => setRuleForm({ ...ruleForm, label: e.target.value ? [e.target.value] : [] })}
                                style={{
                                    width: "100%",
                                    padding: "8px 12px",
                                    marginBottom: 12,
                                    borderRadius: 8,
                                    border: "1px solid #cbd5e1",
                                    fontSize: "14px",
                                }}
                            >
                                <option value="">Seleccionar objeto</option>
                                {objects.map((obj) => (
                                    <option key={obj.value} value={obj.value}>
                                        {obj.label}
                                    </option>
                                ))}
                            </select>

                            <label style={labelStyle}>SCORE MÍNIMO</label>
                            <Input
                                type="number"
                                step="0.1"
                                placeholder="0.7"
                                value={ruleForm.min_score}
                                onChange={(e) => setRuleForm({ ...ruleForm, min_score: e.target.value })}
                            />

                            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                                <Button
                                    variant="secondary"
                                    onClick={handleSkipRule}
                                    style={{ flex: 1 }}
                                >
                                    Saltar
                                </Button>
                                <Button
                                    onClick={handleCreateRule}
                                    disabled={loading || !ruleForm.name}
                                    style={{ flex: 1 }}
                                >
                                    {loading ? "Creando..." : "Crear Regla"}
                                </Button>
                            </div>
                        </div>
                    )}

                    {currentStep === 5 && (
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 64, marginBottom: 24 }}>🎉</div>
                            <h2 style={{ fontSize: 28, marginBottom: 16, color: "#1e293b" }}>
                                ¡Configuración Completada!
                            </h2>
                            <p style={{ fontSize: 16, color: "#64748b", marginBottom: 32, lineHeight: 1.6 }}>
                                Tu sistema de monitoreo está listo para usar. Puedes comenzar a crear reglas
                                y recibir alertas por WhatsApp cuando se detecten objetos en tus cámaras.
                            </p>
                            <div style={{ background: "#f0fdf4", padding: 24, borderRadius: 12, marginBottom: 32, border: "1px solid #86efac" }}>
                                <h3 style={{ fontSize: 18, marginBottom: 16, color: "#166534" }}>Próximos pasos:</h3>
                                <ul style={{ margin: 0, paddingLeft: 20, color: "#166534", textAlign: "left" }}>
                                    <li style={{ marginBottom: 8 }}>Agregar más cámaras desde la pestaña "Cámaras"</li>
                                    <li style={{ marginBottom: 8 }}>Crear más reglas desde la pestaña "Reglas"</li>
                                    <li style={{ marginBottom: 8 }}>Ver eventos y activaciones en sus respectivas pestañas</li>
                                </ul>
                            </div>
                            <Button onClick={handleComplete} style={{ padding: "12px 32px", fontSize: 16 }}>
                                Ir al Panel Principal
                            </Button>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}

const labelStyle = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: "#94a3b8",
    marginBottom: 4,
    marginLeft: 2,
    textTransform: "uppercase",
};

