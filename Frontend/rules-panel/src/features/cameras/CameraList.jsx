import React, { useState, useEffect } from "react";
import { api, frigateProxy } from "../../services/api";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { useToast } from "../../context/ToastContext";

export function CameraList({ onAddCamera, onEditCamera }) {
    const [cameras, setCameras] = useState([]);
    const [loading, setLoading] = useState(false);
    const [reloadingFrigate, setReloadingFrigate] = useState(false);
    const { addToast } = useToast();

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

    const handleDeleteCamera = async (cameraId, cameraName, cameraRtsp) => {
        if (!window.confirm(`¿Estás seguro de que quieres eliminar esta cámara?`)) {
            return;
        }

        try {
            // Eliminar primero de Frigate local (si es posible)
            try {
                await frigateProxy.post("/api/cameras/delete", { name: cameraName, rtsp_url: cameraRtsp || "" });
            } catch (e) {
                console.warn("No se pudo eliminar la cámara en Frigate local", e);
            }

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

    return (
        <div style={{ animation: "fadeIn 0.5s ease-out" }}>
            <Card style={{ padding: "clamp(20px, 3vw, 32px)" }}>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "clamp(16px, 2vw, 24px)",
                    flexWrap: "wrap",
                    gap: 12,
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <h3 style={{
                            margin: 0,
                            fontSize: "clamp(18px, 2.5vw, 22px)",
                            fontWeight: 600,
                            color: "#0f172a",
                            letterSpacing: "-0.01em",
                        }}>
                            Cámaras Configuradas
                        </h3>
                        <Badge variant="neutral">{cameras.length} Total</Badge>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Button variant="secondary" onClick={reloadFrigateCameras} disabled={reloadingFrigate}>
                            {reloadingFrigate ? "Recargando..." : "🔁 Recargar cámaras"}
                        </Button>
                        <Button
                            onClick={onAddCamera}
                            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/30 border-none font-semibold"
                        >
                            ➕ Agregar Cámara
                        </Button>
                    </div>
                </div>

                {loading && (
                    <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Cargando cámaras...</div>
                )}

                {!loading && cameras.length === 0 && (
                    <div style={{ textAlign: "center", padding: 60, color: "#64748b", border: "2px dashed #e2e8f0", borderRadius: 16, background: "#f8fafc" }}>
                        <div style={{ fontSize: 40, marginBottom: 16 }}>📷</div>
                        <p style={{ fontSize: 18, fontWeight: 500, color: "#334155", marginBottom: 8 }}>No hay cámaras configuradas</p>
                        <p style={{ fontSize: 14, marginBottom: 24 }}>Agrega tu primera cámara para comenzar a monitorear.</p>
                        <Button
                            onClick={onAddCamera}
                            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/30 border-none font-semibold"
                        >
                            ➕ Agregar Cámara
                        </Button>
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
                                border: "1px solid #cbd5e1",
                                padding: "0",
                                borderRadius: 16,
                                background: "#ffffff",
                                display: "flex",
                                flexDirection: "column",
                                overflow: "hidden",
                                transition: "all 0.3s ease",
                                boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "translateY(-4px)";
                                e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow = "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)";
                            }}
                        >
                            <div style={{ position: "relative", height: 160, background: "#f1f5f9" }}>
                                {camera.last_snapshot ? (
                                    <img
                                        src={`data:image/jpeg;base64,${camera.last_snapshot}`}
                                        alt={`Vista de ${camera.name}`}
                                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    />
                                ) : (
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8" }}>
                                        Sin vista previa
                                    </div>
                                )}
                                <div style={{
                                    position: "absolute",
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    padding: "40px 16px 12px",
                                    background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
                                    color: "white"
                                }}>
                                    <div style={{ fontWeight: 600, fontSize: 16, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>{camera.name}</div>
                                </div>
                            </div>

                            <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                                <div style={{ fontSize: 13, color: "#64748b" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                        <span>IP/RTSP:</span>
                                        <span style={{ fontFamily: "monospace", color: "#334155" }}>
                                            {(() => {
                                                try {
                                                    if (!camera.rtsp_url) return "N/A";
                                                    // Intentar parsear
                                                    const urlStr = camera.rtsp_url.includes("://") ? camera.rtsp_url : `rtsp://${camera.rtsp_url}`;
                                                    return new URL(urlStr.replace("rtsp://", "http://")).hostname;
                                                } catch (e) {
                                                    return camera.rtsp_url; // Fallback to raw string
                                                }
                                            })()}
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                        {camera.detect && (
                                            <>
                                                <Badge variant="neutral" style={{ fontSize: 11 }}>
                                                    {camera.detect.width}x{camera.detect.height}
                                                </Badge>
                                                <Badge variant="neutral" style={{ fontSize: 11 }}>
                                                    {camera.detect.fps} FPS
                                                </Badge>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div style={{ marginTop: "auto", display: "flex", gap: 8 }}>
                                    <Button
                                        variant="secondary"
                                        style={{ flex: 1 }}
                                        onClick={() => onEditCamera && onEditCamera(camera)}
                                        className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-emerald-300 hover:text-emerald-700"
                                    >
                                        ✏️ Editar
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        style={{
                                            flex: 1,
                                            background: "#fff1f2",
                                            color: "#e11d48",
                                            border: "1px solid #fecdd3",
                                        }}
                                        onClick={() => handleDeleteCamera(camera.id, camera.name, camera.rtsp_url)}
                                    >
                                        🗑️ Eliminar
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
