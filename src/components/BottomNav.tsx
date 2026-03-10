"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { motion } from "framer-motion";

const navItems = [
    { href: "/", icon: "home", label: "Home" },
    { href: "/profiles", icon: "group", label: "Profiles" },
    { href: "/debts", icon: "payments", label: "Debts" },
    { href: "/reports", icon: "bar_chart", label: "Reports" },
    { href: "/settings", icon: "settings", label: "Settings" },
];

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <div className="fixed bottom-6 left-0 right-0 z-50 px-4">
            <nav className="bg-white flex items-center justify-between p-1 rounded-full shadow-2xl border border-white/20 max-w-md mx-auto relative overflow-hidden">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(
                                "relative flex items-center justify-center py-2 px-4 rounded-full transition-colors duration-300 z-10",
                                isActive ? "flex-[1.5] text-primary" : "flex-1 text-slate-500 hover:text-slate-600"
                            )}
                        >
                            {/* Smooth Sliding Background Pod */}
                            {isActive && (
                                <motion.div
                                    layoutId="nav-indicator"
                                    className="absolute inset-0 bg-primary/5 rounded-full shadow-md z-0"
                                    transition={{
                                        duration: 0.4,
                                        ease: [0.16, 1, 0.3, 1] // Custom ease-out expo for a snappy but smooth feel
                                    }}
                                />
                            )}

                            <div className="relative z-10 flex items-center gap-2">
                                <span
                                    className="material-symbols-outlined text-[22px]"
                                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                                >
                                    {item.icon}
                                </span>
                                {isActive && (
                                    <motion.span
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="text-xs font-bold uppercase tracking-wider leading-none"
                                    >
                                        {item.label}
                                    </motion.span>
                                )}
                            </div>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
