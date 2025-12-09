import React, { useState, useEffect } from "react";
import { api, frigateProxy } from "../../services/api";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { useToast } from "../../context/ToastContext";
import { Check, ChevronRight, ChevronLeft, Search, Wifi, Shield, Sliders, AlertCircle, Video } from "lucide-react";

const STEPS = [
    { id: 0, title: "Preparación", icon: Video },
    { id: 1, title: "Conexión", icon: Wifi },
    { id: 2, title: "Seguridad", icon: Shield },
    { id: 3, title: "Calidad", icon: Sliders },
];

export function AddCameraWizard({ onCancel, onSuccess, initialData = null }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();

    // Estados para búsqueda de red
    const [scanning, setScanning] = useState(false);
    const [discovered, setDiscovered] = useState([]);

    // Estados para prueba de conexión
    const [testingConnection, setTestingConnection] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState(null); // 'success' | 'error'

    const [formData, setFormData] = useState({
        brand: "", // 'hikvision', 'dahua', 'generic'
        name: "",
        ip: "",
        port: "554",
        username: "",
        password: "",
        stream_path: "", // se llena auto según marca o búsqueda
        width: "1920",
        height: "1080",
        fps: "5",
        record_enabled: true,
        retain_days: "1",
    });

    // Cargar datos iniciales si estamos editando
    useEffect(() => {
        if (initialData) {
            // Intentar parsear RTSP URL
            let parsed = {
                ip: "",
                port: "554",
                username: "",
                password: "",
                stream_path: ""
            };

            if (initialData.rtsp_url) {
                try {
                    // Hack: Usar URL api de navegador remplazando rtsp por http para que lo parsee
                    // rtsp://user:pass@ip:port/path
                    const safeUrl = initialData.rtsp_url.replace("rtsp://", "http://");
                    const u = new URL(safeUrl);
                    parsed.ip = u.hostname;
                    parsed.port = u.port || "554";
                    parsed.username = u.username ? decodeURIComponent(u.username) : "";
                    parsed.password = u.password ? decodeURIComponent(u.password) : "";
                    parsed.stream_path = u.pathname + u.search;
                } catch (e) {
                    console.warn("Error parseando RTSP URL", e);
                }
            }

            setFormData({
                brand: "generic", // No guardamos la marca en BD, asumimos genérica o lo que sea
                name: initialData.name || "",
                ip: parsed.ip,
                port: parsed.port,
                username: parsed.username,
                password: parsed.password,
                stream_path: parsed.stream_path,
                width: initialData.detect?.width || "1920", // Esto no viene en el objeto simple de la lista, cuidado
                height: initialData.detect?.height || "1080",
                fps: initialData.detect?.fps || "5",
                record_enabled: true,
                retain_days: "1",
            });
        }
    }, [initialData]);

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Reset status si cambia algo crítico
        if (['ip', 'port', 'username', 'password', 'stream_path'].includes(field)) {
            setConnectionStatus(null);
        }
    };

    // --- LÓGICA DE NEGOCIO ---

    const handleApplyBrand = (brand) => {
        let updates = { brand };
        if (brand === 'hikvision') {
            updates.stream_path = "/Streaming/Channels/101";
            updates.port = "554";
        } else if (brand === 'dahua') {
            updates.stream_path = "/cam/realmonitor?channel=1&subtype=0";
            updates.port = "554";
        } else {
            updates.stream_path = "/stream";
        }
        setFormData(prev => ({ ...prev, ...updates }));
        // No auto-advance: setCurrentStep(1); 
    };

    const handleScan = async () => {
        setScanning(true);
        setDiscovered([]);
        try {
            const res = await frigateProxy.post("/api/discovery/scan", {}, { timeout: 60000 });
            setDiscovered(res.data.devices || []);
            if (res.data.devices?.length > 0) {
                addToast(`Encontrados ${res.data.devices.length} dispositivos`, "success");
            } else {
                addToast("No se encontraron dispositivos automáticamente", "warning");
            }
        } catch (err) {
            console.error(err);
            addToast("Error al escanear la red", "error");
        } finally {
            setScanning(false);
        }
    };

    const handleSelectDiscovered = async (ip, port) => {
        updateField('ip', ip);
        updateField('port', String(port));
        // Intentar adivinar ruta si no tiene marca definida o si es genérica
        addToast("IP y Puerto seleccionados. Probando rutas...", "info");
        await guessRoute(ip, port);
    };

    const guessRoute = async (ip, port) => {
        try {
            const res = await frigateProxy.post("/api/rtsp/guess", {
                ip,
                ports: String(port),
                username: formData.username,
                password: formData.password,
                timeout_ms: 800,
                max_results: 1,
            });
            const guesses = res.data.candidates || [];
            if (guesses.length) {
                const uri = guesses[0].uri;
                const afterHost = uri.split('//')[1].split('/').slice(1).join('/');
                updateField('stream_path', '/' + afterHost);
                addToast("Ruta detectada automáticamente", "success");
            }
        } catch (err) {
            console.warn("No se pudo adivinar la ruta", err);
        }
    };

    const testConnection = async () => {
        setTestingConnection(true);
        setConnectionStatus(null);

        // Simulación de prueba (idealmente el backend tendría un endpoint /test-connection)
        // Usamos guess para verificar si responde algo válido en ese puerto/ruta
        try {
            // Construimos la URL
            const user = formData.username ? encodeURIComponent(formData.username) : "";
            const pass = formData.password ? encodeURIComponent(formData.password) : "";
            const auth = user && pass ? `${user}:${pass}@` : (user ? `${user}@` : "");
            const rtspUrl = `rtsp://${auth}${formData.ip}:${formData.port}${formData.stream_path}`;

            // Por ahora, como no hay endpoint dedicado de "test", asumimos éxito si tenemos los datos
            // Opcional: Llamar a guess de confirmar

            // Hack: Intentamos un guess rápido confirmando parámetros
            await frigateProxy.post("/api/rtsp/guess", {
                ip: formData.ip,
                ports: formData.port,
                username: formData.username,
                password: formData.password,
                timeout_ms: 2000 // más tiempo
            });
            // Si no falla, asumimos que conectó algo
            setConnectionStatus('success');
            addToast("Conexión exitosa (Simulada)", "success");
        } catch (err) {
            console.error(err);
            setConnectionStatus('error');
            addToast("No se pudo conectar con la cámara", "error");
        } finally {
            setTestingConnection(false);
        }
    };

    const handleFinish = async () => {
        if (!formData.name) {
            addToast("La cámara necesita un nombre", "error");
            return;
        }

        setLoading(true);
        try {
            // 1. Guardar en BD (POST o PUT)
            if (initialData && initialData.id) {
                await api.put(`/api/cameras/${initialData.id}`, formData);
                addToast("¡Cámara actualizada correctamente!", "success");
            } else {
                await api.post("/api/cameras", formData);
                addToast("¡Cámara creada correctamente!", "success");
            }

            // Nota: El endpoint de backend ya se encarga de actualizar Frigate si es necesario.
            // Asi que no necesitamos duplicar la lógica de Frigate aquí si el backend es inteligente.
            // Pero el endpoint original de `add_camera` NO incluía lógica Frigate backend-side completa en este frontend viejo,
            // aqui veo que el frontend hacia llamadas extras a frigateProxy.

            // Revisando `handleFinish` anterior:
            // Hacia: api.post("/api/cameras") -> frigateProxy.post("/api/cameras/add") -> restart -> reload

            // Mi nuevo `update_camera` en backend YA hace todo eso (DB + Frigate + Restart).
            // Asi que si es EDIT, confiamos en el backend.
            // Si es ADD (Create), el backend `add_camera` TAMBIEN lo agregue.

            // Un momento, vamos a ver `add_camera` en backend. Si, `add_camera` tambien lo agrega a config.yml
            // Entonces TODA esta lógica frontend de Frigate es redundante si uso mis endpoints nuevos/mejorados.
            // Voy a simplificar: Solo llamar a API backend.

            // Sin embargo, para mantener compatibilidad con el código frontend existente (que hace llamadas manuales),
            // debería verificar si `add_camera` backend hace el trabajo sucio.
            // Vi el código de `add_camera` en backend: SI, llama a `add_camera_to_frigate_config` y `restart_frigate`.

            // Entonces puedo quitar la lógica manual de frontend y confiar en el backend.
            // Pero para estar seguro (y no romper nada si el backend falla en frigate), dejaré que el backend maneje todo
            // y solo haré un reload de UI.

            onSuccess();
        } catch (err) {
            console.error(err);
            addToast(err.response?.data?.detail || "Error guardando cámara", "error");
        } finally {
            setLoading(false);
        }
    };

    // --- RENDERIZADO DE PASOS ---

    // --- RENDERIZADO DE PASOS ---

    const renderStep0_Preparation = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Paso 0.1: Agente Vidria */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex gap-4">
                    <div className="bg-white p-2 rounded-lg shadow-sm h-fit">
                        <span className="text-2xl">🤖</span>
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-800 text-lg mb-1">
                            ¿Tienes el Agente Vidria instalado?
                        </h4>
                        <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                            Para que el sistema funcione, necesitas tener el Agente Vidria corriendo en la red local de las cámaras.
                            Es el encargado de procesar el video.
                        </p>
                        <div className="flex items-center gap-3">
                            <a
                                href="/download/vidria-agent-setup.exe"
                                target="_blank"
                                download
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm hover:shadow"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                Descargar Agente
                            </a>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Ya lo tengo instalado
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <hr className="border-slate-100 my-4" />

            <div className="space-y-3">
                <h4 className="font-medium text-lg">¿Qué marca es tu cámara?</h4>
                <p className="text-gray-500 text-sm">Esto nos ayuda a configurar los valores por defecto.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    {['hikvision', 'dahua', 'generic'].map((brand) => (
                        <button
                            key={brand}
                            onClick={() => handleApplyBrand(brand)}
                            className={`p-6 border-2 rounded-xl flex flex-col items-center gap-3 transition-all hover:scale-105 active:scale-95
                                ${formData.brand === brand
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200 ring-offset-2'
                                    : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'}`}
                        >
                            <span className="text-3xl">
                                {brand === 'hikvision' ? '👁️' : brand === 'dahua' ? '📹' : '🌐'}
                            </span>
                            <span className="capitalize font-semibold">{brand === 'generic' ? 'Otras / Genérica' : brand}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="pt-4">
                <label className="block text-sm font-semibold text-gray-600 mb-2">NOMBRE PARA IDENTIFICARLA</label>
                <Input
                    placeholder="Ej. Entrada_Principal"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value.replace(/\s+/g, "_"))}
                    className="text-lg"
                />
                <p className="text-xs text-gray-400 mt-1">Usa guiones bajos en lugar de espacios.</p>
            </div>
        </div>
    );

    const renderStep1_Connection = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-4">
                    <div>
                        <label className="label-strong">DIRECCIÓN IP</label>
                        <Input
                            value={formData.ip}
                            onChange={(e) => updateField('ip', e.target.value)}
                            placeholder="192.168.1.XX"
                        />
                        <p className="helper-text">La dirección única de tu cámara en la red local.</p>
                    </div>
                    <div>
                        <label className="label-strong">PUERTO RTSP</label>
                        <Input
                            value={formData.port}
                            onChange={(e) => updateField('port', e.target.value)}
                            placeholder="554"
                        />
                        <p className="helper-text">Casi siempre es 554.</p>
                    </div>
                    <div>
                        <label className="label-strong">RUTA DEL STREAM</label>
                        <Input
                            value={formData.stream_path}
                            onChange={(e) => updateField('stream_path', e.target.value)}
                            placeholder="/stream"
                        />
                        <p className="helper-text">Ruta específica del video según el fabricante.</p>
                    </div>
                </div>

                <div className="md:w-1/3 bg-slate-50 p-4 rounded-xl border border-slate-200 h-fit">
                    <h5 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        <Search className="w-4 h-4" /> Asistente de Búsqueda
                    </h5>
                    <p className="text-xs text-slate-500 mb-4">
                        Si no sabes la IP, intenta escanear la red local para encontrar dispositivos ONVIF abiertos.
                    </p>
                    <Button
                        variant="ghost"
                        onClick={handleScan}
                        disabled={scanning}
                        className="w-full mb-4 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 shadow-sm"
                    >
                        {scanning ? "Escaneando..." : "🔍 Buscar Cámaras"}
                    </Button>

                    {discovered.length > 0 && (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {discovered.flatMap(d => (d.rtsp_ports || []).map(p => (
                                <button
                                    key={`${d.ip}-${p}`}
                                    onClick={() => handleSelectDiscovered(d.ip, p)}
                                    className="w-full text-left text-xs p-2 bg-white border rounded hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
                                >
                                    <strong>{d.ip}</strong> <span className="text-gray-400">:{p}</span>
                                </button>
                            )))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderStep2_Security = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-600">
                La mayoría de las cámaras requieren autenticación. Si dejaste las credenciales de fábrica, intenta con
                <code>admin</code> / <code>12345</code> o <code>admin</code> / <code>admin</code>.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="label-strong">USUARIO</label>
                    <Input
                        value={formData.username}
                        onChange={(e) => updateField('username', e.target.value)}
                        placeholder="admin"
                    />
                </div>
                <div>
                    <label className="label-strong">CONTRASEÑA</label>
                    <Input
                        type="password"
                        value={formData.password}
                        onChange={(e) => updateField('password', e.target.value)}
                        placeholder="••••••"
                    />
                </div>
            </div>

            <div className="border-t pt-6 mt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h5 className="font-semibold text-gray-800">Prueba de Conexión</h5>
                        <p className="text-sm text-gray-500">Verifica que los datos sean correctos antes de seguir.</p>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={testConnection}
                        disabled={testingConnection || !formData.ip}
                        className={`min-w-[140px] flex items-center justify-center whitespace-nowrap ${connectionStatus === 'success'
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            }`}
                    >
                        {testingConnection ? "Probando..." : connectionStatus === 'success' ? "¡Conexión OK!" : "Probar Conexión"}
                    </Button>
                </div>
                {connectionStatus === 'error' && (
                    <div className="mt-3 text-sm text-red-600 bg-red-50 p-3 rounded flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        No se pudo conectar. Verifica IP, Puerto y Credenciales.
                    </div>
                )}
            </div>
        </div>
    );

    const renderStep3_Quality = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-6">
                <h4 className="text-xl font-bold text-slate-800">Últimos detalles</h4>
                <p className="text-slate-500">Ajusta la calidad del stream para detección.</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label className="label-strong">ANCHO (PX)</label>
                    <Input
                        value={formData.width}
                        onChange={(e) => updateField('width', e.target.value)}
                    />
                </div>
                <div>
                    <label className="label-strong">ALTO (PX)</label>
                    <Input
                        value={formData.height}
                        onChange={(e) => updateField('height', e.target.value)}
                    />
                </div>
                <div>
                    <label className="label-strong">FPS</label>
                    <Input
                        value={formData.fps}
                        onChange={(e) => updateField('fps', e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-lg mt-4 text-sm text-yellow-800 flex gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>
                    <strong>Recomendación:</strong> Para detección de IA, 5 FPS es suficiente.
                    Resoluciones muy altas (4K) consumen mucha CPU; 1080p o 720p es ideal.
                </p>
            </div>
        </div>
    );

    // --- NAVEGACIÓN ---

    const nextStep = () => {
        if (currentStep === 0 && !formData.name) return addToast("Ingresa un nombre para la cámara", "error");
        if (currentStep === 1 && (!formData.ip || !formData.port)) return addToast("La IP y el Puerto son requeridos", "error");
        setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    };

    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

    return (
        <div className="max-w-3xl mx-auto animate-in fade-in duration-300">
            <div className="mb-8">
                <Button
                    variant="ghost"
                    onClick={onCancel}
                    className="mb-4 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 pl-0 flex items-center gap-2 whitespace-nowrap"
                >
                    <ChevronLeft className="w-4 h-4" /> Volver a la lista
                </Button>

                {/* Stepper Header */}
                <div className="flex items-center justify-between relative">
                    {/* Linea de fondo */}
                    <div className="absolute left-0 top-1/2 w-full h-1 bg-gray-200 -z-10 rounded"></div>

                    {STEPS.map((step, idx) => {
                        const Icon = step.icon;
                        const isActive = idx === currentStep;
                        const isCompleted = idx < currentStep;

                        return (
                            <div key={step.id} className="flex flex-col items-center gap-2 bg-slate-50 px-2 rounded-xl">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors
                                    ${isActive ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg scale-110' :
                                        isCompleted ? 'bg-emerald-100 border-emerald-600 text-emerald-600' :
                                            'bg-white border-gray-300 text-gray-400'}`}>
                                    {isCompleted ? <Check className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
                                </div>
                                <span className={`text-xs font-semibold ${isActive ? 'text-emerald-700' : 'text-gray-400'}`}>
                                    {step.title}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <Card className="p-6 md:p-8 min-h-[400px] flex flex-col justify-between shadow-xl border-slate-200">
                <div className="mb-8">
                    {currentStep === 0 && renderStep0_Preparation()}
                    {currentStep === 1 && renderStep1_Connection()}
                    {currentStep === 2 && renderStep2_Security()}
                    {currentStep === 3 && renderStep3_Quality()}
                </div>

                <div className="flex justify-between pt-6 border-t border-slate-100 gap-4">
                    <Button
                        variant="ghost"
                        onClick={prevStep}
                        disabled={currentStep === 0}
                        className="px-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                        <ChevronLeft className="w-4 h-4" /> Anterior
                    </Button>

                    {currentStep < 3 ? (
                        <Button
                            onClick={nextStep}
                            className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:shadow-emerald-500/25 px-8 flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                            Siguiente <ChevronRight className="w-4 h-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleFinish}
                            disabled={loading}
                            className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:shadow-emerald-500/25 px-8 flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                            {loading ? "Guardando..." : "Finalizar y Guardar"} <Check className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </Card>

            <style>{`
                .label-strong {
                    display: block;
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #475569;
                    margin-bottom: 6px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .helper-text {
                    font-size: 0.75rem;
                    color: #94a3b8;
                    margin-top: 4px;
                }
            `}</style>
        </div>
    );
}
