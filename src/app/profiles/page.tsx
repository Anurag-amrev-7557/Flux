"use client";

import { useDatabase } from "@/db/DatabaseProvider";
import { seedProfileCategories } from "@/db/database";
import { useAppStore } from "@/store/appStore";
import { ProfileDocType, TransactionDocType } from "@/db/schema";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useRef } from "react";
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

import { ActionModal } from "@/components/ActionModal";
import { mutate, softDelete } from "@/sync/mutate";
import { triggerHaptic } from "@/utils/haptics";

const quickPresets = [
    { name: "Personal", icon: "person", desc: "Everyday life & personal spending" },
    { name: "Work", icon: "business_center", desc: "Corporate, freelancing & clients" },
    { name: "Travel", icon: "flight_takeoff", desc: "Trips, holidays & adventures" },
    { name: "Household", icon: "home", desc: "Rent, utilities & shared groceries" },
    { name: "Side Project", icon: "terminal", desc: "SaaS, domain & indie hacking" },
];

function getWorkspaceMeta(name: string) {
    const lower = name.toLowerCase();
    if (lower.includes('work') || lower.includes('biz') || lower.includes('office') || lower.includes('corp') || lower.includes('client')) {
        return {
            icon: 'business_center',
            color: '#38BDF8',
            barColor: 'bg-sky-500',
            avatarBg: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/20',
        };
    }
    if (lower.includes('travel') || lower.includes('trip') || lower.includes('vacation') || lower.includes('tour') || lower.includes('holiday')) {
        return {
            icon: 'flight_takeoff',
            color: '#F59E0B',
            barColor: 'bg-amber-500',
            avatarBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20',
        };
    }
    if (lower.includes('house') || lower.includes('home') || lower.includes('family') || lower.includes('flat') || lower.includes('rent')) {
        return {
            icon: 'home',
            color: '#10B981',
            barColor: 'bg-emerald-500',
            avatarBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        };
    }
    if (lower.includes('side') || lower.includes('project') || lower.includes('dev') || lower.includes('tech') || lower.includes('code')) {
        return {
            icon: 'terminal',
            color: '#A855F7',
            barColor: 'bg-purple-500',
            avatarBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20',
        };
    }
    if (lower.includes('person') || lower.includes('me') || lower.includes('self') || lower.includes('main')) {
        return {
            icon: 'person',
            color: '#6366F1',
            barColor: 'bg-indigo-500',
            avatarBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        };
    }
    return {
        icon: 'folder_open',
        color: '#64748B',
        barColor: 'bg-slate-500',
        avatarBg: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20',
    };
}

/* ── World-Class Architectural Workspace Scenery (Matching Homepage & Debts Fidelity) ── */
/* ── World-Class Architectural Workspace Scenery (Matching Homepage & Debts Fidelity) ── */
function ProfilesHeroScenery() {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
            {/* ── Light Mode Daytime Scenery (Architect Studio Lofts, Artisan Plaza & Workspace Colonnade) ── */}
            <svg
                viewBox="0 0 400 280"
                className="block dark:hidden w-full h-full object-cover"
                preserveAspectRatio="xMidYMid slice"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id="profilesSkyLight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#BAE6FD" />
                        <stop offset="40%" stopColor="#DBEAFE" />
                        <stop offset="75%" stopColor="#EFF6FF" />
                        <stop offset="100%" stopColor="#F8FAFC" />
                    </linearGradient>
                    <radialGradient id="profilesSunLight" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.45" />
                        <stop offset="50%" stopColor="#FBBF24" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="profilesColonnadeRoof" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0EA5E9" />
                        <stop offset="100%" stopColor="#0284C7" />
                    </linearGradient>
                    <linearGradient id="profilesGlassLight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7DD3FC" />
                        <stop offset="100%" stopColor="#38BDF8" />
                    </linearGradient>
                </defs>

                {/* 1. Daylight Clear Sky */}
                <rect width="400" height="280" fill="url(#profilesSkyLight)" />

                {/* 2. Morning Sun with Warm Corona Aura */}
                <circle cx="340" cy="44" r="34" fill="url(#profilesSunLight)" />
                <circle cx="340" cy="44" r="14" fill="#F59E0B" opacity="0.9" />
                <circle cx="340" cy="44" r="10" fill="#FDE68A" />

                {/* Soft Fluffy Clouds */}
                <g opacity="0.8">
                    <path d="M 45 42 Q 58 32 75 38 Q 92 30 105 40 Q 114 38 120 46 L 45 46 Z" fill="#FFFFFF" />
                    <path d="M 185 32 Q 198 24 212 28 Q 225 20 238 30 Q 246 28 252 36 L 185 36 Z" fill="#FFFFFF" opacity="0.65" />
                </g>

                {/* Distant Birds Soaring */}
                <path d="M 148 48 Q 153 44 158 48 Q 163 44 168 48" stroke="#64748B" strokeWidth="1" fill="none" opacity="0.7" />
                <path d="M 166 42 Q 170 39 174 42 Q 178 39 182 42" stroke="#64748B" strokeWidth="0.8" fill="none" opacity="0.6" />

                {/* 3. Distant Layered Mountains */}
                <path
                    d="M-20 162 C 60 135, 140 155, 230 138 C 300 125, 360 142, 420 134 L 420 280 L -20 280 Z"
                    fill="#93C5FD"
                    opacity="0.5"
                />
                <path
                    d="M-20 176 C 80 148, 180 168, 290 146 C 345 136, 385 152, 420 148 L 420 280 L -20 280 Z"
                    fill="#86EFAC"
                    opacity="0.8"
                />

                {/* 4. Left Landmark: Modern 2-Story Architect Studio Loft */}
                <g transform="translate(12, 130)">
                    {/* Main Loft Building */}
                    <rect x="8" y="18" width="52" height="42" fill="#F8FAFC" rx="2" />
                    {/* Pitched Studio Roof with Overhang */}
                    <path d="M4 18 L34 2 L64 18 Z" fill="#E2E8F0" />
                    <rect x="44" y="6" width="5" height="12" fill="#94A3B8" rx="1" />
                    {/* Rooftop Dormer / Skylight */}
                    <polygon points="18,12 28,6 28,15 18,17" fill="#CBD5E1" />
                    <polygon points="20,11 26,7 26,13 20,15" fill="#38BDF8" opacity="0.75" />

                    {/* Double-Height Drafting Studio Window Grid */}
                    <rect x="14" y="24" width="22" height="24" fill="url(#profilesGlassLight)" opacity="0.85" rx="1.5" />
                    <line x1="25" y1="24" x2="25" y2="48" stroke="#FFFFFF" strokeWidth="1.4" />
                    <line x1="14" y1="36" x2="36" y2="36" stroke="#FFFFFF" strokeWidth="1.4" />
                    <line x1="14" y1="30" x2="36" y2="30" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.7" />
                    <line x1="14" y1="42" x2="36" y2="42" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.7" />

                    {/* Interior Drafting Easel Silhouette */}
                    <line x1="22" y1="36" x2="28" y2="46" stroke="#0F172A" strokeWidth="1.2" opacity="0.5" />
                    <line x1="28" y1="36" x2="22" y2="46" stroke="#0F172A" strokeWidth="1.2" opacity="0.5" />
                    <rect x="21" y="34" width="8" height="6" fill="#F8FAFC" opacity="0.6" />

                    {/* Secondary Studio Upper Window */}
                    <rect x="40" y="24" width="16" height="12" fill="url(#profilesGlassLight)" opacity="0.75" rx="1" />
                    <line x1="48" y1="24" x2="48" y2="36" stroke="#FFFFFF" strokeWidth="1.2" />

                    {/* Studio Entrance Porch & Door */}
                    <rect x="42" y="40" width="12" height="20" fill="#475569" rx="1" />
                    <circle cx="51" cy="50" r="1.3" fill="#F59E0B" />
                    {/* Azure Canopy Awning */}
                    <path d="M38 39 L57 39 L54 43 L41 43 Z" fill="#0284C7" />
                    {/* Outdoor Entrance Lantern */}
                    <circle cx="39" cy="46" r="2" fill="#F59E0B" />
                </g>

                {/* Studio Rooftop Garden Terrace & Pines */}
                <g transform="translate(68, 128)">
                    {/* Terrace Planter Box */}
                    <rect x="2" y="24" width="14" height="6" fill="#D97706" rx="1" />
                    {/* Pines Behind Studio */}
                    <rect x="18" y="22" width="2.5" height="20" fill="#78350F" />
                    <polygon points="19,6 11,24 27,24" fill="#15803D" />
                    <polygon points="19,0 13,14 25,14" fill="#16A34A" />
                </g>
                <g transform="translate(88, 138)">
                    <rect x="3" y="18" width="2" height="16" fill="#78350F" />
                    <polygon points="4,6 -2,20 10,20" fill="#16A34A" />
                </g>

                {/* 5. Center Artisan Plaza & Winding Promenade */}
                <path
                    d="M 64 192 C 120 178, 180 196, 270 182"
                    stroke="#E2E8F0"
                    strokeWidth="8"
                    strokeLinecap="round"
                />
                <path
                    d="M 64 192 C 120 178, 180 196, 270 182"
                    stroke="#CBD5E1"
                    strokeWidth="2"
                    strokeDasharray="4 6"
                    strokeLinecap="round"
                />

                {/* Plaza Sundial / Gateway Monument */}
                <g transform="translate(172, 168)">
                    <rect x="2" y="10" width="18" height="16" fill="#CBD5E1" rx="1.5" />
                    <path d="M4 10 A 7 7 0 0 1 18 10 Z" fill="#94A3B8" />
                    <circle cx="11" cy="5" r="3" fill="#F59E0B" />
                </g>

                {/* Two Creative Colleagues Conversing on the Promenade */}
                <g transform="translate(132, 172)">
                    <circle cx="5" cy="4" r="2.5" fill="#334155" />
                    <path d="M2.5 7 L7.5 7 L8 15 L2 15 Z" fill="#475569" />
                </g>
                <g transform="translate(144, 173)">
                    <circle cx="5" cy="4" r="2.5" fill="#334155" />
                    <path d="M2.5 7 L7.5 7 L8 14 L2 14 Z" fill="#0284C7" />
                </g>

                {/* Promenade Lantern Posts */}
                <g transform="translate(112, 166)">
                    <line x1="3" y1="2" x2="3" y2="24" stroke="#64748B" strokeWidth="1.3" />
                    <circle cx="3" cy="2" r="2.2" fill="#F59E0B" />
                </g>
                <g transform="translate(222, 162)">
                    <line x1="3" y1="2" x2="3" y2="24" stroke="#64748B" strokeWidth="1.3" />
                    <circle cx="3" cy="2" r="2.2" fill="#F59E0B" />
                </g>

                {/* 6. Right Landmark: Innovation Workspace Colonnade & Rotunda */}
                <path
                    d="M 252 186 C 300 162, 360 175, 420 168 L 420 280 L 252 280 Z"
                    fill="#4ADE80"
                />
                <g transform="translate(274, 132)">
                    {/* Main Colonnade Pavilion */}
                    <rect x="10" y="20" width="58" height="40" fill="#F8FAFC" rx="2" />
                    {/* Cornice Roof & Balustrade */}
                    <rect x="8" y="16" width="62" height="5" fill="#E2E8F0" rx="1" />
                    <rect x="12" y="12" width="54" height="4" fill="url(#profilesColonnadeRoof)" rx="1" />

                    {/* Arched Colonnade Gallery (3 Classical Arches with Tinted Glass) */}
                    <path d="M16 38 A 6 6 0 0 1 28 38 L28 58 L16 58 Z" fill="url(#profilesGlassLight)" opacity="0.8" />
                    <path d="M33 38 A 6 6 0 0 1 45 38 L45 58 L33 58 Z" fill="url(#profilesGlassLight)" opacity="0.8" />
                    <path d="M50 38 A 6 6 0 0 1 62 38 L62 58 L50 58 Z" fill="url(#profilesGlassLight)" opacity="0.8" />

                    {/* Fluted Pillars */}
                    <rect x="14" y="36" width="3" height="24" fill="#CBD5E1" rx="0.5" />
                    <rect x="31" y="36" width="3" height="24" fill="#CBD5E1" rx="0.5" />
                    <rect x="48" y="36" width="3" height="24" fill="#CBD5E1" rx="0.5" />
                    <rect x="63" y="36" width="3" height="24" fill="#CBD5E1" rx="0.5" />

                    {/* Upper Clerestory Accent Windows */}
                    <rect x="16" y="24" width="12" height="6" fill="url(#profilesGlassLight)" opacity="0.6" rx="0.5" />
                    <rect x="33" y="24" width="12" height="6" fill="url(#profilesGlassLight)" opacity="0.6" rx="0.5" />
                    <rect x="50" y="24" width="12" height="6" fill="url(#profilesGlassLight)" opacity="0.6" rx="0.5" />
                </g>

                {/* Stately Italian Cypress Trees */}
                <g transform="translate(352, 126)">
                    <rect x="4" y="26" width="2.5" height="18" fill="#78350F" />
                    <ellipse cx="5" cy="16" rx="6.5" ry="18" fill="#15803D" />
                    <ellipse cx="5" cy="14" rx="4.5" ry="14" fill="#16A34A" />
                </g>
                <g transform="translate(376, 134)">
                    <rect x="4" y="24" width="2" height="16" fill="#78350F" />
                    <ellipse cx="5" cy="14" rx="5.5" ry="16" fill="#16A34A" />
                </g>

                {/* 7. Foreground Terraced Meadow with Stone Retaining Wall */}
                <path
                    d="M-20 206 C 75 186, 175 204, 280 188 C 345 178, 385 196, 420 190 L 420 280 L -20 280 Z"
                    fill="#22C55E"
                />
                {/* Stone Retaining Wall Accent */}
                <path
                    d="M-20 216 C 75 196, 175 214, 280 198 C 345 188, 385 206, 420 200"
                    stroke="#15803D"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    fill="none"
                    opacity="0.6"
                />
                {/* Flowering Agave & Garden Shrub Accents */}
                <ellipse cx="40" cy="214" rx="12" ry="6" fill="#16A34A" />
                <ellipse cx="160" cy="220" rx="15" ry="7" fill="#16A34A" />
                <ellipse cx="295" cy="208" rx="14" ry="7" fill="#16A34A" />
            </svg>

            {/* ── Dark Mode Celestial Night Scenery (Studios with Glowing Amber Windows & Workspace Colonnade) ── */}
            <svg
                viewBox="0 0 400 280"
                className="hidden dark:block w-full h-full object-cover"
                preserveAspectRatio="xMidYMid slice"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id="profilesNightSky" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#01060A" />
                        <stop offset="35%" stopColor="#051017" />
                        <stop offset="70%" stopColor="#0A1C26" />
                        <stop offset="100%" stopColor="#141414" />
                    </linearGradient>
                    <radialGradient id="profilesMoonGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.4" />
                        <stop offset="55%" stopColor="#FDE68A" stopOpacity="0.1" />
                        <stop offset="100%" stopColor="#FDE68A" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="profilesAmberWindow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FFA000" />
                        <stop offset="100%" stopColor="#FF8F00" />
                    </linearGradient>
                </defs>

                {/* 1. Velvety Night Sky */}
                <rect width="400" height="280" fill="url(#profilesNightSky)" />

                {/* 2. Golden Moon with Radiant Glow */}
                <circle cx="340" cy="44" r="30" fill="url(#profilesMoonGlow)" />
                <circle cx="340" cy="44" r="13" fill="#FDE68A" />
                <circle cx="336" cy="42" r="12" fill="#051017" />

                {/* 3. Twinkling Stars & Constellation Navigation Coordinates */}
                <circle cx="60" cy="30" r="1.6" fill="#FFFFFF" opacity="0.9" />
                <circle cx="88" cy="22" r="1.3" fill="#BAE6FD" opacity="0.85" />
                <circle cx="118" cy="34" r="1.6" fill="#FFFFFF" opacity="0.95" />
                <circle cx="146" cy="40" r="1.2" fill="#FDE68A" opacity="0.85" />
                <circle cx="178" cy="26" r="1.5" fill="#FFFFFF" opacity="0.9" />
                <circle cx="218" cy="18" r="1.3" fill="#BAE6FD" opacity="0.8" />
                <circle cx="250" cy="32" r="1.4" fill="#FFFFFF" opacity="0.8" />
                <line x1="60" y1="30" x2="88" y2="22" stroke="#38BDF8" strokeWidth="0.6" strokeDasharray="2 3" opacity="0.3" />
                <line x1="88" y1="22" x2="118" y2="34" stroke="#38BDF8" strokeWidth="0.6" strokeDasharray="2 3" opacity="0.3" />
                <line x1="118" y1="34" x2="146" y2="40" stroke="#38BDF8" strokeWidth="0.6" strokeDasharray="2 3" opacity="0.3" />
                <line x1="146" y1="40" x2="178" y2="26" stroke="#38BDF8" strokeWidth="0.6" strokeDasharray="2 3" opacity="0.3" />
                <line x1="178" y1="26" x2="218" y2="18" stroke="#38BDF8" strokeWidth="0.6" strokeDasharray="2 3" opacity="0.3" />

                {/* Shooting Star Trail */}
                <line x1="260" y1="22" x2="295" y2="34" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.75" />

                {/* 4. Deep Mountain Silhouettes */}
                <path
                    d="M-20 162 C 60 135, 140 155, 230 138 C 300 125, 360 142, 420 134 L 420 280 L -20 280 Z"
                    fill="#08141C"
                    opacity="0.85"
                />
                <path
                    d="M-20 176 C 80 148, 180 168, 290 146 C 345 136, 385 152, 420 148 L 420 280 L -20 280 Z"
                    fill="#0D222E"
                />

                {/* 5. Left Landmark: Studio Atelier at Night with Glowing Amber Windows */}
                <g transform="translate(12, 130)">
                    {/* Atelier Building Silhouette */}
                    <rect x="8" y="18" width="52" height="42" fill="#0C171F" rx="2" />
                    <path d="M4 18 L34 2 L64 18 Z" fill="#111F2A" />
                    <rect x="44" y="6" width="5" height="12" fill="#070E13" rx="1" />

                    {/* Double-Height Drafting Loft Windows with Warm Amber Glow */}
                    <rect x="14" y="24" width="22" height="24" fill="url(#profilesAmberWindow)" opacity="0.95" rx="1.5" />
                    <line x1="25" y1="24" x2="25" y2="48" stroke="#0C171F" strokeWidth="1.6" />
                    <line x1="14" y1="36" x2="36" y2="36" stroke="#0C171F" strokeWidth="1.6" />
                    {/* Interior Drafting Easel & Pendant Lamp Silhouette */}
                    <line x1="22" y1="36" x2="28" y2="46" stroke="#060C10" strokeWidth="1.4" />
                    <line x1="28" y1="36" x2="22" y2="46" stroke="#060C10" strokeWidth="1.4" />
                    <line x1="25" y1="24" x2="25" y2="28" stroke="#060C10" strokeWidth="1" />
                    <circle cx="25" cy="28" r="1.5" fill="#FFE082" />

                    {/* Secondary Upper Window */}
                    <rect x="40" y="24" width="16" height="12" fill="url(#profilesAmberWindow)" opacity="0.85" rx="1" />
                    <line x1="48" y1="24" x2="48" y2="36" stroke="#0C171F" strokeWidth="1.4" />

                    {/* Studio Entrance Door with Glowing Lantern */}
                    <rect x="42" y="40" width="12" height="20" fill="#060C10" rx="1" />
                    <circle cx="39" cy="46" r="2.2" fill="#FFA000" />
                </g>

                {/* Festive String Fairy Lights on Rooftop Terrace & Pines */}
                <g transform="translate(68, 128)">
                    {/* Silhouetted Pines */}
                    <rect x="18" y="22" width="2.5" height="20" fill="#050A0E" />
                    <polygon points="19,6 11,24 27,24" fill="#0A1820" />
                    <polygon points="19,0 13,14 25,14" fill="#0F2430" />
                </g>
                <g transform="translate(88, 138)">
                    <rect x="3" y="18" width="2" height="16" fill="#050A0E" />
                    <polygon points="4,6 -2,20 10,20" fill="#0A1820" />
                </g>

                {/* 6. Center Artisan Promenade with Glowing Amber Street Lanterns */}
                <path
                    d="M 64 192 C 120 178, 180 196, 270 182"
                    stroke="#0A1620"
                    strokeWidth="8"
                    strokeLinecap="round"
                />
                <circle cx="112" cy="166" r="2.5" fill="#FFA000" />
                <circle cx="112" cy="166" r="6" fill="#FFA000" opacity="0.2" />
                <circle cx="222" cy="162" r="2.5" fill="#FFA000" />
                <circle cx="222" cy="162" r="6" fill="#FFA000" opacity="0.2" />

                {/* Silhouetted Colleagues Walking on the Promenade */}
                <g transform="translate(132, 172)">
                    <circle cx="5" cy="4" r="2.5" fill="#060C10" />
                    <path d="M2.5 7 L7.5 7 L8 15 L2 15 Z" fill="#081016" />
                </g>
                <g transform="translate(144, 173)">
                    <circle cx="5" cy="4" r="2.5" fill="#060C10" />
                    <path d="M2.5 7 L7.5 7 L8 14 L2 14 Z" fill="#081016" />
                </g>

                {/* 7. Right Landmark: Workspace Colonnade with Glowing Arches */}
                <path
                    d="M 252 186 C 300 162, 360 175, 420 168 L 420 280 L 252 280 Z"
                    fill="#0F281E"
                />
                <g transform="translate(274, 132)">
                    {/* Pavilion Body */}
                    <rect x="10" y="20" width="58" height="40" fill="#0E1A16" rx="2" />
                    <rect x="8" y="16" width="62" height="5" fill="#14241E" rx="1" />

                    {/* Arched Colonnade Gallery (3 Classical Arches Glowing Warm Amber) */}
                    <path d="M16 38 A 6 6 0 0 1 28 38 L28 58 L16 58 Z" fill="url(#profilesAmberWindow)" opacity="0.95" />
                    <path d="M33 38 A 6 6 0 0 1 45 38 L45 58 L33 58 Z" fill="url(#profilesAmberWindow)" opacity="0.9" />
                    <path d="M50 38 A 6 6 0 0 1 62 38 L62 58 L50 58 Z" fill="url(#profilesAmberWindow)" opacity="0.95" />

                    {/* Fluted Pillars */}
                    <rect x="14" y="36" width="3" height="24" fill="#0A1410" rx="0.5" />
                    <rect x="31" y="36" width="3" height="24" fill="#0A1410" rx="0.5" />
                    <rect x="48" y="36" width="3" height="24" fill="#0A1410" rx="0.5" />
                    <rect x="63" y="36" width="3" height="24" fill="#0A1410" rx="0.5" />

                    {/* Upper Clerestory Accent Lights */}
                    <rect x="16" y="24" width="12" height="6" fill="url(#profilesAmberWindow)" opacity="0.7" rx="0.5" />
                    <rect x="33" y="24" width="12" height="6" fill="url(#profilesAmberWindow)" opacity="0.7" rx="0.5" />
                    <rect x="50" y="24" width="12" height="6" fill="url(#profilesAmberWindow)" opacity="0.7" rx="0.5" />
                </g>

                {/* Silhouetted Cypress Trees */}
                <g transform="translate(352, 126)">
                    <rect x="4" y="26" width="2.5" height="18" fill="#050A08" />
                    <ellipse cx="5" cy="16" rx="6.5" ry="18" fill="#0A1C14" />
                    <ellipse cx="5" cy="14" rx="4.5" ry="14" fill="#0E281C" />
                </g>
                <g transform="translate(376, 134)">
                    <rect x="4" y="24" width="2" height="16" fill="#050A08" />
                    <ellipse cx="5" cy="14" rx="5.5" ry="16" fill="#0E281C" />
                </g>

                {/* 8. Foreground Deep Emerald Night Slopes */}
                <path
                    d="M-20 206 C 75 186, 175 204, 280 188 C 345 178, 385 196, 420 190 L 420 280 L -20 280 Z"
                    fill="#081A12"
                />
            </svg>
        </div>
    );
}

export default function ProfilesPage() {
    const router = useRouter();
    const db = useDatabase();
    const { activeProfileId, setActiveProfileId, currency, showToast, isPrivacyMode, togglePrivacyMode } = useAppStore();
    const currencySymbol = currency?.symbol || '$';

    const [profiles, setProfiles] = useState<ProfileDocType[]>([]);
    const [transactions, setTransactions] = useState<TransactionDocType[]>([]);
    const [isMenuOpen, setIsMenuOpen] = useState<string | null>(null);
    const [isAddingProfile, setIsAddingProfile] = useState(false);
    const [newProfileName, setNewProfileName] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    // Modal State
    const [activeModal, setActiveModal] = useState<{
        type: 'rename' | 'delete' | 'warning';
        profileId?: string;
        profileName?: string;
    } | null>(null);
    const [modalInput, setModalInput] = useState("");
    const [isActionLoading, setIsActionLoading] = useState(false);

    useEffect(() => {
        const sub1 = db.profiles.find({ selector: { _deleted: false } }).$.subscribe(docs => {
            setProfiles(docs.map(d => d.toJSON() as ProfileDocType));
        });

        const sub2 = db.transactions.find({ selector: { _deleted: false } }).$.subscribe(docs => {
            setTransactions(docs.map(d => d.toJSON() as TransactionDocType));
        });

        return () => {
            sub1.unsubscribe();
            sub2.unsubscribe();
        };
    }, [db]);

    useEffect(() => {
        if (!isMenuOpen) return;
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest('[data-profile-menu]')) return;
            setIsMenuOpen(null);
        };
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [isMenuOpen]);

    const { totalSpend, profileSpendMap, profileTxCountMap } = useMemo(() => {
        let total = 0;
        const spendMap: Record<string, number> = {};
        const countMap: Record<string, number> = {};

        // Only count current month for spend overview
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        transactions.forEach(tx => {
            if (tx.profile_id) {
                countMap[tx.profile_id] = (countMap[tx.profile_id] || 0) + 1;
            }
            if (tx.type === 'expense' && tx.timestamp >= startOfMonth) {
                total += tx.amount;
                spendMap[tx.profile_id] = (spendMap[tx.profile_id] || 0) + tx.amount;
            }
        });

        return {
            totalSpend: total,
            profileSpendMap: spendMap,
            profileTxCountMap: countMap,
        };
    }, [transactions]);

    const activeProfile = useMemo(() => {
        return profiles.find(p => p.id === activeProfileId) || profiles[0];
    }, [profiles, activeProfileId]);

    const handleProfileSelect = (id: string) => {
        triggerHaptic('selection');
        if (id !== activeProfileId) {
            setActiveProfileId(id);
            showToast('Active workspace switched', 'info');
        }
        router.push('/');
    };

    const handleAddProfile = async () => {
        const trimmed = newProfileName.trim();
        if (!trimmed) return;

        const id = uuidv4();
        await mutate(db.profiles, id, {
            name: trimmed,
            theme: 'primary',
        });
        await seedProfileCategories(db, id);
        triggerHaptic('success');
        showToast(`Workspace "${trimmed}" created`, 'success');
        setNewProfileName("");
        setIsAddingProfile(false);
    };

    const confirmDeleteProfile = async () => {
        if (!activeModal?.profileId) return;

        const profileId = activeModal.profileId;
        const deletedName = activeModal.profileName || "Profile";
        setIsActionLoading(true);
        const profileDoc = await db.profiles.findOne(profileId).exec();
        if (profileDoc) {
            // Cascade soft-delete child records with proper replication tombstones
            const txDocs = await db.transactions.find({ selector: { profile_id: profileId, _deleted: false } }).exec();
            await Promise.all(txDocs.map(d => softDelete(db.transactions, d.id)));

            const catDocs = await db.categories.find({ selector: { profile_id: profileId, _deleted: false } }).exec();
            await Promise.all(catDocs.map(d => softDelete(db.categories, d.id)));

            const debtDocs = await db.debts.find({ selector: { profile_id: profileId, _deleted: false } }).exec();
            await Promise.all(debtDocs.map(d => softDelete(db.debts, d.id)));

            await softDelete(db.profiles, profileId);
            if (activeProfileId === profileId) {
                // Switch to the first available profile
                const remainingProfiles = profiles.filter(p => p.id !== profileId);
                if (remainingProfiles.length > 0) {
                    setActiveProfileId(remainingProfiles[0].id);
                }
            }
            triggerHaptic('warning');
            showToast(`Deleted "${deletedName}"`, 'info');
        }
        setIsActionLoading(false);
        setActiveModal(null);
    };

    const confirmRenameProfile = async () => {
        const trimmed = modalInput.trim();
        if (!activeModal?.profileId || !trimmed) return;

        setIsActionLoading(true);
        const profileDoc = await db.profiles.findOne(activeModal.profileId).exec();
        if (profileDoc) {
            await mutate(db.profiles, activeModal.profileId, { name: trimmed });
            triggerHaptic('success');
            showToast(`Workspace renamed to "${trimmed}"`, 'success');
        }
        setIsActionLoading(false);
        setActiveModal(null);
    };

    return (
        <main className="flex-1 min-h-[100dvh] !bg-slate-50 dark:!bg-[#141414] text-slate-900 dark:text-[#E3E3E3] max-w-md mx-auto w-full pb-28 sm:pb-32 flex flex-col overflow-y-auto m3-scrollable">
            {/* ── 1. Hero Section with Scenery Background (Same Depth & Rhythm as Homepage & Debts) ── */}
            <div className="relative shrink-0 overflow-hidden bg-gradient-to-b from-[#BAE6FD]/40 via-[#E0F2FE]/60 to-[#F0F9FF] dark:from-[#070B0E] dark:via-[#0A0E12] dark:to-[#141414] text-slate-900 dark:text-white min-h-[220px] sm:min-h-[245px] flex flex-col justify-start">
                <ProfilesHeroScenery />

                {/* Bottom Boundary: In dark mode, seamless deep night gradient fade. In light mode, crisp solid wavy boundary separation */}
                <div className="hidden dark:block absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[#141414] pointer-events-none z-[1]" />
                <div className="block dark:hidden absolute inset-x-0 bottom-0 w-full overflow-hidden pointer-events-none z-[1] leading-none select-none">
                    <svg
                        viewBox="0 0 1200 120"
                        preserveAspectRatio="none"
                        className="w-full h-8 sm:h-10 block drop-shadow-[0_-2px_4px_rgba(15,23,42,0.04)]"
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

                {/* Minimal Top App Bar over scenic banner */}
                <header className="relative z-10 pt-4 pb-2 px-5 sm:px-6 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
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
                        <div>
                            <h1 className="text-[19px] sm:text-[20px] font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                                Workspaces
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-[#C4C7C5] font-medium">
                                {profiles.length} {profiles.length === 1 ? 'workspace' : 'workspaces'} configured
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Privacy Toggle */}
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
                                    : "bg-white/85 dark:bg-[#1E2020]/90 backdrop-blur-md border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-[#C4C7C5] hover:bg-slate-100 dark:hover:bg-[#282A2A] active:scale-95"
                            )}
                            title={isPrivacyMode ? "Show figures" : "Hide figures (Privacy Shield)"}
                            aria-label={isPrivacyMode ? "Show figures" : "Hide figures (Privacy Shield)"}
                        >
                            <span className="material-symbols-outlined text-[18px]">
                                {isPrivacyMode ? "visibility_off" : "visibility"}
                            </span>
                        </button>

                        {/* Add Workspace Button */}
                        <button
                            onClick={() => {
                                triggerHaptic('selection');
                                setIsAddingProfile(true);
                            }}
                            className="flex items-center gap-1.5 px-3.5 h-10 rounded-full bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 active:scale-95 transition-all text-xs font-semibold shadow-xs cursor-pointer"
                            aria-label="Add workspace"
                        >
                            <span className="material-symbols-outlined text-[18px]">add</span>
                            <span>New</span>
                        </button>
                    </div>
                </header>

                </div>

            {/* ── 2. Content below Hero Banner: Natural in-page flow, ZERO card clipping, full 24px corners & borders ── */}
            <div className="relative z-20 px-5 sm:px-6 pt-3.5 pb-8 space-y-4 sm:space-y-5">
                {/* ── Key Overview Card: Monthly Total Spend (Full Unclipped Border & Rounded Corners) ── */}
                <section className="bg-white dark:bg-[#1E2020] rounded-[24px] p-5 shadow-xs border border-slate-200/80 dark:border-white/10 transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                            Monthly Total Spend
                        </span>

                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 border border-slate-200/80 dark:text-zinc-300 dark:bg-white/10 dark:border-white/15 px-2.5 py-0.5 rounded-full shadow-2xs">
                                This Month
                            </span>
                            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0 shadow-2xs">
                                <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
                            </div>
                        </div>
                    </div>

                    <h2
                        className={clsx(
                            "text-[32px] sm:text-[36px] font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight mt-1 mb-2.5 m3-tabular-nums cursor-default privacy-mask",
                            isPrivacyMode && "privacy-blur"
                        )}
                    >
                        {currencySymbol}{totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h2>

                    <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-100 dark:border-white/5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active: {activeProfile?.name || 'Personal'}
                        </span>
                        <span className="text-slate-500 dark:text-[#C4C7C5] font-medium">
                            {transactions.length} total txns
                        </span>
                    </div>
                </section>
                {/* ── Workspace Spend Allocation Progress Bar ── */}
                {totalSpend > 0 && profiles.length > 1 && (
                    <section className="bg-white dark:bg-[#1E2020] rounded-[24px] p-5 shadow-xs border border-slate-200/80 dark:border-white/10">
                        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-[#C4C7C5] mb-2.5 font-medium">
                            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-500 dark:text-zinc-400">Spend Allocation</span>
                            <span>{profiles.length} Workspaces</span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden flex gap-0.5">
                            {profiles.map(p => {
                                const spend = profileSpendMap[p.id] || 0;
                                const share = totalSpend > 0 ? (spend / totalSpend) * 100 : 0;
                                if (share <= 0) return null;
                                const meta = getWorkspaceMeta(p.name);
                                return (
                                    <div
                                        key={p.id}
                                        style={{ width: `${share}%` }}
                                        className={clsx("h-full transition-all duration-300", meta.barColor)}
                                        title={`${p.name}: ${share.toFixed(1)}%`}
                                    />
                                );
                            })}
                        </div>

                        {/* Legend Chips */}
                        <div className="flex flex-wrap items-center gap-2.5 mt-3">
                            {profiles.map(p => {
                                const spend = profileSpendMap[p.id] || 0;
                                const share = totalSpend > 0 ? (spend / totalSpend) * 100 : 0;
                                const meta = getWorkspaceMeta(p.name);
                                return (
                                    <div key={p.id} className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-[#C4C7C5] font-medium">
                                        <span className={clsx("w-2 h-2 rounded-full", meta.barColor)} />
                                        <span>{p.name}</span>
                                        <span className="text-slate-400 dark:text-zinc-500 font-semibold">({share.toFixed(0)}%)</span>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* ── 3. Inline Create Workspace Card (Animated) ── */}
                <AnimatePresence initial={false}>
                    {isAddingProfile && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
                            onAnimationComplete={() => {
                                if (isAddingProfile) {
                                    inputRef.current?.focus();
                                }
                            }}
                            className="overflow-hidden"
                        >
                            <div className="bg-white dark:bg-[#1E2020] rounded-[24px] p-5 shadow-md border border-slate-300 dark:border-white/15">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-[18px]">add_circle</span>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Create Workspace</h3>
                                            <p className="text-xs text-slate-500 dark:text-[#C4C7C5]">Separate ledger, categories & tracking</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setIsAddingProfile(false);
                                            setNewProfileName("");
                                        }}
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                        aria-label="Close"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">close</span>
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {/* Presets with curated icons */}
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-500 dark:text-[#C4C7C5] mb-2 uppercase tracking-wider">
                                            Quick Presets
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {quickPresets.map(preset => (
                                                <button
                                                    key={preset.name}
                                                    type="button"
                                                    onClick={() => {
                                                        setNewProfileName(preset.name);
                                                        inputRef.current?.focus();
                                                    }}
                                                    className={clsx(
                                                        "text-xs px-3 py-1.5 rounded-xl border transition-all font-medium inline-flex items-center gap-1.5 cursor-pointer active:scale-95",
                                                        newProfileName === preset.name
                                                            ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-zinc-950 dark:border-white shadow-xs"
                                                            : "bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100 dark:bg-white/[0.04] dark:text-zinc-300 dark:border-white/10 dark:hover:bg-white/10"
                                                    )}
                                                >
                                                    <span className="material-symbols-outlined text-[15px]">{preset.icon}</span>
                                                    <span>{preset.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="profileName" className="text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5 block">
                                            Workspace Name
                                        </label>
                                        <input
                                            ref={inputRef}
                                            id="profileName"
                                            type="text"
                                            value={newProfileName}
                                            onChange={(e) => setNewProfileName(e.target.value)}
                                            placeholder="e.g. Travel, Side Project, Household"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleAddProfile();
                                                if (e.key === 'Escape') setIsAddingProfile(false);
                                            }}
                                            className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-slate-900 dark:focus:border-white/40 focus:ring-1 focus:ring-slate-900 dark:focus:ring-white/40 transition-colors font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                                        />
                                    </div>

                                    <div className="flex gap-2.5 pt-1">
                                        <button
                                            onClick={handleAddProfile}
                                            disabled={!newProfileName.trim()}
                                            className="flex-1 h-10 rounded-full bg-slate-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">check</span>
                                            <span>Create Workspace</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsAddingProfile(false);
                                                setNewProfileName("");
                                            }}
                                            className="h-10 px-4 rounded-full border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-zinc-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── 4. Workspace Cards List ── */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between px-0.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-[#C4C7C5]">
                            Configured Workspaces
                        </span>
                        <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                            Tap to switch active
                        </span>
                    </div>

                    {profiles.map((profile) => {
                        const isActive = activeProfileId === profile.id;
                        const spend = profileSpendMap[profile.id] || 0;
                        const txCount = profileTxCountMap[profile.id] || 0;
                        const share = totalSpend > 0 ? (spend / totalSpend) * 100 : 0;
                        const meta = getWorkspaceMeta(profile.name);

                        return (
                            <motion.div
                                layout
                                key={profile.id}
                                transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                            >
                                <div
                                    onClick={() => handleProfileSelect(profile.id)}
                                    className={clsx(
                                        "bg-white dark:bg-[#1E2020] rounded-[24px] p-5 transition-all duration-150 cursor-pointer group border shadow-xs relative overflow-hidden",
                                        isActive
                                            ? "border-slate-400 dark:border-white/30 ring-1 ring-slate-400/40 dark:ring-white/20 bg-slate-50/70 dark:bg-[#202222]"
                                            : "border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:shadow-sm"
                                    )}
                                >
                                    {/* Workspace Card Header */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            {/* Curated Workspace Avatar Icon */}
                                            <div className={clsx(
                                                "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 shadow-2xs",
                                                meta.avatarBg
                                            )}>
                                                <span className="material-symbols-outlined text-[22px]">
                                                    {meta.icon}
                                                </span>
                                            </div>

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-[17px] text-slate-900 dark:text-white truncate">
                                                        {profile.name}
                                                    </h3>
                                                    {isActive && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10.5px] font-bold">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                            Active
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-[#C4C7C5] font-medium mt-0.5">
                                                    {txCount} {txCount === 1 ? 'transaction' : 'transactions'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Right Controls: Radio selection indicator + 3-dots Menu */}
                                        <div className="flex items-center gap-1.5 shrink-0" data-profile-menu>
                                            {/* Active Checkmark Pill */}
                                            <div className={clsx(
                                                "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                                                isActive
                                                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-2xs"
                                                    : "border border-slate-300 dark:border-white/20 text-transparent group-hover:border-slate-400"
                                            )}>
                                                <span className="material-symbols-outlined text-[16px]">check</span>
                                            </div>

                                            {/* 3-dots Action Menu */}
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        triggerHaptic('light');
                                                        setIsMenuOpen(isMenuOpen === profile.id ? null : profile.id);
                                                    }}
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                                                    aria-label="Workspace options"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">more_vert</span>
                                                </button>

                                                {/* Dropdown Menu */}
                                                <AnimatePresence>
                                                    {isMenuOpen === profile.id && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                                            transition={{ duration: 0.12 }}
                                                            className="absolute right-0 top-full mt-1.5 w-40 bg-white dark:bg-[#1E2020] rounded-2xl shadow-xl border border-slate-200 dark:border-white/10 z-40 py-1.5 overflow-hidden text-xs"
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setModalInput(profile.name);
                                                                    setActiveModal({ type: 'rename', profileId: profile.id, profileName: profile.name });
                                                                    setIsMenuOpen(null);
                                                                }}
                                                                className="w-full text-left px-3.5 py-2 font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2.5 transition-colors cursor-pointer"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px] text-slate-500 dark:text-zinc-400">edit</span>
                                                                <span>Rename</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (profiles.length <= 1) {
                                                                        setActiveModal({ type: 'warning' });
                                                                    } else {
                                                                        setActiveModal({ type: 'delete', profileId: profile.id, profileName: profile.name });
                                                                    }
                                                                    setIsMenuOpen(null);
                                                                }}
                                                                className="w-full text-left px-3.5 py-2 font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2.5 transition-colors cursor-pointer"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px] text-rose-500 dark:text-rose-400">delete</span>
                                                                <span>Delete</span>
                                                            </button>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Monthly Spend & Share Bar */}
                                    <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                                        <div>
                                            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#C4C7C5] block">
                                                Monthly Spend
                                            </span>
                                            <p className={clsx(
                                                "text-xl font-bold text-slate-900 dark:text-white tracking-tight tabular-nums mt-0.5 privacy-mask",
                                                isPrivacyMode && "privacy-blur"
                                            )}>
                                                {currencySymbol}{spend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                        </div>

                                        {totalSpend > 0 && (
                                            <div className="text-right">
                                                <span className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
                                                    {share.toFixed(0)}%
                                                </span>
                                                <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">
                                                    of month
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </section>
            </div>

            {/* ── 5. Action Modals ── */}
            {/* Rename Modal */}
            <ActionModal
                isOpen={activeModal?.type === 'rename'}
                onClose={() => setActiveModal(null)}
                title="Rename Workspace"
                description={`Enter a new name for "${activeModal?.profileName}"`}
                confirmLabel="Rename"
                confirmVariant="slate"
                onConfirm={confirmRenameProfile}
                isConfirmLoading={isActionLoading}
            >
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 z-10 pointer-events-none text-[20px]">
                        badge
                    </span>
                    <input
                        autoFocus
                        type="text"
                        value={modalInput}
                        onChange={(e) => setModalInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && confirmRenameProfile()}
                        placeholder="Workspace name"
                        className="w-full h-14 pl-12 pr-4 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-full text-base font-semibold text-slate-900 dark:text-white transition-all focus:outline-none focus:border-slate-900 dark:focus:border-white/30 focus:ring-1 focus:ring-slate-900 dark:focus:ring-white/30"
                    />
                </div>
            </ActionModal>

            {/* Delete Confirmation Modal */}
            <ActionModal
                isOpen={activeModal?.type === 'delete'}
                onClose={() => setActiveModal(null)}
                title="Delete Workspace?"
                description={`Are you sure you want to delete "${activeModal?.profileName}"? All associated transactions, categories, and debts will also be deleted.`}
                confirmLabel="Delete"
                confirmVariant="danger"
                onConfirm={confirmDeleteProfile}
                isConfirmLoading={isActionLoading}
            />

            {/* Delete Warning Modal (Last Profile) */}
            <ActionModal
                isOpen={activeModal?.type === 'warning'}
                onClose={() => setActiveModal(null)}
                title="Cannot Delete"
                description="You must have at least one active workspace. Create another before deleting this one."
                confirmLabel="Understood"
                confirmVariant="slate"
                onConfirm={() => setActiveModal(null)}
            />
        </main>
    );
}
