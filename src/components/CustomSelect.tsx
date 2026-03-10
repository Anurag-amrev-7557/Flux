"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useI18n } from "@/hooks/useI18n";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Option {
    id: string;
    name: string;
    icon?: string;
}

interface CustomSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    icon?: string; // Icon for the trigger prefix
    className?: string;
    onAddClick?: () => void;
    onDeleteItem?: (id: string) => void;
    direction?: "up" | "down";
}

export default function CustomSelect({
    options,
    value,
    onChange,
    placeholder = "Select an option",
    label,
    icon,
    className,
    onAddClick,
    onDeleteItem,
    direction = "down"
}: CustomSelectProps) {
    const { t } = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.id === value);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!isOpen) return;
            const target = event.target as Node;
            const isClickInsideContainer = containerRef.current?.contains(target);
            const isClickInsideDropdown = dropdownRef.current?.contains(target);

            if (!isClickInsideContainer && !isClickInsideDropdown) {
                setIsOpen(false);
            }
        };

        const updateCoords = () => {
            if (triggerRef.current && isOpen) {
                const rect = triggerRef.current.getBoundingClientRect();
                setCoords({
                    top: rect.top,
                    left: rect.left,
                    width: rect.width
                });
            }
        };

        if (isOpen) {
            updateCoords();
            window.addEventListener("scroll", updateCoords, true);
            window.addEventListener("resize", updateCoords);
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("scroll", updateCoords, true);
            window.removeEventListener("resize", updateCoords);
        };
    }, [isOpen]);

    const toggleOpen = () => {
        if (!isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.top,
                left: rect.left,
                width: rect.width
            });
        }
        setIsOpen(!isOpen);
    };

    const handleSelect = (optionId: string) => {
        onChange(optionId);
        setIsOpen(false);
    };

    return (
        <div className={cn("space-y-2 w-full relative", isOpen ? "z-[10000]" : "z-0", className)} ref={containerRef}>
            {label && <label className="text-sm font-semibold text-slate-600 px-1">{label}</label>}

            <div className="relative mt-1">
                {/* Trigger Button */}
                <button
                    ref={triggerRef}
                    type="button"
                    onClick={toggleOpen}
                    className={cn(
                        "w-full h-14 pl-12 pr-10 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary text-base font-medium text-left transition-all flex items-center",
                        isOpen && "ring-2 ring-primary border-transparent bg-white shadow-md"
                    )}
                >
                    {/* Prefix Icon (Prop icon or selected option icon) */}
                    {(icon || selectedOption?.icon) && (
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none">
                            {selectedOption?.icon || icon}
                        </span>
                    )}

                    <span className={cn(
                        "truncate",
                        !selectedOption && "text-slate-500 font-normal"
                    )}>
                        {selectedOption ? selectedOption.name : placeholder}
                    </span>

                    <motion.span
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.3, ease: "anticipate" }}
                        className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    >
                        expand_more
                    </motion.span>
                </button>

                {/* Dropdown Menu */}
                {mounted && createPortal(
                    <AnimatePresence>
                        {isOpen && coords && (
                            <motion.div
                                ref={dropdownRef}
                                initial={{ opacity: 0, scale: 0.95, y: direction === "up" ? 10 : -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: direction === "up" ? 10 : -10 }}
                                transition={{
                                    duration: 0.2,
                                    ease: [0.16, 1, 0.3, 1] // Custom ease out quint
                                }}
                                className={cn(
                                    "fixed z-[9999] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-200 overflow-hidden"
                                )}
                                style={{
                                    top: direction === "up" ? "auto" : coords.top + 56 + 8,
                                    bottom: direction === "up" ? (window.innerHeight - coords.top) + 8 : "auto",
                                    left: coords.left,
                                    width: coords.width,
                                }}
                            >
                                <div className="max-h-64 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                    {onAddClick && (
                                        <div className="pb-1 mb-1 border-b border-slate-100">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onAddClick();
                                                    setIsOpen(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold text-primary hover:bg-primary/5 transition-all active:scale-[0.98]"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">add_circle</span>
                                                {t('add_new')}
                                            </button>
                                        </div>
                                    )}

                                    {options.length === 0 ? (
                                        <div className="px-4 py-3 text-sm text-slate-500 text-center italic">
                                            {t('no_options')}
                                        </div>
                                    ) : (
                                        options.map((option) => (
                                            <button
                                                key={option.id}
                                                type="button"
                                                onClick={() => handleSelect(option.id)}
                                                className={cn(
                                                    "w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-all group",
                                                    value === option.id
                                                        ? "bg-primary text-white"
                                                        : "text-slate-700 hover:bg-slate-100/80 active:scale-[0.98]"
                                                )}
                                            >
                                                <div className="flex items-center gap-3 truncate">
                                                    {option.icon && (
                                                        <span className={cn(
                                                            "material-symbols-outlined text-[20px]",
                                                            value === option.id ? "text-white" : "text-slate-500"
                                                        )}>
                                                            {option.icon}
                                                        </span>
                                                    )}
                                                    <span className="truncate">{option.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {value === option.id && !onDeleteItem && (
                                                        <motion.span
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            className="material-symbols-outlined text-[18px]"
                                                        >
                                                            check
                                                        </motion.span>
                                                    )}
                                                    {onDeleteItem && !option.id.startsWith('cat-') && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onDeleteItem(option.id);
                                                            }}
                                                            className="p-1.5 rounded-full hover:bg-red-500 hover:text-white text-slate-400 transition-all"
                                                        >
                                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                                        </button>
                                                    )}
                                                    {value === option.id && onDeleteItem && (
                                                        <span className="material-symbols-outlined text-[18px] text-white">check</span>
                                                    )}
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
            </div>
        </div>
    );
}
