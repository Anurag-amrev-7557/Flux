"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRef, useState, useMemo } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { useAppStore } from "@/store/appStore";
import { evaluateMathExpression } from "@/utils/mathEval";
import { triggerHaptic } from "@/utils/haptics";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface PriceInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    isReady?: boolean; // New prop to delay animations
    currencySymbol?: string;
}

export default function PriceInput({
    value,
    onChange,
    placeholder = "0.00",
    className,
    isReady = true,
    currencySymbol
}: PriceInputProps) {
    const storeSymbol = useAppStore((state) => state.currency?.symbol ?? "$");
    const activeSymbol = currencySymbol ?? storeSymbol;
    const inputRef = useRef<HTMLInputElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleClick = () => {
        inputRef.current?.focus();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        // Allow numbers, decimal point, arithmetic operators (+, -, *, /, x, X, parentheses, spaces)
        if (val === "" || /^[\d\s.+\-*/xX()÷,]*$/.test(val)) {
            onChange(val);
        }
    };

    const hasMath = /[+\-*/xX()÷]/.test(value);
    const evaluatedResult = useMemo(() => {
        if (!hasMath) return null;
        return evaluateMathExpression(value);
    }, [value, hasMath]);

    const handleApplyEvaluation = () => {
        if (evaluatedResult !== null) {
            triggerHaptic('success');
            onChange(evaluatedResult.toString());
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && evaluatedResult !== null) {
            e.preventDefault();
            handleApplyEvaluation();
        }
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (evaluatedResult !== null) {
            onChange(evaluatedResult.toString());
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
                "relative flex flex-col items-center justify-center min-h-[105px] cursor-text w-full select-none py-2",
                className
            )}
        >
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={handleBlur}
                className="absolute opacity-0 pointer-events-none inset-0 w-full h-full"
                autoFocus
            />

            <div className="relative flex items-center justify-center font-semibold text-5xl sm:text-6xl tracking-tight h-[1.2em] tabular-nums">
                <span className="text-3xl sm:text-4xl font-medium text-slate-400 dark:text-zinc-300 mr-2 select-none self-center shrink-0">
                    {activeSymbol}
                </span>
                <div className="relative flex items-center justify-center">
                    {characters.length === 0 ? (
                        <span className="text-slate-300/80 dark:text-zinc-400/70 pointer-events-none select-none">
                            {placeholder}
                        </span>
                    ) : (
                        <div className="flex items-center">
                            {characters.map((char, index) => (
                                <div key={`char-box-${index}`} className="relative h-[1.2em] overflow-hidden flex items-center justify-center">
                                    <motion.span
                                        key={`${index}-${char}`}
                                        initial={isReady ? { y: 8, opacity: 0 } : { y: 0, opacity: 1 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ y: -8, opacity: 0 }}
                                        transition={{
                                            duration: 0.15,
                                            ease: "easeOut"
                                        }}
                                        className={cn(
                                            "inline-block",
                                            "+-*/xX()÷".includes(char)
                                                ? "text-primary dark:text-rose-400 font-normal px-0.5 scale-90"
                                                : "text-slate-900 dark:text-white"
                                        )}
                                    >
                                        {char}
                                    </motion.span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Smooth Caret */}
                    {isFocused && isReady && (
                        <motion.div
                            className="w-[3px] h-[0.9em] bg-slate-900 dark:bg-white rounded-full ml-1"
                            initial={{ opacity: 0 }}
                            animate={{
                                opacity: [0, 1, 0],
                            }}
                            transition={{
                                opacity: {
                                    repeat: Infinity,
                                    duration: 0.9,
                                    ease: "easeInOut"
                                }
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Smart Math Result Preview Pill */}
            <AnimatePresence>
                {evaluatedResult !== null && (
                    <motion.button
                        type="button"
                        initial={{ opacity: 0, y: -4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleApplyEvaluation();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 mt-2.5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                        title="Click to calculate"
                    >
                        <span className="material-symbols-outlined text-[15px]">calculate</span>
                        <span>= {activeSymbol}{evaluatedResult.toFixed(2)}</span>
                        <span className="text-[10px] opacity-75 font-normal ml-0.5">apply</span>
                    </motion.button>
                )}
            </AnimatePresence>

        </div>
    );
}

