"use client";

import { useAppStore } from "@/store/appStore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import LanguageSelector, { languages } from "@/components/LanguageSelector";

export default function SettingsPage() {
    const router = useRouter();
    const { user, setUser, logout, setLanguage } = useAppStore();
    const { t, language } = useI18n();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);


    const currentLanguageName = languages.find(l => l.name === language || l.code === language)?.name || language;

    const handleLogout = () => {
        setIsLoggingOut(true);
        setTimeout(() => {
            logout();
            router.push('/');
        }, 1000);
    };

    const handleEditProfile = () => {
        const newName = prompt("Enter your name:", user.name);
        if (newName && newName !== user.name) {
            setUser({ ...user, name: newName });
        }
    };

    return (
        <main className="flex-1 overflow-y-auto max-w-md mx-auto w-full pb-24">
            <header className="sticky top-0 z-10 bg-background-light/80 backdrop-blur-md py-4 px-4">
                <div className="flex items-center justify-between w-full">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-200 transition-colors"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h2 className="text-lg font-bold tracking-tight">{t('settings')}</h2>
                    <div className="w-10 h-10"></div>
                </div>
            </header>

            <section className="p-6">
                <div className="flex items-center gap-5">
                    <div className="relative group">
                        <div
                            className="w-20 h-20 rounded-full bg-cover bg-center ring-4 ring-primary/20 overflow-hidden"
                            style={{ backgroundImage: `url("${user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?fit=crop&w=256&h=256'}")` }}
                        ></div>
                        <button
                            onClick={handleEditProfile}
                            className="absolute bottom-0 right-0 bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm cursor-pointer hover:bg-primary/90 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[16px] scale-90">edit</span>
                        </button>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">{user.name}</h3>
                        <p className="text-slate-500 text-sm">{user.email}</p>
                        {user.isPremium && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-primary/20 text-emerald-800 text-[10px] font-bold uppercase tracking-wider rounded">Premium Member</span>
                        )}
                    </div>
                </div>
            </section>

            <section className="mt-2">
                <h4 className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-slate-400">Account Configuration</h4>
                <div className="px-4">
                    <div className="bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                        <Link href="/profiles" className="flex items-center gap-4 px-4 py-4 hover:bg-slate-50 transition-colors border-b border-slate-100">
                            <div className="flex items-center justify-center rounded-lg bg-primary/5 text-primary shrink-0 w-10 h-10">
                                <span className="material-symbols-outlined">account_balance_wallet</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold">Expense Profiles</p>
                                <p className="text-xs text-slate-500">Manage multiple accounts</p>
                            </div>
                            <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                        </Link>

                        <button className="w-full flex items-center gap-4 px-4 py-4 hover:bg-slate-50 transition-colors border-b border-slate-100 text-left">
                            <div className="flex items-center justify-center rounded-lg bg-primary/5 text-primary shrink-0 w-10 h-10">
                                <span className="material-symbols-outlined">notifications_active</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold">Notifications</p>
                                <p className="text-xs text-slate-500">Alerts, Weekly Reports</p>
                            </div>
                            <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                        </button>

                        <button className="w-full flex items-center gap-4 px-4 py-4 hover:bg-slate-50 transition-colors text-left">
                            <div className="flex items-center justify-center rounded-lg bg-primary/5 text-primary shrink-0 w-10 h-10">
                                <span className="material-symbols-outlined">security</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold">Security</p>
                                <p className="text-xs text-slate-500">FaceID, Two-Factor Auth</p>
                            </div>
                            <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                        </button>
                    </div>
                </div>
            </section>

            <section className="mt-8">
                <h4 className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-slate-400">Preferences</h4>
                <div className="px-4">
                    <div className="bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between px-4 py-4 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setIsLanguageModalOpen(true)}>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center rounded-lg bg-primary/5 text-primary shrink-0 w-10 h-10">
                                    <span className="material-symbols-outlined">language</span>
                                </div>
                                <p className="text-sm font-semibold">{t('language')}</p>
                            </div>
                            <p className="text-sm text-primary font-medium flex items-center">
                                {currentLanguageName} <span className="material-symbols-outlined text-[16px] ml-1">chevron_right</span>
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mt-8">
                <h4 className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-slate-400">App Info</h4>
                <div className="px-4">
                    <div className="bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                        <button className="w-full flex items-center gap-4 px-4 py-4 hover:bg-slate-50 transition-colors border-b border-slate-100 text-left">
                            <div className="flex items-center justify-center rounded-lg bg-primary/5 text-primary shrink-0 w-10 h-10">
                                <span className="material-symbols-outlined">info</span>
                            </div>
                            <p className="text-sm font-semibold flex-1">About ExpenseFlow</p>
                            <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                        </button>

                        <button className="w-full flex items-center gap-4 px-4 py-4 hover:bg-slate-50 transition-colors text-left">
                            <div className="flex items-center justify-center rounded-lg bg-primary/5 text-primary shrink-0 w-10 h-10">
                                <span className="material-symbols-outlined">help</span>
                            </div>
                            <p className="text-sm font-semibold flex-1">Support & Feedback</p>
                            <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                        </button>
                    </div>
                </div>
            </section>

            <div className="px-6 py-10 text-center">
                <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="text-red-500 font-bold text-sm hover:opacity-80 transition-opacity disabled:opacity-50"
                >
                    {isLoggingOut ? t('logging_out') : t('logout')}
                </button>
                <p className="mt-4 text-[10px] text-slate-400 uppercase tracking-widest">{t('version')} 2.4.0 (8821)</p>
            </div>

            <LanguageSelector
                isOpen={isLanguageModalOpen}
                onClose={() => setIsLanguageModalOpen(false)}
            />
        </main>
    );
}
