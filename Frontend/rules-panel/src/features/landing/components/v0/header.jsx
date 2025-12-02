import React from 'react';
import { Button } from "./ui/button";

export function Header({ onLogin, onRegister }) {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-20 max-w-7xl items-center justify-between px-4 md:px-6 mx-auto">
                <div className="flex items-center gap-2">
                    <a className="flex items-center gap-2 font-bold text-xl" href="/">
                        <img
                            src="/logo-vidria-png-recortado-1250.png"
                            alt="Vidria Logo"
                            className="h-10 w-auto object-contain"
                        />
                    </a>
                </div>

                <div className="flex items-center gap-4">
                    {/* BOTÓN 1: Ingresar (Limpio y sutil) */}
                    <Button
                        variant="ghost"
                        size="lg"
                        onClick={onLogin}
                        className="text-muted-foreground hover:text-emerald-700 bg-transparent hover:bg-transparent transition-colors"
                    >
                        Ingresar
                    </Button>

                    {/* BOTÓN 2: Registrarse (Resalta con tu marca) */}
                    <Button
                        size="lg"
                        onClick={onRegister}
                        className="bg-gradient-to-r from-emerald-600 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/20 hover:shadow-xl transition-all border-0"
                    >
                        Registrarse
                    </Button>
                </div>
            </div>
        </header>
    );
}
