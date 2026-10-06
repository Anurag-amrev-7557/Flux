"use client";

import React, { useId } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

/* ───────────────────────────────────────────────
   Material 3 Progress Indicator
   Spec: https://m3.material.io/components/progress-indicators
   Variants: Linear, Circular
   Behavior: Determinate, Indeterminate
   Shape: Flat (default), Wavy (M3 Expressive)
   Track thickness: 4dp default, configurable
   ─────────────────────────────────────────────── */

export interface ProgressIndicatorProps {
    /** 0–100 for determinate; omit or undefined for indeterminate */
    value?: number;
    /** Variant */
    variant?: "linear" | "circular";
    /** Shape of active indicator */
    shape?: "flat" | "wavy";
    /** Track thickness in px (default 4) */
    thickness?: number;
    /** Outer size for circular variant in px (default 40) */
    size?: number;
    /** Active indicator color (default: primary / currentColor) */
    color?: string;
    /** Track color (default: secondary container) */
    trackColor?: string;
    /** Show stop indicator on linear determinate (default true) */
    showStopIndicator?: boolean;
    /** Accessibility label */
    label?: string;
    className?: string;
}

// ─── Linear ────────────────────────────────────

function LinearFlat({
    value,
    thickness,
    color,
    trackColor,
    showStopIndicator,
    label,
    className,
}: ProgressIndicatorProps) {
    const t = thickness ?? 4;
    const isDeterminate = value !== undefined;
    const pct = isDeterminate ? Math.max(0, Math.min(100, value)) : 0;
    const r = t / 2; // fully-rounded cap radius

    return (
        <div
            role="progressbar"
            aria-label={label || "Loading"}
            aria-valuenow={isDeterminate ? pct : undefined}
            aria-valuemin={isDeterminate ? 0 : undefined}
            aria-valuemax={isDeterminate ? 100 : undefined}
            className={clsx("w-full relative", className)}
            style={{ height: t, paddingInline: 4 }}
        >
            {/* Track */}
            <div
                className="absolute inset-0 mx-1"
                style={{
                    backgroundColor: trackColor || "var(--m3-secondary-container, #e2e8f0)",
                    borderRadius: r,
                    height: t,
                }}
            />

            {/* Active indicator */}
            {isDeterminate ? (
                <motion.div
                    className="absolute left-1 top-0"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
                    style={{
                        backgroundColor: color || "var(--m3-primary, #0f172a)",
                        borderRadius: r,
                        height: t,
                        minWidth: pct > 0 ? t : 0,
                    }}
                />
            ) : (
                /* Indeterminate: sliding bar */
                <motion.div
                    className="absolute top-0"
                    animate={{
                        left: ["-30%", "100%"],
                        width: ["30%", "10%"],
                    }}
                    transition={{
                        duration: 1.8,
                        repeat: Infinity,
                        ease: [0.4, 0, 0.2, 1],
                    }}
                    style={{
                        backgroundColor: color || "var(--m3-primary, #0f172a)",
                        borderRadius: r,
                        height: t,
                    }}
                />
            )}

            {/* Stop indicator – 4dp circle at trailing end for determinate */}
            {isDeterminate && showStopIndicator !== false && (
                <div
                    className="absolute top-1/2 -translate-y-1/2"
                    style={{
                        right: 4,
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        backgroundColor: color || "var(--m3-primary, #0f172a)",
                    }}
                />
            )}
        </div>
    );
}

function LinearWavy({
    value,
    thickness,
    color,
    trackColor,
    showStopIndicator,
    label,
    className,
}: ProgressIndicatorProps) {
    const baseT = thickness ?? 4;
    const amplitude = baseT * 0.75; // M3: wave amp ≈ 75% of track thickness
    const wavelength = 40;          // M3: ~40dp
    const containerH = baseT + amplitude * 2 + 2;
    const isDeterminate = value !== undefined;
    const pct = isDeterminate ? Math.max(0, Math.min(100, value)) : 0;
    const svgId = useId();

    // Build a sine-wave path used as the active indicator stroke
    function wavePath(widthPx: number): string {
        const cy = containerH / 2;
        const steps = Math.max(60, Math.ceil(widthPx / 2));
        let d = `M 0 ${cy.toFixed(2)}`;
        for (let i = 1; i <= steps; i++) {
            const x = (i / steps) * widthPx;
            const y = cy + amplitude * Math.sin((x / wavelength) * 2 * Math.PI);
            d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
        }
        return d;
    }

    // We render the wave via an SVG that fills the container
    return (
        <div
            role="progressbar"
            aria-label={label || "Loading"}
            aria-valuenow={isDeterminate ? pct : undefined}
            aria-valuemin={isDeterminate ? 0 : undefined}
            aria-valuemax={isDeterminate ? 100 : undefined}
            className={clsx("w-full relative", className)}
            style={{ height: containerH, paddingInline: 4 }}
        >
            {/* Track (flat) */}
            <div
                className="absolute mx-1"
                style={{
                    backgroundColor: trackColor || "var(--m3-secondary-container, #e2e8f0)",
                    borderRadius: baseT / 2,
                    height: baseT,
                    top: (containerH - baseT) / 2,
                    left: 0,
                    right: 0,
                }}
            />

            {/* Active wavy indicator via SVG */}
            <svg
                className="absolute inset-0 overflow-visible"
                width="100%"
                height={containerH}
                preserveAspectRatio="none"
            >
                <defs>
                    {isDeterminate ? (
                        <clipPath id={`wave-clip-${svgId}`}>
                            <rect x="4" y="0" width={`${pct}%`} height={containerH} />
                        </clipPath>
                    ) : (
                        <clipPath id={`wave-clip-${svgId}`}>
                            <motion.rect
                                y="0"
                                height={containerH}
                                animate={{
                                    x: ["-30%", "100%"],
                                    width: ["35%", "15%"],
                                }}
                                transition={{
                                    duration: 1.8,
                                    repeat: Infinity,
                                    ease: [0.4, 0, 0.2, 1],
                                }}
                            />
                        </clipPath>
                    )}
                </defs>
                <motion.path
                    d={wavePath(800)}
                    initial={{ d: wavePath(800) }}
                    fill="none"
                    stroke={color || "var(--m3-primary, #0f172a)"}
                    strokeWidth={baseT}
                    strokeLinecap="round"
                    clipPath={`url(#wave-clip-${svgId})`}
                    animate={isDeterminate ? undefined : {
                        d: [wavePath(800), wavePath(800)],
                    }}
                    style={{
                        // Animate the phase shift for a moving wave feel
                        ...(isDeterminate ? {} : {
                            strokeDashoffset: 0,
                        }),
                    }}
                />
            </svg>

            {/* Stop indicator */}
            {isDeterminate && showStopIndicator !== false && (
                <div
                    className="absolute top-1/2 -translate-y-1/2"
                    style={{
                        right: 4,
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        backgroundColor: color || "var(--m3-primary, #0f172a)",
                    }}
                />
            )}
        </div>
    );
}

// ─── Circular ──────────────────────────────────

function CircularIndicator({
    value,
    thickness,
    size: outerSize,
    color,
    trackColor,
    label,
    className,
}: ProgressIndicatorProps) {
    const sz = outerSize ?? 40;
    const t = thickness ?? 4;
    const r = (sz - t) / 2;
    const circumference = 2 * Math.PI * r;
    const isDeterminate = value !== undefined;
    const pct = isDeterminate ? Math.max(0, Math.min(100, value)) : 0;

    return (
        <div
            role="progressbar"
            aria-label={label || "Loading"}
            aria-valuenow={isDeterminate ? pct : undefined}
            aria-valuemin={isDeterminate ? 0 : undefined}
            aria-valuemax={isDeterminate ? 100 : undefined}
            className={clsx("inline-flex items-center justify-center shrink-0", className)}
            style={{ width: sz, height: sz }}
        >
            <motion.svg
                viewBox={`0 0 ${sz} ${sz}`}
                width={sz}
                height={sz}
                className="overflow-visible"
                animate={isDeterminate ? undefined : { rotate: [0, 360] }}
                transition={isDeterminate ? undefined : {
                    rotate: { duration: 1.4, repeat: Infinity, ease: "linear" },
                }}
            >
                {/* Track circle */}
                <circle
                    cx={sz / 2}
                    cy={sz / 2}
                    r={r}
                    fill="none"
                    stroke={trackColor || "var(--m3-secondary-container, #e2e8f0)"}
                    strokeWidth={t}
                />

                {isDeterminate ? (
                    /* Determinate arc */
                    <motion.circle
                        cx={sz / 2}
                        cy={sz / 2}
                        r={r}
                        fill="none"
                        stroke={color || "var(--m3-primary, #0f172a)"}
                        strokeWidth={t}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: circumference - (circumference * pct) / 100 }}
                        transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
                        transform={`rotate(-90 ${sz / 2} ${sz / 2})`}
                    />
                ) : (
                    /* Indeterminate arc that grows/shrinks */
                    <motion.circle
                        cx={sz / 2}
                        cy={sz / 2}
                        r={r}
                        fill="none"
                        stroke={color || "var(--m3-primary, #0f172a)"}
                        strokeWidth={t}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        animate={{
                            strokeDashoffset: [circumference * 0.75, circumference * 0.15, circumference * 0.75],
                            rotate: [0, 180, 360],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                        transform={`rotate(-90 ${sz / 2} ${sz / 2})`}
                    />
                )}
            </motion.svg>
        </div>
    );
}

// ─── Public API ────────────────────────────────

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = (props) => {
    const { variant = "linear", shape = "flat" } = props;

    if (variant === "circular") {
        return <CircularIndicator {...props} />;
    }

    if (shape === "wavy") {
        return <LinearWavy {...props} />;
    }

    return <LinearFlat {...props} />;
};

export default ProgressIndicator;
