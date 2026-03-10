"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface PriceInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    isReady?: boolean; // New prop to delay animations
}

export default function PriceInput({
    value,
    onChange,
    placeholder = "0.00",
    className,
    isReady = true
}: PriceInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleClick = () => {
        inputRef.current?.focus();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        // Allow numbers and a single decimal point
        if (val === "" || /^\d*\.?\d*$/.test(val)) {
            onChange(val);
        }
    };

    // Split value into parts to animate
    const displayValue = value || "";
    const characters = displayValue.split("");

    return (
        <div
            ref={containerRef}
            onClick={handleClick}
            className={cn(
                "relative flex items-center justify-center min-h-[100px] cursor-text w-full overflow-hidden select-none",
                className
            )}
        >
            <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={value}
                onChange={handleChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="absolute opacity-0 pointer-events-none inset-0 w-full h-full"
                autoFocus
            />

            <div className="relative flex items-center justify-center font-bold text-7xl tracking-tight h-[1.2em] tabular-nums">
                <div className="relative flex items-center justify-center">
                    <AnimatePresence mode="popLayout" initial={false}>
                        {characters.length === 0 ? (
                            <motion.span
                                key="placeholder"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 0.3, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="text-slate-300 pointer-events-none absolute"
                            >
                                {placeholder}
                            </motion.span>
                        ) : (
                            <div className="flex items-center">
                                {characters.map((char, index) => (
                                    <div key={`char-box-${index}`} className="relative h-[1.2em] overflow-hidden flex items-center justify-center">
                                        <AnimatePresence mode="popLayout">
                                            <motion.span
                                                key={`${index}-${char}`}
                                                initial={isReady ? { y: "100%", opacity: 0 } : { y: "0%", opacity: 1 }}
                                                animate={{ y: "0%", opacity: 1 }}
                                                exit={{ y: "-100%", opacity: 0 }}
                                                transition={{
                                                    type: "spring",
                                                    stiffness: 400,
                                                    damping: 25,
                                                    mass: 0.5
                                                }}
                                                className="inline-block"
                                            >
                                                {char}
                                            </motion.span>
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </div>
                        )}
                    </AnimatePresence>

                    {/* Smooth Caret - Only blink if isReady is true to save CPU during transition */}
                    {isFocused && isReady && (
                        <motion.div
                            layoutId="caret"
                            className="w-[5px] h-[0.9em] bg-primary rounded-full ml-2"
                            initial={{ opacity: 0 }}
                            animate={{
                                opacity: [0, 1, 0],
                            }}
                            transition={{
                                opacity: {
                                    repeat: Infinity,
                                    duration: 0.8,
                                    ease: "easeInOut"
                                },
                                layout: {
                                    type: "spring",
                                    stiffness: 500,
                                    damping: 30
                                }
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

