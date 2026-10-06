"use client";

import { useDatabase } from "@/db/DatabaseProvider";
import { useAppStore } from "@/store/appStore";
import { TransactionDocType, CategoryDocType } from "@/db/schema";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { formatCompactCurrency, formatFullCurrency } from "@/utils/currency";
import { exportTransactionsToCsv } from "@/utils/exportImport";
import { triggerHaptic } from "@/utils/haptics";
import { generateExecutiveDigest, ExecutiveDigestResult } from "@/utils/aiClient";
import { formatTransactionHistoryDate } from "@/utils/avatar";

const CATEGORY_PALETTE = [
    "#2563eb", // Blue
    "#059669", // Emerald
    "#d97706", // Amber
    "#7c3aed", // Purple
    "#db2777", // Pink
    "#0891b2", // Cyan
    "#ea580c", // Orange
    "#475569", // Slate
    "#0d9488", // Teal
    "#e11d48", // Rose
];

type TimeframeOption = "week" | "month" | "year" | "all";

interface CategoryStat {
    categoryId: string;
    name: string;
    icon: string;
    amount: number;
    count: number;
    percentage: number;
    color: string;
    transactions: TransactionDocType[];
}

function ReportsHeroScenery() {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
            {/* ── Light Mode Daytime Scenery (Signal Lighthouse, Harbor Bay Yacht & Mountaintop Observatory) ── */}
            <svg
                viewBox="0 0 400 280"
                className="block dark:hidden w-full h-full object-cover"
                preserveAspectRatio="xMidYMid slice"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id="reportsSkyLight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#BAE6FD" />
                        <stop offset="40%" stopColor="#DBEAFE" />
                        <stop offset="75%" stopColor="#EFF6FF" />
                        <stop offset="100%" stopColor="#F8FAFC" />
                    </linearGradient>
                    <radialGradient id="reportsSunGlowLight" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.45" />
                        <stop offset="50%" stopColor="#FBBF24" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="reportsLighthouseDome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#14B8A6" />
                        <stop offset="100%" stopColor="#0D9488" />
                    </linearGradient>
                    <linearGradient id="reportsWaterGradLight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7DD3FC" />
                        <stop offset="100%" stopColor="#BAE6FD" />
                    </linearGradient>
                    <linearGradient id="reportsDomeLight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38BDF8" />
                        <stop offset="100%" stopColor="#0284C7" />
                    </linearGradient>
                </defs>

                {/* 1. Daytime Clear Sky */}
                <rect width="400" height="280" fill="url(#reportsSkyLight)" />

                {/* 2. Morning Sun with Golden Aura */}
                <circle cx="342" cy="44" r="34" fill="url(#reportsSunGlowLight)" />
                <circle cx="342" cy="44" r="14" fill="#F59E0B" opacity="0.9" />
                <circle cx="342" cy="44" r="10" fill="#FDE68A" />

                {/* Soft Drifting Morning Clouds */}
                <g opacity="0.8">
                    <path d="M 45 42 Q 58 32 75 38 Q 92 30 105 40 Q 114 38 120 46 L 45 46 Z" fill="#FFFFFF" />
                    <path d="M 185 32 Q 198 24 212 28 Q 225 20 238 30 Q 246 28 252 36 L 185 36 Z" fill="#FFFFFF" opacity="0.65" />
                </g>

                {/* Distant Sea-Gulls Gliding */}
                <path d="M 152 46 Q 157 42 162 46 Q 167 42 172 46" stroke="#64748B" strokeWidth="1" fill="none" opacity="0.7" />
                <path d="M 170 40 Q 174 37 178 40 Q 182 37 186 40" stroke="#64748B" strokeWidth="0.8" fill="none" opacity="0.6" />

                {/* 3. Distant Coastline Mountain Ranges */}
                <path
                    d="M-20 156 C 60 132, 140 150, 230 134 C 300 122, 360 138, 420 130 L 420 280 L -20 280 Z"
                    fill="#93C5FD"
                    opacity="0.5"
                />
                <path
                    d="M-20 168 C 80 142, 180 160, 290 140 C 345 132, 385 146, 420 142 L 420 280 L -20 280 Z"
                    fill="#86EFAC"
                    opacity="0.8"
                />

                {/* 4. Harbor Bay Water Sheet */}
                <path
                    d="M 60 178 C 120 168, 200 174, 300 170 C 350 168, 390 172, 420 170 L 420 220 L 60 220 Z"
                    fill="url(#reportsWaterGradLight)"
                    opacity="0.85"
                />
                {/* Gentle Water Ripple Reflections */}
                <line x1="120" y1="184" x2="160" y2="184" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.7" strokeLinecap="round" />
                <line x1="180" y1="188" x2="230" y2="188" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.6" strokeLinecap="round" />
                <line x1="240" y1="182" x2="270" y2="182" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.7" strokeLinecap="round" />

                {/* Two-Sail Schooner Sailboat in Harbor Bay */}
                <g transform="translate(196, 162)">
                    {/* Mainsail (Tall triangular sail) */}
                    <polygon points="12,0 12,18 24,18" fill="#FFFFFF" />
                    {/* Jib / Foresail */}
                    <polygon points="9,3 9,18 1,18" fill="#E2E8F0" />
                    {/* Mast & Pennant */}
                    <line x1="10.5" y1="-1" x2="10.5" y2="20" stroke="#78350F" strokeWidth="1.2" />
                    <polygon points="10.5,-1 15,-2.5 10.5,-4" fill="#0284C7" />
                    {/* Boat Wooden Hull */}
                    <path d="M-3 20 L27 20 L23 24 L1 24 Z" fill="#78350F" />
                    {/* Water Shadow */}
                    <ellipse cx="12" cy="24.5" rx="15" ry="1.5" fill="#0284C7" opacity="0.3" />
                </g>

                {/* Floating Navigation Channel Buoy */}
                <g transform="translate(150, 186)">
                    <rect x="2" y="2" width="5" height="7" fill="#EF4444" rx="1" />
                    <line x1="4.5" y1="2" x2="4.5" y2="-2" stroke="#475569" strokeWidth="0.8" />
                    <circle cx="4.5" cy="-2" r="1.2" fill="#F59E0B" />
                    <ellipse cx="4.5" cy="9.5" rx="4.5" ry="1.2" fill="#0284C7" opacity="0.35" />
                </g>

                {/* 5. Left Landmark: Classical Stone Signal Lighthouse & Keeper's Cottage */}
                <g transform="translate(12, 126)">
                    {/* Rocky Promontory Shoreline */}
                    <path d="M-10 54 L64 54 L58 44 L38 42 L18 45 L-10 50 Z" fill="#64748B" />

                    {/* Attached Keeper's Cottage */}
                    <rect x="36" y="30" width="26" height="18" fill="#F8FAFC" rx="1" />
                    <polygon points="34,30 49,20 64,30" fill="#E2E8F0" />
                    <rect x="56" y="16" width="3" height="8" fill="#94A3B8" rx="0.5" />
                    <rect x="42" y="34" width="6" height="7" fill="#38BDF8" opacity="0.75" rx="0.5" />
                    <rect x="52" y="36" width="6" height="12" fill="#475569" rx="0.5" />

                    {/* Lighthouse Tower Base & Tapered Body */}
                    <polygon points="12,50 26,50 24,14 14,14" fill="#F8FAFC" />
                    <polygon points="13,50 25,50 23,46 15,46" fill="#CBD5E1" />
                    {/* Red Accent Belt Bands */}
                    <polygon points="13.6,38 24.4,38 24.1,33 13.9,33" fill="#EF4444" opacity="0.9" />
                    <polygon points="14.2,25 23.8,25 23.5,20 14.5,20" fill="#EF4444" opacity="0.9" />

                    {/* Circular Observation Catwalk */}
                    <rect x="11" y="13" width="16" height="2" fill="#64748B" rx="0.5" />
                    <line x1="12" y1="11" x2="26" y2="11" stroke="#64748B" strokeWidth="0.8" />
                    <line x1="13" y1="11" x2="13" y2="13" stroke="#64748B" strokeWidth="0.8" />
                    <line x1="19" y1="11" x2="19" y2="13" stroke="#64748B" strokeWidth="0.8" />
                    <line x1="25" y1="11" x2="25" y2="13" stroke="#64748B" strokeWidth="0.8" />

                    {/* Lantern Room & Copper Teal Dome */}
                    <rect x="13.5" y="7" width="11" height="6" fill="#BAE6FD" opacity="0.9" />
                    <path d="M12 7 A 7 7 0 0 1 26 7 Z" fill="url(#reportsLighthouseDome)" />
                    <line x1="19" y1="0" x2="19" y2="3" stroke="#D97706" strokeWidth="1" />
                    <circle cx="19" cy="0" r="1.2" fill="#F59E0B" />
                </g>

                {/* Coastal Pines Behind Lighthouse */}
                <g transform="translate(74, 134)">
                    <rect x="4" y="20" width="2" height="16" fill="#78350F" />
                    <polygon points="5,6 -3,20 13,20" fill="#15803D" />
                    <polygon points="5,0 -1,13 11,13" fill="#16A34A" />
                </g>
                <g transform="translate(88, 142)">
                    <rect x="3" y="16" width="2" height="14" fill="#78350F" />
                    <polygon points="4,6 -2,18 10,18" fill="#16A34A" />
                </g>

                {/* 6. Right Landmark: Mountaintop Astrological Observatory & Rotunda */}
                <path
                    d="M 252 186 C 300 162, 360 175, 420 168 L 420 280 L 252 280 Z"
                    fill="#4ADE80"
                />
                <g transform="translate(272, 130)">
                    {/* Classical Observatory Body */}
                    <rect x="12" y="22" width="54" height="34" fill="#F8FAFC" rx="2" />
                    <rect x="10" y="18" width="58" height="5" fill="#E2E8F0" rx="1" />

                    {/* Columned Portico with 4 Pillars & Steps */}
                    <polygon points="34,14 49,6 64,14" fill="#CBD5E1" />
                    <rect x="36" y="14" width="26" height="2" fill="#E2E8F0" />
                    <rect x="38" y="16" width="2.5" height="18" fill="#CBD5E1" rx="0.5" />
                    <rect x="45" y="16" width="2.5" height="18" fill="#CBD5E1" rx="0.5" />
                    <rect x="52" y="16" width="2.5" height="18" fill="#CBD5E1" rx="0.5" />
                    <rect x="59" y="16" width="2.5" height="18" fill="#CBD5E1" rx="0.5" />
                    {/* Observatory Portico Entrance */}
                    <rect x="43" y="22" width="14" height="14" fill="#334155" rx="1" />

                    {/* Great Hemispherical Observatory Dome with Telescope Slit */}
                    <path d="M14 18 A 12 12 0 0 1 38 18 Z" fill="url(#reportsDomeLight)" />
                    {/* Open Telescope Slit */}
                    <rect x="23" y="8" width="5" height="10" fill="#0F172A" />
                    {/* Telescope Tube Protruding */}
                    <polygon points="24,9 29,3 32,5 27,11" fill="#FFFFFF" />

                    {/* Sundial Terrace Balustrade */}
                    <line x1="68" y1="28" x2="78" y2="28" stroke="#64748B" strokeWidth="1.5" />
                    <circle cx="73" cy="24" r="2" fill="#F59E0B" />
                </g>

                {/* Stately Italian Cypress Trees Flanking Observatory */}
                <g transform="translate(352, 126)">
                    <rect x="4" y="26" width="2.5" height="18" fill="#78350F" />
                    <ellipse cx="5" cy="16" rx="6.5" ry="18" fill="#15803D" />
                    <ellipse cx="5" cy="14" rx="4.5" ry="14" fill="#16A34A" />
                </g>
                <g transform="translate(376, 134)">
                    <rect x="4" y="24" width="2" height="16" fill="#78350F" />
                    <ellipse cx="5" cy="14" rx="5.5" ry="16" fill="#16A34A" />
                </g>

                {/* 7. Foreground Sweeping Coastal Ridge with Flowering Heather */}
                <path
                    d="M-20 206 C 75 186, 175 204, 280 188 C 345 178, 385 196, 420 190 L 420 280 L -20 280 Z"
                    fill="#22C55E"
                />
                {/* Stone Boundary Wall */}
                <path
                    d="M-20 216 C 75 196, 175 214, 280 198 C 345 188, 385 206, 420 200"
                    stroke="#15803D"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    fill="none"
                    opacity="0.6"
                />
                {/* Coastal Heather & Lavender Shrubs */}
                <ellipse cx="35" cy="214" rx="14" ry="7" fill="#16A34A" />
                <ellipse cx="145" cy="220" rx="16" ry="8" fill="#16A34A" />
                <ellipse cx="285" cy="208" rx="15" ry="7" fill="#16A34A" />
                {/* Lavender floral dots */}
                <circle cx="35" cy="212" r="1.5" fill="#818CF8" />
                <circle cx="145" cy="218" r="1.5" fill="#818CF8" />
            </svg>

            {/* ── Dark Mode Celestial Night Scenery (Sweeping Beacon Lighthouse, Starry Bay & Laser Telescope) ── */}
            <svg
                viewBox="0 0 400 280"
                className="hidden dark:block w-full h-full object-cover"
                preserveAspectRatio="xMidYMid slice"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id="reportsNightSky" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#010610" />
                        <stop offset="35%" stopColor="#051222" />
                        <stop offset="70%" stopColor="#0A1F36" />
                        <stop offset="100%" stopColor="#141414" />
                    </linearGradient>
                    <radialGradient id="reportsMoonGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.4" />
                        <stop offset="55%" stopColor="#FDE68A" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="#FDE68A" stopOpacity="0" />
                    </radialGradient>
                    {/* Sweeping Luminous Lighthouse Beacon Gradient */}
                    <linearGradient id="reportsBeaconBeam" x1="0" y1="0" x2="1" y2="0.6">
                        <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.9" />
                        <stop offset="15%" stopColor="#38BDF8" stopOpacity="0.75" />
                        <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
                    </linearGradient>
                    {/* Observatory Telescope Sky Beam */}
                    <linearGradient id="reportsTelescopeBeam" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.6" />
                        <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="reportsAmberWindow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FFA000" />
                        <stop offset="100%" stopColor="#FF8F00" />
                    </linearGradient>
                    <linearGradient id="reportsNightWater" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0A1E32" />
                        <stop offset="100%" stopColor="#0E2840" />
                    </linearGradient>
                </defs>

                {/* 1. Velvety Oceanic Night Sky */}
                <rect width="400" height="280" fill="url(#reportsNightSky)" />

                {/* 2. Golden Moon with Radiant Glow */}
                <circle cx="342" cy="44" r="30" fill="url(#reportsMoonGlow)" />
                <circle cx="342" cy="44" r="13" fill="#FDE68A" />
                <circle cx="338" cy="42" r="12" fill="#051222" />

                {/* 3. Twinkling Navigation Stars & Constellations */}
                <circle cx="50" cy="28" r="1.6" fill="#FFFFFF" opacity="0.9" />
                <circle cx="82" cy="20" r="1.3" fill="#BAE6FD" opacity="0.85" />
                <circle cx="112" cy="32" r="1.6" fill="#FFFFFF" opacity="0.95" />
                <circle cx="142" cy="38" r="1.2" fill="#FDE68A" opacity="0.85" />
                <circle cx="174" cy="24" r="1.5" fill="#FFFFFF" opacity="0.9" />
                <circle cx="214" cy="18" r="1.3" fill="#BAE6FD" opacity="0.8" />
                <circle cx="254" cy="30" r="1.4" fill="#FFFFFF" opacity="0.8" />
                <line x1="50" y1="28" x2="82" y2="20" stroke="#38BDF8" strokeWidth="0.6" strokeDasharray="2 3" opacity="0.3" />
                <line x1="82" y1="20" x2="112" y2="32" stroke="#38BDF8" strokeWidth="0.6" strokeDasharray="2 3" opacity="0.3" />
                <line x1="112" y1="32" x2="142" y2="38" stroke="#38BDF8" strokeWidth="0.6" strokeDasharray="2 3" opacity="0.3" />
                <line x1="142" y1="38" x2="174" y2="24" stroke="#38BDF8" strokeWidth="0.6" strokeDasharray="2 3" opacity="0.3" />
                <line x1="174" y1="24" x2="214" y2="18" stroke="#38BDF8" strokeWidth="0.6" strokeDasharray="2 3" opacity="0.3" />

                {/* Shooting Star Trail */}
                <line x1="265" y1="20" x2="300" y2="32" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.75" />

                {/* 4. Deep Distant Mountain Silhouettes */}
                <path
                    d="M-20 156 C 60 132, 140 150, 230 134 C 300 122, 360 138, 420 130 L 420 280 L -20 280 Z"
                    fill="#081624"
                    opacity="0.85"
                />
                <path
                    d="M-20 168 C 80 142, 180 160, 290 140 C 345 132, 385 146, 420 142 L 420 280 L -20 280 Z"
                    fill="#0D2336"
                />

                {/* 5. Moonlit Harbor Water Sheet */}
                <path
                    d="M 60 178 C 120 168, 200 174, 300 170 C 350 168, 390 172, 420 170 L 420 220 L 60 220 Z"
                    fill="url(#reportsNightWater)"
                />
                {/* Moonlit Shimmer on Water */}
                <line x1="140" y1="184" x2="180" y2="184" stroke="#38BDF8" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
                <line x1="200" y1="188" x2="245" y2="188" stroke="#38BDF8" strokeWidth="1" opacity="0.3" strokeLinecap="round" />

                {/* Silhouetted Night Yacht with Glowing Cabin Light */}
                <g transform="translate(196, 162)">
                    <polygon points="12,0 12,18 24,18" fill="#0C1B2A" />
                    <polygon points="9,3 9,18 1,18" fill="#081420" />
                    <line x1="10.5" y1="-1" x2="10.5" y2="20" stroke="#050C14" strokeWidth="1.2" />
                    <path d="M-3 20 L27 20 L23 24 L1 24 Z" fill="#050C14" />
                    {/* Glowing Cabin Porthole */}
                    <circle cx="16" cy="22" r="1.5" fill="#FFA000" />
                </g>

                {/* Blinking Harbor Buoy */}
                <g transform="translate(150, 186)">
                    <rect x="2" y="2" width="5" height="7" fill="#0A1826" rx="1" />
                    <circle cx="4.5" cy="-2" r="1.5" fill="#FFA000" />
                </g>

                {/* 6. Sweeping Radiant Lighthouse Beacon Beam (Dramatic Visual Signature) */}
                <polygon points="31,135 340,90 380,185" fill="url(#reportsBeaconBeam)" />

                {/* 7. Left Landmark: Lighthouse & Cottage at Night */}
                <g transform="translate(12, 126)">
                    {/* Dark Headland Base */}
                    <path d="M-10 54 L64 54 L58 44 L38 42 L18 45 L-10 50 Z" fill="#08121C" />

                    {/* Keeper's Cottage with Lit Amber Windows */}
                    <rect x="36" y="30" width="26" height="18" fill="#0C1A28" rx="1" />
                    <polygon points="34,30 49,20 64,30" fill="#102234" />
                    <rect x="56" y="16" width="3" height="8" fill="#071018" rx="0.5" />
                    {/* Glowing Cottage Window */}
                    <rect x="42" y="34" width="6" height="7" fill="url(#reportsAmberWindow)" rx="0.5" />
                    <rect x="52" y="36" width="6" height="12" fill="#050C14" rx="0.5" />

                    {/* Lighthouse Tower Silhouette */}
                    <polygon points="12,50 26,50 24,14 14,14" fill="#0F1E2E" />
                    <polygon points="13.6,38 24.4,38 24.1,33 13.9,33" fill="#881337" opacity="0.8" />
                    <polygon points="14.2,25 23.8,25 23.5,20 14.5,20" fill="#881337" opacity="0.8" />

                    {/* Catwalk */}
                    <rect x="11" y="13" width="16" height="2" fill="#071018" rx="0.5" />

                    {/* Brilliant Glowing Lantern Lens */}
                    <circle cx="19" cy="9.5" r="4.5" fill="#FFA000" />
                    <circle cx="19" cy="9.5" r="2.5" fill="#FFFBEB" />
                    <path d="M12 7 A 7 7 0 0 1 26 7 Z" fill="#0A1826" />
                </g>

                {/* Coastal Pines */}
                <g transform="translate(74, 134)">
                    <rect x="4" y="20" width="2" height="16" fill="#050A0E" />
                    <polygon points="5,6 -3,20 13,20" fill="#081622" />
                    <polygon points="5,0 -1,13 11,13" fill="#0C2030" />
                </g>

                {/* 8. Right Landmark: Observatory with Laser Telescope Beam */}
                <path
                    d="M 252 186 C 300 162, 360 175, 420 168 L 420 280 L 252 280 Z"
                    fill="#0F2434"
                />

                {/* Telescope Laser Beam Projecting into Cosmos */}
                <polygon points="298,138 290,15 315,15" fill="url(#reportsTelescopeBeam)" />

                <g transform="translate(272, 130)">
                    {/* Observatory Building Body */}
                    <rect x="12" y="22" width="54" height="34" fill="#0E1B28" rx="2" />
                    <rect x="10" y="18" width="58" height="5" fill="#142638" rx="1" />

                    {/* Portico Entrance with Glowing Amber Arch */}
                    <polygon points="34,14 49,6 64,14" fill="#102030" />
                    <rect x="43" y="22" width="14" height="14" fill="url(#reportsAmberWindow)" rx="1" />

                    {/* Observatory Dome with Open Slit */}
                    <path d="M14 18 A 12 12 0 0 1 38 18 Z" fill="#122436" />
                    <rect x="23" y="8" width="5" height="10" fill="#38BDF8" opacity="0.9" />

                    {/* Sundial Terrace Lantern */}
                    <circle cx="73" cy="24" r="2.2" fill="#FFA000" />
                </g>

                {/* Silhouetted Cypress Trees */}
                <g transform="translate(352, 126)">
                    <rect x="4" y="26" width="2.5" height="18" fill="#050A0E" />
                    <ellipse cx="5" cy="16" rx="6.5" ry="18" fill="#081824" />
                    <ellipse cx="5" cy="14" rx="4.5" ry="14" fill="#0C2436" />
                </g>
                <g transform="translate(376, 134)">
                    <rect x="4" y="24" width="2" height="16" fill="#050A0E" />
                    <ellipse cx="5" cy="14" rx="5.5" ry="16" fill="#0C2436" />
                </g>

                {/* 9. Foreground Deep Emerald Night Coastal Bluff */}
                <path
                    d="M-20 206 C 75 186, 175 204, 280 188 C 345 178, 385 196, 420 190 L 420 280 L -20 280 Z"
                    fill="#081822"
                />
            </svg>
        </div>
    );
}

export default function ReportsPage() {
    const router = useRouter();
    const db = useDatabase();
    const {
        activeProfileId,
        setEditingTransactionId,
        openLogTransaction,
        currency,
        isPrivacyMode,
        togglePrivacyMode
    } = useAppStore();

    const currencySymbol = currency?.symbol || '$';

    const [transactions, setTransactions] = useState<TransactionDocType[]>([]);
    const [categories, setCategories] = useState<Record<string, CategoryDocType>>({});
    const [timeframe, setTimeframe] = useState<TimeframeOption>("month");
    const [reportType, setReportType] = useState<"expense" | "income">("expense");
    const [selectedCategoryForDrilldown, setSelectedCategoryForDrilldown] = useState<string | null>(null);
    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
    const [isTimeframeMenuOpen, setIsTimeframeMenuOpen] = useState(false);

    // Subscribe to categories and transactions
    useEffect(() => {
        if (!activeProfileId || !db) return;

        const catSub = db.categories
            .find({ selector: { profile_id: activeProfileId, _deleted: false } })
            .$
            .subscribe(docs => {
                const catMap: Record<string, CategoryDocType> = {};
                docs.forEach(d => {
                    const data = d.toJSON() as CategoryDocType;
                    catMap[data.id] = data;
                });
                setCategories(catMap);
            });

        const txSub = db.transactions
            .find({
                selector: { profile_id: activeProfileId, _deleted: false },
                sort: [{ timestamp: 'desc' }],
            })
            .$
            .subscribe(docs => {
                setTransactions(docs.map(d => d.toJSON() as TransactionDocType));
            });

        return () => {
            catSub.unsubscribe();
            txSub.unsubscribe();
        };
    }, [activeProfileId, db]);

    // Data Aggregation & Analytics
    const analytics = useMemo(() => {
        const now = new Date();
        let currentStartTime = 0;
        let prevStartTime = 0;
        let daysInPeriod = 30;

        if (timeframe === 'week') {
            const start = new Date(now);
            start.setDate(start.getDate() - 7);
            currentStartTime = start.getTime();

            const prevStart = new Date(start);
            prevStart.setDate(prevStart.getDate() - 7);
            prevStartTime = prevStart.getTime();
            daysInPeriod = 7;
        } else if (timeframe === 'month') {
            const start = new Date(now);
            start.setMonth(start.getMonth() - 1);
            currentStartTime = start.getTime();

            const prevStart = new Date(start);
            prevStart.setMonth(prevStart.getMonth() - 1);
            prevStartTime = prevStart.getTime();
            daysInPeriod = 30;
        } else if (timeframe === 'year') {
            const start = new Date(now);
            start.setFullYear(start.getFullYear() - 1);
            currentStartTime = start.getTime();

            const prevStart = new Date(start);
            prevStart.setFullYear(prevStart.getFullYear() - 1);
            prevStartTime = prevStart.getTime();
            daysInPeriod = 365;
        } else {
            // 'all'
            currentStartTime = 0;
            prevStartTime = 0;
            const oldest = transactions.reduce((min, tx) => Math.min(min, tx.timestamp), Date.now());
            daysInPeriod = Math.max(1, Math.round((Date.now() - oldest) / 86400000));
        }

        // Filter transactions for current timeframe
        const periodTxs = currentStartTime === 0
            ? transactions
            : transactions.filter(tx => tx.timestamp >= currentStartTime);

        // Previous period transactions for trend
        const prevPeriodTxs = (currentStartTime > 0 && prevStartTime > 0)
            ? transactions.filter(tx => tx.timestamp >= prevStartTime && tx.timestamp < currentStartTime)
            : [];

        // Cash flow numbers
        let totalExpense = 0;
        let totalIncome = 0;
        let prevTotalForType = 0;

        periodTxs.forEach(tx => {
            if (tx.type === 'expense') totalExpense += tx.amount;
            else if (tx.type === 'income') totalIncome += tx.amount;
        });

        prevPeriodTxs.forEach(tx => {
            if (tx.type === reportType) prevTotalForType += tx.amount;
        });

        const activeTotal = reportType === 'expense' ? totalExpense : totalIncome;
        const netCashFlow = totalIncome - totalExpense;

        // Percentage change
        let percentChange = 0;
        if (prevTotalForType > 0) {
            percentChange = ((activeTotal - prevTotalForType) / prevTotalForType) * 100;
        } else if (activeTotal > 0 && prevStartTime > 0) {
            percentChange = 100;
        }

        // Category breakdown for active reportType
        const breakdownMap: Record<string, { amount: number; count: number; txs: TransactionDocType[] }> = {};
        const typeTxs = periodTxs.filter(tx => tx.type === reportType);

        typeTxs.forEach(tx => {
            const catId = tx.category_id || 'uncategorized';
            if (!breakdownMap[catId]) {
                breakdownMap[catId] = { amount: 0, count: 0, txs: [] };
            }
            breakdownMap[catId].amount += tx.amount;
            breakdownMap[catId].count += 1;
            breakdownMap[catId].txs.push(tx);
        });

        const sortedCategories: CategoryStat[] = Object.entries(breakdownMap)
            .map(([catId, data], index) => {
                const cat = categories[catId];
                return {
                    categoryId: catId,
                    name: cat?.name || (catId === 'uncategorized' ? 'Uncategorized' : 'Other'),
                    icon: cat?.icon || (catId === 'uncategorized' ? 'receipt' : 'category'),
                    amount: data.amount,
                    count: data.count,
                    percentage: activeTotal > 0 ? (data.amount / activeTotal) * 100 : 0,
                    color: CATEGORY_PALETTE[index % CATEGORY_PALETTE.length],
                    transactions: data.txs.sort((a, b) => b.timestamp - a.timestamp),
                };
            })
            .sort((a, b) => b.amount - a.amount);

        const avgPerDay = daysInPeriod > 0 ? activeTotal / daysInPeriod : 0;
        const topCategory = sortedCategories.length > 0 ? sortedCategories[0] : null;

        return {
            periodTxs,
            totalAmount: activeTotal,
            totalExpense,
            totalIncome,
            netCashFlow,
            percentChange,
            categoryBreakdown: sortedCategories,
            avgPerDay,
            topCategory,
            transactionCount: typeTxs.length,
            daysInPeriod,
        };
    }, [transactions, categories, timeframe, reportType]);

    // Active category for Donut display (hovered, expanded, or top)
    const activeHoverStat = useMemo(() => {
        if (hoveredCategory) {
            return analytics.categoryBreakdown.find(c => c.categoryId === hoveredCategory) || null;
        }
        if (selectedCategoryForDrilldown) {
            return analytics.categoryBreakdown.find(c => c.categoryId === selectedCategoryForDrilldown) || null;
        }
        return null;
    }, [hoveredCategory, selectedCategoryForDrilldown, analytics.categoryBreakdown]);

    const timeframeLabel = useMemo(() => {
        if (timeframe === 'week') return 'Last 7 days';
        if (timeframe === 'month') return 'Last 30 days';
        if (timeframe === 'year') return 'Past year';
        return 'All time';
    }, [timeframe]);

    const timeframeOptions: { id: TimeframeOption; label: string }[] = [
        { id: 'week', label: 'Last 7 days' },
        { id: 'month', label: 'Last 30 days' },
        { id: 'year', label: 'Past year' },
        { id: 'all', label: 'All time' },
    ];

    const [digest, setDigest] = useState<ExecutiveDigestResult | null>(null);
    const [isGeneratingDigest, setIsGeneratingDigest] = useState(false);

    useEffect(() => {
        let isMounted = true;
        setIsGeneratingDigest(true);

        generateExecutiveDigest({
            timeframe: timeframeLabel,
            reportType,
            totalAmount: analytics.totalAmount,
            transactionCount: analytics.transactionCount,
            percentChange: analytics.percentChange,
            netCashFlow: analytics.netCashFlow,
            topCategories: analytics.categoryBreakdown.map(c => ({
                name: c.name,
                amount: c.amount,
                percentage: c.percentage
            })),
            currencySymbol,
        }).then(res => {
            if (isMounted) {
                setDigest(res);
                setIsGeneratingDigest(false);
            }
        }).catch(() => {
            if (isMounted) setIsGeneratingDigest(false);
        });

        return () => {
            isMounted = false;
        };
    }, [timeframe, reportType, analytics.totalAmount, analytics.transactionCount, timeframeLabel, currencySymbol, analytics.percentChange, analytics.netCashFlow, analytics.categoryBreakdown]);

    return (
        <main className="flex-1 min-h-[100dvh] !bg-slate-50 dark:!bg-[#141414] text-slate-900 dark:text-[#E3E3E3] max-w-md mx-auto w-full pb-28 sm:pb-32 flex flex-col overflow-y-auto m3-scrollable">
            {/* ── 1. Unobstructed Scenic Banner (Artwork Fully Visible at Top) ── */}
            <div className="relative shrink-0 w-full min-h-[220px] sm:min-h-[245px] bg-gradient-to-b from-[#BAE6FD]/40 via-[#E0F2FE]/60 to-[#F0F9FF] dark:from-[#050B12] dark:via-[#09131E] dark:to-[#141414] flex flex-col justify-start z-30">
                {/* Artwork wrapper: overflow-hidden keeps SVGs clipped to banner bounds without clipping the header dropdown */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <ReportsHeroScenery />

                    {/* Bottom Boundary: Seamless fade into page background */}
                    <div className="hidden dark:block absolute inset-x-0 bottom-0 h-14 bg-gradient-to-b from-transparent to-[#141414] pointer-events-none z-[1]" />
                    <div className="block dark:hidden absolute inset-x-0 bottom-0 w-full overflow-hidden pointer-events-none z-[1] leading-none select-none">
                        <svg
                            viewBox="0 0 1200 120"
                            preserveAspectRatio="none"
                            className="w-full h-7 sm:h-9 block drop-shadow-[0_-2px_4px_rgba(15,23,42,0.04)]"
                            aria-hidden="true"
                        >
                            <path
                                d="M0,45 C160,82 340,16 520,52 C700,88 880,24 1040,58 C1120,74 1170,48 1200,54 L1200,120 L0,120 Z"
                                fill="#CBD5E1"
                                opacity="0.45"
                            />
                            <path
                                d="M0,58 C180,18 360,92 540,50 C720,8 900,82 1060,40 C1130,22 1175,34 1200,38 L1200,120 L0,120 Z"
                                fill="#F8FAFC"
                            />
                        </svg>
                    </div>
                </div>

                {/* Minimal Top App Bar over the scenic banner */}
                <header className="relative z-30 pt-4 px-5 sm:px-6 flex items-center justify-between gap-3">
                    {/* Back Button + Title + Timeframe Selector */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                triggerHaptic('light');
                                router.back();
                            }}
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/85 dark:bg-[#1E2020]/90 backdrop-blur-md border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-[#E3E3E3] hover:bg-slate-100 dark:hover:bg-[#282A2A] active:scale-95 transition-all shadow-xs cursor-pointer"
                            aria-label="Go back"
                        >
                            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                        </button>

                        {/* Interactive Timeframe Pill (replaces bulky toggler) */}
                        <div className="relative">
                            <button
                                onClick={() => {
                                    triggerHaptic('light');
                                    setIsTimeframeMenuOpen(!isTimeframeMenuOpen);
                                }}
                                className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full bg-white/85 dark:bg-[#1E2020]/90 backdrop-blur-md border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-[#E3E3E3] hover:bg-slate-100 dark:hover:bg-[#282A2A] active:scale-95 transition-all shadow-xs cursor-pointer text-xs font-medium"
                                aria-expanded={isTimeframeMenuOpen}
                            >
                                <span>{timeframeLabel}</span>
                                <span className={clsx(
                                    "material-symbols-outlined text-[16px] text-slate-400 dark:text-[#C4C7C5] transition-transform duration-200",
                                    isTimeframeMenuOpen && "rotate-180"
                                )}>
                                    expand_more
                                </span>
                            </button>

                            {/* Dropdown Menu */}
                            <AnimatePresence>
                                {isTimeframeMenuOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setIsTimeframeMenuOpen(false)}
                                        />
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute left-0 top-12 w-44 bg-white dark:bg-[#1E2020] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl py-1.5 z-50 text-xs overflow-hidden"
                                        >
                                            {timeframeOptions.map((opt) => (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => {
                                                        triggerHaptic('selection');
                                                        setTimeframe(opt.id);
                                                        setSelectedCategoryForDrilldown(null);
                                                        setIsTimeframeMenuOpen(false);
                                                    }}
                                                    className={clsx(
                                                        "w-full px-3.5 py-2.5 text-left flex items-center justify-between cursor-pointer transition-colors",
                                                        timeframe === opt.id
                                                            ? "bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white font-medium"
                                                            : "text-slate-600 dark:text-[#C4C7C5] hover:bg-slate-50 dark:hover:bg-white/5"
                                                    )}
                                                >
                                                    <span>{opt.label}</span>
                                                    {timeframe === opt.id && (
                                                        <span className="material-symbols-outlined text-[16px] text-primary dark:text-[#A8C7FA]">check</span>
                                                    )}
                                                </button>
                                            ))}
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Right Action Icons: CSV Export + Privacy Shield */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                triggerHaptic('medium');
                                exportTransactionsToCsv(analytics.periodTxs, categories);
                            }}
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/85 dark:bg-[#1E2020]/90 backdrop-blur-md border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-[#C4C7C5] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#282A2A] active:scale-95 transition-all shadow-xs cursor-pointer"
                            title="Export Filtered CSV"
                            aria-label="Export Filtered CSV"
                        >
                            <span className="material-symbols-outlined text-[19px]">download</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                triggerHaptic('light');
                                togglePrivacyMode();
                            }}
                            className={clsx(
                                "w-10 h-10 rounded-full border shrink-0 flex items-center justify-center transition-all shadow-xs cursor-pointer",
                                isPrivacyMode
                                    ? "bg-slate-200/90 dark:bg-white/12 border-slate-300 dark:border-white/20 text-slate-800 dark:text-slate-100"
                                    : "bg-white/85 dark:bg-[#1E2020]/90 backdrop-blur-md border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-[#C4C7C5] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#282A2A] active:scale-95"
                            )}
                            title={isPrivacyMode ? "Privacy Mode Active (Tap to reveal figures)" : "Privacy Mode Inactive (Tap to blur figures)"}
                            aria-label={isPrivacyMode ? "Disable privacy blur" : "Enable privacy blur"}
                        >
                            <span
                                className="material-symbols-outlined text-[20px]"
                                style={{ fontVariationSettings: isPrivacyMode ? "'FILL' 1" : "'FILL' 0" }}
                            >
                                {isPrivacyMode ? "visibility_off" : "visibility"}
                            </span>
                        </button>
                    </div>
                </header>
            </div>

            {/* ── 2. Clean Financial Summary Area (In Page Flow on Solid Canvas, Not Blocking Artwork) ── */}
            <div className="px-5 sm:px-6 pt-4 pb-3 flex flex-col items-start text-left">
                {/* Header row with inline Spending/Income Switcher & Trend Badge */}
                <div className="flex items-center justify-between w-full">
                    {/* Compact Type Switcher */}
                    <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-200/70 dark:bg-white/10">
                        <button
                            onClick={() => {
                                triggerHaptic('selection');
                                setReportType('expense');
                                setSelectedCategoryForDrilldown(null);
                                setHoveredCategory(null);
                            }}
                            className={clsx(
                                "px-2.5 py-1 rounded-md text-[11.5px] transition-all cursor-pointer",
                                reportType === 'expense'
                                    ? "bg-white dark:bg-[#1E2020] text-rose-600 dark:text-[#F2B8B5] font-medium shadow-2xs"
                                    : "text-slate-500 dark:text-[#C4C7C5] hover:text-slate-900 dark:hover:text-white"
                            )}
                        >
                            Spending
                        </button>
                        <button
                            onClick={() => {
                                triggerHaptic('selection');
                                setReportType('income');
                                setSelectedCategoryForDrilldown(null);
                                setHoveredCategory(null);
                            }}
                            className={clsx(
                                "px-2.5 py-1 rounded-md text-[11.5px] transition-all cursor-pointer",
                                reportType === 'income'
                                    ? "bg-white dark:bg-[#1E2020] text-emerald-600 dark:text-[#6DD58C] font-medium shadow-2xs"
                                    : "text-slate-500 dark:text-[#C4C7C5] hover:text-slate-900 dark:hover:text-white"
                            )}
                        >
                            Income
                        </button>
                    </div>

                    {/* Trend Percentage Badge */}
                    {analytics.percentChange !== 0 && timeframe !== 'all' && (
                        <div className={clsx(
                            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border privacy-mask",
                            isPrivacyMode && "privacy-blur",
                            analytics.percentChange > 0
                                ? (reportType === 'expense'
                                    ? "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-500/15 dark:border-rose-500/25"
                                    : "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-500/15 dark:border-emerald-500/25")
                                : (reportType === 'expense'
                                    ? "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-500/15 dark:border-emerald-500/25"
                                    : "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-500/15 dark:border-rose-500/25")
                        )}>
                            <span className="material-symbols-outlined text-[13px]">
                                {analytics.percentChange > 0 ? 'trending_up' : 'trending_down'}
                            </span>
                            <span className="tabular-nums font-bold">
                                {Math.abs(analytics.percentChange).toFixed(1)}%
                            </span>
                        </div>
                    )}
                </div>

                {/* Big Bold Clean Amount */}
                <h1
                    title={formatFullCurrency(analytics.totalAmount, currencySymbol)}
                    className={clsx(
                        "text-[38px] sm:text-[44px] font-semibold tracking-tight text-slate-900 dark:text-[#E3E3E3] leading-tight my-1 m3-tabular-nums cursor-default privacy-mask",
                        isPrivacyMode && "privacy-blur"
                    )}
                >
                    {formatFullCurrency(analytics.totalAmount, currencySymbol)}
                </h1>

                {/* Sub-bar: Cash flow & count */}
                <div className="flex items-center justify-between w-full text-[13px] font-normal mt-0.5">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-[#C4C7C5]">
                        <span>Cash Flow:</span>
                        <span className={clsx(
                            "font-medium tabular-nums privacy-mask",
                            isPrivacyMode && "privacy-blur",
                            analytics.netCashFlow > 0 ? "text-emerald-600 dark:text-[#6DD58C]" : (analytics.netCashFlow < 0 ? "text-rose-600 dark:text-[#F2B8B5]" : "text-slate-700 dark:text-zinc-300")
                        )}>
                            {analytics.netCashFlow > 0 ? '+' : ''}{formatCompactCurrency(analytics.netCashFlow, currencySymbol, 1000)}
                        </span>
                    </div>
                    <span className="text-slate-500 dark:text-[#C4C7C5]">
                        {analytics.transactionCount} {analytics.transactionCount === 1 ? 'transaction' : 'transactions'}
                    </span>
                </div>
            </div>

            {/* ── 3. Open Telemetry Band (No Separate Boxed Cards) ── */}
            <div className="mx-5 sm:mx-6 my-2 py-3 border-y border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                <div>
                    <span className="text-[12px] font-normal text-slate-500 dark:text-[#C4C7C5] block leading-tight">
                        Daily Average
                    </span>
                    <span className={clsx(
                        "text-[16px] font-normal text-slate-900 dark:text-[#E3E3E3] tabular-nums block mt-0.5 privacy-mask",
                        isPrivacyMode && "privacy-blur"
                    )}>
                        {currencySymbol}{analytics.avgPerDay.toFixed(2)}
                    </span>
                </div>

                <div className="text-right">
                    <span className="text-[12px] font-normal text-slate-500 dark:text-[#C4C7C5] block leading-tight">
                        Top Category
                    </span>
                    <span
                        className="text-[16px] font-normal text-slate-900 dark:text-[#E3E3E3] truncate block mt-0.5 max-w-[150px]"
                        title={analytics.topCategory?.name || 'None'}
                    >
                        {analytics.topCategory ? analytics.topCategory.name : '—'}
                    </span>
                </div>
            </div>

            {/* ── 4. Open Executive AI Briefing (Editorial Narrative, No Card Box) ── */}
            {analytics.transactionCount > 0 && digest && !isGeneratingDigest && (
                <div className="px-5 sm:px-6 py-2.5">
                    <div className="flex items-center gap-1.5 text-indigo-600 dark:text-[#A8C7FA] mb-1">
                        <span className="material-symbols-outlined text-[17px]">auto_awesome</span>
                        <span className="text-[11px] font-medium tracking-wider uppercase">
                            Executive Briefing
                        </span>
                    </div>
                    <h3 className="text-[15px] sm:text-[15.5px] font-normal text-slate-900 dark:text-[#E3E3E3] leading-snug">
                        {digest.headline}
                    </h3>
                    <p className="text-[13px] sm:text-[13.5px] font-normal text-slate-500 dark:text-[#C4C7C5] leading-relaxed mt-1">
                        {digest.summary}
                    </p>
                </div>
            )}

            {/* ── 5. Category Distribution (Open In-Page Display, No Separate Box) ── */}
            {analytics.categoryBreakdown.length > 0 && (
                <div className="px-5 sm:px-6 pt-3 pb-2">
                    <div className="flex items-center justify-between mb-1">
                        <h2 className="text-[18px] sm:text-[19px] font-normal tracking-tight text-slate-900 dark:text-[#E3E3E3]">
                            Category distribution
                        </h2>
                        <span className="text-[12px] font-normal px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-[#C4C7C5]">
                            {analytics.categoryBreakdown.length}
                        </span>
                    </div>

                    {/* Donut Chart with Center Readout */}
                    <div className="relative w-48 h-48 sm:w-52 sm:h-52 mx-auto flex items-center justify-center my-2">
                        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                            {/* Track */}
                            <circle
                                cx="50"
                                cy="50"
                                r="38"
                                fill="transparent"
                                className="stroke-slate-200/70 dark:stroke-white/10"
                                strokeWidth="11"
                            />
                            {/* Segments */}
                            {(() => {
                                let cumulativePercent = 0;
                                const radius = 38;
                                const circumference = 2 * Math.PI * radius;

                                return analytics.categoryBreakdown.map((cat) => {
                                    const pct = cat.percentage;
                                    const strokeDasharray = `${(pct / 100) * circumference} ${circumference}`;
                                    const strokeDashoffset = -((cumulativePercent / 100) * circumference);
                                    cumulativePercent += pct;

                                    const isHighlighted = activeHoverStat?.categoryId === cat.categoryId;

                                    return (
                                        <circle
                                            key={cat.categoryId}
                                            cx="50"
                                            cy="50"
                                            r={radius}
                                            fill="transparent"
                                            stroke={cat.color}
                                            strokeWidth={isHighlighted ? "13" : "11"}
                                            strokeDasharray={strokeDasharray}
                                            strokeDashoffset={strokeDashoffset}
                                            strokeLinecap="butt"
                                            className="transition-all duration-300 cursor-pointer"
                                            onMouseEnter={() => setHoveredCategory(cat.categoryId)}
                                            onMouseLeave={() => setHoveredCategory(null)}
                                            onClick={() => {
                                                setSelectedCategoryForDrilldown(
                                                    selectedCategoryForDrilldown === cat.categoryId ? null : cat.categoryId
                                                );
                                            }}
                                            style={{
                                                opacity: activeHoverStat && !isHighlighted ? 0.45 : 1,
                                                transformOrigin: "50% 50%",
                                            }}
                                        />
                                    );
                                });
                            })()}
                        </svg>

                        {/* Center Readout */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pointer-events-none">
                            {activeHoverStat ? (
                                <>
                                    <span className="text-[12px] font-normal text-slate-500 dark:text-[#C4C7C5] truncate max-w-[120px]">
                                        {activeHoverStat.name}
                                    </span>
                                    <span className={clsx("text-[24px] sm:text-[26px] font-normal text-slate-900 dark:text-[#E3E3E3] tabular-nums leading-tight mt-0.5 privacy-mask", isPrivacyMode && "privacy-blur")}>
                                        {currencySymbol}{activeHoverStat.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </span>
                                    <span
                                        className="text-[11px] font-medium mt-1 px-2 py-0.5 rounded-full"
                                        style={{
                                            backgroundColor: `${activeHoverStat.color}20`,
                                            color: activeHoverStat.color
                                        }}
                                    >
                                        {activeHoverStat.percentage.toFixed(1)}%
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="text-[12px] font-normal text-slate-500 dark:text-[#C4C7C5]">
                                        Total
                                    </span>
                                    <span className={clsx("text-[24px] sm:text-[26px] font-normal text-slate-900 dark:text-[#E3E3E3] tabular-nums leading-tight mt-0.5 privacy-mask", isPrivacyMode && "privacy-blur")}>
                                        {currencySymbol}{analytics.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </span>
                                    <span className="text-[11.5px] text-slate-400 dark:text-zinc-500 font-normal mt-0.5">
                                        100% of {reportType}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Proportional Stacked Ribbon */}
                    <div className="w-full h-2.5 bg-slate-200/70 dark:bg-white/10 rounded-full overflow-hidden flex mt-2 shadow-2xs">
                        {analytics.categoryBreakdown.map((cat) => (
                            <div
                                key={cat.categoryId}
                                className="h-full transition-all duration-300 hover:brightness-110 cursor-pointer ring-1 ring-white/60 dark:ring-[#141414]/60"
                                style={{
                                    width: `${Math.max(2, cat.percentage)}%`,
                                    backgroundColor: cat.color,
                                    opacity: activeHoverStat && activeHoverStat.categoryId !== cat.categoryId ? 0.4 : 1,
                                }}
                                onMouseEnter={() => setHoveredCategory(cat.categoryId)}
                                onMouseLeave={() => setHoveredCategory(null)}
                                onClick={() => {
                                    triggerHaptic('light');
                                    setSelectedCategoryForDrilldown(
                                        selectedCategoryForDrilldown === cat.categoryId ? null : cat.categoryId
                                    );
                                }}
                                title={`${cat.name}: ${currencySymbol}${cat.amount.toFixed(2)} (${cat.percentage.toFixed(1)}%)`}
                            />
                        ))}
                    </div>

                    {/* Quick Legend Filter Pills */}
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-slate-200/60 dark:border-white/5">
                        {analytics.categoryBreakdown.slice(0, 6).map((cat) => {
                            const isSelected = activeHoverStat?.categoryId === cat.categoryId;
                            return (
                                <button
                                    key={cat.categoryId}
                                    onClick={() => {
                                        triggerHaptic('light');
                                        setSelectedCategoryForDrilldown(
                                            selectedCategoryForDrilldown === cat.categoryId ? null : cat.categoryId
                                        );
                                    }}
                                    onMouseEnter={() => setHoveredCategory(cat.categoryId)}
                                    onMouseLeave={() => setHoveredCategory(null)}
                                    className={clsx(
                                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-normal transition-all cursor-pointer",
                                        isSelected
                                            ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                                            : "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-[#C4C7C5] hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95"
                                    )}
                                >
                                    <span
                                        className="w-2 h-2 rounded-full shrink-0"
                                        style={{ backgroundColor: cat.color }}
                                    />
                                    <span className="truncate max-w-[90px]">{cat.name}</span>
                                    <span className="opacity-75 tabular-nums">
                                        {cat.percentage.toFixed(0)}%
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── 6. Category Breakdown List Section (Matching Homepage Recent Transactions & Debts) ── */}
            <div className="flex items-center justify-between mb-2 px-5 sm:px-6 shrink-0 mt-4">
                <h2 className="text-[18px] sm:text-[19px] font-normal tracking-tight text-slate-900 dark:text-[#E3E3E3]">
                    Category breakdown
                </h2>
                <span className="text-[13px] sm:text-[13.5px] font-normal text-slate-500 dark:text-[#C4C7C5]">
                    Tap to inspect items
                </span>
            </div>

            <section className="px-5 sm:px-6 pb-12 flex flex-col flex-1">
                {analytics.categoryBreakdown.length === 0 ? (
                    <div className="flex-1 min-h-full flex flex-col items-center justify-center py-8 px-4 text-center my-auto">
                        <div className="w-16 h-16 rounded-full bg-slate-200/80 dark:bg-[#1E2020] flex items-center justify-center mb-3 text-slate-700 dark:text-[#E3E3E3] shadow-xs">
                            <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                {reportType === 'expense' ? 'receipt_long' : 'payments'}
                            </span>
                        </div>
                        <p className="text-base font-normal text-slate-800 dark:text-[#E3E3E3]">
                            No {reportType === 'expense' ? 'Expenses' : 'Income'} Recorded
                        </p>
                        <p className="text-xs text-slate-500 dark:text-[#C4C7C5] font-normal mt-0.5 mb-6">
                            No {reportType} transactions were logged for {timeframeLabel.toLowerCase()}.
                        </p>
                        <button
                            onClick={() => {
                                triggerHaptic('selection');
                                openLogTransaction(reportType);
                            }}
                            className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full bg-slate-900 dark:bg-white text-white dark:text-zinc-950 hover:bg-slate-800 dark:hover:bg-zinc-200 active:scale-95 transition-all text-xs font-semibold shadow-xs cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[16px]">add</span>
                            <span>Log {reportType === 'expense' ? 'Expense' : 'Income'}</span>
                        </button>
                    </div>
                ) : (
                    <div className="space-y-1 w-full">
                        {analytics.categoryBreakdown.map((cat) => {
                            const isExpanded = selectedCategoryForDrilldown === cat.categoryId;

                            return (
                                <div
                                    key={cat.categoryId}
                                    className="transition-colors overflow-hidden"
                                >
                                    {/* Category Row Trigger (Matching Homepage & Debts List Item) */}
                                    <div
                                        onClick={() => {
                                            triggerHaptic('selection');
                                            setSelectedCategoryForDrilldown(isExpanded ? null : cat.categoryId);
                                        }}
                                        className="group relative z-10 bg-slate-50 dark:bg-[#141414] flex items-center gap-4 py-3 px-1.5 hover:bg-slate-100/70 dark:hover:bg-white/[0.04] active:bg-slate-200/50 dark:active:bg-white/[0.08] transition-colors cursor-pointer select-none rounded-xl"
                                    >
                                        {/* Circular Avatar matching Homepage Transactions */}
                                        <div
                                            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                                            style={{
                                                backgroundColor: `${cat.color}22`,
                                                color: cat.color,
                                            }}
                                        >
                                            <span className="material-symbols-outlined text-[20px]">
                                                {cat.icon}
                                            </span>
                                        </div>

                                        {/* Name & Subtitle Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[15.5px] sm:text-[16px] font-normal text-slate-900 dark:text-[#E3E3E3] truncate leading-tight">
                                                {cat.name}
                                            </p>
                                            <p className="text-[13px] sm:text-[13.5px] font-normal text-slate-500 dark:text-[#C4C7C5] truncate mt-1 leading-normal">
                                                {cat.count} {cat.count === 1 ? 'entry' : 'entries'} • avg {currencySymbol}{(cat.amount / cat.count).toFixed(2)}
                                            </p>
                                        </div>

                                        {/* Amount & Chevron */}
                                        <div className="flex items-center gap-2.5 text-right shrink-0">
                                            <div>
                                                <p
                                                    title={formatFullCurrency(cat.amount, currencySymbol)}
                                                    className={clsx(
                                                        "text-[16px] sm:text-[17px] font-normal tabular-nums whitespace-nowrap privacy-mask",
                                                        isPrivacyMode && "privacy-blur",
                                                        reportType === 'income'
                                                            ? "text-emerald-600 dark:text-[#6DD58C]"
                                                            : "text-slate-900 dark:text-[#E3E3E3]"
                                                    )}
                                                >
                                                    {reportType === 'income' ? `+ ${currencySymbol}` : `${currencySymbol}`}{Number.isInteger(cat.amount) ? cat.amount.toLocaleString() : cat.amount.toFixed(2)}
                                                </p>
                                                <span className="text-[11.5px] font-normal text-slate-500 dark:text-[#C4C7C5] block tabular-nums text-right">
                                                    {cat.percentage.toFixed(0)}% of total
                                                </span>
                                            </div>

                                            <span className={clsx(
                                                "material-symbols-outlined text-[20px] text-slate-400 dark:text-[#C4C7C5] transition-transform duration-200",
                                                isExpanded && "rotate-180"
                                            )}>
                                                expand_more
                                            </span>
                                        </div>
                                    </div>

                                    {/* Collapsible Drilldown Drawer */}
                                    <div
                                        className={clsx(
                                            "grid transition-[grid-template-rows] duration-200 ease-out",
                                            isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                                        )}
                                    >
                                        <div className="overflow-hidden pl-2 sm:pl-4 pr-0.5 py-1">
                                            <div className="bg-slate-100/70 dark:bg-white/[0.03] rounded-2xl p-2.5 sm:p-3 space-y-1.5 border border-slate-200/60 dark:border-white/5 my-0.5">
                                                <div className="flex items-center justify-between pb-0.5 px-1.5">
                                                    <span className="text-[13px] font-normal text-slate-500 dark:text-[#C4C7C5]">
                                                        {cat.name} Transactions ({cat.transactions.length})
                                                    </span>
                                                    <span className="text-[11.5px] text-slate-400 dark:text-zinc-500 font-normal">
                                                        Tap to edit
                                                    </span>
                                                </div>

                                                <div className="space-y-1">
                                                    {cat.transactions.map((tx) => {
                                                        const dateStr = formatTransactionHistoryDate(tx.timestamp);
                                                        const displayAmount = Number.isInteger(tx.amount) ? tx.amount.toLocaleString() : tx.amount.toFixed(2);

                                                        return (
                                                            <div
                                                                key={tx.id}
                                                                onClick={() => {
                                                                    triggerHaptic('medium');
                                                                    setEditingTransactionId(tx.id);
                                                                }}
                                                                className="group relative z-10 bg-slate-50 dark:bg-[#141414] hover:bg-slate-100/70 dark:hover:bg-white/[0.04] active:bg-slate-200/50 dark:active:bg-white/[0.08] flex items-center justify-between py-2.5 px-2 rounded-xl transition-colors cursor-pointer select-none"
                                                            >
                                                                <div className="flex items-center gap-3 min-w-0 pr-2">
                                                                    <div
                                                                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                                                                        style={{
                                                                            backgroundColor: `${cat.color}22`,
                                                                            color: cat.color,
                                                                        }}
                                                                    >
                                                                        <span className="material-symbols-outlined text-[17px]">{cat.icon}</span>
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="text-[15px] font-normal text-slate-900 dark:text-[#E3E3E3] truncate leading-tight">
                                                                            {tx.note || cat.name}
                                                                        </p>
                                                                        <p className="text-[12.5px] font-normal text-slate-500 dark:text-[#C4C7C5] truncate mt-0.5">
                                                                            {dateStr}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-1.5 shrink-0 text-right">
                                                                    <span className={clsx(
                                                                        "text-[15.5px] font-normal tabular-nums whitespace-nowrap privacy-mask",
                                                                        isPrivacyMode && "privacy-blur",
                                                                        tx.type === 'income' ? "text-emerald-600 dark:text-[#6DD58C]" : "text-slate-900 dark:text-[#E3E3E3]"
                                                                    )}>
                                                                        {tx.type === 'income' ? `+ ${currencySymbol}${displayAmount}` : `${currencySymbol}${displayAmount}`}
                                                                    </span>
                                                                    <span className="material-symbols-outlined text-[16px] text-slate-400 dark:text-zinc-500">
                                                                        chevron_right
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </main>
    );
}
