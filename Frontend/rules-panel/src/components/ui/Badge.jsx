import React from "react";

const variants = {
    success: {
        background: "#dcfce7",
        color: "#166534",
        border: "1px solid #bbf7d0",
    },
    warning: {
        background: "#fef9c3",
        color: "#854d0e",
        border: "1px solid #fde047",
    },
    error: {
        background: "#fee2e2",
        color: "#991b1b",
        border: "1px solid #fecaca",
    },
    neutral: {
        background: "#f1f5f9",
        color: "#475569",
        border: "1px solid #e2e8f0",
    },
};

export function Badge({ children, variant = "neutral", style }) {
    const baseStyle = variants[variant] || variants.neutral;
    return (
        <span
            style={{
                padding: "2px 8px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                display: "inline-flex",
                alignItems: "center",
                ...baseStyle,
                ...style,
            }}
        >
            {children}
        </span>
    );
}
