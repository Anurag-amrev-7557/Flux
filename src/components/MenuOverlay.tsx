"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/store/appStore";
import { useI18n } from "@/hooks/useI18n";

interface MenuOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    origin: { x: number; y: number } | null;
}

export function MenuOverlay({ isOpen, onClose, origin }: MenuOverlayProps) {
    const [isMounted, setIsMounted] = useState(false);
    const pathname = usePathname();
    const { user, setIsLogExpenseOpen } = useAppStore();
    const { t } = useI18n();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen) {
            onClose();
        }
    }, [pathname]);

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
                    className="fixed inset-0 z-[100] flex flex-col bg-white"
                    initial={{ clipPath: minPath }}
                    animate={{ clipPath: maxPath }}
                    exit={{ clipPath: minPath }}
                    transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                    style={{
                        "--origin-x": origin ? `${origin.x}px` : "10%",
                        "--origin-y": origin ? `${origin.y}px` : "5%",
                    } as any}
                >
                    <motion.div
                        className="flex flex-col h-full bg-[#FAFAFA]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.4 }}
                    >
                        <header className="px-6 py-8 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {user.avatar ? (
                                    <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full border-2 border-primary/20 shadow-sm" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                                        {user.name.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 leading-tight">{user.name}</h2>
                                    <p className="text-xs text-slate-500 font-medium">{user.email}</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-full hover:bg-slate-100 transition-colors bg-slate-50 border border-slate-200 flex items-center justify-center"
                            >
                                <span className="material-symbols-outlined text-slate-600">close</span>
                            </button>
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
                                                ? "bg-primary/10 text-primary font-bold shadow-sm"
                                                : "text-slate-600 hover:bg-slate-100"
                                                }`}
                                        >
                                            <span className={`material-symbols-outlined ${isActive ? "text-primary fill-1" : "text-slate-500"}`}>
                                                {item.icon}
                                            </span>
                                            <span className="text-lg">{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </nav>

                            <div className="mt-12 px-4">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-6">Quick Actions</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => {
                                            onClose();
                                            setIsLogExpenseOpen(true);
                                        }}
                                        className="flex flex-col items-center justify-center p-6 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-md transition-all group text-left w-full"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-600 group-hover:bg-primary/10 group-hover:text-primary transition-colors mb-3">
                                            <span className="material-symbols-outlined">add_card</span>
                                        </div>
                                        <span className="text-sm font-bold text-slate-900">Add Entry</span>
                                    </button>
                                    <button className="flex flex-col items-center justify-center p-6 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-md transition-all group">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-600 group-hover:bg-primary/10 group-hover:text-primary transition-colors mb-3">
                                            <span className="material-symbols-outlined">share</span>
                                        </div>
                                        <span className="text-sm font-bold text-slate-900">Export</span>
                                    </button>
                                </div>
                            </div>
                        </main>

                        <footer className="p-6 bg-white border-t border-slate-100 mt-auto">
                            <button className="w-full flex items-center justify-center gap-3 py-4 text-slate-500 font-bold hover:text-red-500 transition-colors">
                                <span className="material-symbols-outlined">logout</span>
                                Sign Out
                            </button>
                            <p className="text-center text-[10px] text-slate-300 font-medium mt-4">Expense Tracker v1.0.4 • Made with ♥</p>
                        </footer>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
