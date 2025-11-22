import React, { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext();

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = "info") => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);

        // Auto remove after 3 seconds
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    }, []);

    const removeToast = (id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div
                style={{
                    position: "fixed",
                    bottom: 24,
                    right: 24,
                    zIndex: 9999,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                }}
            >
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        onClick={() => removeToast(toast.id)}
                        style={{
                            background:
                                toast.type === "error"
                                    ? "#fee2e2"
                                    : toast.type === "success"
                                        ? "#dcfce7"
                                        : "#fff",
                            color:
                                toast.type === "error"
                                    ? "#991b1b"
                                    : toast.type === "success"
                                        ? "#166534"
                                        : "#1e293b",
                            borderLeft:
                                toast.type === "error"
                                    ? "4px solid #ef4444"
                                    : toast.type === "success"
                                        ? "4px solid #22c55e"
                                        : "4px solid #3b82f6",
                            padding: "12px 16px",
                            borderRadius: 8,
                            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                            minWidth: 250,
                            cursor: "pointer",
                            animation: "slideIn 0.3s ease-out",
                            fontSize: 14,
                            fontWeight: 500,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}
                    >
                        <span>{toast.message}</span>
                    </div>
                ))}
            </div>
            <style>
                {`
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}
            </style>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}
