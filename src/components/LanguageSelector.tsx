"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/hooks/useI18n";
import { useAppStore } from "@/store/appStore";
import { languages } from "@/i18n/translations";
import { triggerHaptic } from "@/utils/haptics";

interface LanguageSelectorProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LanguageSelector({ isOpen, onClose }: LanguageSelectorProps) {
    const { t, language } = useI18n();
    const { setLanguage } = useAppStore();

    const handleClose = () => {
        triggerHaptic('light');
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="language-selector-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[90]"
                    />

                    {/* Modal Container */}
                    <div key="language-selector-modal-container" className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
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

                            <header className="px-6 py-4 flex flex-col items-center sticky top-0 bg-white dark:bg-[#141416] z-10 border-b border-transparent dark:border-white/5">
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
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white">{t('select_language')}</h3>
                                        <p className="text-slate-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider leading-tight">{t('choose_language')}</p>
                                    </div>
                                    <div className="w-10"></div>
                                </div>
                            </header>

                            {/* Language List */}
                            <div className="px-4 pb-8 max-h-[60vh] overflow-y-auto">
                                <div className="grid grid-cols-1 gap-2.5 mt-3">
                                    {languages.map((lang) => {
                                        const isSelected = language === lang.name || language === lang.code;
                                        return (
                                            <button
                                                key={lang.code}
                                                onClick={() => {
                                                    triggerHaptic('success');
                                                    setLanguage(lang.name);
                                                    onClose();
                                                }}
                                                className={`
                          group relative flex items-center justify-between p-4 rounded-2xl transition-all duration-300
                          ${isSelected
                                                        ? 'bg-primary/5 dark:bg-[#27272a] ring-2 ring-primary dark:ring-white/20 shadow-sm dark:shadow-none'
                                                        : 'bg-slate-50 dark:bg-white/5 border border-transparent dark:border-white/5 hover:bg-white dark:hover:bg-white/10 hover:border-slate-200 dark:hover:border-white/10 hover:shadow-md'
                                                    }
                        `}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`
                            w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold transition-colors
                            ${isSelected ? 'bg-primary text-white dark:bg-white dark:text-zinc-950' : 'bg-white dark:bg-white/10 text-slate-500 dark:text-zinc-300 shadow-sm dark:shadow-none'}
                          `}>
                                                        {lang.code.toUpperCase()}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className={`font-bold transition-colors ${isSelected ? 'text-primary dark:text-white' : 'text-slate-700 dark:text-zinc-200'}`}>
                                                            {lang.name}
                                                        </p>
                                                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium uppercase tracking-wider">
                                                            {lang.code === 'en' ? 'Default' : lang.code}
                                                        </p>
                                                    </div>
                                                </div>

                                                {isSelected ? (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="w-6 h-6 rounded-full bg-primary dark:bg-white flex items-center justify-center"
                                                    >
                                                        <span className="material-symbols-outlined text-white dark:text-zinc-950 text-[16px] font-bold">check</span>
                                                    </motion.div>
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full border-2 border-slate-200 dark:border-white/20 group-hover:border-primary/30 dark:group-hover:border-white/40 transition-colors" />
                                                )}
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
