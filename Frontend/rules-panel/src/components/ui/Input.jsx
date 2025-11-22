import React, { useState } from "react";

const style = {
    width: "100%",
    padding: "10px 14px",
    marginBottom: 12,
    borderRadius: 10,
    border: "1.5px solid #cbd5e1",
    fontSize: "0.9375rem", // 15px
    fontFamily: "var(--font-family-base)",
    outline: "none",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    background: "#fff",
    color: "#1e293b",
    lineHeight: 1.5,
};

const focusStyle = {
    borderColor: "#3b82f6",
    boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
};

export function Input({ onFocus, onBlur, ...props }) {
    const [isFocused, setIsFocused] = useState(false);
    
    return (
        <input
            style={{
                ...style,
                ...(isFocused ? focusStyle : {}),
            }}
            onFocus={(e) => {
                setIsFocused(true);
                if (onFocus) onFocus(e);
            }}
            onBlur={(e) => {
                setIsFocused(false);
                if (onBlur) onBlur(e);
            }}
            {...props}
        />
    );
}
