"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/store/appStore";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { triggerHaptic } from "@/utils/haptics";

const navItems = [
    { href: "/", icon: "home", label: "Home" },
    { href: "/profiles", icon: "group", label: "Profiles" },
    { href: "/debts", icon: "handshake", label: "Debts" },
    { href: "/reports", icon: "bar_chart", label: "Reports" },
    { href: "/settings", icon: "account_circle", label: "You" },
];

export default function BottomNav() {
    const pathname = usePathname();
    const { user } = useAppStore();

    const handleItemClick = (e: React.MouseEvent, href: string) => {
        triggerHaptic('light');
        const cleanPath = pathname?.replace(/\/+$/, "") || "/";
        const cleanHref = href.replace(/\/+$/, "") || "/";
        if (cleanPath === cleanHref) {
            e.preventDefault();
            // Material 3 specification: Re-selecting currently active destination resets scroll to top
            window.scrollTo({ top: 0, behavior: "smooth" });
            const main = document.querySelector("main");
            if (main) {
                main.scrollTo({ top: 0, behavior: "smooth" });
            }
        }
    };

    // Derive this directly from Next's current route.
    const isCurrentRoute = (href: string) => {
        const cleanPath = pathname?.replace(/\/+$/, "") || "/";
        const cleanHref = href.replace(/\/+$/, "") || "/";
        return cleanPath === cleanHref;
    };

    return (
        <nav
            role="navigation"
            aria-label="Navigation bar"
            className="fixed bottom-0 left-0 right-0 z-50 w-full bg-[#eaeef6] dark:bg-[#141414] rounded-t-[24px] sm:rounded-t-[28px] border-t border-slate-200/90 dark:border-white/10 transition-colors pb-[env(safe-area-inset-bottom)] select-none overflow-hidden"
        >
            {/* COMPACT WINDOWS (< 640px): M3 Vertical navigation items spanning full width equally */}
            <div className="flex sm:hidden items-center justify-around h-20 w-full px-2">
                {navItems.map((item) => {
                    const isActive = isCurrentRoute(item.href);
                    return (
                        <Link
                            key={`compact-${item.href}`}
                            href={item.href}
                            prefetch={true}
                            onClick={(e) => handleItemClick(e, item.href)}
                            className="relative flex flex-col items-center justify-center flex-1 h-full py-2 group touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-xl bg-transparent border-none cursor-pointer no-underline"
                            aria-current={isActive ? "page" : undefined}
                            aria-label={item.label}
                        >
                            {/* M3 Active Indicator Pill (w-16 h-8 stadium shape) with dynamic lateral expanding animation */}
                            <div className="relative flex items-center justify-center w-16 h-8 rounded-full">
                                <AnimatePresence mode="wait">
                                {isActive && (
                                    <motion.div
                                        key={`pill-compact-${item.href}`}
                                        initial={{ scaleX: 0, opacity: 0 }}
                                        animate={{ scaleX: 1, opacity: 1 }}
                                        exit={{ scaleX: 0, opacity: 0 }}
                                        style={{ originX: 0.5 }}
                                        className="absolute inset-0 bg-[#014A77] rounded-full "
                                        transition={{
                                            scaleX: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
                                            opacity: { duration: 0.15 }
                                        }}
                                    />
                                )}
                                </AnimatePresence>
                                {item.href === "/settings" ? (
                                    <div className="w-6 h-6 rounded-full overflow-hidden relative z-10 flex items-center justify-center">
                                        {user?.avatar ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img src={user.avatar} alt="You" className="w-full h-full object-cover" />
                                        ) : (
                                            <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                                                <circle cx="50" cy="50" r="50" fill="#141414" />
                                                <path d="M50 0 A50 50 0 0 1 50 100 A25 25 0 0 1 50 50 A25 25 0 0 0 50 0 Z" fill="#ffffff" />
                                                <circle cx="50" cy="25" r="7" fill="#141414" />
                                                <circle cx="50" cy="75" r="7" fill="#ffffff" />
                                            </svg>
                                        )}
                                    </div>
                                ) : (
                                    <span
                                        className={clsx(
                                            "material-symbols-outlined text-[24px] relative z-10 transition-colors duration-200",
                                            isActive
                                                ? "text-[#D3E3FD]"
                                                : "text-[#44474e] dark:text-[#C4C7C5] group-hover:text-slate-900 dark:group-hover:text-[#E3E3E3]"
                                        )}
                                        style={
                                            isActive
                                                ? { fontVariationSettings: "'FILL' 1, 'wght' 600" }
                                                : { fontVariationSettings: "'FILL' 0, 'wght' 400" }
                                        }
                                    >
                                        {item.icon}
                                    </span>
                                )}
                            </div>

                            {/* M3 Label Text directly beneath icon */}
                            <span
                                className={clsx(
                                    "text-[12px] tracking-[0.4px] mt-1 transition-colors duration-200 leading-tight",
                                    isActive
                                        ? "text-slate-900 dark:text-[#E3E3E3] font-bold"
                                        : "text-[#44474e] dark:text-[#C4C7C5] font-semibold group-hover:text-slate-800 dark:group-hover:text-[#E3E3E3]"
                                )}
                            >
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>

            {/* MEDIUM WINDOWS (>= 640px): M3 Expressive Horizontal navigation items centered */}
            <div className="hidden sm:flex items-center justify-center h-16 w-full max-w-4xl mx-auto px-4 gap-2 md:gap-4">
                {navItems.map((item) => {
                    const isActive = isCurrentRoute(item.href);
                    return (
                        <Link
                            key={`medium-${item.href}`}
                            href={item.href}
                            prefetch={true}
                            onClick={(e) => handleItemClick(e, item.href)}
                            className="relative flex items-center justify-center h-10 px-4 rounded-full group touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 transition-colors bg-transparent border-none cursor-pointer no-underline"
                            aria-current={isActive ? "page" : undefined}
                            aria-label={item.label}
                        >
                            {/* Horizontal Pill Indicator surrounding both Icon & Label */}
                            <AnimatePresence mode="wait">
                            {isActive && (
                                <motion.div
                                    key={`pill-medium-${item.href}`}
                                    initial={{ scaleX: 0, opacity: 0 }}
                                    animate={{ scaleX: 1, opacity: 1 }}
                                    exit={{ scaleX: 0, opacity: 0 }}
                                    style={{ originX: 0.5 }}
                                    className="absolute inset-0 bg-[#014A77] rounded-full"
                                    transition={{
                                        scaleX: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
                                        opacity: { duration: 0.15 }
                                    }}
                                />
                            )}
                            </AnimatePresence>
                            {!isActive && (
                                <div className="absolute inset-0 rounded-full hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors" />
                            )}

                            {/* Icon & Label beside each other */}
                            <div className="relative z-10 flex items-center gap-2">
                                <span
                                    className={clsx(
                                        "material-symbols-outlined text-[22px] transition-colors duration-150",
                                        isActive
                                            ? "text-[#D3E3FD]"
                                            : "text-[#44474e] dark:text-[#C4C7C5] group-hover:text-slate-900 dark:group-hover:text-[#E3E3E3]"
                                    )}
                                    style={
                                        isActive
                                            ? { fontVariationSettings: "'FILL' 1, 'wght' 600" }
                                            : { fontVariationSettings: "'FILL' 0, 'wght' 400" }
                                    }
                                >
                                    {item.icon}
                                </span>
                                <span
                                    className={clsx(
                                        "text-[13px] tracking-[0.2px] transition-colors duration-200 leading-none whitespace-nowrap",
                                        isActive
                                            ? "text-[#D3E3FD] font-bold"
                                            : "text-[#44474e] dark:text-[#C4C7C5] font-semibold group-hover:text-slate-800 dark:group-hover:text-[#E3E3E3]"
                                    )}
                                >
                                    {item.label}
                                </span>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

