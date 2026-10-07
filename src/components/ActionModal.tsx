"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { LoadingIndicator } from "./LoadingIndicator";
import clsx from "clsx";
import { triggerHaptic } from "@/utils/haptics";

interface ActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    description?: string;
    icon?: string;
    children?: ReactNode;
    confirmLabel?: string;
    confirmVariant?: "primary" | "danger" | "slate";
    onConfirm?: () => void;
    isConfirmLoading?: boolean;
}

export function ActionModal({
    isOpen,
    onClose,
    title,
    subtitle,
    description,
    icon,
    children,
    confirmLabel = "Confirm",
    confirmVariant = "primary",
    onConfirm,
    isConfirmLoading = false,
}: ActionModalProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const isDanger = confirmVariant === "danger";
    const defaultIcon = icon || (isDanger ? "delete" : title.toLowerCase().includes("cannot") ? "warning" : "edit_note");

    const handleClose = () => {
        triggerHaptic('light');
        onClose();
    };

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="action-modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[90] pointer-events-auto"
                    />

                    {/* Modal Bottom Sheet Container */}
                    <div key="action-modal-container" className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
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
                            {/* Header */}
                            <header className="px-6 py-4 flex flex-col items-center sticky top-0 bg-white dark:bg-[#141416] z-10 border-b border-slate-50 dark:border-white/5">
                                <div className="w-full flex justify-center py-2 -mt-2 cursor-grab active:cursor-grabbing sm:hidden">
                                    <div className="w-12 h-1.5 bg-slate-200 dark:bg-white/20 rounded-full" />
                                </div>
                                <div className="w-full flex items-center justify-between relative">
                                    <button
                                        onClick={handleClose}
                                        type="button"
                                        className="m3-icon-btn text-slate-400 dark:text-zinc-300 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
                                        aria-label="Close modal"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">close</span>
                                    </button>
                                    <div className="text-center absolute left-1/2 -translate-x-1/2 max-w-[calc(100%-88px)] truncate">
                                        <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate">{title}</h3>
                                        <p className="text-slate-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider leading-tight truncate">
                                            {subtitle || (isDanger ? "Confirm action" : "Action required")}
                                        </p>
                                    </div>
                                    <div className="w-10" />
                                </div>
                            </header>

                            {/* Body Content */}
                            <div className="p-6">
                                {/* Visual Badge if confirmation dialog without custom children */}
                                {!children && (
                                    <div className={clsx(
                                        "w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 border shadow-2xs",
                                        isDanger
                                            ? "bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-200/80 dark:border-rose-500/30"
                                            : "bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-zinc-200 border-slate-200/80 dark:border-white/10"
                                    )}>
                                        <span className="material-symbols-outlined text-[28px]">
                                            {defaultIcon}
                                        </span>
                                    </div>
                                )}

                                {description && (
                                    <p className={clsx(
                                        "text-sm font-medium leading-relaxed text-center",
                                        children ? "text-slate-500 dark:text-zinc-400 mb-4" : "text-slate-600 dark:text-zinc-300 max-w-sm mx-auto mb-6"
                                    )}>
                                        {description}
                                    </p>
                                )}

                                {children && <div className="mb-6">{children}</div>}

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="h-12 rounded-full font-bold text-sm bg-slate-100 dark:bg-[#1f1f23] text-slate-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-[#28282d] border border-slate-200/80 dark:border-white/10 active:scale-95 transition-all flex items-center justify-center"
                                    >
                                        Cancel
                                    </button>
                                    {onConfirm && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                triggerHaptic(isDanger ? 'warning' : 'medium');
                                                onConfirm();
                                            }}
                                            disabled={isConfirmLoading}
                                            className={clsx(
                                                "h-12 rounded-full font-bold text-sm text-white active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm",
                                                isDanger
                                                    ? "bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500"
                                                    : "bg-slate-900 dark:bg-white dark:text-zinc-950 hover:bg-slate-800 dark:hover:bg-zinc-200"
                                            )}
                                        >
                                            {isConfirmLoading ? (
                                                <LoadingIndicator size={20} color="currentColor" label="Processing..." />
                                            ) : (
                                                confirmLabel
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );

    if (!mounted) return null;
    return createPortal(modalContent, document.body);
}
