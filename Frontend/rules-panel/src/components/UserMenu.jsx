import React, { useState, useEffect, useRef } from "react";
import { useToast } from "../context/ToastContext";
import { api } from "../services/api";

export function UserMenu({ onLogout }) {
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const menuRef = useRef(null);
    const { addToast } = useToast();

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        // Primero intentar cargar desde localStorage
        const userData = localStorage.getItem("userData");
        if (userData) {
            try {
                setUser(JSON.parse(userData));
                setLoading(false);
                return;
            } catch (e) {
                console.error("Error parsing user data:", e);
            }
        }

        // Si no hay datos en localStorage, obtenerlos del backend
        try {
            const token = localStorage.getItem("adminToken");
            if (!token) {
                setLoading(false);
                return;
            }

            const response = await api.get("/api/auth/me");
            const userData = {
                username: response.data.username,
                email: response.data.email,
                whatsapp_number: response.data.whatsapp_number
            };

            // Guardar en localStorage para futuras sesiones
            localStorage.setItem("userData", JSON.stringify(userData));
            setUser(userData);
        } catch (error) {
            console.error("Error loading user data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Cerrar menú al hacer clic fuera
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const getInitials = () => {
        if (!user) return "?";
        const names = user.username.split(" ");
        if (names.length >= 2) {
            return (names[0][0] + names[1][0]).toUpperCase();
        }
        return user.username.substring(0, 2).toUpperCase();
    };

    const handleLogout = () => {
        setIsOpen(false);
        addToast("Sesión cerrada exitosamente", "success");
        setTimeout(() => {
            onLogout();
        }, 300);
    };

    // Mostrar un placeholder mientras carga
    if (loading) {
        return (
            <div style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                background: "#e2e8f0",
                animation: "pulse 2s ease-in-out infinite"
            }} />
        );
    }

    // Si no hay usuario después de cargar, no mostrar nada
    if (!user) {
        return null;
    }

    return (
        <div ref={menuRef} style={{ position: "relative" }}>
            {/* Avatar Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: "relative",
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                    border: "2px solid #fff",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    outline: "none",
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.transform = "scale(1.05)";
                    e.currentTarget.style.boxShadow = "0 6px 16px rgba(37, 99, 235, 0.4)";
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.3)";
                }}
            >
                {getInitials()}
                {/* Online indicator */}
                <div
                    style={{
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                        width: 12,
                        height: 12,
                        background: "#10b981",
                        border: "2px solid #fff",
                        borderRadius: "50%",
                        boxShadow: "0 0 0 2px rgba(16, 185, 129, 0.2)",
                    }}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        right: 0,
                        width: 280,
                        background: "#fff",
                        borderRadius: 12,
                        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)",
                        zIndex: 1000,
                        overflow: "hidden",
                        animation: "slideDown 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                >
                    {/* User Info Section */}
                    <div
                        style={{
                            padding: 16,
                            borderBottom: "1px solid #f1f5f9",
                        }}
                    >
                        <div
                            style={{
                                fontSize: 15,
                                fontWeight: 600,
                                color: "#0f172a",
                                marginBottom: 4,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {user.username}
                        </div>
                        <div
                            style={{
                                fontSize: 13,
                                color: "#64748b",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {user.email}
                        </div>
                    </div>

                    {/* Menu Items */}
                    <div style={{ padding: "8px 0" }}>
                        <MenuItem
                            icon="👤"
                            text="Mi Perfil"
                            onClick={() => {
                                setIsOpen(false);
                                // Navigate to profile - placeholder for now
                                console.log("Navigate to /perfil");
                            }}
                        />
                        <MenuItem
                            icon="⚙️"
                            text="Configuración"
                            onClick={() => {
                                setIsOpen(false);
                                // Navigate to settings - placeholder for now
                                console.log("Navigate to /configuracion");
                            }}
                        />
                    </div>

                    {/* Divider */}
                    <div style={{ height: 1, background: "#f1f5f9" }} />

                    {/* Logout */}
                    <div style={{ padding: "8px 0" }}>
                        <MenuItem
                            icon="🚪"
                            text="Cerrar Sesión"
                            onClick={handleLogout}
                            danger
                        />
                    </div>
                </div>
            )}

            <style>
                {`
                    @keyframes slideDown {
                        from {
                            opacity: 0;
                            transform: translateY(-8px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    @keyframes pulse {
                        0%, 100% {
                            opacity: 1;
                        }
                        50% {
                            opacity: 0.5;
                        }
                    }
                `}
            </style>
        </div>
    );
}

function MenuItem({ icon, text, onClick, danger = false }) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                width: "100%",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: isHovered ? (danger ? "#fef2f2" : "#f8fafc") : "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 500,
                color: danger ? "#dc2626" : "#475569",
                transition: "all 0.15s ease",
                textAlign: "left",
            }}
        >
            <span style={{ fontSize: 18 }}>{icon}</span>
            <span>{text}</span>
        </button>
    );
}
