import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface EmptyStateProps {
    type: 'transactions' | 'categories' | 'stats';
    title: string;
    description?: string;
    compact?: boolean;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export function EmptyState({ type, title, description, compact, action }: EmptyStateProps) {
    const Illustration = () => {
        const size = compact ? "100" : "160";

        switch (type) {
            case 'transactions':
                return (
                    <motion.svg
                        width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg"
                        className="mx-auto -mb-12 -mt-12"
                        initial="hidden"
                        animate="visible"
                    >
                        {/* Main Card */}
                        <motion.rect
                            x="30" y="40" width="100" height="80" rx="12"
                            className="fill-slate-50 stroke-slate-200" strokeWidth="2"
                            variants={{
                                hidden: { y: 10, opacity: 0 },
                                visible: {
                                    y: 0, opacity: 1,
                                    transition: { duration: 0.8, ease: "easeOut" }
                                }
                            }}
                            animate={{
                                y: [0, -4, 0],
                            }}
                            transition={{
                                y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                            }}
                        />

                        {/* Lines */}
                        {[
                            { x: 45, y: 60, width: 40 },
                            { x: 45, y: 72, width: 70 },
                            { x: 45, y: 84, width: 50 },
                        ].map((line, i) => (
                            <motion.rect
                                key={i}
                                x={line.x} y={line.y} width={line.width} height={4} rx="2"
                                className="fill-slate-200"
                                variants={{
                                    hidden: { width: 0, opacity: 0 },
                                    visible: {
                                        width: line.width, opacity: 1,
                                        transition: { delay: 0.4 + (i * 0.1), duration: 0.5 }
                                    }
                                }}
                            />
                        ))}

                        {/* Plus Icon Button */}
                        <motion.g
                            variants={{
                                hidden: { scale: 0, opacity: 0 },
                                visible: {
                                    scale: 1, opacity: 1,
                                    transition: { delay: 0.8, type: "spring", stiffness: 200 }
                                }
                            }}
                        >
                            <circle cx="115" cy="105" r="10" className="fill-white stroke-slate-200" strokeWidth="2" />
                            <path d="M110 105H120M115 100V110" className="stroke-slate-400" strokeWidth="2" strokeLinecap="round" />
                        </motion.g>
                    </motion.svg>
                );
            case 'categories':
                return (
                    <motion.svg
                        width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg"
                        className="mx-auto"
                        initial="hidden"
                        animate="visible"
                    >
                        <motion.circle
                            cx="80" cy="80" r="50"
                            className="fill-slate-50 stroke-slate-200" strokeWidth="2"
                            variants={{
                                hidden: { scale: 0.8, opacity: 0 },
                                visible: { scale: 1, opacity: 1, transition: { duration: 0.6 } }
                            }}
                        />
                        {[
                            { x: 65, y: 65 }, { x: 83, y: 65 },
                            { x: 65, y: 83 }, { x: 83, y: 83 }
                        ].map((pos, i) => (
                            <motion.rect
                                key={i}
                                x={pos.x} y={pos.y} width={12} height={12} rx="3"
                                className="fill-slate-200"
                                variants={{
                                    hidden: { scale: 0, opacity: 0 },
                                    visible: {
                                        scale: 1, opacity: 1,
                                        transition: { delay: 0.3 + (i * 0.1), type: "spring" }
                                    }
                                }}
                            />
                        ))}
                    </motion.svg>
                );
            case 'stats':
                return (
                    <motion.svg
                        width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg"
                        className="mx-auto scale-120"
                        initial="hidden"
                        animate="visible"
                    >
                        <motion.path
                            d="M30 130H130"
                            className="stroke-slate-200" strokeWidth="2" strokeLinecap="round"
                            variants={{
                                hidden: { pathLength: 0, opacity: 0 },
                                visible: { pathLength: 1, opacity: 1, transition: { duration: 0.8 } }
                            }}
                        />
                        {[
                            { x: 45, y: 90, h: 40, color: "fill-slate-50" },
                            { x: 74, y: 60, h: 70, color: "fill-slate-100" },
                            { x: 103, y: 100, h: 30, color: "fill-slate-50" }
                        ].map((bar, i) => (
                            <motion.rect
                                key={i}
                                x={bar.x} y={bar.y} width={12} height={bar.h} rx="4"
                                className={clsx(bar.color, "stroke-slate-200")} strokeWidth="2"
                                style={{ originY: "130px" }}
                                variants={{
                                    hidden: { scaleY: 0, opacity: 0 },
                                    visible: {
                                        scaleY: 1, opacity: 1,
                                        transition: { delay: 0.5 + (i * 0.15), duration: 0.6, ease: "easeOut" }
                                    }
                                }}
                            />
                        ))}
                    </motion.svg>
                );
            default:
                return null;
        }
    };

    return (
        <div className={clsx(
            "flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-500 w-full",
            compact ? "py-2" : "p-8 min-h-[280px]"
        )}>
            <div className={clsx("opacity-80", compact ? "mb-2" : "mb-6")}>
                <Illustration />
            </div>
            <h3 className={clsx("font-bold text-slate-900", compact ? "text-sm mb-1" : "text-lg mb-2")}>{title}</h3>
            {description && !compact && (
                <p className="text-sm text-slate-500 leading-relaxed mb-6">
                    {description}
                </p>
            )}
            {action && (
                <button
                    onClick={action.onClick}
                    className={clsx(
                        "bg-slate-900 text-white rounded-full font-bold shadow-sm hover:bg-slate-800 transition-all active:scale-95",
                        compact ? "px-4 py-1.5 text-xs" : "px-6 py-2.5 text-sm"
                    )}
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}
