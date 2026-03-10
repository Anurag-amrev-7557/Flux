"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    isSameDay,
    addDays,
    eachDayOfInterval,
    isToday
} from "date-fns";
import { useI18n } from "@/hooks/useI18n";
import { TranslationKey } from "@/i18n/translations";

interface CustomDatePickerProps {
    label: string;
    value: string; // ISO string or empty
    onChange: (date: string) => void;
    className?: string;
    direction?: "up" | "down";
}

export default function CustomDatePicker({
    label,
    value,
    onChange,
    className,
    direction = "down"
}: CustomDatePickerProps) {
    const { t } = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
    const [view, setView] = useState<"days" | "months" | "years">("days");
    const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedDate = value ? new Date(value) : null;

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
                setView("days");
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
        setView("days");
    };

    const days = eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentMonth)),
        end: endOfWeek(endOfMonth(currentMonth))
    });

    const handleDateSelect = (date: Date) => {
        onChange(format(date, "yyyy-MM-dd"));
        setIsOpen(false);
        setView("days");
    };

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const nextYear = () => setCurrentMonth(addMonths(currentMonth, 12));
    const prevYear = () => setCurrentMonth(subMonths(currentMonth, 12));

    const years = Array.from({ length: 12 }, (_, i) => {
        const year = currentMonth.getFullYear() - 5 + i;
        return year;
    });

    const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    return (
        <div className={clsx("relative", isOpen ? "z-[10000]" : "z-0", className)} ref={containerRef}>
            <label className="block text-sm font-semibold text-slate-600 px-1 mb-2">{label}</label>

            <button
                ref={triggerRef}
                type="button"
                onClick={toggleOpen}
                className={clsx(
                    "w-full h-14 pl-4 pr-4 bg-slate-50 border border-slate-200 rounded-full flex items-center gap-3 text-base font-medium transition-all text-left",
                    isOpen ? "ring-2 ring-primary border-primary" : "hover:border-slate-300"
                )}
            >
                <span className="material-symbols-outlined text-slate-400 pointer-events-none">
                    event
                </span>
                <span className={clsx("flex-1", selectedDate ? "text-slate-900" : "text-slate-400")}>
                    {selectedDate ? format(selectedDate, "PPP") : t('select_date')}
                </span>
                <span className={clsx(
                    "material-symbols-outlined text-slate-400 transition-transform",
                    isOpen && "rotate-180"
                )}>
                    expand_more
                </span>
            </button>

            {mounted && createPortal(
                <AnimatePresence>
                    {isOpen && coords && (
                        <motion.div
                            ref={dropdownRef}
                            initial={{ opacity: 0, scale: 0.95, y: direction === "up" ? 10 : -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: direction === "up" ? 10 : -10 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            className={clsx(
                                "fixed z-[9999] bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-200 overflow-hidden"
                            )}
                            style={{
                                top: direction === "up" ? "auto" : coords.top + 56 + 8,
                                bottom: direction === "up" ? (window.innerHeight - coords.top) + 8 : "auto",
                                left: coords.left,
                                width: coords.width,
                            }}
                        >
                            {/* Calendar Header */}
                            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white">
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setView(view === "months" ? "days" : "months")}
                                        className={clsx(
                                            "px-2 py-1.5 rounded-xl font-bold text-sm transition-all active:scale-95",
                                            view === "months" ? "bg-primary text-white shadow-md shadow-primary/20" : "text-slate-800 hover:bg-slate-100"
                                        )}
                                    >
                                        {format(currentMonth, "MMMM")}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setView(view === "years" ? "days" : "years")}
                                        className={clsx(
                                            "px-2 py-1.5 rounded-xl font-bold text-sm transition-all active:scale-95",
                                            view === "years" ? "bg-primary text-white shadow-md shadow-primary/20" : "text-slate-800 hover:bg-slate-100"
                                        )}
                                    >
                                        {format(currentMonth, "yyyy")}
                                    </button>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (view === "years") prevYear();
                                            else prevMonth();
                                        }}
                                        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[22px]">chevron_left</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (view === "years") nextYear();
                                            else nextMonth();
                                        }}
                                        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[22px]">chevron_right</span>
                                    </button>
                                </div>
                            </div>

                            {/* Calendar Body */}
                            <div className="p-3 bg-white min-h-[280px] flex flex-col">
                                {view === "days" && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex-1"
                                    >
                                        <div className="grid grid-cols-7 mb-2">
                                            {(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as TranslationKey[]).map((d) => (
                                                <span key={d} className="text-[10px] font-black uppercase text-slate-400 text-center py-1">
                                                    {t(d)}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-7 gap-1">
                                            {days.map((day: Date, idx: number) => {
                                                const isSelected = selectedDate && isSameDay(day, selectedDate);
                                                const isCurrentMonth = isSameMonth(day, currentMonth);
                                                const isTodayDate = isToday(day);

                                                return (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => handleDateSelect(day)}
                                                        className={clsx(
                                                            "aspect-square flex items-center justify-center rounded-xl text-sm font-bold transition-all active:scale-90",
                                                            !isCurrentMonth && "text-slate-200",
                                                            isCurrentMonth && !isSelected && "text-slate-700 hover:bg-slate-100",
                                                            isSelected && "bg-primary text-white shadow-lg shadow-primary/20 scale-105",
                                                            isTodayDate && !isSelected && "text-primary border border-primary/20 bg-primary/5"
                                                        )}
                                                    >
                                                        {format(day, "d")}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}

                                {view === "months" && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="grid grid-cols-3 gap-2 flex-1"
                                    >
                                        {months.map((m, idx) => {
                                            const isCurrent = currentMonth.getMonth() === idx;
                                            return (
                                                <button
                                                    key={m}
                                                    type="button"
                                                    onClick={() => {
                                                        const next = new Date(currentMonth);
                                                        next.setMonth(idx);
                                                        setCurrentMonth(next);
                                                        setView("days");
                                                    }}
                                                    className={clsx(
                                                        "py-4 rounded-xl text-sm font-bold transition-all active:scale-95",
                                                        isCurrent ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-700 hover:bg-slate-100"
                                                    )}
                                                >
                                                    {m}
                                                </button>
                                            );
                                        })}
                                    </motion.div>
                                )}

                                {view === "years" && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="grid grid-cols-3 gap-2 flex-1"
                                    >
                                        {years.map((y) => {
                                            const isCurrent = currentMonth.getFullYear() === y;
                                            return (
                                                <button
                                                    key={y}
                                                    type="button"
                                                    onClick={() => {
                                                        const next = new Date(currentMonth);
                                                        next.setFullYear(y);
                                                        setCurrentMonth(next);
                                                        setView("days");
                                                    }}
                                                    className={clsx(
                                                        "py-4 rounded-xl text-sm font-bold transition-all active:scale-95",
                                                        isCurrent ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-700 hover:bg-slate-100"
                                                    )}
                                                >
                                                    {y}
                                                </button>
                                            );
                                        })}
                                    </motion.div>
                                )}
                            </div>

                            {/* Footer / Today Link */}
                            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-center">
                                <button
                                    type="button"
                                    onClick={() => handleDateSelect(new Date())}
                                    className="text-xs font-bold text-primary hover:underline"
                                >
                                    {t('today')}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
