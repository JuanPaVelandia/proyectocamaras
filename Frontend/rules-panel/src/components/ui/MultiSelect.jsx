import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export function MultiSelect({ options, value = [], onChange, placeholder = "Select...", renderLabel }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (optionValue) => {
        const newValue = value.includes(optionValue)
            ? value.filter(v => v !== optionValue)
            : [...value, optionValue];
        onChange(newValue);
    };

    const displayText = value.length > 0
        ? `${value.length} seleccionados`
        : placeholder;

    return (
        <div className="relative w-full" ref={containerRef}>
            <button
                type="button"
                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="truncate">{displayText}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-80">
                    <div className="p-1">
                        {options.map((option) => {
                            const isSelected = value.includes(option);
                            return (
                                <div
                                    key={option}
                                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                    onClick={() => toggleOption(option)}
                                >
                                    <div className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary ${isSelected ? 'bg-primary text-primary-foreground' : 'opacity-50 [&_svg]:invisible'}`}>
                                        <Check className="h-4 w-4" />
                                    </div>
                                    <span>{renderLabel ? renderLabel(option) : option}</span>
                                </div>
                            );
                        })}
                        {options.length === 0 && (
                            <div className="py-6 text-center text-sm text-muted-foreground">No options found.</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
