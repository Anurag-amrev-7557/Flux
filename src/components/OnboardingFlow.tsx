"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore, SUPPORTED_CURRENCIES } from "@/store/appStore";
import LanguageSelector from "@/components/LanguageSelector";
import { ActionModal } from "@/components/ActionModal";

interface OnboardingFlowProps {
    isOpen: boolean;
    onClose: () => void;
}

export function OnboardingFlow({ isOpen, onClose }: OnboardingFlowProps) {
    const {
        user,
        setUser,
        currency,
        setCurrency,
        language,
        setHasCompletedOnboarding,
        showToast
    } = useAppStore();

    const [step, setStep] = useState(1);
    const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
    const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
    const [userNameInput, setUserNameInput] = useState(user.name);
    const [userEmailInput, setUserEmailInput] = useState(user.email);

    if (!isOpen) return null;

    const handleNext = () => {
        if (step < 4) {
            setStep(step + 1);
        } else {
            handleComplete();
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    const handleComplete = () => {
        setHasCompletedOnboarding(true);
        onClose();
        showToast("Welcome to Flux! Your financial space is ready.", "success");
    };

    const handleSaveUser = () => {
        if (userNameInput.trim()) {
            setUser({
                ...user,
                name: userNameInput.trim(),
                email: userEmailInput.trim() || `${userNameInput.toLowerCase().replace(/\s+/g, '')}@flux.app`,
            });
            showToast("Identity updated", "success");
            setIsEditUserModalOpen(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] bg-white flex flex-col justify-between max-w-md mx-auto w-full overflow-y-auto">
            {/* Top Bar with Skip */}
            <header className="px-6 pt-6 pb-2 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm">
                        F
                    </div>
                    <span className="font-bold text-slate-900 text-sm tracking-tight">Flux</span>
                </div>
                {step < 4 && (
                    <button
                        onClick={handleComplete}
                        className="m3-btn m3-btn-text text-xs uppercase tracking-wider py-1 px-3 text-slate-500 hover:text-slate-900"
                    >
                        Skip
                    </button>
                )}
            </header>

            {/* Main Step Content */}
            <main className="flex-1 flex flex-col justify-center px-6 py-4">
                <AnimatePresence mode="wait">
                    {/* STEP 1: Welcome & Authorized Identity */}
                    {step === 1 && (
                        <motion.div
                            key="onboarding-step-1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="flex flex-col items-center text-center space-y-6"
                        >
                            {/* Icon with concentric ripples */}
                            <div className="relative flex items-center justify-center my-4">
                                <div className="absolute w-36 h-36 rounded-full border border-slate-100 animate-ping opacity-25" />
                                <div className="absolute w-28 h-28 rounded-full border border-slate-100" />
                                <div className="absolute w-20 h-20 rounded-full border border-slate-200/60" />
                                <div className="w-16 h-16 rounded-2xl bg-white shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center justify-center relative z-10">
                                    <span className="material-symbols-outlined text-3xl text-slate-900">
                                        trending_up
                                    </span>
                                </div>
                            </div>

                            <div>
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                                    Elevate Your <span className="italic font-serif font-bold">Finance</span>
                                </h1>
                                <p className="text-sm font-medium text-slate-500 mt-2 max-w-xs mx-auto">
                                    Experience the visionary way to master your wealth.
                                </p>
                            </div>

                            {/* Authorised Identity Card */}
                            <div className="w-full pt-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                    Authorised Identity
                                </p>
                                <div
                                    onClick={() => {
                                        setUserNameInput(user.name);
                                        setUserEmailInput(user.email);
                                        setIsEditUserModalOpen(true);
                                    }}
                                    className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.06)] p-4 flex items-center justify-between cursor-pointer hover:border-slate-300 hover:shadow-md transition-all group"
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-800 font-bold flex items-center justify-center text-base group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                            {user.name ? user.name.charAt(0).toUpperCase() : 'G'}
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-slate-900 text-sm">{user.name || 'Guest User'}</p>
                                            <p className="text-xs text-slate-400">{user.email || 'guest@example.com'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-slate-900 transition-colors">
                                        <span className="material-symbols-outlined text-lg">verified_user</span>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2 font-medium">Tap identity to customize your name</p>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2: Visionary Experience (Capabilities) */}
                    {step === 2 && (
                        <motion.div
                            key="onboarding-step-2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="flex flex-col space-y-5"
                        >
                            <div className="text-center">
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                                    Visionary Experience
                                </h1>
                                <p className="text-sm font-medium text-slate-500 mt-2">
                                    Engineered for your financial freedom.
                                </p>
                            </div>

                            <div className="space-y-3 pt-2">
                                {[
                                    {
                                        title: "Intelligent Sync",
                                        desc: "Secure real-time cloud architecture",
                                        icon: "sync",
                                        color: "bg-blue-100 text-blue-600",
                                    },
                                    {
                                        title: "Wealth Control",
                                        desc: "Precision tracking for every asset",
                                        icon: "account_balance",
                                        color: "bg-emerald-100 text-emerald-600",
                                    },
                                    {
                                        title: "Advanced Analysis",
                                        desc: "Visualise trends with neural clarity",
                                        icon: "show_chart",
                                        color: "bg-purple-100 text-purple-600",
                                    },
                                    {
                                        title: "Local-First Safety",
                                        desc: "Your data, encrypted and private",
                                        icon: "shield",
                                        color: "bg-orange-100 text-orange-600",
                                    },
                                ].map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3.5">
                                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                                                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 text-sm">{item.title}</p>
                                                <p className="text-xs text-slate-500 leading-tight">{item.desc}</p>
                                            </div>
                                        </div>
                                        <span className="material-symbols-outlined text-slate-300 text-lg">chevron_right</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: Preferences (Currency & Language) */}
                    {step === 3 && (
                        <motion.div
                            key="onboarding-step-3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="flex flex-col space-y-6"
                        >
                            <div className="text-center">
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                                    Preferences
                                </h1>
                                <p className="text-sm font-medium text-slate-500 mt-2">
                                    Tailor Flux to your needs.
                                </p>
                            </div>

                            {/* Currency Selection Grid */}
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5">
                                    Default Currency
                                </p>
                                <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-3xl border border-slate-100">
                                    {SUPPORTED_CURRENCIES.map((c) => {
                                        const isSelected = currency?.code === c.code;
                                        return (
                                            <button
                                                key={c.code}
                                                onClick={() => setCurrency(c)}
                                                className={`flex flex-col items-center justify-center py-4 rounded-2xl transition-all duration-200 active:scale-95 ${
                                                    isSelected
                                                        ? "bg-white text-slate-900 shadow-md ring-2 ring-slate-900/10 font-bold"
                                                        : "bg-transparent text-slate-500 hover:bg-white/60 hover:text-slate-800"
                                                }`}
                                            >
                                                <span className={`text-xl font-bold mb-0.5 ${isSelected ? "text-slate-900" : "text-slate-400"}`}>
                                                    {c.symbol}
                                                </span>
                                                <span className="text-[11px] font-semibold uppercase tracking-wider">
                                                    {c.code}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Language Selector */}
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5">
                                    Language
                                </p>
                                <button
                                    onClick={() => setIsLanguageModalOpen(true)}
                                    className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between text-left hover:bg-slate-100/70 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-slate-500 text-xl">translate</span>
                                        <span className="font-bold text-slate-900 text-sm">{language || "English"}</span>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-400">keyboard_arrow_down</span>
                                </button>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center mt-3">
                                    Flux supports 9 languages
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 4: Vision Realised */}
                    {step === 4 && (
                        <motion.div
                            key="onboarding-step-4"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="flex flex-col items-center text-center space-y-6"
                        >
                            {/* Glowing Checkmark */}
                            <div className="relative my-4">
                                <div className="w-24 h-24 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xl shadow-emerald-500/40">
                                    <span className="material-symbols-outlined text-5xl font-black">check</span>
                                </div>
                            </div>

                            <div>
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                                    Vision Realised
                                </h1>
                                <p className="text-sm font-medium text-slate-500 mt-2 max-w-xs mx-auto">
                                    Your custom Flux environment is ready. Let&apos;s start building your financial legacy.
                                </p>
                            </div>

                            {/* First Expedition Card */}
                            <div className="w-full bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col items-center text-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-200/30 rounded-full -mr-8 -mt-8" />
                                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 shadow-sm text-slate-800 flex items-center justify-center mb-3">
                                    <span className="material-symbols-outlined text-2xl">add_card</span>
                                </div>
                                <h3 className="font-bold text-slate-900 text-base">First Expedition</h3>
                                <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
                                    Tap the <strong className="text-slate-900">ADD</strong> button to log your first insight.
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Bottom Actions & Stepper */}
            <footer className="p-6 bg-white border-t border-slate-50 space-y-4">
                {/* Stepper Dots */}
                <div className="flex justify-center items-center gap-1.5">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                step === i ? "w-6 bg-slate-900" : "w-1.5 bg-slate-200"
                            }`}
                        />
                    ))}
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-3">
                    {step > 1 && (
                        <button
                            onClick={handleBack}
                            className="m3-btn m3-btn-outlined flex-1"
                        >
                            Back
                        </button>
                    )}
                    <button
                        onClick={handleNext}
                        className="m3-btn m3-btn-filled flex-1 shadow-lg shadow-slate-900/10"
                    >
                        {step === 4 ? "Let's Start" : "Next"}
                    </button>
                </div>
            </footer>

            {/* Language Selector Modal */}
            <LanguageSelector
                isOpen={isLanguageModalOpen}
                onClose={() => setIsLanguageModalOpen(false)}
            />

            {/* Edit User Modal */}
            <ActionModal
                isOpen={isEditUserModalOpen}
                onClose={() => setIsEditUserModalOpen(false)}
                title="Authorised Identity"
                description="Set your display name and email address for this device."
                confirmLabel="Save Identity"
                confirmVariant="slate"
                onConfirm={handleSaveUser}
            >
                <div className="space-y-3">
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Display Name</label>
                        <input
                            type="text"
                            value={userNameInput}
                            onChange={(e) => setUserNameInput(e.target.value)}
                            placeholder="Your Name"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-slate-900"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Email</label>
                        <input
                            type="email"
                            value={userEmailInput}
                            onChange={(e) => setUserEmailInput(e.target.value)}
                            placeholder="your.email@example.com"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:border-slate-900"
                        />
                    </div>
                </div>
            </ActionModal>
        </div>
    );
}
