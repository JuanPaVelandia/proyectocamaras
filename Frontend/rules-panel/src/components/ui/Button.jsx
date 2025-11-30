import React from "react";

const styles = {
    primary: {
        width: "100%",
        padding: "12px 24px",
        background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
        color: "#fff",
        borderRadius: 12,
        border: "none",
        cursor: "pointer",
        fontWeight: 600,
        fontSize: "0.9375rem", // 15px
        fontFamily: "var(--font-family-base)",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
        letterSpacing: "-0.01em",
    },
    secondary: {
        padding: "10px 20px",
        background: "#fff",
        color: "#475569",
        borderRadius: 10,
        border: "1.5px solid #e2e8f0",
        cursor: "pointer",
        fontWeight: 500,
        fontSize: "0.875rem", // 14px
        fontFamily: "var(--font-family-base)",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        letterSpacing: "-0.01em",
    },
};

export function Button({ children, variant = "primary", style, ...props }) {
    const baseStyle = styles[variant] || styles.primary;
    const [isHovered, setIsHovered] = React.useState(false);
    
    return (
        <button
            style={{
                ...baseStyle,
                ...style,
                transform: isHovered && variant === "primary" ? "translateY(-1px)" : "translateY(0)",
                boxShadow: isHovered && variant === "primary"
                    ? "0 6px 16px rgba(37, 99, 235, 0.4)"
                    : baseStyle.boxShadow || "none",
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            {...props}
        >
            {children}
        </button>
    );
}
