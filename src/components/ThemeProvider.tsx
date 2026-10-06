"use client";

import { useEffect, type ReactNode } from "react";
import { useAppStore, applyTheme } from "@/store/appStore";

export function ThemeProvider({ children }: { children: ReactNode }) {
    const theme = useAppStore((state) => state.theme);

    useEffect(() => {
        applyTheme(theme);

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = () => {
            if (useAppStore.getState().theme === "system") {
                applyTheme("system");
            }
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, [theme]);

    return <>{children}</>;
}
