import React, { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

export function OAuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    useEffect(() => {
        const token = searchParams.get("token");
        const username = searchParams.get("username");
        
        if (token) {
            // Guardar token
            localStorage.setItem("adminToken", token);
            
            // Redirigir al dashboard
            window.location.href = "/";
        } else {
            // Si no hay token, redirigir al login
            navigate("/");
        }
    }, [searchParams, navigate]);
    
    return (
        <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
            fontFamily: "system-ui, sans-serif",
        }}>
            <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
                <h2 style={{ color: "#1e293b", marginBottom: 8 }}>Completando autenticación...</h2>
                <p style={{ color: "#64748b" }}>Por favor espera</p>
            </div>
        </div>
    );
}

