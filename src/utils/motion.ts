/**
 * Material 3 Expressive Motion Physics System
 * Spec: https://m3.material.io/styles/motion/overview/specs
 * May 2025 Release
 *
 * Implements M3 Expressive and Standard motion schemes with spring physics,
 * updated easing curves, and standard transition patterns for Framer Motion.
 *
 * The new motion physics system uses springs (stiffness, damping, velocity)
 * instead of easing curves for most component animations.
 */

import { Transition, Variants } from "framer-motion";

/* ─────────────────────────────────────────────────────────────
   1. M3 Motion Physics System (Spring-based)
   Spatial: Overshoots and bounces (position, scale, size, radius)
   Effects: Smooth, no overshoot (opacity, color)
   ───────────────────────────────────────────────────────────── */

/**
 * Spring physics parameters for M3 Expressive and Standard schemes
 * Based on May 2025 motion physics specifications
 */
export const m3Springs = {
    // Smooth Scheme (Fluid, responsive, zero bounce)
    expressive: {
        /** Fast spatial: small components, switches, buttons */
        fastSpatial: {
            type: "spring",
            stiffness: 380,
            damping: 38,
            mass: 0.8,
            bounce: 0,
        } as const satisfies Transition,

        /** Default spatial: cards, sheets, dialogs, drawers */
        defaultSpatial: {
            type: "spring",
            stiffness: 300,
            damping: 35,
            mass: 1.0,
            bounce: 0,
        } as const satisfies Transition,

        /** Slow spatial: full-screen transitions, large surfaces */
        slowSpatial: {
            type: "spring",
            stiffness: 220,
            damping: 32,
            mass: 1.2,
            bounce: 0,
        } as const satisfies Transition,

        /** Fast effects: color/opacity change for small items (no overshoot) */
        fastEffects: {
            type: "tween",
            ease: [0.31, 0.94, 0.34, 1.0] as [number, number, number, number],
            duration: 0.15, // 150ms
        } as const satisfies Transition,

        /** Default effects: opacity of cards, content fade */
        defaultEffects: {
            type: "tween",
            ease: [0.34, 0.8, 0.34, 1.0] as [number, number, number, number],
            duration: 0.2, // 200ms
        } as const satisfies Transition,

        /** Slow effects: gradual color/opacity transitions */
        slowEffects: {
            type: "tween",
            ease: [0.34, 0.88, 0.34, 1.0] as [number, number, number, number],
            duration: 0.3, // 300ms
        } as const satisfies Transition,
    },

    // Standard Scheme (Utilitarian, smooth, functional, zero bounce)
    standard: {
        /** Fast spatial: minimal bounce for utility components */
        fastSpatial: {
            type: "spring",
            stiffness: 380,
            damping: 38,
            mass: 0.8,
            bounce: 0,
        } as const satisfies Transition,

        /** Default spatial: functional cards and surfaces */
        defaultSpatial: {
            type: "spring",
            stiffness: 320,
            damping: 36,
            mass: 1.0,
            bounce: 0,
        } as const satisfies Transition,

        /** Slow spatial: large functional surfaces */
        slowSpatial: {
            type: "spring",
            stiffness: 240,
            damping: 34,
            mass: 1.2,
            bounce: 0,
        } as const satisfies Transition,

        /** Fast effects: quick utility transitions */
        fastEffects: {
            type: "tween",
            ease: [0.31, 0.94, 0.34, 1.0] as [number, number, number, number],
            duration: 0.15, // 150ms
        } as const satisfies Transition,

        /** Default effects: standard utility transitions */
        defaultEffects: {
            type: "tween",
            ease: [0.34, 0.8, 0.34, 1.0] as [number, number, number, number],
            duration: 0.2, // 200ms
        } as const satisfies Transition,

        /** Slow effects: gradual utility transitions */
        slowEffects: {
            type: "tween",
            ease: [0.34, 0.88, 0.34, 1.0] as [number, number, number, number],
            duration: 0.3, // 300ms
        } as const satisfies Transition,
    },
} as const;

/* ─────────────────────────────────────────────────────────────
   2. Legacy Easing System (for screen and modal transitions)
   Still used for transitions where springs aren't applicable
   ───────────────────────────────────────────────────────────── */

export const m3MotionCurves = {
    // Emphasized easing set (most common for M3 style)
    emphasized: {
        normal: {
            ease: [0.2, 0.0, 0.0, 1.0] as [number, number, number, number],
            duration: 0.5, // 500ms
        },
        decelerate: {
            ease: [0.05, 0.7, 0.1, 1.0] as [number, number, number, number],
            duration: 0.4, // 400ms - Enter screen
        },
        accelerate: {
            ease: [0.3, 0.0, 0.8, 0.15] as [number, number, number, number],
            duration: 0.2, // 200ms - Exit screen
        },
    },

    // Standard easing set (for utility transitions)
    standard: {
        normal: {
            ease: [0.2, 0.0, 0.0, 1.0] as [number, number, number, number],
            duration: 0.3, // 300ms
        },
        decelerate: {
            ease: [0.0, 0.0, 0.0, 1.0] as [number, number, number, number],
            duration: 0.25, // 250ms - Enter screen
        },
        accelerate: {
            ease: [0.3, 0.0, 1.0, 1.0] as [number, number, number, number],
            duration: 0.2, // 200ms - Exit screen
        },
    },
} as const;

/* ─────────────────────────────────────────────────────────────
   3. Legacy Spring Presets (for backward compatibility)
   ───────────────────────────────────────────────────────────── */

export const m3LegacySprings = {
    /** Fast spatial: small components, switches, buttons */
    fastSpatial: {
        type: "spring",
        stiffness: 380,
        damping: 38,
        mass: 0.8,
        bounce: 0,
    } as const satisfies Transition,

    /** Default spatial: cards, sheets, dialogs, drawers */
    defaultSpatial: {
        type: "spring",
        stiffness: 300,
        damping: 35,
        mass: 1.0,
        bounce: 0,
    } as const satisfies Transition,

    /** Slow spatial: full-screen transitions, large surfaces */
    slowSpatial: {
        type: "spring",
        stiffness: 220,
        damping: 32,
        mass: 1.2,
        bounce: 0,
    } as const satisfies Transition,

    /** Fast effects: color/opacity change for small items (no overshoot) */
    fastEffects: {
        type: "tween",
        ease: m3MotionCurves.emphasized.decelerate.ease,
        duration: 0.15, // 150ms
    } as const satisfies Transition,

    /** Default effects: opacity of cards, content fade */
    defaultEffects: {
        type: "tween",
        ease: m3MotionCurves.emphasized.normal.ease,
        duration: 0.2, // 200ms
    } as const satisfies Transition,

    /** Emphasized enter: enter screen bounds with peak decelerate */
    emphasizedEnter: {
        type: "tween",
        ease: m3MotionCurves.emphasized.decelerate.ease,
        duration: m3MotionCurves.emphasized.decelerate.duration,
    } as const satisfies Transition,

    /** Emphasized exit: exit screen bounds with accelerate */
    emphasizedExit: {
        type: "tween",
        ease: m3MotionCurves.emphasized.accelerate.ease,
        duration: m3MotionCurves.emphasized.accelerate.duration,
    } as const satisfies Transition,
};

/* ─────────────────────────────────────────────────────────────
   4. The 6 Standard M3 Transition Patterns (Updated 2025)
   ───────────────────────────────────────────────────────────── */

/**
 * 1. Top Level Transition:
 * Used for top-level navigation (BottomNav, Rail, Drawer).
 * Quick fade out then fade in without directional grouping.
 * Updated with latest easing curves for smoother transitions.
 * Simplified to prevent flash during navigation.
 */
export const m3TopLevelVariants: Variants = {
    initial: {
        opacity: 0,
    },
    animate: {
        opacity: 1,
        transition: {
            duration: 0.1, // Faster transition to reduce flash
            ease: [0.2, 0.0, 0.0, 1.0], // Simple ease
        },
    },
    exit: {
        opacity: 0,
        transition: {
            duration: 0.1, // Faster exit
            ease: [0.3, 0.0, 0.8, 0.15],
        },
    },
};

/**
 * 2. Forward & Backward Transition:
 * Hierarchical navigation between consecutive levels (Android fade + slide).
 * Updated with expressive spring physics for natural movement.
 */
export const m3ForwardBackwardVariants = (direction: "forward" | "backward" = "forward"): Variants => ({
    initial: {
        opacity: 0,
        x: direction === "forward" ? 32 : -32,
    },
    animate: {
        opacity: 1,
        x: 0,
        transition: {
            x: m3Springs.expressive.defaultSpatial,
            opacity: m3Springs.expressive.defaultEffects,
        },
    },
    exit: {
        opacity: 0,
        x: direction === "forward" ? -32 : 32,
        transition: {
            x: { type: "tween", ease: m3MotionCurves.emphasized.accelerate.ease, duration: 0.2 },
            opacity: { duration: 0.15 },
        },
    },
});

/**
 * 3. Lateral Transition:
 * Peer content at the same level (Tabs, carousels). Grouped slide in unison.
 * Updated with smooth non-bouncing movement.
 */
export const m3LateralVariants = (direction: 1 | -1 = 1): Variants => ({
    initial: {
        x: `${direction * 100}%`,
    },
    animate: {
        x: 0,
        transition: {
            duration: 0.25,
            ease: [0.2, 0.0, 0.0, 1.0],
        },
    },
    exit: {
        x: `${direction * -100}%`,
        transition: {
            duration: 0.2,
            ease: [0.3, 0.0, 0.8, 0.15],
        },
    },
});

/**
 * 4. Enter & Exit Transition:
 * For modal dialogs, bottom sheets, snackbars, and menus.
 * Updated with smooth zero-bounce motion.
 */
export const m3EnterExitVariants: Variants = {
    initial: {
        opacity: 0,
        scale: 0.92,
        y: 16,
    },
    animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            scale: m3Springs.expressive.defaultSpatial,
            y: m3Springs.expressive.defaultSpatial,
            opacity: m3Springs.expressive.fastEffects,
        },
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        y: 8,
        transition: {
            duration: 0.15,
            ease: m3MotionCurves.emphasized.accelerate.ease,
        },
    },
};

/**
 * 5. Bottom Sheet Enter & Exit:
 * Slides up from bottom edge with M3 decelerate/accelerate curves.
 * Smooth zero bounce.
 */
export const m3BottomSheetVariants: Variants = {
    initial: {
        y: "100%",
    },
    animate: {
        y: 0,
        transition: {
            duration: 0.28,
            ease: [0.2, 0.0, 0.0, 1.0],
        },
    },
    exit: {
        y: "100%",
        transition: {
            duration: 0.22,
            ease: [0.3, 0.0, 0.8, 0.15],
        },
    },
};

/**
 * 6. Skeleton Loader Pulse:
 * Subtle diagonal pulsing animation for indeterminate placeholder loading.
 */
export const m3SkeletonTransition: Transition = {
    repeat: Infinity,
    repeatType: "reverse",
    duration: 1.2,
    ease: [0.2, 0.0, 0.0, 1.0],
};

/* ─────────────────────────────────────────────────────────────
   5. Helper Functions for Motion Scheme Selection
   ───────────────────────────────────────────────────────────── */

/**
 * Get spring presets based on motion scheme preference
 * @param scheme - 'expressive' (default) or 'standard'
 */
export const getM3Springs = (scheme: "expressive" | "standard" = "expressive") => {
    return m3Springs[scheme];
};

/**
 * Get transition variants with specified motion scheme
 * @param variants - Base variants function
 * @param scheme - Motion scheme to apply
 */
export const withMotionScheme = (
    variants: Variants | ((...args: any[]) => Variants),
    _scheme: "expressive" | "standard" = "expressive"
) => {
    // This is a helper that can be extended to wrap variants with scheme-specific springs
    return variants;
};
