"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/hooks/useI18n";
import { useAppStore } from "@/store/appStore";

interface LanguageSelectorProps {
    isOpen: boolean;
    onClose: () => void;
}

export const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },
    { code: 'pt', name: 'Português' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'zh', name: '中文' },
    { code: 'ja', name: '日本語' },
];

export default function LanguageSelector({ isOpen, onClose }: LanguageSelectorProps) {
    const { t, language } = useI18n();
    const { setLanguage } = useAppStore();

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
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90]"
                    />

                    {/* Modal Container */}
                    <div key="language-selector-modal-container" className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="bg-white w-full max-w-md rounded-t-[32px] shadow-2xl overflow-hidden pointer-events-auto border-t border-slate-100 pb-safe"
                            drag="y"
                            dragConstraints={{ top: 0, bottom: 0 }}
                            dragElastic={{ top: 0, bottom: 0.8 }}
                            onDragEnd={(_, info) => {
                                if (info.offset.y > 100 || info.velocity.y > 500) {
                                    onClose();
                                }
                            }}
                        >

                            <header className="px-6 py-4 flex flex-col items-center sticky top-0 bg-white z-10">
                                <div className="w-12 h-1.5 bg-slate-100 rounded-full mb-4 sm:hidden" />
                                <div className="w-full flex items-center justify-between relative">
                                    <button
                                        onClick={onClose}
                                        className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">close</span>
                                    </button>
                                    <div className="text-center absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                                        <h3 className="text-xl font-black text-slate-900">{t('select_language')}</h3>
                                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider leading-tight">{t('choose_language')}</p>
                                    </div>
                                    <div className="w-10"></div>
                                </div>
                            </header>

                            {/* Language List */}
                            <div className="px-4 pb-8 max-h-[60vh] overflow-y-auto">
                                <div className="grid grid-cols-1 gap-2.5 mt-3">
                                    {languages.map((lang, index) => {
                                        const isSelected = language === lang.name || language === lang.code;
                                        return (
                                            <motion.button
                                                key={lang.code}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                onClick={() => {
                                                    setLanguage(lang.name);
                                                    onClose();
                                                }}
                                                className={`
                          group relative flex items-center justify-between p-4 rounded-2xl transition-all duration-300
                          ${isSelected
                                                        ? 'bg-primary/5 ring-2 ring-primary shadow-sm'
                                                        : 'bg-slate-50 border border-transparent hover:bg-white hover:border-slate-200 hover:shadow-md'
                                                    }
                        `}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`
                            w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold transition-colors
                            ${isSelected ? 'bg-primary text-white' : 'bg-white text-slate-500 shadow-sm'}
                          `}>
                                                        {lang.code.toUpperCase()}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className={`font-bold transition-colors ${isSelected ? 'text-primary' : 'text-slate-700'}`}>
                                                            {lang.name}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                                                            {lang.code === 'en' ? 'Default' : lang.code}
                                                        </p>
                                                    </div>
                                                </div>

                                                {isSelected ? (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                                                    >
                                                        <span className="material-symbols-outlined text-white text-[16px] font-bold">check</span>
                                                    </motion.div>
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full border-2 border-slate-200 group-hover:border-primary/30 transition-colors" />
                                                )}
                                            </motion.button>
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
