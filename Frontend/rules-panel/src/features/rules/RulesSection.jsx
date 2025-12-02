import React, { useState, useEffect } from "react";
import { api, frigateProxy, IS_DEVELOPMENT } from "../../services/api";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { useToast } from "../../context/ToastContext";

export function RulesSection() {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingRuleId, setEditingRuleId] = useState(null);
    const [cameras, setCameras] = useState([]);
    const [objects, setObjects] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [objectSearch, setObjectSearch] = useState("");
    const { addToast } = useToast();

    const [form, setForm] = useState({
        name: "",
        camera: "",
        label: [], // Ahora es un array para múltiples objetos
        frigate_type: "end",
        min_score: "",
        min_duration_seconds: "",
        custom_message: "",
        time_start_hour: "",
        time_start_minute: "",
        time_end_hour: "",
        time_end_minute: "",
        enabled: true,
    });

    const loadRules = async () => {
        setLoading(true);
        try {
            const res = await api.get("/api/rules");
            setRules(res.data.rules);
        } catch (err) {
            console.error(err);
            addToast("Error cargando reglas", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRules();
        loadFrigateOptions();
    }, []);

    const loadFrigateOptions = async () => {
        setLoadingOptions(true);
        try {
            let camerasRes, objectsRes;

            // Solo intentar usar el proxy local si estamos en desarrollo (localhost)
            // En producción (Vercel), NUNCA intentar usar el proxy local para evitar Mixed Content
            if (IS_DEVELOPMENT) {
                try {
                    // Intentar con el proxy local (solo en desarrollo)
                    camerasRes = await frigateProxy.get("/api/frigate/cameras");
                    objectsRes = await frigateProxy.get("/api/frigate/objects");
                    console.log("✅ Usando proxy local de Frigate");
                } catch (proxyError) {
                    // Si el proxy local no está disponible, usar el backend de Railway
                    console.log("⚠️ Proxy local no disponible, usando backend de Railway");
                    camerasRes = await api.get("/api/frigate/cameras");
                    objectsRes = await api.get("/api/frigate/objects");
                }
            } else {
                // En producción (Vercel), SIEMPRE usar el backend de Railway
                // NO intentar usar el proxy local para evitar errores de Mixed Content
                console.log("🌐 Producción: usando backend de Railway");

                // CAMBIO: Usar /api/cameras (configuración guardada) en lugar de /api/frigate/cameras (estado en vivo)
                // Esto es necesario porque en arquitectura híbrida el backend (nube) no puede ver al Frigate (local)
                const configCamerasRes = await api.get("/api/cameras");
                camerasRes = {
                    data: {
                        // La API /api/cameras devuelve objetos {name, rtsp_url...}, extraemos solo los nombres
                        cameras: configCamerasRes.data.cameras.map(c => c.name)
                    }
                };

                objectsRes = await api.get("/api/frigate/objects");
            }

            setCameras(camerasRes.data.cameras || []);
            setObjects(objectsRes.data.objects || []);
        } catch (err) {
            console.error("Error cargando opciones de Frigate:", err);
            addToast("Error cargando opciones de Frigate", "error");
        } finally {
            setLoadingOptions(false);
        }
    };

    const resetForm = () => {
        setForm({
            name: "",
            camera: "",
            label: [],
            frigate_type: "end",
            min_score: "",
            min_duration_seconds: "",
            custom_message: "",
            time_start_hour: "",
            time_start_minute: "",
            time_end_hour: "",
            time_end_minute: "",
            enabled: true,
        });
        setEditingRuleId(null);
    };

    // Convertir HH:MM a hora y minuto separados
    const parseTime = (timeStr) => {
        if (!timeStr) return { hour: "", minute: "" };
        const [hour, minute] = timeStr.split(":");
        return { hour: hour || "", minute: minute || "" };
    };

    // Convertir hora y minuto a HH:MM
    const formatTime = (hour, minute) => {
        if (!hour && !minute) return null;
        const h = hour || "00";
        const m = minute || "00";
        return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
    };

    const handleCreateRule = async () => {
        if (!form.name) {
            addToast("El nombre de la regla es obligatorio", "error");
            return;
        }
        try {
            const payload = {
                name: form.name,
                camera: form.camera || null,
                label: form.label.length > 0 ? form.label.join(",") : null, // Convertir array a string separado por comas
                frigate_type: form.frigate_type || null,
                min_score: form.min_score ? parseFloat(form.min_score.toString().replace(',', '.')) : null,
                min_duration_seconds: form.min_duration_seconds ? parseFloat(form.min_duration_seconds.toString().replace(',', '.')) : null,
                custom_message: form.custom_message || null,
                time_start: formatTime(form.time_start_hour, form.time_start_minute),
                time_end: formatTime(form.time_end_hour, form.time_end_minute),
                enabled: form.enabled,
            };
            await api.post("/api/rules", payload);
            addToast("Regla creada correctamente", "success");
            await loadRules();
            resetForm();
        } catch (err) {
            console.error(err);
            addToast("Error creando regla", "error");
        }
    };

    const handleEditRule = (rule) => {
        setEditingRuleId(rule.id);
        const timeStart = parseTime(rule.time_start);
        const timeEnd = parseTime(rule.time_end);
        setForm({
            name: rule.name || "",
            camera: rule.camera || "",
            label: rule.label ? rule.label.split(",").filter(l => l.trim()) : [], // Convertir string a array
            frigate_type: rule.frigate_type || "end",
            min_score: rule.min_score ? rule.min_score.toString() : "",
            min_duration_seconds: rule.min_duration_seconds ? rule.min_duration_seconds.toString() : "",
            custom_message: rule.custom_message || "",
            time_start_hour: timeStart.hour,
            time_start_minute: timeStart.minute,
            time_end_hour: timeEnd.hour,
            time_end_minute: timeEnd.minute,
            enabled: rule.enabled,
        });
        // Scroll al formulario
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleUpdateRule = async () => {
        if (!form.name) {
            addToast("El nombre de la regla es obligatorio", "error");
            return;
        }
        try {
            const payload = {
                name: form.name,
                camera: form.camera || null,
                label: form.label.length > 0 ? form.label.join(",") : null,
                frigate_type: form.frigate_type || null,
                min_score: form.min_score ? parseFloat(form.min_score.toString().replace(',', '.')) : null,
                min_duration_seconds: form.min_duration_seconds ? parseFloat(form.min_duration_seconds.toString().replace(',', '.')) : null,
                custom_message: form.custom_message || null,
                time_start: formatTime(form.time_start_hour, form.time_start_minute),
                time_end: formatTime(form.time_end_hour, form.time_end_minute),
                enabled: form.enabled,
            };
            await api.patch(`/api/rules/${editingRuleId}`, payload);
            addToast("Regla actualizada correctamente", "success");
            await loadRules();
            resetForm();
        } catch (err) {
            console.error(err);
            addToast("Error actualizando regla", "error");
        }
    };

    const handleDeleteRule = async (ruleId) => {
        if (!window.confirm("¿Estás seguro de que quieres eliminar esta regla?")) {
            return;
        }
        try {
            // Intentar primero con DELETE
            try {
                await api.delete(`/api/rules/${ruleId}`);
            } catch (deleteError) {
                // Si DELETE falla con "Method Not Allowed", usar POST como alternativa
                if (deleteError.response?.status === 405 || deleteError.message?.includes("Method Not Allowed")) {
                    console.log("DELETE no disponible, usando POST alternativo");
                    await api.post(`/api/rules/${ruleId}/delete`);
                } else {
                    throw deleteError;
                }
            }
            addToast("Regla eliminada correctamente", "success");
            await loadRules();
            if (editingRuleId === ruleId) {
                resetForm();
            }
        } catch (err) {
            console.error("Error eliminando regla:", err);
            const errorMessage = err.response?.data?.detail || err.message || "Error eliminando regla";
            addToast(`Error: ${errorMessage}`, "error");
        }
    };

    const toggleEnabled = async (rule) => {
        try {
            await api.patch(`/api/rules/${rule.id}`, { enabled: !rule.enabled });
            addToast(`Regla ${!rule.enabled ? "activada" : "desactivada"}`, !rule.enabled ? "success" : "info");
            await loadRules();
        } catch (err) {
            console.error(err);
            addToast("Error actualizando regla", "error");
        }
    };

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
                        justifyContent: "space-between",
                        marginBottom: 20,
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 22 }}>{editingRuleId ? "✏️" : "✨"}</span>
                            <h3 style={{
                                margin: 0,
                                fontSize: "clamp(18px, 2.5vw, 20px)",
                                fontWeight: 600,
                                color: "#0f172a",
                                letterSpacing: "-0.01em",
                            }}>
                                {editingRuleId ? "Editar Regla" : "Nueva Regla"}
                            </h3>
                        </div>
                        {editingRuleId && (
                            <Button
                                variant="secondary"
                                onClick={resetForm}
                                style={{ fontSize: 12, padding: "6px 12px" }}
                            >
                                Cancelar
                            </Button>
                        )}
                    </div>
                    <label style={labelStyle}>NOMBRE</label>
                    <Input placeholder="Ej. Persona en Entrada" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    <label style={labelStyle}>CÁMARA</label>
                    <select
                        value={form.camera}
                        onChange={(e) => setForm({ ...form, camera: e.target.value })}
                        style={{
                            width: "100%",
                            padding: "8px 12px",
                            marginBottom: 12,
                            borderRadius: 8,
                            border: "1px solid #cbd5e1",
                            fontSize: "14px",
                            outline: "none",
                            transition: "border-color 0.2s",
                            backgroundColor: "#fff",
                        }}
                    >
                        <option value="">Seleccionar cámara (opcional)</option>
                        {/* Defensive check for cameras array */}
                        {(cameras || []).map((cam) => (
                            <option key={cam} value={cam}>
                                {cam}
                            </option>
                        ))}
                    </select>
                    <label style={labelStyle}>OBJETOS</label>
                    <Input
                        placeholder="🔍 Buscar objetos..."
                        value={objectSearch}
                        onChange={(e) => setObjectSearch(e.target.value)}
                        style={{ marginBottom: 8 }}
                    />
                    <div
                        style={{
                            border: "1px solid #cbd5e1",
                            borderRadius: 8,
                            padding: "12px",
                            marginBottom: 12,
                            maxHeight: "250px",
                            overflowY: "auto",
                            backgroundColor: "#fff",
                        }}
                    >
                        {loadingOptions ? (
                            <div style={{ textAlign: "center", padding: 20, color: "#64748b" }}>
                                Cargando objetos...
                            </div>
                        ) : (objects || []).length === 0 ? (
                            <div style={{ textAlign: "center", padding: 20, color: "#64748b" }}>
                                No hay objetos disponibles
                            </div>
                        ) : (() => {
                            // Filtrar objetos según la búsqueda
                            const filteredObjects = (objects || []).filter((obj) => {
                                const searchLower = (objectSearch || "").toLowerCase();

                                // Handle if obj is just a string
                                if (typeof obj === 'string') {
                                    return obj.toLowerCase().includes(searchLower);
                                }

                                // Handle if obj is an object
                                const label = String(obj?.label || "");
                                const value = String(obj?.value || "");

                                return (
                                    label.toLowerCase().includes(searchLower) ||
                                    value.toLowerCase().includes(searchLower)
                                );
                            });

                            if (filteredObjects.length === 0) {
                                return (
                                    <div style={{ textAlign: "center", padding: 20, color: "#64748b" }}>
                                        No se encontraron objetos con "{objectSearch}"
                                    </div>
                                );
                            }

                            return (
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {filteredObjects.map((obj) => (
                                        <label
                                            key={obj.value}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 8,
                                                padding: "8px",
                                                borderRadius: 6,
                                                cursor: "pointer",
                                                transition: "background-color 0.2s",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = "#f1f5f9";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = "transparent";
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={form.label.includes(obj.value)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setForm({
                                                            ...form,
                                                            label: [...form.label, obj.value],
                                                        });
                                                    } else {
                                                        setForm({
                                                            ...form,
                                                            label: form.label.filter((l) => l !== obj.value),
                                                        });
                                                    }
                                                }}
                                                style={{
                                                    width: "18px",
                                                    height: "18px",
                                                    cursor: "pointer",
                                                    accentColor: "#2563eb",
                                                }}
                                            />
                                            <span style={{ fontSize: 14, color: "#1e293b", userSelect: "none" }}>
                                                {obj.label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                    {form.label.length > 0 && (
                        <p style={{ fontSize: 11, color: "#2563eb", marginTop: -8, marginBottom: 12 }}>
                            {form.label.length} objeto(s) seleccionado(s)
                        </p>
                    )}
                    {objectSearch && (
                        <p style={{ fontSize: 11, color: "#94a3b8", marginTop: -8, marginBottom: 12 }}>
                            Mostrando {(objects || []).filter((obj) => {
                                const searchLower = objectSearch.toLowerCase();
                                return (
                                    (obj.label || "").toLowerCase().includes(searchLower) ||
                                    (obj.value || "").toLowerCase().includes(searchLower)
                                );
                            }).length} de {(objects || []).length} objetos
                        </p>
                    )}
                    <div style={{ display: "flex", gap: 10 }}>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>SCORE MÍN.</label>
                            <Input placeholder="0.0 - 1.0" type="number" step="0.1" value={form.min_score} onChange={(e) => setForm({ ...form, min_score: e.target.value })} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>DURACIÓN (s)</label>
                            <Input placeholder="Segundos" type="number" value={form.min_duration_seconds} onChange={(e) => setForm({ ...form, min_duration_seconds: e.target.value })} />
                        </div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <label style={labelStyle}>HORA INICIO</label>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <select
                                value={form.time_start_hour}
                                onChange={(e) => setForm({ ...form, time_start_hour: e.target.value })}
                                style={{
                                    flex: 1,
                                    padding: "8px 12px",
                                    borderRadius: 8,
                                    border: "1px solid #cbd5e1",
                                    fontSize: "14px",
                                    outline: "none",
                                    backgroundColor: "#fff",
                                }}
                            >
                                <option value="">Hora</option>
                                {Array.from({ length: 24 }, (_, i) => (
                                    <option key={i} value={i.toString().padStart(2, "0")}>
                                        {i.toString().padStart(2, "0")}
                                    </option>
                                ))}
                            </select>
                            <span style={{ fontSize: 18, color: "#64748b" }}>:</span>
                            <select
                                value={form.time_start_minute}
                                onChange={(e) => setForm({ ...form, time_start_minute: e.target.value })}
                                style={{
                                    flex: 1,
                                    padding: "8px 12px",
                                    borderRadius: 8,
                                    border: "1px solid #cbd5e1",
                                    fontSize: "14px",
                                    outline: "none",
                                    backgroundColor: "#fff",
                                }}
                            >
                                <option value="">Min</option>
                                {[0, 15, 30, 45].map((m) => (
                                    <option key={m} value={m.toString().padStart(2, "0")}>
                                        {m.toString().padStart(2, "0")}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, marginBottom: 12 }}>
                            Dejar vacío para siempre activo
                        </p>
                    </div>
                    <div>
                        <label style={labelStyle}>HORA FIN</label>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <select
                                value={form.time_end_hour}
                                onChange={(e) => setForm({ ...form, time_end_hour: e.target.value })}
                                style={{
                                    flex: 1,
                                    padding: "8px 12px",
                                    borderRadius: 8,
                                    border: "1px solid #cbd5e1",
                                    fontSize: "14px",
                                    outline: "none",
                                    backgroundColor: "#fff",
                                }}
                            >
                                <option value="">Hora</option>
                                {Array.from({ length: 24 }, (_, i) => (
                                    <option key={i} value={i.toString().padStart(2, "0")}>
                                        {i.toString().padStart(2, "0")}
                                    </option>
                                ))}
                            </select>
                            <span style={{ fontSize: 18, color: "#64748b" }}>:</span>
                            <select
                                value={form.time_end_minute}
                                onChange={(e) => setForm({ ...form, time_end_minute: e.target.value })}
                                style={{
                                    flex: 1,
                                    padding: "8px 12px",
                                    borderRadius: 8,
                                    border: "1px solid #cbd5e1",
                                    fontSize: "14px",
                                    outline: "none",
                                    backgroundColor: "#fff",
                                }}
                            >
                                <option value="">Min</option>
                                {[0, 15, 30, 45].map((m) => (
                                    <option key={m} value={m.toString().padStart(2, "0")}>
                                        {m.toString().padStart(2, "0")}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, marginBottom: 12 }}>
                            Dejar vacío para siempre activo
                        </p>
                    </div>
                    <label style={labelStyle}>MENSAJE PERSONALIZADO (OPCIONAL)</label>
                    <textarea
                        placeholder="Ej: 🚨 {label} detectado en {camera} con {score}% de confianza"
                        value={form.custom_message}
                        onChange={(e) => setForm({ ...form, custom_message: e.target.value })}
                        rows={3}
                        style={{
                            width: "100%",
                            padding: "10px",
                            borderRadius: "6px",
                            border: "1px solid #e2e8f0",
                            fontSize: "14px",
                            fontFamily: "inherit",
                            resize: "vertical",
                            marginBottom: "8px",
                        }}
                    />
                    <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, marginBottom: 12 }}>
                        Variables disponibles: {'{camera}'}, {'{label}'}, {'{score}'}, {'{duration}'}, {'{event_id}'}, {'{rule_name}'}
                    </p>
                    <Button
                        onClick={editingRuleId ? handleUpdateRule : handleCreateRule}
                        style={{ marginTop: 8 }}
                    >
                        {editingRuleId ? "Actualizar Regla" : "Crear Regla"}
                    </Button>
                </Card>
            </div>

            {/* Lista */}
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
                            Mis Reglas
                        </h3>
                        <Badge variant="neutral">{rules.length} Total</Badge>
                    </div>
                    {loading && (
                        <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Cargando reglas...</div>
                    )}
                    {!loading && rules.length === 0 && (
                        <div style={{ textAlign: "center", padding: 40, color: "#64748b", border: "2px dashed #e2e8f0", borderRadius: 8 }}>
                            <p>No tienes reglas configuradas.</p>
                            <p style={{ fontSize: 13 }}>Usa el formulario de la izquierda para crear la primera.</p>
                        </div>
                    )}
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 350px), 1fr))",
                        gap: "clamp(16px, 2vw, 20px)",
                        width: "100%",
                        maxWidth: "100%",
                        boxSizing: "border-box",
                    }}>
                        {(rules || []).map((rule) => (
                            <div
                                key={rule.id}
                                style={{
                                    border: "2px solid",
                                    borderColor: rule.enabled ? "#cbd5e1" : "#e2e8f0",
                                    padding: "clamp(16px, 2vw, 24px)",
                                    borderRadius: 16,
                                    background: rule.enabled
                                        ? "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)"
                                        : "#f8fafc",
                                    opacity: rule.enabled ? 1 : 0.7,
                                    transition: "all 0.3s ease",
                                    boxShadow: rule.enabled
                                        ? "0 4px 12px rgba(0,0,0,0.08)"
                                        : "0 2px 4px rgba(0,0,0,0.04)",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 12,
                                }}
                                onMouseEnter={(e) => {
                                    if (rule.enabled) {
                                        e.currentTarget.style.transform = "translateY(-2px)";
                                        e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.12)";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (rule.enabled) {
                                        e.currentTarget.style.transform = "translateY(0)";
                                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
                                    }
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                        marginBottom: 12,
                                        flexWrap: "wrap",
                                    }}>
                                        <strong style={{
                                            fontSize: "clamp(16px, 2.5vw, 18px)",
                                            color: "#1e293b",
                                            fontWeight: 700,
                                        }}>
                                            {rule.name}
                                        </strong>
                                        <Badge variant={rule.enabled ? "success" : "neutral"}>
                                            {rule.enabled ? "ACTIVA" : "INACTIVA"}
                                        </Badge>
                                    </div>
                                    <div style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 8,
                                        fontSize: "clamp(12px, 2vw, 14px)",
                                        color: "#64748b",
                                    }}>
                                        {rule.camera && (
                                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>📷 {rule.camera}</span>
                                        )}
                                        {rule.label && (
                                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                👤 {(rule.label || "").split(",").map(l => {
                                                    const obj = (objects || []).find(o => o.value === l.trim());
                                                    return obj ? obj.label : l.trim();
                                                }).join(", ")}
                                            </span>
                                        )}
                                        {(rule.min_score || rule.min_duration_seconds) && (
                                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                ⚙️ {rule.min_score ? `>${rule.min_score}` : ""}{rule.min_duration_seconds ? ` ${rule.min_duration_seconds}s` : ""}
                                            </span>
                                        )}
                                        {(rule.time_start || rule.time_end) && (
                                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                🕐 {
                                                    rule.time_start && rule.time_end
                                                        ? `${rule.time_start} - ${rule.time_end}`
                                                        : rule.time_start
                                                            ? `Desde ${rule.time_start}`
                                                            : `Hasta ${rule.time_end}`
                                                }
                                            </span>
                                        )}
                                        {rule.custom_message && (
                                            <div style={{ marginTop: 4, fontSize: 13, color: "#64748b", width: "100%" }}>
                                                <strong>Mensaje:</strong> {rule.custom_message}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div style={{
                                    display: "flex",
                                    gap: 8,
                                    flexWrap: "wrap",
                                    marginTop: "auto",
                                    paddingTop: 12,
                                    borderTop: "1px solid #e2e8f0",
                                }}>
                                    <Button
                                        variant="secondary"
                                        style={{
                                            flex: "1 1 auto",
                                            minWidth: "80px",
                                            fontSize: "clamp(11px, 1.8vw, 13px)",
                                            padding: "8px 12px",
                                            background: "#dbeafe",
                                            color: "#1e40af",
                                            border: "1px solid #bfdbfe",
                                        }}
                                        onClick={() => handleEditRule(rule)}
                                    >
                                        ✏️ Editar
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        style={{
                                            flex: "1 1 auto",
                                            minWidth: "80px",
                                            fontSize: "clamp(11px, 1.8vw, 13px)",
                                            padding: "8px 12px",
                                            background: rule.enabled ? "#fee2e2" : "#dcfce7",
                                            color: rule.enabled ? "#991b1b" : "#166534",
                                            border: rule.enabled ? "1px solid #fecaca" : "1px solid #bbf7d0",
                                        }}
                                        onClick={() => toggleEnabled(rule)}
                                    >
                                        {rule.enabled ? "⏸️ Desactivar" : "▶️ Activar"}
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        style={{
                                            flex: "1 1 auto",
                                            minWidth: "80px",
                                            fontSize: "clamp(11px, 1.8vw, 13px)",
                                            padding: "8px 12px",
                                            background: "#fee2e2",
                                            color: "#991b1b",
                                            border: "1px solid #fecaca",
                                        }}
                                        onClick={() => handleDeleteRule(rule.id)}
                                    >
                                        🗑️ Eliminar
                                    </Button>
                                </div>
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
                @media (max-width: 768px) {
                    div[style*="gridTemplateColumns"] {
                        grid-template-columns: 1fr !important;
                    }
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
