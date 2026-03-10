"use client";

import { useAppStore } from "@/store/appStore";
import LogExpenseModal from "./LogExpenseModal";
import { AnimatePresence } from "framer-motion";

export default function ModalContainer() {
    const { isLogExpenseOpen, setIsLogExpenseOpen } = useAppStore();

    return (
        <LogExpenseModal
            isOpen={isLogExpenseOpen}
            onClose={() => setIsLogExpenseOpen(false)}
        />
    );
}
