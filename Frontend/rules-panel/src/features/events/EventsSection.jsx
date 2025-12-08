import React, { useState, useEffect, useCallback } from "react";
import { api } from "../../services/api";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { useToast } from "../../context/ToastContext";

export function EventsSection() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedEventIndex, setSelectedEventIndex] = useState(null);
    const { addToast } = useToast();

    const loadEvents = async () => {
        setLoading(true);
        try {
            const res = await api.get("/api/events/db?limit=50");
            setEvents(res.data.events);
        } catch (err) {
            console.error(err);
            addToast("Error cargando eventos", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEvents();
    }, []);

    const handleEventClick = (index) => {
        setSelectedEventIndex(index);
    };

    const handleCloseModal = () => {
        setSelectedEventIndex(null);
    };

    const handleNext = useCallback(() => {
        setSelectedEventIndex((prev) => (prev + 1) % events.length);
    }, [events.length]);

    const handlePrev = useCallback(() => {
        setSelectedEventIndex((prev) => (prev - 1 + events.length) % events.length);
    }, [events.length]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (selectedEventIndex === null) return;
            if (e.key === "ArrowRight") handleNext();
            if (e.key === "ArrowLeft") handlePrev();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedEventIndex, handleNext, handlePrev]);

    const selectedEvent = selectedEventIndex !== null ? events[selectedEventIndex] : null;

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
                        Feed de Eventos (Frigate)
                    </h3>
                    <ButtonRefresh onClick={loadEvents} loading={loading} />
                </div>

                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
                    gap: "clamp(12px, 2vw, 16px)",
                    width: "100%",
                    maxWidth: "100%",
                    boxSizing: "border-box",
                }}>
                    {events.map((item, index) => {
                        const e = item.event || {};
                        return (
                            <div
                                key={item.id}
                                onClick={() => handleEventClick(index)}
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
                                    cursor: "pointer",
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
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        marginBottom: 8,
                                        flexWrap: "wrap",
                                    }}>
                                        <Badge variant="neutral">📷 {e.camera}</Badge>
                                        <span style={{
                                            fontSize: "clamp(11px, 1.8vw, 13px)",
                                            color: "#94a3b8",
                                        }}>
                                            {new Date(item.received_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <div style={{
                                        fontSize: "clamp(14px, 2vw, 16px)",
                                        fontWeight: 600,
                                        color: "#1e293b",
                                        marginBottom: 8,
                                    }}>
                                        👤 Detección de {e.label}
                                    </div>
                                    <div style={{
                                        display: "flex",
                                        gap: 12,
                                        flexWrap: "wrap",
                                    }}>
                                        <Badge variant="success">
                                            Score: {Math.round((e.top_score || 0) * 100)}%
                                        </Badge>
                                        <Badge variant="neutral">
                                            Duración: {e.duration_seconds ? e.duration_seconds.toFixed(1) : 0}s
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {!loading && events.length === 0 && (
                        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
                            No se han recibido eventos aún.
                        </div>
                    )}
                </div>
            </Card>

            <Modal isOpen={selectedEventIndex !== null} onClose={handleCloseModal}>
                {selectedEvent && (
                    <div style={{
                        background: "#fff",
                        borderRadius: 16,
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                    }}>
                        <div style={{ position: "relative", background: "#000", minHeight: "300px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {selectedEvent.snapshot_base64 ? (
                                <img
                                    src={`data:image/jpeg;base64,${selectedEvent.snapshot_base64}`}
                                    alt="Event Snapshot"
                                    style={{ width: "100%", height: "auto", maxHeight: "60vh", objectFit: "contain" }}
                                />
                            ) : (
                                <div style={{ color: "#fff", padding: 20 }}>No snapshot available</div>
                            )}

                            {/* Navigation Arrows */}
                            <button
                                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                                style={{
                                    position: "absolute",
                                    left: 16,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    background: "rgba(255, 255, 255, 0.2)",
                                    border: "none",
                                    borderRadius: "50%",
                                    width: 40,
                                    height: 40,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    color: "#fff",
                                    fontSize: 24,
                                    backdropFilter: "blur(4px)",
                                    transition: "background 0.2s",
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.4)"}
                                onMouseOut={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)"}
                            >
                                ‹
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                style={{
                                    position: "absolute",
                                    right: 16,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    background: "rgba(255, 255, 255, 0.2)",
                                    border: "none",
                                    borderRadius: "50%",
                                    width: 40,
                                    height: 40,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    color: "#fff",
                                    fontSize: 24,
                                    backdropFilter: "blur(4px)",
                                    transition: "background 0.2s",
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.4)"}
                                onMouseOut={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)"}
                            >
                                ›
                            </button>
                        </div>

                        <div style={{ padding: 24 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 16 }}>
                                <div>
                                    <h2 style={{ margin: "0 0 8px 0", fontSize: 20, fontWeight: 600, color: "#0f172a" }}>
                                        {selectedEvent.event?.label || "Unknown Event"}
                                    </h2>
                                    <div style={{ display: "flex", gap: 8, color: "#64748b", fontSize: 14 }}>
                                        <span>📷 {selectedEvent.event?.camera}</span>
                                        <span>•</span>
                                        <span>{new Date(selectedEvent.received_at).toLocaleString()}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleCloseModal}
                                    style={{
                                        background: "transparent",
                                        border: "none",
                                        color: "#94a3b8",
                                        cursor: "pointer",
                                        padding: 4,
                                        fontSize: 20,
                                    }}
                                >
                                    ✕
                                </button>
                            </div>

                            <div style={{ display: "flex", gap: 12 }}>
                                <Badge variant="success">
                                    Score: {Math.round((selectedEvent.event?.top_score || 0) * 100)}%
                                </Badge>
                                <Badge variant="neutral">
                                    Duración: {selectedEvent.event?.duration_seconds ? selectedEvent.event.duration_seconds.toFixed(1) : 0}s
                                </Badge>
                                <Badge variant="neutral">
                                    ID: {selectedEvent.id}
                                </Badge>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

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
            {loading ? "..." : "🔄"}
        </button>
    );
}
