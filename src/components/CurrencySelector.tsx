"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useAppStore, SUPPORTED_CURRENCIES, CurrencyConfig } from "@/store/appStore";
import { triggerHaptic } from "@/utils/haptics";

interface CurrencySelectorProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CurrencySelector({ isOpen, onClose }: CurrencySelectorProps) {
    const { currency, setCurrency, showToast } = useAppStore();

    const handleClose = () => {
        triggerHaptic('light');
        onClose();
    };

    const handleSelect = (c: CurrencyConfig) => {
        triggerHaptic('success');
        setCurrency(c);
        showToast(`Currency changed to ${c.code} (${c.symbol})`, "success");
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="currency-selector-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[90]"
                    />

                    {/* Modal Container */}
                    <div key="currency-selector-modal-container" className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ duration: 0.16, ease: "easeOut" }}
                            className="bg-white dark:bg-[#141416] w-full max-w-md rounded-t-[32px] shadow-2xl dark:shadow-[0_-8px_32px_rgba(0,0,0,0.8)] overflow-hidden pointer-events-auto border-t border-slate-100 dark:border-white/10 pb-safe"
                            drag="y"
                            dragConstraints={{ top: 0, bottom: 0 }}
                            dragElastic={{ top: 0, bottom: 0.8 }}
                            onDragEnd={(_, info) => {
                                if (info.offset.y > 80 || info.velocity.y > 400) {
                                    handleClose();
                                }
                            }}
                        >
                            <header className="px-6 py-4 flex flex-col items-center sticky top-0 bg-white dark:bg-[#141416] z-10 border-b border-slate-50 dark:border-white/5">
                                <div className="w-full flex justify-center py-2 -mt-2 cursor-grab active:cursor-grabbing sm:hidden">
                                    <div className="w-12 h-1.5 bg-slate-200 dark:bg-white/20 rounded-full" />
                                </div>
                                <div className="w-full flex items-center justify-between relative">
                                    <button
                                        onClick={handleClose}
                                        className="m3-icon-btn text-slate-400 dark:text-zinc-300 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
                                        aria-label="Close modal"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">close</span>
                                    </button>
                                    <div className="text-center absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white">Default Currency</h3>
                                        <p className="text-slate-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider leading-tight">Tailor Flux to your needs</p>
                                    </div>
                                    <div className="w-10"></div>
                                </div>
                            </header>

                            <div className="p-6">

                                <div className="grid grid-cols-3 gap-3 bg-slate-50/80 dark:bg-black/40 p-3 rounded-2xl border border-slate-100 dark:border-white/10">
                                    {SUPPORTED_CURRENCIES.map((c) => {
                                        const isSelected = currency?.code === c.code;
                                        return (
                                            <button
                                                key={c.code}
                                                onClick={() => handleSelect(c)}
                                                className={`flex flex-col items-center justify-center py-5 rounded-xl transition-all duration-200 active:scale-95 ${
                                                    isSelected
                                                        ? "bg-white dark:bg-[#27272a] text-slate-900 dark:text-white shadow-md dark:shadow-none dark:border dark:border-white/15 font-bold"
                                                        : "bg-transparent text-slate-500 dark:text-zinc-400 hover:bg-white/60 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-zinc-200"
                                                }`}
                                            >
                                                <span className={`text-2xl font-bold mb-1 ${isSelected ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-zinc-400"}`}>
                                                    {c.symbol}
                                                </span>
                                                <span className="text-xs font-semibold uppercase tracking-wider">
                                                    {c.code}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
