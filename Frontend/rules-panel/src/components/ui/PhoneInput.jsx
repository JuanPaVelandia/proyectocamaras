import React from "react";
import PhoneInputWithCountry from "react-phone-number-input";
import "react-phone-number-input/style.css";
import "./PhoneInput.css";

/**
 * Componente de entrada de teléfono con selector de país
 * - Selector de país con banderas y búsqueda
 * - Validación automática por país
 * - Formato visual con espacios
 * - Guarda en formato internacional: +573112264829
 */
export function PhoneInput({ value, onChange, placeholder, disabled, error }) {
    return (
        <div className="phone-input-wrapper">
            <PhoneInputWithCountry
                international
                defaultCountry="CO"
                value={value}
                onChange={onChange}
                placeholder={placeholder || "311 226 4829"}
                disabled={disabled}
                className={error ? "phone-input-error" : ""}
                countrySelectProps={{
                    className: "country-select"
                }}
                numberInputProps={{
                    className: "phone-number-input"
                }}
            />
            {error && (
                <p className="phone-input-error-message">{error}</p>
            )}
        </div>
    );
}
