"use client";

import React, { useRef, useEffect } from "react";
import clsx from "clsx";

// ---------------------------------------------------------------------------
// M3 Expressive Loading Indicator — manual rAF path morphing
// ---------------------------------------------------------------------------
// framer-motion cannot interpolate SVG path `d` strings. Instead we:
//   1. Pre-compute 7 shapes as arrays of [x,y] coordinates (48 points each)
//   2. Use requestAnimationFrame to lerp between coordinate arrays
//   3. Rebuild the SVG path string each frame and set via ref
// This is 100% reliable across Chrome, Safari/WebKit, Firefox, iOS, Android.
// ---------------------------------------------------------------------------

const N = 48;
const CX = 50;
const CY = 50;

type Pt = [number, number];

function getShapeCoords(type: number): Pt[] {
    const pts: Pt[] = [];
    for (let i = 0; i < N; i++) {
        const theta = (i * 2 * Math.PI) / N;
        let r = 35;
        switch (type) {
            case 0: {
                // Pentagon — rounded 5-sided polygon, vertex pointing up
                const a = theta + Math.PI / 2;
                const seg = (2 * Math.PI) / 5;
                const loc = ((a % seg) + seg) % seg - seg / 2;
                const sR = 29.2 / Math.cos(loc);
                r = Math.min(36.8, sR * 0.93 + 2.5);
                break;
            }
            case 1: // Cookie9 — 9-lobed scalloped flower
                r = 32.5 + 4.8 * Math.cos(9 * theta);
                break;
            case 2: { // Pill — horizontal stadium capsule
                const c = Math.cos(theta), s = Math.sin(theta);
                const ac = Math.abs(c), as2 = Math.abs(s);
                const R = 18.5, L = 17.5;
                if (as2 > 0.001) {
                    const tf = R / as2;
                    r = tf * ac <= L ? tf : L * ac + Math.sqrt(L * L * ac * ac + (R * R - L * L));
                } else { r = L + R; }
                break;
            }
            case 3: // Sunny — 8-point rounded sun burst
                r = 32.0 + 5.5 * Math.cos(8 * theta) - 1.0 * Math.cos(16 * theta);
                break;
            case 4: // Cookie4 — 4-lobed clover cookie
                r = 30.0 + 7.2 * Math.cos(4 * theta) - 1.5 * Math.cos(8 * theta);
                break;
            case 5: { // Oval — smooth elongated ellipse
                const c = Math.cos(theta), s = Math.sin(theta);
                const a2 = 36.5, b2 = 23.5;
                r = (a2 * b2) / Math.sqrt((b2 * c) ** 2 + (a2 * s) ** 2);
                break;
            }
            case 6: // SoftBurst — 12-point soft scalloped bloom
                r = 33.5 + 3.8 * Math.cos(12 * theta);
                break;
        }
        pts.push([
            +(CX + r * Math.cos(theta)).toFixed(2),
            +(CY + r * Math.sin(theta)).toFixed(2),
        ]);
    }
    return pts;
}

/** Build a smooth closed cubic Bézier path string from coordinate array.
 *  Uses Catmull-Rom → Bézier conversion (tangent factor = 1/6). */
function coordsToPath(pts: Pt[]): string {
    const len = pts.length;
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < len; i++) {
        const p0 = pts[(i - 1 + len) % len];
        const p1 = pts[i];
        const p2 = pts[(i + 1) % len];
        const p3 = pts[(i + 2) % len];
        const c1x = +(p1[0] + (p2[0] - p0[0]) / 6).toFixed(2);
        const c1y = +(p1[1] + (p2[1] - p0[1]) / 6).toFixed(2);
        const c2x = +(p2[0] - (p3[0] - p1[0]) / 6).toFixed(2);
        const c2y = +(p2[1] - (p3[1] - p1[1]) / 6).toFixed(2);
        d += `C${c1x} ${c1y} ${c2x} ${c2y} ${p2[0]} ${p2[1]}`;
    }
    return d + "Z";
}

// Pre-compute all 7 shape coordinate arrays at module load
const SHAPE_COORDS: Pt[][] = [
    getShapeCoords(0), // Pentagon
    getShapeCoords(1), // Cookie9
    getShapeCoords(2), // Pill
    getShapeCoords(3), // Sunny
    getShapeCoords(4), // Cookie4
    getShapeCoords(5), // Oval
    getShapeCoords(6), // SoftBurst
];

// Pre-compute initial path string for SSR (renders on first paint, no flash)
const INITIAL_PATH = coordsToPath(SHAPE_COORDS[0]);

// Continuous organic easing — smoothstep ensures fluid motion without dead pauses
function smoothstep(t: number): number {
    return t * t * (3 - 2 * t);
}

/** Linearly interpolate between two coordinate arrays, producing a new path string. */
function lerpPath(from: Pt[], to: Pt[], t: number): string {
    const len = from.length;
    const pts: Pt[] = new Array(len);
    for (let i = 0; i < len; i++) {
        pts[i] = [
            +(from[i][0] + (to[i][0] - from[i][0]) * t).toFixed(2),
            +(from[i][1] + (to[i][1] - from[i][1]) * t).toFixed(2),
        ];
    }
    return coordsToPath(pts);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface LoadingIndicatorProps {
    variant?: "default" | "contained";
    size?: number;
    color?: string;
    containerColor?: string;
    label?: string;
    className?: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
    variant = "default",
    size = 48,
    color,
    containerColor,
    label = "Loading...",
    className,
}) => {
    const isContained = variant === "contained";
    const activeSize = isContained ? Math.round(size * 0.7917) : size;
    const pathRef = useRef<SVGPathElement>(null);

    useEffect(() => {
        const el = pathRef.current;
        if (!el) return;

        const STEP_MS = 600; // ms per shape transition for fluid organic motion
        const COUNT = SHAPE_COORDS.length;
        let raf: number;
        let start: number | null = null;

        function tick(now: number) {
            if (!el) return;
            if (start === null) start = now;
            const elapsed = now - start;
            const totalCycle = STEP_MS * COUNT; // 4200ms full loop
            const cyclePos = elapsed % totalCycle;
            const shapeIdx = Math.floor(cyclePos / STEP_MS);
            const localT = (cyclePos - shapeIdx * STEP_MS) / STEP_MS;
            const easedT = smoothstep(localT);

            const from = SHAPE_COORDS[shapeIdx];
            const to = SHAPE_COORDS[(shapeIdx + 1) % COUNT];
            el.setAttribute("d", lerpPath(from, to, easedT));

            raf = requestAnimationFrame(tick);
        }

        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, []);

    return (
        <div
            role="progressbar"
            aria-label={label}
            suppressHydrationWarning
            className={clsx(
                "inline-flex items-center justify-center shrink-0 select-none",
                isContained &&
                    "rounded-full shadow-sm bg-[#e8def8] text-[#1d192b] dark:bg-[#27272a] dark:text-[#fafafa]",
                !isContained && "text-primary dark:text-[#fafafa]",
                className
            )}
            style={{
                width: `${size}px`,
                height: `${size}px`,
                ...(containerColor ? { backgroundColor: containerColor } : {}),
            }}
        >
            <svg
                viewBox="0 0 100 100"
                style={{
                    width: activeSize,
                    height: activeSize,
                    overflow: "visible",
                }}
            >
                <path
                    ref={pathRef}
                    d={INITIAL_PATH}
                    fill={color || "currentColor"}
                />
            </svg>
        </div>
    );
};

export default LoadingIndicator;
