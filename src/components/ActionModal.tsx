"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface ActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
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
    description,
    children,
    confirmLabel = "Confirm",
    confirmVariant = "primary",
    onConfirm,
    isConfirmLoading = false,
}: ActionModalProps) {
    const variantClasses = {
        primary: "bg-primary text-slate-900 hover:bg-primary/90",
        danger: "bg-red-500 text-white hover:bg-red-600",
        slate: "bg-slate-900 text-white hover:bg-slate-800",
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden ring-1 ring-slate-900/5"
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.8 }}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 100 || info.velocity.y > 500) {
                                onClose();
                            }
                        }}
                    >
                        <header className="px-6 py-6 flex flex-col items-center border-b border-slate-50 sticky top-0 bg-white z-10">
                            <div className="w-full flex items-center justify-center relative">
                                <h2 className="text-xl font-black text-slate-900">{title}</h2>
                            </div>
                        </header>
                        <div className="p-6">
                            {description && (
                                <p className="text-sm font-medium text-slate-500 leading-relaxed mb-6">
                                    {description}
                                </p>
                            )}

                            {children && <div className="mb-6">{children}</div>}

                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 bg-slate-100 text-slate-600 hover:bg-slate-200 py-3 rounded-xl text-sm font-bold active:scale-[0.98] transition-all"
                                >
                                    Cancel
                                </button>
                                {onConfirm && (
                                    <button
                                        onClick={onConfirm}
                                        disabled={isConfirmLoading}
                                        className={`flex-[1.5] py-3 rounded-xl text-sm font-bold shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${variantClasses[confirmVariant]}`}
                                    >
                                        {isConfirmLoading ? (
                                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            confirmLabel
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
