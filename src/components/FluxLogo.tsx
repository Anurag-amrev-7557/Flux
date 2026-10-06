import React from 'react';

interface FluxLogoProps {
    className?: string;
    size?: number;
    showText?: boolean;
}

export default function FluxLogo({ className = "w-7 h-7", size, showText = false }: FluxLogoProps) {
    return (
        <div className="inline-flex items-center gap-2.5 select-none">
            <svg
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={className}
                style={size ? { width: size, height: size } : undefined}
            >
                {/* Minimalist Jet Black Squircle */}
                <rect width="64" height="64" rx="16" fill="#09090b" />
                <rect x="0.5" y="0.5" width="63" height="63" rx="15.5" stroke="#27272a" strokeWidth="1" />
                
                {/* Architectural Minimalist Monochrome 'F' */}
                <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M20 16C18.3431 16 17 17.3431 17 19V45C17 46.6569 18.3431 48 20 48C21.6569 48 23 46.6569 23 45V34H38C39.6569 34 41 32.6569 41 31C41 29.3431 39.6569 28 38 28H23V22H44C45.6569 22 47 20.6569 47 19C47 17.3431 45.6569 16 44 16H20Z"
                    fill="#ffffff"
                />
            </svg>
            {showText && (
                <span className="font-extrabold tracking-tight text-slate-900 font-display text-base">
                    Flux
                </span>
            )}
        </div>
    );
}
