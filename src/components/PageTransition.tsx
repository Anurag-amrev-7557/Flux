"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

export function PageTransition({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="relative flex-1 flex flex-col w-full overflow-x-hidden">
            <motion.div
                key={pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="flex-1 flex flex-col w-full"
            >
                {children}
            </motion.div>
        </div>
    );
}

export default PageTransition;

