import React, { useState, useEffect } from "react";
import { api, frigateProxy } from "../../services/api";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { useToast } from "../../context/ToastContext";

export function CamerasSection() {
    const [cameras, setCameras] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingCamera, setEditingCamera] = useState(null);
    const { addToast } = useToast();
    const [reloadingFrigate, setReloadingFrigate] = useState(false);

    // Buscar cámaras (escaneo unicast simplificado)
    const [scanning, setScanning] = useState(false);
    const [discovered, setDiscovered] = useState([]); // [{ip, onvif_ports, rtsp_ports}]
    const [selectedFound, setSelectedFound] = useState(""); // value: `${ip}|${port}`

    const [form, setForm] = useState({
        name: "",
        ip: "",
        port: "554",
        username: "",
        password: "",
        stream_path: "/Streaming/Channels/101",
        width: "1920",
        height: "1080",
        fps: "5",
        record_enabled: true,
        retain_days: "1",
    });

    const loadCameras = async () => {
        setLoading(true);
        try {
            const res = await api.get("/api/cameras");
            setCameras(res.data.cameras || []);
        } catch (err) {
            console.error(err);
            addToast("Error cargando cámaras", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCameras();
    }, []);

    const resetForm = () => {
        setForm({
            name: "",
            ip: "",
            port: "554",
            username: "",
            password: "",
            stream_path: "/Streaming/Channels/101",
            width: "1920",
            height: "1080",
            fps: "5",
            record_enabled: true,
            retain_days: "1",
        });
        setEditingCamera(null);
    };

    const handleAddCamera = async () => {
        if (!form.name || !form.ip) {
            addToast("El nombre y la IP son obligatorios", "error");
            return;
        }

        try {
            await api.post("/api/cameras", form);
            addToast("Cámara agregada correctamente", "success");

            // Reiniciar Frigate para aplicar cambios
            try {
                const restartRes = await api.post("/api/cameras/restart-frigate");
                if (restartRes.data.status === "ok") {
                    addToast("Frigate reiniciado para aplicar cambios", "success");
                } else {
                    addToast(restartRes.data.message, "warning");
                }
            } catch (restartErr) {
                addToast("Cámara agregada. Reinicia Frigate manualmente: docker restart frigate", "warning");
            }

            // Además, recargar Frigate vía proxy (igual que el botón)
            try {
                await frigateProxy.post("/api/frigate/reload");
                addToast("Frigate recargado/reiniciado", "success");
            } catch (err) {
                console.warn("No se pudo recargar Frigate vía proxy", err);
            }

            await loadCameras();
            resetForm();
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.detail || "Error agregando cámara";
            addToast(`Error: ${errorMsg}`, "error");
        }
    };

    const handleDeleteCamera = async (cameraId) => {
        if (!window.confirm(`¿Estás seguro de que quieres eliminar esta cámara?`)) {
            return;
        }

        try {
            await api.delete(`/api/cameras/${cameraId}`);
            addToast("Cámara eliminada correctamente", "success");

            // Reiniciar Frigate
            try {
                const restartRes = await api.post("/api/cameras/restart-frigate");
                if (restartRes.data.status === "ok") {
                    addToast("Frigate reiniciado", "success");
                }
            } catch (restartErr) {
                addToast("Reinicia Frigate manualmente: docker restart frigate", "warning");
            }

            // Además, recargar Frigate vía proxy (igual que el botón)
            try {
                await frigateProxy.post("/api/frigate/reload");
                addToast("Frigate recargado/reiniciado", "success");
            } catch (err) {
                console.warn("No se pudo recargar Frigate vía proxy", err);
            }

            await loadCameras();
        } catch (err) {
            console.error(err);
            addToast("Error eliminando cámara", "error");
        }
    };

    // Plantillas pre-configuradas
    const templates = {
        hikvision: {
            stream_path: "/Streaming/Channels/101",
            port: "554",
        },
        dahua: {
            stream_path: "/cam/realmonitor?channel=1&subtype=0",
            port: "554",
        },
        generic: {
            stream_path: "/stream",
            port: "554",
        },
    };

    const applyTemplate = (templateName) => {
        const template = templates[templateName];
        setForm({ ...form, ...template });
    };

    const reloadFrigateCameras = async () => {
        setReloadingFrigate(true);
        try {
            await frigateProxy.post("/api/frigate/reload");
            addToast("Frigate recargado/reiniciado", "success");
        } catch (err) {
            console.error(err);
            addToast(`No se pudo recargar Frigate: ${err.response?.data?.detail || err.message}`, "error");
        } finally {
            setReloadingFrigate(false);
        }
    };

    const handleScan = async () => {
        setScanning(true);
        setDiscovered([]);
        setSelectedFound("");
        try {
            const res = await frigateProxy.post("/api/discovery/scan", {}, { timeout: 60000 });
            setDiscovered(res.data.devices || []);
            addToast(`Encontrados ${res.data.devices?.length || 0} posibles dispositivos`, "success");
        } catch (err) {
            console.error(err);
            addToast(`Error al escanear: ${err.response?.data?.detail || err.message}`, "error");
        } finally {
            setScanning(false);
        }
    };

    const guessAndPrefill = async (ip, port) => {
        try {
            const res = await frigateProxy.post("/api/rtsp/guess", {
                ip,
                ports: String(port),
                username: (form.username || ""),
                password: (form.password || ""),
                timeout_ms: 800,
                max_results: 6,
            }, { timeout: 20000 });
            const guesses = res.data.candidates || [];
            if (guesses.length) {
                const uri = guesses[0].uri;
                // extract path from rtsp://...
                try {
                    const afterHost = uri.split('//')[1].split('/').slice(1).join('/');
                    const path = '/' + afterHost;
                    setForm((f) => ({ ...f, ip, port: String(port), stream_path: path }));
                    addToast("Ruta de streaming sugerida completada", "success");
                } catch {
                    setForm((f) => ({ ...f, ip, port: String(port) }));
                }
            } else {
                setForm((f) => ({ ...f, ip, port: String(port) }));
                addToast("No se encontraron URLs RTSP; completa la ruta manualmente", "warning");
            }
        } catch (err) {
            console.error(err);
            setForm((f) => ({ ...f, ip, port: String(port) }));
            addToast(`Error buscando URLs: ${err.response?.data?.detail || err.message}`, "error");
        }
    };

    // (revert) No direct proxy reload from UI; backend endpoint will handle restart/reload

    return (
        <div
            className="grid-layout"
            style={{
                display: "grid",
                gridTemplateColumns: "minmax(350px, 1fr) minmax(400px, 2fr)",
                gap: "clamp(20px, 3vw, 32px)",
                alignItems: "start",
                width: "100%",
                maxWidth: "100%",
                minWidth: 0,
                boxSizing: "border-box",
                flex: "1 1 auto",
            }}
        >
            {/* (se removió sección de Buscar Cámaras para simplificar) */}

            {/* Formulario */}
            <div style={{ animation: "fadeIn 0.5s ease-out" }}>
                <Card style={{
                    position: "sticky",
                    top: "clamp(16px, 2vw, 24px)",
                    padding: "clamp(20px, 3vw, 32px)",
                }}>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 20,
                    }}>
                        <span style={{ fontSize: 22 }}>📷</span>
                        <h3 style={{
                            margin: 0,
                            fontSize: "clamp(18px, 2.5vw, 20px)",
                            fontWeight: 600,
                            color: "#0f172a",
                            letterSpacing: "-0.01em",
                        }}>
                            Agregar Cámara
                        </h3>
                    </div>

                    <label style={labelStyle}>NOMBRE DE LA CÁMARA</label>
                    <Input
                        placeholder="Ej. cam_entrada"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                    />
                    <div style={{
                        fontSize: 11,
                        color: "#f59e0b",
                        marginTop: 6,
                        marginBottom: 12,
                        padding: "8px 12px",
                        background: "#fffbeb",
                        border: "1px solid #fde68a",
                        borderRadius: 6,
                    }}>
                        <strong>⚠️ Importante:</strong> El nombre debe coincidir <strong>exactamente</strong> con el configurado en Frigate local.
                        <br />
                        <span style={{ fontSize: 10, color: "#92400e" }}>
                            Ejemplo: Si en tu archivo config.yml de Frigate tienes "cam_apto", usa ese mismo nombre aquí.
                        </span>
                    </div>

                    {/* Buscar cámaras simplificado */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0" }}>
                        <Button variant="secondary" onClick={handleScan} disabled={scanning}>
                            {scanning ? "🛰️ Buscando..." : "🛰️ Buscar cámaras"}
                        </Button>
                        {scanning && <span style={{ fontSize: 12, color: "#64748b" }}>Escaneando la red local...</span>}
                    </div>
                    {discovered.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                            <label style={labelStyle}>CÁMARAS DETECTADAS</label>
                            <select
                                value={selectedFound}
                                onChange={async (e) => {
                                    const val = e.target.value; // ip|port
                                    setSelectedFound(val);
                                    const [ip, port] = val.split('|');
                                    await guessAndPrefill(ip, port);
                                }}
                                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
                            >
                                <option value="">Selecciona una cámara</option>
                                {discovered.flatMap((d) => (d.rtsp_ports || []).map((p) => (
                                    <option key={`${d.ip}-${p}`} value={`${d.ip}|${p}`}>{d.ip} : {p}</option>
                                )))}
                            </select>
                        </div>
                    )}

                    <label style={labelStyle}>IP DE LA CÁMARA</label>
                    <Input
                        placeholder="Ej. 192.168.1.100"
                        value={form.ip}
                        onChange={(e) => setForm({ ...form, ip: e.target.value })}
                    />

                    <div style={{ display: "flex", gap: 10 }}>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>PUERTO</label>
                            <Input
                                placeholder="554"
                                value={form.port}
                                onChange={(e) => setForm({ ...form, port: e.target.value })}
                            />
                        </div>
                        <div style={{ flex: 2 }}>
                            <label style={labelStyle}>RUTA DEL STREAM</label>
                            <Input
                                placeholder="/Streaming/Channels/101"
                                value={form.stream_path}
                                onChange={(e) => setForm({ ...form, stream_path: e.target.value })}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                        <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>Plantillas comunes:</p>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <Button
                                variant="secondary"
                                onClick={() => applyTemplate("hikvision")}
                                style={{ fontSize: 12, padding: "6px 12px" }}
                            >
                                Hikvision
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => applyTemplate("dahua")}
                                style={{ fontSize: 12, padding: "6px 12px" }}
                            >
                                Dahua
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => applyTemplate("generic")}
                                style={{ fontSize: 12, padding: "6px 12px" }}
                            >
                                Genérica
                            </Button>
                        </div>
                    </div>

                    <label style={labelStyle}>USUARIO (Opcional)</label>
                    <Input
                        placeholder="admin"
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                    />

                    <label style={labelStyle}>CONTRASEÑA (Opcional)</label>
                    <Input
                        type="password"
                        placeholder="••••••••"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />

                    <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>ANCHO</label>
                            <Input
                                placeholder="1920"
                                value={form.width}
                                onChange={(e) => setForm({ ...form, width: e.target.value })}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>ALTO</label>
                            <Input
                                placeholder="1080"
                                value={form.height}
                                onChange={(e) => setForm({ ...form, height: e.target.value })}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>FPS</label>
                            <Input
                                placeholder="5"
                                value={form.fps}
                                onChange={(e) => setForm({ ...form, fps: e.target.value })}
                            />
                        </div>
                    </div>

                    <Button onClick={handleAddCamera} style={{ marginTop: 16, width: "100%" }}>
                        Agregar Cámara
                    </Button>
                </Card>
            </div>

            {/* Lista de Cámaras */}
            <div style={{ animation: "fadeIn 0.5s ease-out 0.2s", animationFillMode: "backwards" }}>
                <Card style={{ padding: "clamp(20px, 3vw, 32px)" }}>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "clamp(16px, 2vw, 24px)",
                        flexWrap: "wrap",
                        gap: 12,
                    }}>
                        <h3 style={{
                            margin: 0,
                            fontSize: "clamp(18px, 2.5vw, 22px)",
                            fontWeight: 600,
                            color: "#0f172a",
                            letterSpacing: "-0.01em",
                        }}>
                            Cámaras Configuradas
                        </h3>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Badge variant="neutral">{cameras.length} Total</Badge>
                            <Button variant="secondary" onClick={reloadFrigateCameras} disabled={reloadingFrigate}>
                                {reloadingFrigate ? "Recargando..." : "🔁 Recargar cámaras"}
                            </Button>
                        </div>
                    </div>
                    {loading && (
                        <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Cargando cámaras...</div>
                    )}
                    {!loading && cameras.length === 0 && (
                        <div style={{ textAlign: "center", padding: 40, color: "#64748b", border: "2px dashed #e2e8f0", borderRadius: 8 }}>
                            <p>No hay cámaras configuradas.</p>
                            <p style={{ fontSize: 13 }}>Usa el formulario de la izquierda para agregar la primera.</p>
                        </div>
                    )}
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
                        gap: "clamp(16px, 2vw, 20px)",
                        width: "100%",
                        maxWidth: "100%",
                        boxSizing: "border-box",
                    }}>
                        {cameras.map((camera) => (
                            <div
                                key={camera.name}
                                style={{
                                    border: "2px solid #cbd5e1",
                                    padding: "clamp(16px, 2vw, 24px)",
                                    borderRadius: 16,
                                    background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 12,
                                    transition: "all 0.3s ease",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "translateY(-2px)";
                                    e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.12)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "translateY(0)";
                                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
                                }}
                            >
                                {camera.last_snapshot && (
                                    <img
                                        src={`data:image/jpeg;base64,${camera.last_snapshot}`}
                                        alt={`Vista de ${camera.name}`}
                                        style={{
                                            width: "100%",
                                            height: "180px",
                                            objectFit: "cover",
                                            borderRadius: 8,
                                            marginBottom: 12,
                                        }}
                                    />
                                )}
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                        marginBottom: 12,
                                    }}>
                                        <span style={{ fontSize: 24 }}>📷</span>
                                        <strong style={{
                                            fontSize: "clamp(16px, 2.5vw, 18px)",
                                            color: "#1e293b",
                                            fontWeight: 700,
                                        }}>
                                            {camera.name}
                                        </strong>
                                    </div>
                                    {camera.last_event_time && (
                                        <div style={{
                                            fontSize: "clamp(11px, 1.8vw, 12px)",
                                            color: "#94a3b8",
                                            marginBottom: 8,
                                        }}>
                                            Última captura: {new Date(camera.last_event_time).toLocaleString()}
                                        </div>
                                    )}
                                    <div style={{
                                        fontSize: "clamp(12px, 2vw, 14px)",
                                        color: "#64748b",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 8,
                                    }}>
                                        <div>
                                            <strong style={{ color: "#475569" }}>RTSP:</strong>{" "}
                                            <span style={{
                                                fontFamily: "monospace",
                                                fontSize: "clamp(11px, 1.8vw, 13px)",
                                                wordBreak: "break-all",
                                            }}>
                                                {camera.rtsp_url ? camera.rtsp_url.replace(/:[^:@]*@/, ":****@") : "N/A"}
                                            </span>
                                        </div>
                                        {camera.detect && (
                                            <div style={{
                                                display: "flex",
                                                gap: 8,
                                                flexWrap: "wrap",
                                            }}>
                                                <Badge variant="neutral">
                                                    {camera.detect.width}x{camera.detect.height}
                                                </Badge>
                                                <Badge variant="neutral">
                                                    {camera.detect.fps} FPS
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    variant="secondary"
                                    style={{
                                        width: "100%",
                                        fontSize: "clamp(12px, 2vw, 14px)",
                                        padding: "10px 16px",
                                        background: "#fee2e2",
                                        color: "#991b1b",
                                        border: "1px solid #fecaca",
                                        marginTop: "auto",
                                    }}
                                    onClick={() => handleDeleteCamera(camera.id)}
                                >
                                    🗑️ Eliminar Cámara
                                </Button>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
            <style>
                {`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                `}
            </style>
        </div>
    );
}

const labelStyle = {
    display: "block",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#64748b",
    marginBottom: 6,
    marginLeft: 2,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    fontFamily: "var(--font-family-base)",
};
