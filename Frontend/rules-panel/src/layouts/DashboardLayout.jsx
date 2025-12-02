import React from "react";
import { UserMenu } from "../components/UserMenu";

export function DashboardLayout({ children, onLogout, onNavigateToProfile, onNavigateToLanding }) {
    return (
        <div style={{
            width: "100%",
            minHeight: "100vh",
            background: "#f8fafc",
        }}>
            <header
                className="sticky-header"
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 16,
                    padding: "clamp(16px, 2.5vw, 24px) clamp(16px, 3vw, 32px)",
                }}
            >
                <div
                    style={{ flex: "1 1 auto", minWidth: "200px", cursor: "pointer" }}
                    onClick={onNavigateToLanding}
                    title="Volver al inicio"
                >
                    <h1 style={{
                        margin: 0,
                        fontSize: "clamp(20px, 3.5vw, 28px)",
                        fontWeight: 700,
                        color: "#0f172a",
                        letterSpacing: "-0.02em",
                        lineHeight: 1.2,
                    }}>
                        🎥 Control de Vidria
                    </h1>
                    <p style={{
                        margin: "6px 0 0",
                        color: "#64748b",
                        fontSize: "clamp(13px, 1.8vw, 15px)",
                        fontWeight: 400,
                        lineHeight: 1.5,
                    }}>
                        Configura tus cámaras y reglas
                    </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <UserMenu
                        onLogout={onLogout}
                        onNavigateToProfile={onNavigateToProfile}
                        onNavigateToLanding={onNavigateToLanding}
                    />
                </div>
            </header>

            <main style={{
                width: "100%",
                maxWidth: "1600px",
                margin: "0 auto",
                minWidth: 0,
                padding: "clamp(16px, 3vw, 32px)",
                boxSizing: "border-box",
            }}>
                <div style={{
                    width: "100%",
                    maxWidth: "100%",
                    minWidth: 0,
                    boxSizing: "border-box",
                }}>
                    {children}
                </div>
            </main>
        </div>
    );
}
