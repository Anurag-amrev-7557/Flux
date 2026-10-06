"use client";

import { useAppStore } from "@/store/appStore";
import LogExpenseModal from "./LogExpenseModal";
import SplitBillModal from "./SplitBillModal";
import { OnboardingFlow } from "./OnboardingFlow";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";

import { useEffect, useState } from "react";

export default function ModalContainer() {
    const [mounted, setMounted] = useState(false);
    const {
        isLogExpenseOpen,
        setIsLogExpenseOpen,
        isSplitBillOpen,
        setIsSplitBillOpen,
        initialCategoryName,
        setInitialCategoryName,
        initialTransactionType,
        editingTransactionId,
        setEditingTransactionId,
        toast,
        clearToast,
        isOnboardingOpen,
        setIsOnboardingOpen,
        hasCompletedOnboarding,
    } = useAppStore();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <>
            <OnboardingFlow
                isOpen={isOnboardingOpen || !hasCompletedOnboarding}
                onClose={() => setIsOnboardingOpen(false)}
            />

            <LogExpenseModal
                isOpen={isLogExpenseOpen}
                transactionId={editingTransactionId || undefined}
                initialCategoryName={initialCategoryName || undefined}
                initialType={initialTransactionType || "expense"}
                onClose={() => {
                    setIsLogExpenseOpen(false);
                    setEditingTransactionId(null);
                    setInitialCategoryName(null);
                }}
            />

            <SplitBillModal
                isOpen={isSplitBillOpen}
                onClose={() => setIsSplitBillOpen(false)}
            />

            {/* Global Floating Toast - floats cleanly above BottomNav with unclipped ambient shadow */}
            <div className="fixed bottom-0 left-0 right-0 z-[60] pointer-events-none flex justify-center px-4 pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
                <AnimatePresence>
                    {toast && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.94 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 14, scale: 0.94 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            className={clsx(
                                "pointer-events-auto flex items-center justify-between gap-3 px-4 py-2.5 rounded-full shadow-[0_12px_36px_-4px_rgba(0,0,0,0.55),0_4px_16px_rgba(0,0,0,0.3)] border max-w-sm",
                                "bg-slate-950/95 text-white border-slate-700/70 ring-1 ring-white/10"
                            )}
                        >
                            <div className="flex items-center gap-2.5 pl-0.5">
                                <span className={clsx(
                                    "material-symbols-outlined text-[18px] shrink-0",
                                    toast.type === 'error' && "text-rose-400",
                                    toast.type === 'info' && "text-sky-400",
                                    (!toast.type || toast.type === 'success') && "text-emerald-400"
                                )}>
                                    {toast.type === 'error' ? 'error' : (toast.type === 'info' ? 'info' : 'check_circle')}
                                </span>
                                <span className="text-xs font-medium text-slate-100 leading-snug pr-1 select-none">{toast.message}</span>
                            </div>
                            <button
                                onClick={clearToast}
                                className="text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10 active:scale-90"
                                aria-label="Dismiss toast"
                            >
                                <span className="material-symbols-outlined text-sm leading-none block">close</span>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}

