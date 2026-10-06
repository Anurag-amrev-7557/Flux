"use client";

import { useEffect, useState } from "react";

export default function OrientationLock() {
    const [isMobileLandscape, setIsMobileLandscape] = useState(false);

    useEffect(() => {
        // Attempt browser native orientation lock (supported on Android Chrome/PWA)
        if (
            typeof window !== "undefined" &&
            "screen" in window &&
            screen.orientation &&
            "lock" in screen.orientation
        ) {
            try {
                (screen.orientation.lock as (orientation: string) => Promise<void>)("portrait").catch(() => {
                    // Requires fullscreen or unsupported on iOS Safari tabs; safely ignore
                });
            } catch {
                // Ignore
            }
        }

        // Listener for mobile screen orientation changes
        const checkOrientation = () => {
            if (typeof window === "undefined") return;
            const isLandscape = window.innerWidth > window.innerHeight;
            // Target mobile devices in landscape (typically height < 500px on phones)
            const isPhoneSized = window.innerHeight <= 500 || (window.innerWidth <= 932 && window.innerHeight <= 450);
            const isTouch = window.matchMedia("(hover: none) and (pointer: coarse)").matches || "ontouchstart" in window;

            setIsMobileLandscape(isLandscape && isPhoneSized && isTouch);
        };

        checkOrientation();
        window.addEventListener("resize", checkOrientation);
        window.addEventListener("orientationchange", checkOrientation);

        return () => {
            window.removeEventListener("resize", checkOrientation);
            window.removeEventListener("orientationchange", checkOrientation);
        };
    }, []);

    if (!isMobileLandscape) return null;

    return (
        <aside
            role="status"
            aria-live="polite"
            className="fixed inset-0 z-[99999] flex flex-col items-center justify-center p-6 bg-slate-950/95 dark:bg-black/98 backdrop-blur-xl text-white select-none animate-in fade-in duration-200"
        >
            <div className="w-16 h-16 rounded-2xl bg-white/10 dark:bg-white/5 border border-white/15 flex items-center justify-center mb-4 shadow-lg animate-pulse">
                <span className="material-symbols-outlined text-[36px] text-white">
                    screen_rotation
                </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight mb-1 text-center">
                Please Rotate Your Device
            </h2>
            <p className="text-xs text-slate-300 dark:text-zinc-400 text-center max-w-xs leading-relaxed">
                Flux is designed and optimized for portrait mode. Rotate your phone vertically to continue.
            </p>
        </aside>
    );
}
