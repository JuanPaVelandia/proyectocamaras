import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { MultiSelect } from "../../components/ui/MultiSelect";
import { useToast } from "../../context/ToastContext";
import { Shield, Filter, Search, ChevronLeft, ChevronRight } from "lucide-react";

const LABEL_TRANSLATIONS = {
    "person": "Persona",
    "car": "Vehículo",
    "dog": "Perro",
    "cat": "Gato",
    "bird": "Pájaro",
    "bicycle": "Bicicleta",
    "motorcycle": "Motocicleta",
    "bus": "Autobús",
    "train": "Tren",
    "truck": "Camión",
    "boat": "Barco",
    "traffic light": "Semáforo",
    "fire hydrant": "Hidrante",
    "stop sign": "Señal de Stop",
    "parking meter": "Parquímetro",
    "bench": "Banco",
    "backpack": "Mochila",
    "umbrella": "Paraguas",
    "handbag": "Bolso",
    "tie": "Corbata",
    "suitcase": "Maleta",
    "frisbee": "Frisbee",
    "skis": "Esquís",
    "snowboard": "Snowboard",
    "sports ball": "Pelota",
    "kite": "Cometa",
    "baseball bat": "Bate de béisbol",
    "baseball glove": "Guante de béisbol",
    "skateboard": "Monopatín",
    "surfboard": "Tabla de surf",
    "tennis racket": "Raqueta de tenis",
    "bottle": "Botella",
    "wine glass": "Copa de vino",
    "cup": "Taza",
    "fork": "Tenedor",
    "knife": "Cuchillo",
    "spoon": "Cuchara",
    "bowl": "Cuenco",
    "banana": "Plátano",
    "apple": "Manzana",
    "sandwich": "Sándwich",
    "orange": "Naranja",
    "broccoli": "Brócoli",
    "carrot": "Zanahoria",
    "hot dog": "Perrito caliente",
    "pizza": "Pizza",
    "donut": "Rosquilla",
    "cake": "Pastel",
    "chair": "Silla",
    "couch": "Sofá",
    "potted plant": "Planta",
    "bed": "Cama",
    "dining table": "Mesa",
    "toilet": "Inodoro",
    "tv": "TV",
    "laptop": "Portátil",
    "mouse": "Ratón",
    "remote": "Mando",
    "keyboard": "Teclado",
    "cell phone": "Celular",
    "microwave": "Microondas",
    "oven": "Horno",
    "toaster": "Tostadora",
    "sink": "Fregadero",
    "refrigerator": "Nevera",
    "book": "Libro",
    "clock": "Reloj",
    "vase": "Jarrón",
    "scissors": "Tijeras",
    "teddy bear": "Peluche",
    "hair drier": "Secador",
    "toothbrush": "Cepillo de dientes"
};

const getLabelTranslation = (label) => {
    if (!label) return label;
    const lower = label.toLowerCase();
    return LABEL_TRANSLATIONS[lower] || label.charAt(0).toUpperCase() + label.slice(1);
};

export function HitsSection() {
    const [hits, setHits] = useState([]);
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 18;

    // Filters & Options
    const [availableCameras, setAvailableCameras] = useState([]);
    const [availableLabels, setAvailableLabels] = useState([]);

    const [filters, setFilters] = useState({
        camera: [], // Array for MultiSelect
        label: [],  // Array for MultiSelect
        start_date: "",
        end_date: ""
    });

    const loadHits = async () => {
        setLoading(true);
        try {
            // Custom serialization for FastAPI (repeating keys for arrays)
            const params = new URLSearchParams();
            params.append('page', page);
            params.append('page_size', pageSize);

            if (filters.camera && filters.camera.length > 0) {
                filters.camera.forEach(c => params.append('camera', c));
            }
            if (filters.label && filters.label.length > 0) {
                filters.label.forEach(l => params.append('label', l));
            }
            if (filters.start_date) params.append('start_date', filters.start_date);
            if (filters.end_date) params.append('end_date', filters.end_date);

            const res = await api.get("/api/rules/hits", { params });

            setHits(res.data.hits);
            setTotalPages(res.data.total_pages);
            setTotalCount(res.data.total);

            if (res.data.cameras) setAvailableCameras(res.data.cameras);
            if (res.data.labels) setAvailableLabels(res.data.labels);

        } catch (err) {
            console.error(err);
            addToast("Error cargando historial", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHits();
    }, [page]); // Reload on page change

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const applyFilters = () => {
        setPage(1); // Reset to page 1
        loadHits();
    };

    const clearFilters = () => {
        setFilters({
            camera: [],
            label: [],
            start_date: "",
            end_date: ""
        });
        setPage(1);
        // We need to trigger load, either via effect or calling loadHits
        // Since state update is async, best to rely on effect? 
        // But effect only watches 'page'. 
        // Let's call loadHits manually after a short delay or use another effect.
        // Or just set state and then call loadHits with NEW state? (Closure issue).
        // Best approach: reset state and rely on explicit action.
        setTimeout(() => loadHits(), 0);
    };

    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
            {/* Filters Card */}
            <Card className="p-6 relative z-20">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Filter className="w-5 h-5 text-muted-foreground" />
                            Filtros
                        </h3>
                        <div className="flex gap-2">
                            <button
                                onClick={clearFilters}
                                className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-muted transition-colors"
                            >
                                Limpiar
                            </button>
                            <button
                                onClick={applyFilters}
                                className="bg-primary text-primary-foreground px-4 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                            >
                                <Search className="w-4 h-4" />
                                Buscar
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Camera Select */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Cámaras</label>
                            <MultiSelect
                                options={availableCameras}
                                value={filters.camera}
                                onChange={(val) => handleFilterChange("camera", val)}
                                placeholder="Todas las cámaras"
                            />
                        </div>

                        {/* Label Select (Translated) */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Etiquetas</label>
                            <MultiSelect
                                options={availableLabels}
                                value={filters.label}
                                onChange={(val) => handleFilterChange("label", val)}
                                placeholder="Todas las etiquetas"
                                renderLabel={getLabelTranslation}
                            />
                        </div>

                        {/* Start Date */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Desde</label>
                            <input
                                type="datetime-local"
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                value={filters.start_date}
                                onChange={(e) => handleFilterChange("start_date", e.target.value)}
                            />
                        </div>

                        {/* End Date */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Hasta</label>
                            <input
                                type="datetime-local"
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                value={filters.end_date}
                                onChange={(e) => handleFilterChange("end_date", e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Results */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                        Historial de Alertas
                        <Badge variant="outline" className="ml-2">
                            {totalCount} Total
                        </Badge>
                    </h3>
                    <ButtonRefresh onClick={loadHits} loading={loading} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {hits.map((hit) => (
                        <div
                            key={hit.id}
                            className="group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow transition-all hover:shadow-lg hover:-translate-y-1"
                        >
                            {hit.snapshot_base64 && (
                                <div className="aspect-video w-full overflow-hidden bg-muted">
                                    <img
                                        src={`data:image/jpeg;base64,${hit.snapshot_base64}`}
                                        alt="Snapshot"
                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                </div>
                            )}
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <Badge variant="secondary" className="font-normal text-xs">
                                        {new Date(hit.triggered_at).toLocaleString()}
                                    </Badge>
                                </div>

                                {hit.event_data ? (
                                    <>
                                        <div className="font-semibold text-lg mb-2 flex items-center gap-2">
                                            <span>{getLabelTranslation(hit.event_data.label)}</span>
                                            {hit.event_data.score && (
                                                <span className="text-xs text-muted-foreground font-normal">
                                                    ({Math.round(hit.event_data.score * 100)}%)
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Shield className="w-3 h-3" />
                                                {hit.event_data.camera}
                                            </div>
                                            <span className="text-xs opacity-70">Event #{hit.event_id}</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                                        <span>Evento #{hit.event_id}</span>
                                    </div>
                                )}

                                <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="truncate">Regla: {hit.rule_name}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {!loading && hits.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                        <Search className="h-12 w-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium">No se encontraron alertas</p>
                        <p className="text-sm">Prueba ajustando los filtros de búsqueda</p>
                    </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center mt-8 gap-4">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 rounded-full hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-sm font-medium">
                            Página {page} de {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="p-2 rounded-full hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </Card>
        </div>
    );
}

function ButtonRefresh({ onClick, loading }) {
    return (
        <button
            onClick={onClick}
            disabled={loading}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
            <div className={`transition-transform duration-700 ${loading ? "animate-spin" : ""}`}>
                🔄
            </div>
            {loading ? "Actualizando..." : "Actualizar"}
        </button>
    );
}
