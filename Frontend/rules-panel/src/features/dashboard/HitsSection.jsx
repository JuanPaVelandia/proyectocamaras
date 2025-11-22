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
            const res = await api.get("/api/rules/hits?limit=50");
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

                <div style={{ overflowX: "auto", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
                    <table style={{ width: "100%", maxWidth: "100%", borderCollapse: "collapse", fontSize: "clamp(13px, 1.8vw, 14px)", minWidth: "600px", boxSizing: "border-box" }}>
                        <thead>
                            <tr style={{ textAlign: "left", color: "#64748b", borderBottom: "2px solid #f1f5f9" }}>
                                <th style={{ padding: "12px 8px" }}>HORA</th>
                                <th style={{ padding: "12px 8px" }}>REGLA ID</th>
                                <th style={{ padding: "12px 8px" }}>EVENTO ID</th>
                                <th style={{ padding: "12px 8px" }}>ACCIÓN</th>
                            </tr>
                        </thead>
                        <tbody>
                            {hits.map((hit) => (
                                <tr key={hit.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                    <td style={{ padding: "12px 8px", color: "#334155" }}>
                                        {new Date(hit.triggered_at).toLocaleString()}
                                    </td>
                                    <td style={{ padding: "12px 8px", fontFamily: "monospace" }}>
                                        #{hit.rule_id}
                                    </td>
                                    <td style={{ padding: "12px 8px", fontFamily: "monospace", color: "#64748b" }}>
                                        {hit.event_id}
                                    </td>
                                    <td style={{ padding: "12px 8px" }}>
                                        <Badge variant="success">WhatsApp Enviado</Badge>
                                    </td>
                                </tr>
                            ))}
                            {!loading && hits.length === 0 && (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>
                                        No hay alertas registradas aún.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
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
