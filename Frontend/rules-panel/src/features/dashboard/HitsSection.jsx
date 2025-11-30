import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { useToast } from "../../context/ToastContext";

export function HitsSection() {
    const [hits, setHits] = useState([]);
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();

    const loadHits = async () => {
        setLoading(true);
        try {
            const res = await api.get("/api/rules/hits?limit=20");
            setHits(res.data.hits);
        } catch (err) {
            console.error(err);
            addToast("Error cargando historial", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHits();
    }, []);

    return (
        <div style={{ 
            animation: "fadeIn 0.5s ease-out",
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
        }}>
            <Card style={{
                padding: "clamp(20px, 3vw, 32px)",
                width: "100%",
                maxWidth: "100%",
                minWidth: 0,
                boxSizing: "border-box",
                flex: "1 1 auto",
            }}>
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
                        Historial de Alertas
                    </h3>
                    <ButtonRefresh onClick={loadHits} loading={loading} />
                </div>

                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
                    gap: "clamp(12px, 2vw, 16px)",
                    width: "100%",
                    maxWidth: "100%",
                    boxSizing: "border-box",
                }}>
                    {hits.map((hit) => (
                        <div
                            key={hit.id}
                            style={{
                                border: "2px solid #cbd5e1",
                                padding: "clamp(16px, 2vw, 20px)",
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
                            {hit.snapshot_base64 && (
                                <img
                                    src={`data:image/jpeg;base64,${hit.snapshot_base64}`}
                                    alt="Snapshot"
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
                                    gap: 8,
                                    marginBottom: 8,
                                    flexWrap: "wrap",
                                }}>
                                    <Badge variant="success">🔔 {hit.rule_name || `Regla #${hit.rule_id}`}</Badge>
                                    <span style={{
                                        fontSize: "clamp(11px, 1.8vw, 13px)",
                                        color: "#94a3b8",
                                    }}>
                                        {new Date(hit.triggered_at).toLocaleString()}
                                    </span>
                                </div>
                                {hit.event_data && (
                                    <>
                                        <div style={{
                                            fontSize: "clamp(14px, 2vw, 16px)",
                                            fontWeight: 600,
                                            color: "#1e293b",
                                            marginBottom: 8,
                                        }}>
                                            📷 {hit.event_data.camera} - {hit.event_data.label}
                                        </div>
                                        <div style={{
                                            display: "flex",
                                            gap: 12,
                                            flexWrap: "wrap",
                                        }}>
                                            {hit.event_data.score && (
                                                <Badge variant="neutral">
                                                    Score: {Math.round((hit.event_data.score || 0) * 100)}%
                                                </Badge>
                                            )}
                                            <Badge variant="neutral">
                                                Evento #{hit.event_id}
                                            </Badge>
                                        </div>
                                    </>
                                )}
                                {!hit.event_data && (
                                    <div style={{
                                        fontSize: "clamp(12px, 1.8vw, 14px)",
                                        color: "#94a3b8",
                                    }}>
                                        Evento #{hit.event_id}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {!loading && hits.length === 0 && (
                        <div style={{
                            textAlign: "center",
                            padding: 40,
                            color: "#94a3b8",
                            gridColumn: "1 / -1",
                        }}>
                            No hay alertas registradas aún.
                        </div>
                    )}
                </div>
            </Card>
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

function ButtonRefresh({ onClick, loading }) {
    return (
        <button
            onClick={onClick}
            disabled={loading}
            style={{
                background: "transparent",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                padding: "4px 8px",
                cursor: "pointer",
                fontSize: 12,
                color: "#64748b",
            }}
        >
            {loading ? "Refrescando..." : "🔄 Refrescar"}
        </button>
    );
}
