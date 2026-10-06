"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/store/appStore";
import { useI18n } from "@/hooks/useI18n";
import { useDatabase } from "@/db/DatabaseProvider";
import { exportDatabaseToJson } from "@/utils/exportImport";
import { signOutUser } from "@/lib/supabase";
import FluxLogo from "./FluxLogo";

interface MenuOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    origin: { x: number; y: number } | null;
}

export function MenuOverlay({ isOpen, onClose, origin }: MenuOverlayProps) {
    const [isMounted, setIsMounted] = useState(false);
    const pathname = usePathname();
    const prevPathname = useRef(pathname);
    const db = useDatabase();
    const { user, setIsLogExpenseOpen, logout, showToast } = useAppStore();
    const { t } = useI18n();
    const isAuthenticated = Boolean(user?.email && user.email !== 'guest@example.com');

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (prevPathname.current !== pathname) {
            prevPathname.current = pathname;
            if (isOpen) {
                onClose();
            }
        }
    }, [pathname, isOpen, onClose]);

    if (!isMounted) return null;

    const maxPath = "circle(150% at var(--origin-x) var(--origin-y))";
    const minPath = "circle(0% at var(--origin-x) var(--origin-y))";

    const menuItems = [
        { href: "/", icon: "home", label: t('dashboard') || "Dashboard" },
        { href: "/profiles", icon: "group", label: t('profiles') || "Profiles" },
        { href: "/reports", icon: "bar_chart", label: t('stats') || "Reports" },
        { href: "/settings", icon: "settings", label: t('settings') || "Settings" },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-[100] flex flex-col bg-white dark:bg-[#141414]"
                    initial={{ clipPath: minPath }}
                    animate={{ clipPath: maxPath }}
                    exit={{ clipPath: minPath }}
                    transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
                    style={{
                        "--origin-x": origin ? `${origin.x}px` : "32px",
                        "--origin-y": origin ? `${origin.y}px` : "36px",
                    } as React.CSSProperties}
                >
                    <motion.div
                        className="flex flex-col h-full bg-slate-50 dark:bg-[#141414]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1, duration: 0.25 }}
                    >
                        {/* Header: Close button aligned precisely with the header hamburger button spot */}
                        <header className="py-4 px-3 flex items-center justify-between border-b border-transparent dark:border-white/5">
                            <div className="flex items-center gap-3">
                                {user.avatar ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                        src={user.avatar}
                                        alt={user.name}
                                        referrerPolicy="no-referrer"
                                        crossOrigin="anonymous"
                                        className="w-18 h-18 rounded-2xl border border-primary/20 dark:border-white/10 shadow-xs object-cover"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-white/10 flex items-center justify-center text-primary dark:text-[#E3E3E3] font-bold text-sm">
                                        {user.name.charAt(0)}
                                    </div>
                                )}
                                <div className="text-left">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-[#E3E3E3] leading-tight">{user.name}</h2>
                                    <p className="text-[14px] text-slate-500 dark:text-[#C4C7C5] font-medium">{user.email}</p>
                                </div>
                            </div>
                            {isAuthenticated && <button
                                onClick={onClose}
                                className="m3-icon-btn text-slate-700 dark:text-[#E3E3E3] bg-slate-100 dark:bg-white/10 p-3 hover:bg-slate-200 dark:hover:bg-white/15 transition-colors"
                                aria-label="Close menu"
                            >
                                <span className="material-symbols-outlined text-slate-700 dark:text-[#E3E3E3]">close</span>
                            </button>}
                        </header>

                        <main className="flex-1 px-4 py-2">
                            <nav className="space-y-2">
                                {menuItems.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${isActive
                                                ? "bg-slate-200 dark:bg-[#1E2020] text-primary dark:text-[#E3E3E3] font-bold shadow-2xs dark:shadow-none"
                                                : "text-slate-600 dark:text-[#C4C7C5] hover:bg-slate-100 dark:hover:bg-white/5"
                                                }`}
                                        >
                                            <span className={`material-symbols-outlined ${isActive ? "text-primary dark:text-[#D3E3FD] fill-1" : "text-slate-500 dark:text-[#8A8D8B]"}`}>
                                                {item.icon}
                                            </span>
                                            <span className="text-lg">{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </nav>

                            <div className="mt-6 px-4">
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-[#8A8D8B] mb-6">Quick Actions</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => {
                                            onClose();
                                            setIsLogExpenseOpen(true);
                                        }}
                                        className="flex flex-col items-center justify-center p-6 bg-white dark:bg-[#1E2020] border border-slate-100 dark:border-white/10 rounded-3xl shadow-sm dark:shadow-none hover:shadow-md dark:hover:border-white/20 transition-all group text-left w-full"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-[#C4C7C5] group-hover:bg-primary/10 group-hover:text-primary dark:group-hover:text-[#E3E3E3] transition-colors mb-3">
                                            <span className="material-symbols-outlined">add_card</span>
                                        </div>
                                        <span className="text-sm font-bold text-slate-900 dark:text-[#E3E3E3]">Add Entry</span>
                                    </button>
                                    <button
                                        onClick={async () => {
                                            try {
                                                await exportDatabaseToJson(db);
                                                showToast("Backup downloaded successfully", "success");
                                                onClose();
                                            } catch {
                                                showToast("Export failed", "error");
                                            }
                                        }}
                                        className="flex flex-col items-center justify-center p-6 bg-white dark:bg-[#1E2020] border border-slate-100 dark:border-white/10 rounded-3xl shadow-sm dark:shadow-none hover:shadow-md dark:hover:border-white/20 transition-all group"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-[#C4C7C5] group-hover:bg-primary/10 group-hover:text-primary dark:group-hover:text-[#E3E3E3] transition-colors mb-3">
                                            <span className="material-symbols-outlined">download</span>
                                        </div>
                                        <span className="text-sm font-bold text-slate-900 dark:text-[#E3E3E3]">Export JSON</span>
                                    </button>
                                </div>
                            </div>
                        </main>

                        <footer className="p-6 bg-white dark:bg-[#141414] border-t border-slate-100 dark:border-white/10 mt-auto flex flex-col items-center justify-center">
                            <button
                                onClick={async () => {
                                    try {
                                        await signOutUser();
                                    } catch (err) {
                                        console.warn("Sign out error:", err);
                                    }
                                    logout();
                                    showToast("Signed out successfully", "info");
                                    onClose();
                                }}
                                className="m3-btn w-full max-w-[200px] mx-auto bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/60 border border-transparent dark:border-red-900/30 transition-colors"
                            >
                                <span className="material-symbols-outlined">logout</span>
                                Sign Out
                            </button>
                            <div className="flex items-center justify-center gap-1.5 mt-4">
                                <FluxLogo className="w-4 h-4" />
                                <p className="text-center text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                                    Flux v2.4 • Minimalist Finance
                                </p>
                            </div>
                        </footer>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
