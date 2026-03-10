"use client";

import { useAppStore } from "@/store/appStore";
import { useEffect } from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
