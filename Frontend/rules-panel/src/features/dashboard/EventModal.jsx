import React, { useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Calendar, Clock, Camera, Tag, AlertTriangle } from "lucide-react";
import { Badge } from "../../components/ui/Badge";

export function EventModal({ isOpen, onClose, event, onNext, onPrev, hasNext, hasPrev }) {
    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return; // Ignore if closed
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowRight" && hasNext) onNext();
            if (e.key === "ArrowLeft" && hasPrev) onPrev();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose, onNext, onPrev, hasNext, hasPrev]);

    // Prevent scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    if (!isOpen || !event) return null;

    const {
        snapshot_base64,
        id,
        triggered_at,
        event_data,
        rule_name
    } = event;

    const label = event_data?.label || "Desconocido";
    const camera = event_data?.camera || "Desconocida";
    const score = event_data?.score ? Math.round(event_data.score * 100) : null;
    const dateObj = new Date(triggered_at);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={onClose} />

            {/* Modal Content */}
            <div className="relative w-full max-w-[95vw] h-[90vh] bg-card rounded-xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-border">

                {/* Close Button (Mobile) */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full md:hidden"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Left: Image */}
                <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px] md:min-h-full group">
                    {snapshot_base64 ? (
                        <img
                            src={`data:image/jpeg;base64,${snapshot_base64}`}
                            alt="Event Snapshot"
                            className="max-h-full max-w-full object-contain"
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Camera className="w-12 h-12 opacity-50" />
                            <span>Sin imagen disponible</span>
                        </div>
                    )}

                    {/* Navigation Arrows (Over Image) */}
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 pointer-events-none">
                        <button
                            onClick={onPrev}
                            disabled={!hasPrev}
                            className={`pointer-events-auto p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all ${!hasPrev ? "opacity-0 cursor-default" : "opacity-100 hover:scale-110"
                                }`}
                        >
                            <ChevronLeft className="w-8 h-8" />
                        </button>

                        <button
                            onClick={onNext}
                            disabled={!hasNext}
                            className={`pointer-events-auto p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all ${!hasNext ? "opacity-0 cursor-default" : "opacity-100 hover:scale-110"
                                }`}
                        >
                            <ChevronRight className="w-8 h-8" />
                        </button>
                    </div>
                </div>

                {/* Right: Details Sidebar */}
                <div className="w-full md:w-80 lg:w-96 flex flex-col bg-card border-l">

                    {/* Header */}
                    <div className="p-6 border-b flex items-start justify-between">
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2 capitalize">
                                {label}
                                {score && (
                                    <Badge variant={(score > 80 ? "default" : "secondary")} className="text-sm">
                                        {score}%
                                    </Badge>
                                )}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">Evento #{id}</p>
                        </div>

                        {/* Desktop Close Button */}
                        <button
                            onClick={onClose}
                            className="hidden md:flex p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Metadata List */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">

                        {/* Date & Time */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm">
                                <Calendar className="w-4 h-4 text-primary" />
                                <span className="font-medium">Fecha:</span>
                                <span className="text-muted-foreground">{dateObj.toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Clock className="w-4 h-4 text-primary" />
                                <span className="font-medium">Hora:</span>
                                <span className="text-muted-foreground">{dateObj.toLocaleTimeString()}</span>
                            </div>
                        </div>

                        <div className="border-t my-4" />

                        {/* Location */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm">
                                <Camera className="w-4 h-4 text-primary" />
                                <span className="font-medium">Cámara:</span>
                                <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">
                                    {camera}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Tag className="w-4 h-4 text-primary" />
                                <span className="font-medium">Regla detectada:</span>
                                <span className="text-muted-foreground">{rule_name || "N/A"}</span>
                            </div>
                        </div>

                        {/* Technical Details Removed */}

                    </div>

                    {/* Footer / Actions (Optional) */}
                    <div className="p-4 border-t bg-muted/20 text-center text-xs text-muted-foreground">
                        Usa las flechas ⬅ ➡ para navegar
                    </div>
                </div>
            </div>
        </div>
    );
}
