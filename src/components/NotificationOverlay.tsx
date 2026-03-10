"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface NotificationOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    origin: { x: number; y: number } | null;
}

export function NotificationOverlay({ isOpen, onClose, origin }: NotificationOverlayProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return null;

    // Radius needs to be large enough to cover the whole screen from the origin
    // A safe bet is the diagonal of the screen
    const maxPath = "circle(150% at var(--origin-x) var(--origin-y))";
    const minPath = "circle(0% at var(--origin-x) var(--origin-y))";

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
                        "--origin-x": origin ? `${origin.x}px` : "50%",
                        "--origin-y": origin ? `${origin.y}px` : "50%",
                    } as any}
                >
                    <motion.div
                        className="flex flex-col h-full bg-[#FAFAFA]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.4 }}
                    >
                        <header className="px-6 py-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">Notifications</h2>
                                <p className="text-sm text-slate-500 font-medium">You have 3 new alerts</p>
                            </div>
                            <button
                                onClick={onClose}
                                className=" w-10 h-10 -mt-2 rounded-full hover:bg-slate-100 transition-colors bg-slate-50 border border-slate-200 flex items-center justify-center"
                            >
                                <span className="material-symbols-outlined text-slate-600">close</span>
                            </button>
                        </header>

                        <main className="flex-1 overflow-y-auto p-4 space-y-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Recently</span>
                                <button className="text-sm font-bold p-2 px-3 bg-primary/10 rounded-full text-primary hover:underline">Mark all as read</button>
                            </div>

                            {/* Mock Notifications */}
                            <motion.div
                                className="space-y-3"
                                initial="hidden"
                                animate="visible"
                                variants={{
                                    visible: { transition: { staggerChildren: 0.1, delayChildren: 0.4 } }
                                }}
                            >
                                {[
                                    { id: 1, type: 'expense', title: 'Over Budget', description: 'You have exceeded your monthly dining budget by $45.20.', time: '2m ago', icon: 'warning', color: 'bg-orange-100 text-orange-600' },
                                    { id: 2, type: 'system', title: 'Profile Synced', description: 'Your data has been successfully synced across all devices.', time: '1h ago', icon: 'sync', color: 'bg-blue-100 text-blue-600' },
                                    { id: 3, type: 'alert', title: 'Large Transaction', description: 'A transaction of $1,200.00 was recorded in "Electronics".', time: '5h ago', icon: 'payments', color: 'bg-green-100 text-green-600' }
                                ].map((item) => (
                                    <motion.div
                                        key={item.id}
                                        variants={{
                                            hidden: { opacity: 0, y: -20 },
                                            visible: { opacity: 1, y: 0 }
                                        }}
                                        className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow cursor-pointer group"
                                    >
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                                            <span className="material-symbols-outlined">{item.icon}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <p className="font-bold text-slate-900 group-hover:text-primary transition-colors">{item.title}</p>
                                                <span className="text-[11px] font-bold text-slate-400 uppercase">{item.time}</span>
                                            </div>
                                            <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>

                            <div className="pt-8 pb-12 flex flex-col items-center justify-center text-center opacity-40">
                                <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mb-3">
                                    <span className="material-symbols-outlined text-xl">history</span>
                                </div>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">End of notifications</p>
                            </div>
                        </main>

                        <footer className="p-6 bg-white border-t border-slate-100 sticky bottom-0">
                            <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200">
                                Archive All
                            </button>
                        </footer>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
