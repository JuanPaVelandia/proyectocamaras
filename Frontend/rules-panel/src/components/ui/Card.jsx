import React from "react";

const style = {
    background: "#ffffffaa",
    backdropFilter: "blur(12px)",
    borderRadius: 16,
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    padding: 24,
    width: "100%",
    boxSizing: "border-box",
};

export function Card({ children, style: customStyle, ...props }) {
    return (
        <div style={{ ...style, ...customStyle }} {...props}>
            {children}
        </div>
    );
}
