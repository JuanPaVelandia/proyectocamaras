import React from "react";

export function Button({ children, variant = "primary", className = "", style, ...props }) {
    const baseClasses = "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2";

    const variants = {
        primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 focus:ring-blue-500",
        secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm focus:ring-slate-400",
        ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        danger: "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 focus:ring-red-500"
    };

    // Si se pasa un className que contiene colores o fondos, debería de alguna manera tener prioridad.
    // Simplemente concatenamos las clases. En Tailwind, las últimas clases ganan si hay conflicto (a veces), 
    // pero aquí estamos mezclando utilidades. Para ser seguros, el usuario debe usar ! o simplemente
    // confiar en la cascada si las clases personalizadas vienen después.
    // O mejor aún, si el user pasa className, lo añadimos al final.

    // Nota: El botón original tenía "padding: 12px 24px" (aprox p-3 px-6)
    const sizeClasses = "px-6 py-3 text-[15px]";

    return (
        <button
            className={`${baseClasses} ${variants[variant] || variants.primary} ${sizeClasses} ${className}`}
            style={style}
            {...props}
        >
            {children}
        </button>
    );
}
