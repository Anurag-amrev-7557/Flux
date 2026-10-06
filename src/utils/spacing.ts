/**
 * Material 3 Spacing System
 * Spec: https://m3.material.io/styles/spacing/overview
 * Spec Tokens: https://m3.material.io/styles/spacing/tokens
 *
 * Measured on an 8dp scale, where space100 = 8dp (md.sys.measurement.space100).
 * Nested and multiplier units provide consistent padding, gaps, and margins.
 */

export const m3Spacing = {
    /** 0dp (0px / 0rem) */
    space0: 0,
    /** 2dp (2px / 0.125rem) - Nested unit */
    space25: 2,
    /** 4dp (4px / 0.25rem) - Nested unit: tight icon gaps, dense chips */
    space50: 4,
    /** 6dp (6px / 0.375rem) - Nested unit */
    space75: 6,
    /** 8dp (8px / 0.5rem) - Baseline Unit (md.sys.measurement.space100): component padding, standard gaps */
    space100: 8,
    /** 10dp (10px / 0.625rem) - Nested unit */
    space125: 10,
    /** 12dp (12px / 0.75rem) - Card corner radius, focused search margin */
    space150: 12,
    /** 14dp (14px / 0.875rem) - Nested unit */
    space175: 14,
    /** 16dp (16px / 1rem) - space200: Standard content horizontal padding, card padding */
    space200: 16,
    /** 20dp (20px / 1.25rem) - space250: Modal padding, section gaps */
    space250: 20,
    /** 24dp (24px / 1.5rem) - space300: Page margins, unfocused search margin */
    space300: 24,
    /** 32dp (32px / 2rem) - space400: Section spacers, hero spacing */
    space400: 32,
    /** 36dp (36px / 2.25rem) - space450 */
    space450: 36,
    /** 40dp (40px / 2.5rem) - space500: Top level spacing */
    space500: 40,
    /** 48dp (48px / 3rem) - space600: Floating actions, hero banners */
    space600: 48,
    /** 56dp (56px / 3.5rem) - space700: Search bar height, standard app bar height */
    space700: 56,
    /** 64dp (64px / 4rem) - space800: Navigation rail / header heights */
    space800: 64,
    /** 72dp (72px / 4.5rem) - space900: Extended layouts */
    space900: 72,
} as const;

export type M3SpacingKey = keyof typeof m3Spacing;

/** Convert dp/px to rem string based on standard 16px root */
export const m3ToRem = (dp: number): string => `${dp / 16}rem`;
