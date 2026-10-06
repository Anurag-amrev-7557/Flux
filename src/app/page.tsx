"use client";

import { useAppStore } from "@/store/appStore";
import { useDatabase } from "@/db/DatabaseProvider";
import { useEffect, useState, useMemo, Suspense } from "react";
import { TransactionDocType, CategoryDocType } from "@/db/schema";
import { DEFAULT_CATEGORIES } from "@/db/database";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from 'clsx';
import { useI18n } from "@/hooks/useI18n";
import { formatCompactCurrency, formatFullCurrency } from "@/utils/currency";
import { triggerHaptic } from "@/utils/haptics";
import { motion, AnimatePresence, useMotionValue, useTransform, animate, type PanInfo } from "framer-motion";
import { detectAnomalies } from "@/utils/anomalyDetector";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { softDelete } from "@/sync/mutate";
import { getAvatarStyle, formatTransactionHistoryDate } from "@/utils/avatar";

const TICKER_PROMPTS = [
    "Search expenses, bills & categories",
    "Quick add Coffee, Food, Rent...",
    "Track who owes you with Debts",
    "Split bills with multiple friends",
    "Search by amount, tag or note",
];

function getCategoryStyle(name: string) {
    const lower = name.toLowerCase();
    // 1. Food & Dining (warm muted terracotta / cocoa)
    if (lower.includes('food') || lower.includes('drink') || lower.includes('dining') || lower.includes('restaurant')) {
        return { bg: '#5C4336', icon: 'restaurant' };
    }
    if (lower.includes('cafe') || lower.includes('coffee') || lower.includes('tea') || lower.includes('chai')) {
        return { bg: '#5E4034', icon: 'local_cafe' };
    }
    // 2. Transport & Transit (muted steel slate blue)
    if (lower.includes('transport') || lower.includes('transit') || lower.includes('car') || lower.includes('fuel') || lower.includes('commute')) {
        return { bg: '#384B5D', icon: 'directions_car' };
    }
    // 3. Shopping & Retail (muted sage / eucalyptus green)
    if (lower.includes('shopping') || lower.includes('cloth') || lower.includes('mall') || lower.includes('store') || lower.includes('essential')) {
        return { bg: '#335043', icon: 'shopping_bag' };
    }
    // 4. Groceries & Supermarket (muted deep forest green)
    if (lower.includes('grocer') || lower.includes('supermarket') || lower.includes('market')) {
        return { bg: '#2D4B3E', icon: 'local_grocery_store' };
    }
    // 5. Housing & Rent (muted warm bronze)
    if (lower.includes('housing') || lower.includes('home') || lower.includes('rent')) {
        return { bg: '#48443B', icon: 'home' };
    }
    // 6. Bills & Utilities (muted olive taupe)
    if (lower.includes('bill') || lower.includes('utilit') || lower.includes('electric') || lower.includes('water') || lower.includes('power')) {
        return { bg: '#4A4839', icon: 'receipt_long' };
    }
    // 7. Entertainment & Media (muted dusty plum)
    if (lower.includes('entertainment') || lower.includes('movie') || lower.includes('cinema') || lower.includes('show')) {
        return { bg: '#4A3E5C', icon: 'movie' };
    }
    if (lower.includes('game') || lower.includes('gaming')) {
        return { bg: '#443A59', icon: 'sports_esports' };
    }
    // 8. Health & Medical (muted dusty rose)
    if (lower.includes('health') || lower.includes('medical') || lower.includes('doctor') || lower.includes('pharmacy') || lower.includes('medicine')) {
        return { bg: '#583842', icon: 'medical_services' };
    }
    // 9. Subscriptions & Recurring (muted dusky periwinkle)
    if (lower.includes('subscription') || lower.includes('recurring') || lower.includes('streaming')) {
        return { bg: '#3E4264', icon: 'subscriptions' };
    }
    // 10. Travel & Vacations (muted slate teal)
    if (lower.includes('travel') || lower.includes('flight') || lower.includes('trip') || lower.includes('hotel')) {
        return { bg: '#344B50', icon: 'flight' };
    }
    // 11. Education & Learning (muted dusky indigo)
    if (lower.includes('education') || lower.includes('book') || lower.includes('tuition') || lower.includes('school')) {
        return { bg: '#3D4460', icon: 'school' };
    }
    // 12. Fitness & Sports (muted moss bronze)
    if (lower.includes('fitness') || lower.includes('gym') || lower.includes('sport')) {
        return { bg: '#4A4638', icon: 'fitness_center' };
    }
    return { bg: getAvatarStyle(name).bg, icon: 'category' };
}

function YinYangAvatar({ className = "w-full h-full" }: { className?: string }) {
    return (
        <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="50" fill="#141414" />
            <path d="M50 0 A50 50 0 0 1 50 100 A25 25 0 0 1 50 50 A25 25 0 0 0 50 0 Z" fill="#ffffff" />
            <circle cx="50" cy="25" r="7" fill="#141414" />
            <circle cx="50" cy="75" r="7" fill="#ffffff" />
        </svg>
    );
}

function HeroScenery() {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
            {/* ── Light Mode Daytime Scenery (Exact same artwork as Dark Mode with daytime color palette) ── */}
            <svg
                viewBox="0 0 400 280"
                className="block dark:hidden w-full h-full object-cover"
                preserveAspectRatio="xMidYMid slice"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    {/* Daylight Sky Gradient */}
                    <linearGradient id="scenerySkyLight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#CBE2FD" />
                        <stop offset="55%" stopColor="#DCEEFF" />
                        <stop offset="85%" stopColor="#EFF6FD" />
                        <stop offset="100%" stopColor="#F8FAFC" />
                    </linearGradient>

                    {/* Teal Classic Bank Gradients */}
                    <linearGradient id="bankRoofGradLight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#14B8A6" />
                        <stop offset="100%" stopColor="#0D9488" />
                    </linearGradient>
                    <linearGradient id="bankPillarGradLight" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#0F766E" />
                        <stop offset="50%" stopColor="#14B8A6" />
                        <stop offset="100%" stopColor="#0D9488" />
                    </linearGradient>

                    {/* Cart Body & Awning Gradients */}
                    <linearGradient id="cartBodyGradLight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FDD835" />
                        <stop offset="85%" stopColor="#FBC02D" />
                        <stop offset="100%" stopColor="#F57F17" />
                    </linearGradient>
                    <linearGradient id="cartAwningGradLight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38BDF8" />
                        <stop offset="100%" stopColor="#0284C7" />
                    </linearGradient>

                    {/* Bottom Edge Fade for seamless blend into page */}
                    <linearGradient id="sceneryBottomBlendLight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F8FAFC" stopOpacity="0" />
                        <stop offset="70%" stopColor="#F8FAFC" stopOpacity="0.75" />
                        <stop offset="100%" stopColor="#F8FAFC" stopOpacity="1" />
                    </linearGradient>
                </defs>

                {/* ── 1. Soft Daylight Sky ── */}
                <rect width="400" height="280" fill="url(#scenerySkyLight)" />

                {/* ── 2. Distant Skyline Background Silhouette Layers ── */}
                {/* Ridge 1: Soft atmospheric hill across middle */}
                <path
                    d="M-20 172 C 55 142, 160 166, 265 145 C 330 132, 375 148, 420 142 L 420 280 L -20 280 Z"
                    fill="#BFDBFE"
                />

                {/* Left Background Apartment Block with Grid of Windows */}
                <g transform="translate(0, 142)">
                    <rect x="0" y="0" width="46" height="78" fill="#CBD5E1" />
                    {/* Row 1 windows */}
                    <rect x="6" y="8" width="4" height="4" fill="#38BDF8" opacity="0.9" rx="0.5" />
                    <rect x="14" y="8" width="4" height="4" fill="#38BDF8" opacity="0.8" rx="0.5" />
                    <rect x="22" y="8" width="4" height="4" fill="#94A3B8" opacity="0.6" rx="0.5" />
                    <rect x="30" y="8" width="4" height="4" fill="#38BDF8" opacity="0.9" rx="0.5" />
                    <rect x="38" y="8" width="4" height="4" fill="#94A3B8" opacity="0.5" rx="0.5" />
                    {/* Row 2 windows */}
                    <rect x="6" y="16" width="4" height="4" fill="#94A3B8" opacity="0.5" rx="0.5" />
                    <rect x="14" y="16" width="4" height="4" fill="#38BDF8" opacity="0.85" rx="0.5" />
                    <rect x="22" y="16" width="4" height="4" fill="#38BDF8" opacity="0.95" rx="0.5" />
                    <rect x="30" y="16" width="4" height="4" fill="#38BDF8" opacity="0.75" rx="0.5" />
                    <rect x="38" y="16" width="4" height="4" fill="#38BDF8" opacity="0.85" rx="0.5" />
                    {/* Row 3 windows */}
                    <rect x="6" y="24" width="4" height="4" fill="#38BDF8" opacity="0.9" rx="0.5" />
                    <rect x="14" y="24" width="4" height="4" fill="#94A3B8" opacity="0.6" rx="0.5" />
                    <rect x="22" y="24" width="4" height="4" fill="#38BDF8" opacity="0.85" rx="0.5" />
                    <rect x="30" y="24" width="4" height="4" fill="#38BDF8" opacity="0.9" rx="0.5" />
                </g>

                {/* Right Background City Skyline Buildings */}
                <g>
                    {/* Building 1: Slender Tower */}
                    <rect x="316" y="146" width="20" height="85" fill="#CBD5E1" />
                    <rect x="320" y="152" width="3.5" height="3.5" fill="#38BDF8" opacity="0.8" rx="0.5" />
                    <rect x="328" y="152" width="3.5" height="3.5" fill="#38BDF8" opacity="0.9" rx="0.5" />
                    <rect x="320" y="160" width="3.5" height="3.5" fill="#38BDF8" opacity="0.85" rx="0.5" />
                    <rect x="328" y="168" width="3.5" height="3.5" fill="#38BDF8" opacity="0.75" rx="0.5" />
                    <rect x="320" y="176" width="3.5" height="3.5" fill="#38BDF8" opacity="0.9" rx="0.5" />

                    {/* Building 2: Rounded Top Tower with Entrance Arch */}
                    <rect x="337" y="138" width="23" height="95" fill="#94A3B8" rx="3" />
                    <rect x="342" y="146" width="4" height="4" fill="#38BDF8" opacity="0.85" rx="0.5" />
                    <rect x="350" y="146" width="4" height="4" fill="#CBD5E1" opacity="0.5" rx="0.5" />
                    <rect x="342" y="156" width="4" height="4" fill="#38BDF8" opacity="0.9" rx="0.5" />
                    <rect x="350" y="166" width="4" height="4" fill="#38BDF8" opacity="0.8" rx="0.5" />
                    <rect x="342" y="176" width="4" height="4" fill="#38BDF8" opacity="0.85" rx="0.5" />
                    {/* Bottom arched doorway */}
                    <path d="M344 205 Q 348.5 198, 353 205 L 353 218 L 344 218 Z" fill="#64748B" />

                    {/* Building 3: Low Horizontal Building with Grid */}
                    <rect x="364" y="150" width="40" height="75" fill="#CBD5E1" />
                    <rect x="368" y="158" width="3.5" height="3.5" fill="#38BDF8" opacity="0.9" rx="0.5" />
                    <rect x="376" y="158" width="3.5" height="3.5" fill="#94A3B8" opacity="0.4" rx="0.5" />
                    <rect x="384" y="158" width="3.5" height="3.5" fill="#38BDF8" opacity="0.9" rx="0.5" />
                    <rect x="392" y="158" width="3.5" height="3.5" fill="#94A3B8" opacity="0.3" rx="0.5" />
                    <rect x="372" y="166" width="3.5" height="3.5" fill="#38BDF8" opacity="0.85" rx="0.5" />
                    <rect x="380" y="166" width="3.5" height="3.5" fill="#38BDF8" opacity="0.95" rx="0.5" />
                    <rect x="388" y="166" width="3.5" height="3.5" fill="#38BDF8" opacity="0.8" rx="0.5" />
                </g>

                {/* ── 3. Midground Rolling Hill (Sunny Soft Green) ── */}
                <path
                    d="M-20 186 C 65 162, 175 180, 280 164 C 345 154, 385 174, 420 168 L 420 280 L -20 280 Z"
                    fill="#86EFAC"
                />

                {/* Distant Trees on Midground Hill */}
                <circle cx="58" cy="162" r="3" fill="#16A34A" />
                <rect x="57.5" y="164" width="1" height="4" fill="#64748B" />

                <circle cx="162" cy="177" r="3.5" fill="#16A34A" />
                <rect x="161.5" y="180" width="1" height="4" fill="#64748B" />

                <circle cx="286" cy="182" r="4" fill="#16A34A" />
                <rect x="285.5" y="185" width="1" height="4.5" fill="#64748B" />

                {/* Left Midground Building behind Bank */}
                <g transform="translate(0, 168)">
                    <rect x="0" y="0" width="22" height="75" fill="#A7F3D0" />
                    {/* Arched windows in 2 vertical pairs */}
                    <rect x="4" y="6" width="4.5" height="8" rx="2" fill="#059669" />
                    <rect x="12" y="6" width="4.5" height="8" rx="2" fill="#059669" />
                    <rect x="4" y="19" width="4.5" height="8" rx="2" fill="#059669" />
                    <rect x="12" y="19" width="4.5" height="8" rx="2" fill="#059669" />
                </g>

                {/* ── 4. Main Foreground Hill (Vibrant Meadow Green) ── */}
                <path
                    d="M-20 202 C 75 180, 170 196, 270 182 C 340 172, 380 190, 420 184 L 420 280 L -20 280 Z"
                    fill="#4ADE80"
                />

                {/* Front Undulating Slope */}
                <path
                    d="M-20 218 C 65 204, 160 218, 255 202 C 330 192, 380 206, 420 200 L 420 280 L -20 280 Z"
                    fill="#22C55E"
                />

                {/* ── 5. Clean Sandy Pathways ── */}
                {/* Winding road from the Bank down to foreground */}
                <path
                    d="M52 232 C 55 244, 60 258, 64 280"
                    stroke="#E2E8F0"
                    strokeWidth="13"
                    strokeLinecap="round"
                />
                {/* Subtle winding road on the right behind cart */}
                <path
                    d="M365 208 C 378 222, 390 240, 405 280"
                    stroke="#CBD5E1"
                    strokeWidth="8"
                    strokeLinecap="round"
                    opacity="0.6"
                />

                {/* ── 6. Iconic Classical Greek/Teal Bank (Exact Google Pay Pantheon) ── */}
                <g transform="translate(37, 192)">
                    {/* Shadow underneath */}
                    <ellipse cx="17" cy="38" rx="20" ry="2" fill="#15803D" opacity="0.3" />

                    {/* Stepped Pediment Roof (Triangle) */}
                    <polygon points="17,0 0,11 34,11" fill="url(#bankRoofGradLight)" />
                    {/* Pediment Tympanum inner shadow */}
                    <polygon points="17,2.5 3,10.5 31,10.5" fill="#14B8A6" opacity="0.4" />

                    {/* Architrave / Entablature band */}
                    <rect x="1" y="11" width="32" height="3" fill="#0F766E" />

                    {/* Shadow behind pillars */}
                    <rect x="2" y="14" width="30" height="15" fill="#042F2C" opacity="0.25" />

                    {/* 4 Classical Pillars */}
                    <rect x="3" y="14" width="4" height="15" fill="url(#bankPillarGradLight)" rx="0.8" />
                    <rect x="11" y="14" width="4" height="15" fill="url(#bankPillarGradLight)" rx="0.8" />
                    <rect x="19" y="14" width="4" height="15" fill="url(#bankPillarGradLight)" rx="0.8" />
                    <rect x="27" y="14" width="4" height="15" fill="url(#bankPillarGradLight)" rx="0.8" />

                    {/* Stepped Stylobate Base */}
                    <rect x="0" y="29" width="34" height="4" fill="#0F766E" rx="0.5" />
                    <rect x="-2" y="33" width="38" height="3" fill="#0D9488" rx="0.5" />
                </g>

                {/* Minimal Tree next to Bank */}
                <circle cx="84" cy="204" r="3.8" fill="#15803D" />
                <rect x="83.5" y="207" width="1" height="4" fill="#64748B" />

                {/* ── 7. Foreground Succulent / Fan Palm Foliage ── */}
                {/* Left Fan Shrub */}
                <g transform="translate(10, 248)">
                    <path d="M14 18 C 11 11, 4 9, 0 11 C 5 14, 10 16, 14 18 Z" fill="#15803D" />
                    <path d="M14 18 C 12 8, 8 4, 4 4 C 8 8, 12 13, 14 18 Z" fill="#16A34A" />
                    <path d="M14 18 C 14 6, 15 1, 15 0 C 16 6, 15 12, 14 18 Z" fill="#22C55E" />
                    <path d="M14 18 C 16 8, 20 4, 24 4 C 20 8, 16 13, 14 18 Z" fill="#16A34A" />
                    <path d="M14 18 C 17 11, 24 9, 28 11 C 23 14, 18 16, 14 18 Z" fill="#15803D" />
                </g>

                {/* Right Fan Shrub near Cart */}
                <g transform="translate(270, 252)">
                    <path d="M10 14 C 8 8, 3 7, 0 8 C 4 10, 7 12, 10 14 Z" fill="#15803D" />
                    <path d="M10 14 C 9 6, 6 3, 3 3 C 6 6, 9 10, 10 14 Z" fill="#16A34A" />
                    <path d="M10 14 C 10 5, 11 1, 11 0 C 12 5, 11 9, 10 14 Z" fill="#22C55E" />
                    <path d="M10 14 C 12 6, 15 3, 18 3 C 15 6, 12 10, 10 14 Z" fill="#16A34A" />
                    <path d="M10 14 C 13 8, 18 7, 21 8 C 17 10, 14 12, 10 14 Z" fill="#15803D" />
                </g>

                {/* ── 8. Right: Street Chai/Coffee Cart, Barista & Customer (Google Pay Reference) ── */}
                <g transform="translate(306, 208)">
                    {/* Shadow underneath */}
                    <ellipse cx="28" cy="46" rx="30" ry="3.5" fill="#15803D" opacity="0.3" />

                    {/* Cart Blue Canopy / Awning */}
                    <path d="M2 3 L36 3 L33 -5 L5 -5 Z" fill="#0284C7" />
                    {/* Scalloped Valance / Awning Fringe */}
                    <path
                        d="M2 3 Q 5.5 7.5, 9 3 Q 12.5 7.5, 16 3 Q 19.5 7.5, 23 3 Q 26.5 7.5, 30 3 Q 33.5 7.5, 36 3 L 36 1.5 L 2 1.5 Z"
                        fill="url(#cartAwningGradLight)"
                    />

                    {/* Cart Poles */}
                    <line x1="4.5" y1="3" x2="4.5" y2="21" stroke="#64748B" strokeWidth="1.2" />
                    <line x1="33.5" y1="3" x2="33.5" y2="21" stroke="#64748B" strokeWidth="1.2" />

                    {/* Golden Yellow Cart Body */}
                    <rect x="2" y="20" width="34" height="15" rx="1.5" fill="url(#cartBodyGradLight)" />
                    {/* Countertop Trim */}
                    <rect x="1" y="19" width="36" height="2" fill="#FFFFFF" rx="0.5" />

                    {/* QR Code Stand */}
                    <rect x="10" y="12" width="6.5" height="7.5" fill="#FFFFFF" rx="0.6" />
                    <rect x="11.2" y="13.2" width="4.1" height="4.1" fill="#1F2937" rx="0.3" />
                    <rect x="12" y="14" width="2.5" height="2.5" fill="#FFFFFF" rx="0.2" />
                    <rect x="12.7" y="14.7" width="1.1" height="1.1" fill="#16A34A" />

                    {/* Takeaway Chai/Coffee Cup with Steam */}
                    <rect x="29.5" y="13.5" width="3.5" height="5.5" fill="#FFFFFF" rx="0.5" />
                    <rect x="29.5" y="15.2" width="3.5" height="2" fill="#8D6E63" />
                    <path d="M31 12 C 30.5 10.5, 31.8 9.5, 31.2 8" stroke="#94A3B8" strokeWidth="0.7" fill="none" strokeLinecap="round" />

                    {/* Barista */}
                    <circle cx="23" cy="9.5" r="3.6" fill="#8D5538" />
                    <path d="M19.5 8.5 C 19.5 5.5, 26.5 5.5, 26.5 8.5 Z" fill="#1F2937" />
                    <rect x="19" y="13" width="8" height="6.5" fill="#D81B60" rx="1" />
                    <path d="M25 15.5 L 29.5 15" stroke="#D81B60" strokeWidth="2.2" strokeLinecap="round" />

                    {/* Customer */}
                    <circle cx="47" cy="8.5" r="3.4" fill="#C68642" />
                    <path d="M44 7.5 C 44 4.5, 50 4.5, 50 7.5 Z" fill="#263238" />
                    <rect x="43" y="12" width="8" height="13.5" fill="#0284C7" rx="1.5" />
                    <path d="M44 14.5 L 39.5 16" stroke="#0284C7" strokeWidth="2.2" strokeLinecap="round" />
                    <rect x="38.5" y="14" width="2" height="3.8" fill="#FFFFFF" rx="0.4" />
                    <rect x="38.8" y="14.4" width="1.4" height="2.8" fill="#93C5FD" rx="0.2" />
                    <rect x="43.5" y="25.5" width="3.2" height="12" fill="#0369A1" rx="0.8" />
                    <rect x="47.5" y="25.5" width="3.2" height="12" fill="#0369A1" rx="0.8" />
                    <rect x="42.8" y="37" width="4" height="1.8" fill="#FFFFFF" rx="0.5" />
                    <rect x="47" y="37" width="4" height="1.8" fill="#FAFAFA" rx="0.5" />

                    {/* Wheels */}
                    <g transform="translate(8.5, 36.5)">
                        <circle cx="0" cy="0" r="7.5" stroke="#64748B" strokeWidth="1.6" fill="none" />
                        <circle cx="0" cy="0" r="1.8" fill="#475569" />
                        <line x1="-7" y1="0" x2="7" y2="0" stroke="#94A3B8" strokeWidth="0.8" />
                        <line x1="0" y1="-7" x2="0" y2="7" stroke="#94A3B8" strokeWidth="0.8" />
                        <line x1="-5" y1="-5" x2="5" y2="5" stroke="#94A3B8" strokeWidth="0.8" />
                        <line x1="-5" y1="5" x2="5" y2="-5" stroke="#94A3B8" strokeWidth="0.8" />
                    </g>
                    <g transform="translate(27.5, 36.5)">
                        <circle cx="0" cy="0" r="7.5" stroke="#64748B" strokeWidth="1.6" fill="none" />
                        <circle cx="0" cy="0" r="1.8" fill="#475569" />
                        <line x1="-7" y1="0" x2="7" y2="0" stroke="#94A3B8" strokeWidth="0.8" />
                        <line x1="0" y1="-7" x2="0" y2="7" stroke="#94A3B8" strokeWidth="0.8" />
                        <line x1="-5" y1="-5" x2="5" y2="5" stroke="#94A3B8" strokeWidth="0.8" />
                        <line x1="-5" y1="5" x2="5" y2="-5" stroke="#94A3B8" strokeWidth="0.8" />
                    </g>
                </g>

                {/* ── 9. Solid Wavy Boundary into Page ── */}
                <path
                    d="M-10 252 C 80 236, 170 258, 270 240 C 330 228, 375 246, 410 240 L 410 280 L -10 280 Z"
                    fill="#F8FAFC"
                />
            </svg>

            {/* ── Dark Mode Night Scenery ── */}
            <svg
                viewBox="0 0 400 280"
                className="hidden dark:block w-full h-full object-cover"
                preserveAspectRatio="xMidYMid slice"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    {/* Sky Gradient: Pure velvety night transitioning smoothly into hill silhouettes */}
                    <linearGradient id="scenerySky" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#000000" />
                        <stop offset="55%" stopColor="#060A08" />
                        <stop offset="85%" stopColor="#0B130E" />
                        <stop offset="100%" stopColor="#0E1A14" />
                    </linearGradient>

                    {/* Teal Classic Bank Gradients */}
                    <linearGradient id="bankRoofGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1BB39E" />
                        <stop offset="100%" stopColor="#128978" />
                    </linearGradient>
                    <linearGradient id="bankPillarGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#0E6C5F" />
                        <stop offset="50%" stopColor="#159886" />
                        <stop offset="100%" stopColor="#0C5E53" />
                    </linearGradient>

                    {/* Cart Body & Awning Gradients */}
                    <linearGradient id="cartBodyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FDD835" />
                        <stop offset="85%" stopColor="#FBC02D" />
                        <stop offset="100%" stopColor="#F57F17" />
                    </linearGradient>
                    <linearGradient id="cartAwningGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2196F3" />
                        <stop offset="100%" stopColor="#1976D2" />
                    </linearGradient>

                    {/* Bottom Edge Fade for seamless blend into page */}
                    <linearGradient id="sceneryBottomBlend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#141414" stopOpacity="0" />
                        <stop offset="70%" stopColor="#141414" stopOpacity="0.65" />
                        <stop offset="100%" stopColor="#141414" stopOpacity="1" />
                    </linearGradient>
                </defs>

                {/* ── 1. Velvety Night Sky ── */}
                <rect width="400" height="280" fill="url(#scenerySky)" />

                {/* ── 2. Distant Skyline Background Silhouette Layers ── */}
                {/* Ridge 1: Deepest dark silhouette across middle */}
                <path
                    d="M-20 172 C 55 142, 160 166, 265 145 C 330 132, 375 148, 420 142 L 420 280 L -20 280 Z"
                    fill="#101713"
                />

                {/* Left Background Apartment Block with Grid of Lit Amber Windows */}
                <g transform="translate(0, 142)">
                    <rect x="0" y="0" width="46" height="78" fill="#0A110D" />
                    {/* Row 1 windows */}
                    <rect x="6" y="8" width="4" height="4" fill="#FFA000" opacity="0.9" rx="0.5" />
                    <rect x="14" y="8" width="4" height="4" fill="#FFA000" opacity="0.8" rx="0.5" />
                    <rect x="22" y="8" width="4" height="4" fill="#2E3B33" opacity="0.6" rx="0.5" />
                    <rect x="30" y="8" width="4" height="4" fill="#FFA000" opacity="0.9" rx="0.5" />
                    <rect x="38" y="8" width="4" height="4" fill="#2E3B33" opacity="0.5" rx="0.5" />
                    {/* Row 2 windows */}
                    <rect x="6" y="16" width="4" height="4" fill="#2E3B33" opacity="0.5" rx="0.5" />
                    <rect x="14" y="16" width="4" height="4" fill="#FFA000" opacity="0.85" rx="0.5" />
                    <rect x="22" y="16" width="4" height="4" fill="#FFA000" opacity="0.95" rx="0.5" />
                    <rect x="30" y="16" width="4" height="4" fill="#FFA000" opacity="0.75" rx="0.5" />
                    <rect x="38" y="16" width="4" height="4" fill="#FFA000" opacity="0.85" rx="0.5" />
                    {/* Row 3 windows */}
                    <rect x="6" y="24" width="4" height="4" fill="#FFA000" opacity="0.9" rx="0.5" />
                    <rect x="14" y="24" width="4" height="4" fill="#2E3B33" opacity="0.6" rx="0.5" />
                    <rect x="22" y="24" width="4" height="4" fill="#FFA000" opacity="0.85" rx="0.5" />
                    <rect x="30" y="24" width="4" height="4" fill="#FFA000" opacity="0.9" rx="0.5" />
                </g>

                {/* Right Background City Skyline Buildings */}
                <g>
                    {/* Building 1: Tall Dark Slender Tower with Amber Windows */}
                    <rect x="316" y="146" width="20" height="85" fill="#181F23" />
                    <rect x="320" y="152" width="3.5" height="3.5" fill="#FFA000" opacity="0.8" rx="0.5" />
                    <rect x="328" y="152" width="3.5" height="3.5" fill="#FFA000" opacity="0.9" rx="0.5" />
                    <rect x="320" y="160" width="3.5" height="3.5" fill="#FFA000" opacity="0.85" rx="0.5" />
                    <rect x="328" y="168" width="3.5" height="3.5" fill="#FFA000" opacity="0.75" rx="0.5" />
                    <rect x="320" y="176" width="3.5" height="3.5" fill="#FFA000" opacity="0.9" rx="0.5" />

                    {/* Building 2: Rounded Top Tower with Entrance Arch */}
                    <rect x="337" y="138" width="23" height="95" fill="#232A30" rx="3" />
                    <rect x="342" y="146" width="4" height="4" fill="#FFA000" opacity="0.85" rx="0.5" />
                    <rect x="350" y="146" width="4" height="4" fill="#2C373D" opacity="0.5" rx="0.5" />
                    <rect x="342" y="156" width="4" height="4" fill="#FFA000" opacity="0.9" rx="0.5" />
                    <rect x="350" y="166" width="4" height="4" fill="#FFA000" opacity="0.8" rx="0.5" />
                    <rect x="342" y="176" width="4" height="4" fill="#FFA000" opacity="0.85" rx="0.5" />
                    {/* Bottom arched doorway */}
                    <path d="M344 205 Q 348.5 198, 353 205 L 353 218 L 344 218 Z" fill="#141B1F" />

                    {/* Building 3: Low Horizontal Building with Diamond/Square Grid */}
                    <rect x="364" y="150" width="40" height="75" fill="#11181D" />
                    <rect x="368" y="158" width="3.5" height="3.5" fill="#FFA000" opacity="0.9" rx="0.5" />
                    <rect x="376" y="158" width="3.5" height="3.5" fill="#FFA000" opacity="0.4" rx="0.5" />
                    <rect x="384" y="158" width="3.5" height="3.5" fill="#FFA000" opacity="0.9" rx="0.5" />
                    <rect x="392" y="158" width="3.5" height="3.5" fill="#FFA000" opacity="0.3" rx="0.5" />
                    <rect x="372" y="166" width="3.5" height="3.5" fill="#FFA000" opacity="0.85" rx="0.5" />
                    <rect x="380" y="166" width="3.5" height="3.5" fill="#FFA000" opacity="0.95" rx="0.5" />
                    <rect x="388" y="166" width="3.5" height="3.5" fill="#FFA000" opacity="0.8" rx="0.5" />
                </g>

                {/* ── 3. Midground Rolling Hill (Lush Dark Green) ── */}
                <path
                    d="M-20 186 C 65 162, 175 180, 280 164 C 345 154, 385 174, 420 168 L 420 280 L -20 280 Z"
                    fill="#153223"
                />

                {/* Distant Trees on Midground Hill */}
                <circle cx="58" cy="162" r="3" fill="#1B422F" />
                <rect x="57.5" y="164" width="1" height="4" fill="#0C2418" />

                <circle cx="162" cy="177" r="3.5" fill="#1B422F" />
                <rect x="161.5" y="180" width="1" height="4" fill="#0C2418" />

                <circle cx="286" cy="182" r="4" fill="#1B422F" />
                <rect x="285.5" y="185" width="1" height="4.5" fill="#0C2418" />

                {/* Left Midground Green Building behind Bank */}
                <g transform="translate(0, 168)">
                    <rect x="0" y="0" width="22" height="75" fill="#154B33" />
                    {/* Arched windows in 2 vertical pairs */}
                    <rect x="4" y="6" width="4.5" height="8" rx="2" fill="#0A2C1D" />
                    <rect x="12" y="6" width="4.5" height="8" rx="2" fill="#0A2C1D" />
                    <rect x="4" y="19" width="4.5" height="8" rx="2" fill="#0A2C1D" />
                    <rect x="12" y="19" width="4.5" height="8" rx="2" fill="#0A2C1D" />
                </g>

                {/* ── 4. Main Foreground Hill (Rich Signature Google Pay Green) ── */}
                <path
                    d="M-20 202 C 75 180, 170 196, 270 182 C 340 172, 380 190, 420 184 L 420 280 L -20 280 Z"
                    fill="#0E4226"
                />

                {/* Front Undulating Slope */}
                <path
                    d="M-20 218 C 65 204, 160 218, 255 202 C 330 192, 380 206, 420 200 L 420 280 L -20 280 Z"
                    fill="#0B371F"
                />

                {/* ── 5. Dark Curving Pathways ── */}
                {/* Winding road from the Bank down to foreground */}
                <path
                    d="M52 232 C 55 244, 60 258, 64 280"
                    stroke="#081710"
                    strokeWidth="13"
                    strokeLinecap="round"
                />
                {/* Subtle winding road on the right behind cart */}
                <path
                    d="M365 208 C 378 222, 390 240, 405 280"
                    stroke="#081710"
                    strokeWidth="8"
                    strokeLinecap="round"
                    opacity="0.5"
                />

                {/* ── 6. Iconic Classical Greek/Teal Bank (Exact Google Pay Pantheon) ── */}
                <g transform="translate(37, 192)">
                    {/* Shadow underneath */}
                    <ellipse cx="17" cy="38" rx="20" ry="2" fill="#061A12" opacity="0.6" />

                    {/* Stepped Pediment Roof (Triangle) */}
                    <polygon points="17,0 0,11 34,11" fill="url(#bankRoofGrad)" />
                    {/* Pediment Tympanum inner shadow */}
                    <polygon points="17,2.5 3,10.5 31,10.5" fill="#148E7C" opacity="0.3" />

                    {/* Architrave / Entablature band */}
                    <rect x="1" y="11" width="32" height="3" fill="#0E7063" />

                    {/* Deep shadow behind pillars */}
                    <rect x="2" y="14" width="30" height="15" fill="#083E36" />

                    {/* 4 Classical Pillars with subtle highlights */}
                    <rect x="3" y="14" width="4" height="15" fill="url(#bankPillarGrad)" rx="0.8" />
                    <rect x="11" y="14" width="4" height="15" fill="url(#bankPillarGrad)" rx="0.8" />
                    <rect x="19" y="14" width="4" height="15" fill="url(#bankPillarGrad)" rx="0.8" />
                    <rect x="27" y="14" width="4" height="15" fill="url(#bankPillarGrad)" rx="0.8" />

                    {/* Stepped Stylobate Base */}
                    <rect x="0" y="29" width="34" height="4" fill="#0C5E53" rx="0.5" />
                    <rect x="-2" y="33" width="38" height="3" fill="#094A42" rx="0.5" />
                </g>

                {/* Minimal Tree next to Bank */}
                <circle cx="84" cy="204" r="3.8" fill="#14482E" />
                <rect x="83.5" y="207" width="1" height="4" fill="#082015" />

                {/* ── 7. Foreground Succulent / Fan Palm Foliage ── */}
                {/* Left Fan Shrub (5 radiating curved leaves) */}
                <g transform="translate(10, 248)">
                    <path d="M14 18 C 11 11, 4 9, 0 11 C 5 14, 10 16, 14 18 Z" fill="#14482E" />
                    <path d="M14 18 C 12 8, 8 4, 4 4 C 8 8, 12 13, 14 18 Z" fill="#195B39" />
                    <path d="M14 18 C 14 6, 15 1, 15 0 C 16 6, 15 12, 14 18 Z" fill="#1E6B43" />
                    <path d="M14 18 C 16 8, 20 4, 24 4 C 20 8, 16 13, 14 18 Z" fill="#195B39" />
                    <path d="M14 18 C 17 11, 24 9, 28 11 C 23 14, 18 16, 14 18 Z" fill="#14482E" />
                </g>

                {/* Right Fan Shrub near Cart */}
                <g transform="translate(270, 252)">
                    <path d="M10 14 C 8 8, 3 7, 0 8 C 4 10, 7 12, 10 14 Z" fill="#14482E" />
                    <path d="M10 14 C 9 6, 6 3, 3 3 C 6 6, 9 10, 10 14 Z" fill="#195B39" />
                    <path d="M10 14 C 10 5, 11 1, 11 0 C 12 5, 11 9, 10 14 Z" fill="#1E6B43" />
                    <path d="M10 14 C 12 6, 15 3, 18 3 C 15 6, 12 10, 10 14 Z" fill="#195B39" />
                    <path d="M10 14 C 13 8, 18 7, 21 8 C 17 10, 14 12, 10 14 Z" fill="#14482E" />
                </g>

                {/* ── 8. Right: Street Chai/Coffee Cart, Barista & Customer (Google Pay Reference) ── */}
                <g transform="translate(306, 208)">
                    {/* Shadow underneath entire cart & characters */}
                    <ellipse cx="28" cy="46" rx="30" ry="3.5" fill="#061810" opacity="0.65" />

                    {/* Cart Blue Canopy / Awning */}
                    {/* Top Trapeze roof */}
                    <path d="M2 3 L36 3 L33 -5 L5 -5 Z" fill="#1565C0" />
                    {/* Scalloped Valance / Awning Fringe (5 distinct curved scallops) */}
                    <path
                        d="M2 3 Q 5.5 7.5, 9 3 Q 12.5 7.5, 16 3 Q 19.5 7.5, 23 3 Q 26.5 7.5, 30 3 Q 33.5 7.5, 36 3 L 36 1.5 L 2 1.5 Z"
                        fill="url(#cartAwningGrad)"
                    />

                    {/* Cart Poles */}
                    <line x1="4.5" y1="3" x2="4.5" y2="21" stroke="#9E9E9E" strokeWidth="1.2" />
                    <line x1="33.5" y1="3" x2="33.5" y2="21" stroke="#9E9E9E" strokeWidth="1.2" />

                    {/* Golden Yellow Cart Body */}
                    <rect x="2" y="20" width="34" height="15" rx="1.5" fill="url(#cartBodyGrad)" />
                    {/* Countertop Trim */}
                    <rect x="1" y="19" width="36" height="2" fill="#FAFAFA" rx="0.5" />

                    {/* QR Code Stand with scan frame */}
                    <rect x="10" y="12" width="6.5" height="7.5" fill="#FFFFFF" rx="0.6" />
                    <rect x="11.2" y="13.2" width="4.1" height="4.1" fill="#1F2937" rx="0.3" />
                    <rect x="12" y="14" width="2.5" height="2.5" fill="#FFFFFF" rx="0.2" />
                    <rect x="12.7" y="14.7" width="1.1" height="1.1" fill="#2E7D32" />

                    {/* Takeaway Chai/Coffee Cup with Steam */}
                    <rect x="29.5" y="13.5" width="3.5" height="5.5" fill="#FFFFFF" rx="0.5" />
                    <rect x="29.5" y="15.2" width="3.5" height="2" fill="#8D6E63" />
                    {/* Tiny steam swirl */}
                    <path d="M31 12 C 30.5 10.5, 31.8 9.5, 31.2 8" stroke="#E0E0E0" strokeWidth="0.7" fill="none" strokeLinecap="round" />

                    {/* Barista (Behind Counter) */}
                    <circle cx="23" cy="9.5" r="3.6" fill="#8D5538" />
                    {/* Dark neat hair */}
                    <path d="M19.5 8.5 C 19.5 5.5, 26.5 5.5, 26.5 8.5 Z" fill="#1F2937" />
                    {/* Magenta/Burgundy Barista Apron over white shirt */}
                    <rect x="19" y="13" width="8" height="6.5" fill="#D81B60" rx="1" />
                    {/* Arm extending cup forward */}
                    <path d="M25 15.5 L 29.5 15" stroke="#D81B60" strokeWidth="2.2" strokeLinecap="round" />

                    {/* Customer (On Right, Wearing Light Blue Tracksuit) */}
                    {/* Head & Hair */}
                    <circle cx="47" cy="8.5" r="3.4" fill="#C68642" />
                    <path d="M44 7.5 C 44 4.5, 50 4.5, 50 7.5 Z" fill="#263238" />
                    {/* Light Blue Jacket */}
                    <rect x="43" y="12" width="8" height="13.5" fill="#42A5F5" rx="1.5" />
                    {/* Arm holding white smartphone towards QR stand */}
                    <path d="M44 14.5 L 39.5 16" stroke="#42A5F5" strokeWidth="2.2" strokeLinecap="round" />
                    <rect x="38.5" y="14" width="2" height="3.8" fill="#FFFFFF" rx="0.4" />
                    <rect x="38.8" y="14.4" width="1.4" height="2.8" fill="#90CAF9" rx="0.2" />
                    {/* Blue Pants */}
                    <rect x="43.5" y="25.5" width="3.2" height="12" fill="#1E88E5" rx="0.8" />
                    <rect x="47.5" y="25.5" width="3.2" height="12" fill="#1E88E5" rx="0.8" />
                    {/* White Sneakers */}
                    <rect x="42.8" y="37" width="4" height="1.8" fill="#FAFAFA" rx="0.5" />
                    <rect x="47" y="37" width="4" height="1.8" fill="#FAFAFA" rx="0.5" />

                    {/* Front Spoked Cart Wheel */}
                    <g transform="translate(8.5, 36.5)">
                        <circle cx="0" cy="0" r="7.5" stroke="#795548" strokeWidth="1.6" fill="none" />
                        <circle cx="0" cy="0" r="1.8" fill="#5D4037" />
                        {/* 4 crossed spokes */}
                        <line x1="-7" y1="0" x2="7" y2="0" stroke="#8D6E63" strokeWidth="0.8" />
                        <line x1="0" y1="-7" x2="0" y2="7" stroke="#8D6E63" strokeWidth="0.8" />
                        <line x1="-5" y1="-5" x2="5" y2="5" stroke="#8D6E63" strokeWidth="0.8" />
                        <line x1="-5" y1="5" x2="5" y2="-5" stroke="#8D6E63" strokeWidth="0.8" />
                    </g>

                    {/* Rear Spoked Cart Wheel */}
                    <g transform="translate(27.5, 36.5)">
                        <circle cx="0" cy="0" r="7.5" stroke="#795548" strokeWidth="1.6" fill="none" />
                        <circle cx="0" cy="0" r="1.8" fill="#5D4037" />
                        {/* 4 crossed spokes */}
                        <line x1="-7" y1="0" x2="7" y2="0" stroke="#8D6E63" strokeWidth="0.8" />
                        <line x1="0" y1="-7" x2="0" y2="7" stroke="#8D6E63" strokeWidth="0.8" />
                        <line x1="-5" y1="-5" x2="5" y2="5" stroke="#8D6E63" strokeWidth="0.8" />
                        <line x1="-5" y1="5" x2="5" y2="-5" stroke="#8D6E63" strokeWidth="0.8" />
                    </g>
                </g>

                {/* ── 9. Seamless Bottom Blend into Page ── */}
                <rect x="0" y="245" width="400" height="35" fill="url(#sceneryBottomBlend)" />
            </svg>
        </div>
    );
}

const ACTION_PANEL_WIDTH = 104;

function SwipeableTransactionItem({
    tx,
    category,
    isSwiped,
    isPrivacyMode,
    currencySymbol,
    onSwipe,
    onReset,
    onResetOthers,
    onEdit,
    onDelete,
}: {
    tx: TransactionDocType;
    category?: CategoryDocType;
    isSwiped: boolean;
    isPrivacyMode: boolean;
    currencySymbol: string;
    onSwipe: (id: string) => void;
    onReset: () => void;
    onResetOthers: () => void;
    onEdit: (id: string) => void;
    onDelete: (tx: TransactionDocType) => void;
}) {
    const x = useMotionValue(0);

    // Synchronize programmatic state (outside click, another item swiped, etc.)
    useEffect(() => {
        animate(x, isSwiped ? -ACTION_PANEL_WIDTH : 0, {
            type: "spring",
            stiffness: 460,
            damping: 36,
        });
    }, [isSwiped, x]);

    // Progressive appearance linked proportionally to drag distance x (0 -> -ACTION_PANEL_WIDTH)
    // Edit button: appears smoothly first
    const editOpacity = useTransform(x, [-12, -72], [0, 1]);
    const editScale = useTransform(x, [-12, -88], [0.82, 1]);

    // Delete button: appears with a subtle staggered delay as drag continues
    const deleteOpacity = useTransform(x, [-24, -96], [0, 1]);
    const deleteScale = useTransform(x, [-24, -104], [0.82, 1]);

    const note = tx.note?.trim();
    const catName = category?.name || (tx.type === 'income' ? 'Income' : 'Expense');
    const title = note || catName;
    const initial = (title.trim()[0] || 'T').toUpperCase();
    const avatarStyle = getAvatarStyle(title);
    const dateStr = formatTransactionHistoryDate(tx.timestamp);
    const displayAmount = Number.isInteger(tx.amount)
        ? tx.amount.toLocaleString()
        : tx.amount.toFixed(2);

    const handleDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const currentX = x.get();
        const velocityX = info.velocity.x;

        let shouldOpen = false;
        if (velocityX < -200) {
            shouldOpen = true;
        } else if (velocityX > 200) {
            shouldOpen = false;
        } else {
            shouldOpen = currentX < -ACTION_PANEL_WIDTH / 2;
        }

        if (shouldOpen) {
            onSwipe(tx.id);
            triggerHaptic('light');
            animate(x, -ACTION_PANEL_WIDTH, {
                type: "spring",
                stiffness: 460,
                damping: 36,
            });
        } else {
            onReset();
            animate(x, 0, {
                type: "spring",
                stiffness: 460,
                damping: 36,
            });
        }
    };

    return (
        <div
            data-swipe-tx={tx.id}
            className="relative overflow-hidden rounded-2xl mx-5 sm:mx-6 my-0.5 group bg-slate-100/50 dark:bg-white/[0.02]"
        >
            <motion.div
                drag="x"
                dragDirectionLock
                dragMomentum={false}
                dragConstraints={{ left: -ACTION_PANEL_WIDTH, right: 0 }}
                dragElastic={0.12}
                style={{ x }}
                onDragStart={() => {
                    onResetOthers();
                }}
                onDragEnd={handleDragEnd}
                onClick={() => {
                    if (isSwiped) {
                        onReset();
                        triggerHaptic('light');
                    } else {
                        triggerHaptic('light');
                        onEdit(tx.id);
                    }
                }}
                className="flex items-center w-full touch-pan-y select-none cursor-pointer"
            >
                {/* 1. Transaction Entry (100% width of container, side-by-side with buttons; never overlaps) */}
                <div className="w-full shrink-0 bg-slate-50 dark:bg-[#141414] flex items-center gap-4 py-3 px-2 sm:px-2.5 hover:bg-slate-100/80 dark:hover:bg-white/[0.04] transition-colors rounded-2xl">
                    <div
                        className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                        style={{
                            backgroundColor: avatarStyle.bg,
                            color: avatarStyle.text,
                        }}
                    >
                        <span className="text-[20px] font-normal leading-none select-none">
                            {initial}
                        </span>
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="text-[15.5px] sm:text-[16px] font-normal text-slate-900 dark:text-[#E3E3E3] truncate leading-tight">
                            {title}
                        </p>
                        <p className="text-[13px] sm:text-[13.5px] font-normal text-slate-500 dark:text-[#C4C7C5] truncate mt-1 leading-normal">
                            {dateStr}
                        </p>
                    </div>

                    <div className="text-right shrink-0 pr-1">
                        <p className={clsx(
                            "text-[16px] sm:text-[17px] font-normal tabular-nums whitespace-nowrap privacy-mask",
                            isPrivacyMode && "privacy-blur",
                            tx.type === 'income'
                                ? "text-emerald-600 dark:text-[#6DD58C]"
                                : "text-slate-900 dark:text-[#E3E3E3]"
                        )}>
                            {tx.type === 'income' ? `+ ${currencySymbol}${displayAmount}` : `${currencySymbol}${displayAmount}`}
                        </p>
                    </div>
                </div>

                {/* 2. Premium Subtle Action Buttons (strictly adjacent, zero overlap with entry) */}
                <div className="w-[104px] shrink-0 flex items-center justify-center gap-2 pl-2 pr-3 select-none">
                    {/* Subtle Edit Action */}
                    <motion.button
                        type="button"
                        style={{
                            opacity: editOpacity,
                            scale: editScale,
                        }}
                        whileTap={{ scale: 0.92 }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic('light');
                            onEdit(tx.id);
                            onReset();
                        }}
                        className="w-[38px] h-[38px] rounded-full bg-slate-200/80 hover:bg-slate-300/80 active:bg-slate-300 text-slate-700 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] dark:active:bg-white/[0.18] dark:text-zinc-200 border border-slate-300/50 dark:border-white/10 flex items-center justify-center shadow-2xs cursor-pointer transition-colors"
                        title="Edit"
                        aria-label="Edit transaction"
                    >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                    </motion.button>

                    {/* Subtle Delete Action */}
                    <motion.button
                        type="button"
                        style={{
                            opacity: deleteOpacity,
                            scale: deleteScale,
                        }}
                        whileTap={{ scale: 0.92 }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic('medium');
                            onDelete(tx);
                            onReset();
                        }}
                        className="w-[38px] h-[38px] rounded-full bg-rose-500/10 hover:bg-rose-500/18 active:bg-rose-500/25 text-rose-600 dark:bg-rose-500/[0.12] dark:hover:bg-rose-500/[0.22] dark:active:bg-rose-500/[0.28] dark:text-rose-400 border border-rose-500/20 flex items-center justify-center shadow-2xs cursor-pointer transition-colors"
                        title="Delete"
                        aria-label="Delete transaction"
                    >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
}

function DashboardContent() {
    const router = useRouter();
    const {
        activeProfileId,
        setIsLogExpenseOpen,
        openLogExpenseWithCategory,
        openLogTransaction,
        setEditingTransactionId,
        currency,
        setIsSplitBillOpen,
        isPrivacyMode,
        togglePrivacyMode,
        user,
        showToast,
    } = useAppStore();
    const currencySymbol = currency?.symbol || '$';
    const { t } = useI18n();
    const db = useDatabase();
    const searchParams = useSearchParams();

    const [transactions, setTransactions] = useState<TransactionDocType[]>([]);
    const [categories, setCategories] = useState<Record<string, CategoryDocType>>({});

    const [searchQuery, setSearchQuery] = useState("");
    const [isMoreFrequentOpen, setIsMoreFrequentOpen] = useState(false);
    const [dismissedAnomalyIds, setDismissedAnomalyIds] = useState<string[]>([]);
    const [tickerIndex, setTickerIndex] = useState(0);
    const [swipedTxId, setSwipedTxId] = useState<string | null>(null);
    const [deleteConfirmTx, setDeleteConfirmTx] = useState<TransactionDocType | null>(null);

    // Slot-machine ticker animation interval
    useEffect(() => {
        if (searchQuery) return;
        const interval = setInterval(() => {
            setTickerIndex(prev => (prev + 1) % TICKER_PROMPTS.length);
        }, 3200);
        return () => clearInterval(interval);
    }, [searchQuery]);

    useEffect(() => {
        const action = searchParams.get('action');
        if (action === 'log-expense') {
            setIsLogExpenseOpen(true);
            window.history.replaceState({}, '', '/');
        }
    }, [searchParams, setIsLogExpenseOpen]);

    // Close swiped transaction when tapping outside
    useEffect(() => {
        if (!swipedTxId) return;
        const handleOutsidePointerDown = (e: PointerEvent) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest(`[data-swipe-tx="${swipedTxId}"]`)) {
                return;
            }
            setSwipedTxId(null);
        };
        window.addEventListener('pointerdown', handleOutsidePointerDown);
        return () => window.removeEventListener('pointerdown', handleOutsidePointerDown);
    }, [swipedTxId]);

    useEffect(() => {
        if (!activeProfileId || !db) return;

        // 1. Subscribe to ALL Transactions for Active Profile
        const txSub = db.transactions
            .find({
                selector: {
                    profile_id: activeProfileId,
                    _deleted: false,
                },
                sort: [{ timestamp: 'desc' }],
            })
            .$
            .subscribe((docs) => {
                setTransactions(docs.map(d => d.toJSON() as TransactionDocType));
            });

        // 2. Subscribe to Categories
        const catSub = db.categories
            .find({
                selector: {
                    profile_id: activeProfileId,
                    _deleted: false,
                }
            })
            .$
            .subscribe((docs) => {
                const catMap: Record<string, CategoryDocType> = {};
                docs.forEach(d => {
                    const data = d.toJSON() as CategoryDocType;
                    catMap[data.id] = data;
                });
                setCategories(catMap);
            });

        return () => {
            txSub.unsubscribe();
            catSub.unsubscribe();
        };
    }, [activeProfileId, db]);

    // Data Aggregation & Net Balance Calculations
    const { balance, monthExpenses, monthIncome, recentTransactions } = useMemo(() => {
        let totalBalance = 0;
        let currentMonthExp = 0;
        let currentMonthInc = 0;
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Ensure strict descending timestamp order: most recent transaction always at top
        const sorted = [...transactions].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        sorted.forEach(tx => {
            const txDate = new Date(tx.timestamp);
            const isCurrentMonth = txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;

            if (tx.type === 'income') {
                totalBalance += tx.amount;
                if (isCurrentMonth) currentMonthInc += tx.amount;
            } else {
                totalBalance -= tx.amount;
                if (isCurrentMonth) currentMonthExp += tx.amount;
            }
        });

        return {
            balance: totalBalance,
            monthExpenses: currentMonthExp,
            monthIncome: currentMonthInc,
            recentTransactions: sorted
        };
    }, [transactions]);

    const anomalies = useMemo(() => {
        const list = detectAnomalies(transactions, categories);
        return list.filter(a => !dismissedAnomalyIds.includes(a.id));
    }, [transactions, categories, dismissedAnomalyIds]);

    const currentMonthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date());

    const formattedBalanceCompact = useMemo(() => {
        return formatCompactCurrency(balance, currencySymbol, 1000);
    }, [balance, currencySymbol]);

    const formattedBalanceFull = useMemo(() => {
        return formatFullCurrency(balance, currencySymbol);
    }, [balance, currencySymbol]);

    // Single Pill: Profit or Loss (whichever is recent) per user requirement
    const recentPill = useMemo(() => {
        const latestTx = transactions[0];
        if (latestTx) {
            const isIncome = latestTx.type === 'income';
            return {
                isProfit: isIncome,
                label: isIncome ? 'Recent Income' : 'Recent Expense',
                amount: `${isIncome ? '+' : '-'}${currencySymbol}${formatCompactCurrency(latestTx.amount, '', 1000).replace('+', '').replace('-', '')}`,
            };
        }
        const net = monthIncome - monthExpenses;
        const isPositive = net >= 0;
        return {
            isProfit: isPositive,
            label: isPositive ? 'Net Income' : 'Net Expense',
            amount: `${isPositive ? '+' : '-'}${currencySymbol}${formatCompactCurrency(Math.abs(net), '', 1000).replace('+', '').replace('-', '')}`,
        };
    }, [transactions, monthIncome, monthExpenses, currencySymbol]);

    // Frequent Transaction Categories: Ranked by number of transactions (descending)
    const frequentCategories = useMemo(() => {
        // 1. Calculate occurrence of each category_id in user's transactions
        const counts: Record<string, number> = {};
        transactions.forEach(tx => {
            if (tx.category_id) {
                counts[tx.category_id] = (counts[tx.category_id] || 0) + 1;
            }
        });

        // 2. Gather non-deleted categories from local DB
        const dbCatList = Object.values(categories).filter(c => !c._deleted);
        const map = new Map<string, { id: string; name: string; icon: string; count: number }>();

        dbCatList.forEach(c => {
            map.set(c.name.toLowerCase(), {
                id: c.id,
                name: c.name,
                icon: c.icon || 'category',
                count: counts[c.id] || 0,
            });
        });

        // 3. Fallback to DEFAULT_CATEGORIES so section is populated even for new users
        DEFAULT_CATEGORIES.forEach(def => {
            const key = def.name.toLowerCase();
            if (!map.has(key)) {
                map.set(key, {
                    id: def.id,
                    name: def.name,
                    icon: def.icon,
                    count: counts[def.id] || 0,
                });
            }
        });

        // 4. Sort descending by transaction frequency, then alphabetically
        const sorted = Array.from(map.values()).sort((a, b) => {
            if (b.count !== a.count) return b.count - a.count;
            return a.name.localeCompare(b.name);
        });

        return sorted.map(c => {
            const style = getCategoryStyle(c.name);
            const words = c.name.trim().split(/\s+/);
            const line1 = words.length > 1 ? words.slice(0, Math.ceil(words.length / 2)).join(' ') : words[0];
            const line2 = words.length > 1 ? words.slice(Math.ceil(words.length / 2)).join(' ') : '';
            return {
                id: c.id,
                name: c.name,
                line1,
                line2,
                icon: c.icon && c.icon !== 'category' && c.icon !== 'more_horiz' ? c.icon : style.icon,
                bg: style.bg,
                count: c.count,
            };
        });
    }, [transactions, categories]);

    // Maximum number of recent transactions to display on the homepage
    const MAX_RECENT_TRANSACTIONS = 5;

    // Filter and limit transactions: Most recent at top, capped for the homepage
    const displayedTransactions = useMemo(() => {
        if (!searchQuery.trim()) {
            return recentTransactions.slice(0, MAX_RECENT_TRANSACTIONS);
        }
        const q = searchQuery.toLowerCase().trim();
        return recentTransactions
            .filter(tx => {
                const cat = categories[tx.category_id || ''];
                const note = (tx.note || '').toLowerCase();
                const catName = (cat?.name || '').toLowerCase();
                return note.includes(q) || catName.includes(q);
            })
            .slice(0, 10);
    }, [recentTransactions, searchQuery, categories]);

    // Quick categories for empty state
    const quickCategories = useMemo(() => {
        const catList = Object.values(categories).filter(c => !c._deleted);
        if (catList.length > 0) {
            return catList.slice(0, 4).map(c => {
                let subtitle = "Quick log";
                let iconBg = "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-zinc-200";
                const lower = c.name.toLowerCase();
                if (lower.includes('food') || lower.includes('drink') || lower.includes('dining')) {
                    subtitle = "Food & meals";
                    iconBg = "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400";
                } else if (lower.includes('transport') || lower.includes('transit') || lower.includes('car')) {
                    subtitle = "Transit & fuel";
                    iconBg = "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400";
                } else if (lower.includes('shopping') || lower.includes('groceries')) {
                    subtitle = "Daily essentials";
                    iconBg = "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400";
                } else if (lower.includes('housing') || lower.includes('rent') || lower.includes('home')) {
                    subtitle = "Home & utilities";
                    iconBg = "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400";
                } else if (lower.includes('entertainment') || lower.includes('movie')) {
                    subtitle = "Entertainment";
                    iconBg = "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400";
                }

                return {
                    name: c.name,
                    subtitle,
                    icon: c.icon || 'category',
                    iconBg
                };
            });
        }
        return [
            { name: "Food & Drinks", subtitle: "Food & meals", icon: "restaurant", iconBg: "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400" },
            { name: "Transport", subtitle: "Transit & fuel", icon: "directions_car", iconBg: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400" },
            { name: "Shopping", subtitle: "Daily essentials", icon: "shopping_bag", iconBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" },
            { name: "Housing", subtitle: "Home & utilities", icon: "home", iconBg: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400" },
        ];
    }, [categories]);

    return (
        <main className="flex-1 min-h-[100dvh] !bg-slate-50 dark:!bg-[#141414] max-w-md mx-auto w-full pb-28 sm:pb-32 flex flex-col overflow-y-auto m3-scrollable">
            
            {/* ── 1. Settings Page Style Hero Section with Scenery Background (Adaptive Light / Dark) ── */}
            <div className="relative shrink-0 overflow-hidden bg-gradient-to-b from-[#BAE6FD]/40 via-[#E0F2FE]/60 to-[#F0F9FF] dark:from-[#070B0E] dark:via-[#0A0E12] dark:to-[#141414] text-slate-900 dark:text-white min-h-[280px] sm:min-h-[305px] flex flex-col justify-start">
                <HeroScenery />

                {/* Bottom Boundary: In dark mode, seamless deep night gradient fade. In light mode, crisp solid wavy boundary separation */}
                <div className="hidden dark:block absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[#141414] pointer-events-none z-[1]" />
                <div className="block dark:hidden absolute inset-x-0 bottom-0 w-full overflow-hidden pointer-events-none z-[1] leading-none select-none">
                    <svg
                        viewBox="0 0 1200 120"
                        preserveAspectRatio="none"
                        className="w-full h-8 sm:h-10 block drop-shadow-[0_-2px_4px_rgba(15,23,42,0.04)]"
                        aria-hidden="true"
                    >
                        {/* Subtle accent ripple ridge behind for organic depth */}
                        <path
                            d="M0,45 C160,82 340,16 520,52 C700,88 880,24 1040,58 C1120,74 1170,48 1200,54 L1200,120 L0,120 Z"
                            fill="#CBD5E1"
                            opacity="0.45"
                        />
                        {/* Foreground crisp solid wave boundary matching page background */}
                        <path
                            d="M0,58 C180,18 360,92 540,50 C720,8 900,82 1060,40 C1130,22 1175,34 1200,38 L1200,120 L0,120 Z"
                            fill="#F8FAFC"
                        />
                    </svg>
                </div>

                {/* Top Search Bar with Privacy Blur Button on the Right */}
                <header className="relative z-10 pt-4 pb-2 px-5 sm:px-6 flex items-center gap-3">
                    <div className="relative flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white/85 dark:bg-[#1E2020]/90 backdrop-blur-md border border-slate-200/80 dark:border-white/10 shadow-sm transition-all focus-within:border-primary/50 dark:focus-within:border-white/30 focus-within:ring-2 focus-within:ring-primary/20 min-h-[44px]">
                        <span className="material-symbols-outlined text-[20px] text-slate-500 dark:text-slate-300 select-none shrink-0">search</span>
                        
                        <div className="relative flex-1 h-6 flex items-center">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 focus:outline-none relative z-10"
                            />
                            {!searchQuery && (
                                <div className="absolute inset-0 pointer-events-none flex items-center overflow-hidden">
                                    <AnimatePresence mode="popLayout" initial={false}>
                                        <motion.span
                                            key={tickerIndex}
                                            initial={{ y: "100%", opacity: 0 }}
                                            animate={{ y: "0%", opacity: 1 }}
                                            exit={{ y: "-100%", opacity: 0 }}
                                            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                                            className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap truncate select-none block"
                                        >
                                            {TICKER_PROMPTS[tickerIndex]}
                                        </motion.span>
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>

                        {/* Fixed Slot Clear Button (Zero Layout Shift) */}
                        <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            tabIndex={searchQuery ? 0 : -1}
                            className={clsx(
                                "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-150 cursor-pointer",
                                searchQuery
                                    ? "opacity-100 scale-100 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                                    : "opacity-0 scale-75 pointer-events-none text-transparent"
                            )}
                            aria-label="Clear search"
                        >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                    </div>

                    {/* Privacy Blur Toggle Button (Subtle & Minimalist) */}
                    <button
                        type="button"
                        onClick={() => {
                            triggerHaptic('light');
                            togglePrivacyMode();
                        }}
                        className={clsx(
                            "w-11 h-11 rounded-full border shrink-0 flex items-center justify-center transition-all shadow-xs cursor-pointer",
                            isPrivacyMode
                                ? "bg-slate-200/90 dark:bg-white/12 border-slate-300 dark:border-white/20 text-slate-800 dark:text-slate-100"
                                : "bg-white/90 dark:bg-[#1E2020]/90 border-slate-200/90 dark:border-white/15 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#282A2A] active:scale-95"
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
                </header>

                {/* Net Balance & Right-Shifted Tag: Positioned just above scenery with reduced scale */}
                <div className="relative z-10 px-5 sm:px-6 pt-2 sm:pt-3.5 pb-4 flex flex-col items-start text-left">
                    <div className="flex items-center justify-between w-full">
                        <span className="text-[11px] sm:text-[12px] font-semibold text-slate-600 dark:text-slate-300/85 tracking-wider uppercase drop-shadow-xs">
                            Net Balance
                        </span>

                        {/* Single Pill: Profit or Loss (whichever is recent) shifted to right side with reduced scale */}
                        {recentPill && (
                            <div className={clsx(
                                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/80 dark:bg-black/60 backdrop-blur-md border border-slate-200/90 dark:border-white/15 text-[11px] font-semibold shadow-xs mt-1 sm:mt-1.5 privacy-mask",
                                isPrivacyMode && "privacy-blur"
                            )}>
                                <span className={clsx(
                                    "material-symbols-outlined text-[13px]",
                                    recentPill.isProfit ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"
                                    )}>
                                    {recentPill.isProfit ? "trending_up" : "trending_down"}
                                </span>
                                <span className={clsx(
                                    "font-bold tabular-nums text-[11px]",
                                    recentPill.isProfit ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"
                                )}>
                                    {recentPill.amount}
                                </span>
                            </div>
                        )}
                    </div>

                    <h1
                        title={formattedBalanceFull}
                        className={clsx(
                            "text-[36px] sm:text-[40px] font-semibold tracking-tight text-slate-900 dark:text-white leading-tight my-0.5 m3-tabular-nums cursor-default privacy-mask drop-shadow-sm",
                            isPrivacyMode && "privacy-blur"
                        )}
                    >
                        {formattedBalanceCompact}
                    </h1>
                </div>
            </div>

            {/* ── 2. Symmetrical Action Row (Aligned in 4 Columns matching Quick add expense) ── */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3 items-start w-full px-5 sm:px-6 pt-3 pb-5 shrink-0">
                {/* 1. Add Expense */}
                <div className="flex flex-col items-center gap-1.5">
                    <button
                        onClick={() => {
                            triggerHaptic('light');
                            openLogTransaction('expense');
                        }}
                        className="w-14 h-14 rounded-[18px] bg-white dark:bg-[#0842A0] border border-slate-200/90 dark:border-transparent hover:bg-slate-50 dark:hover:bg-[#0b4fc0] active:scale-95 transition-all shadow-xs flex items-center justify-center group cursor-pointer"
                        aria-label="Add Expense"
                    >
                        <span className="material-symbols-outlined text-[24px] text-rose-500 dark:text-[#D3E3FD] transition-transform group-hover:scale-110">arrow_outward</span>
                    </button>
                    <span className="text-[13px] font-semibold text-slate-700 dark:text-[#E3E3E3] text-center leading-tight">
                        Add<br />Expense
                    </span>
                </div>

                {/* 2. Add Income */}
                <div className="flex flex-col items-center gap-1.5">
                    <button
                        onClick={() => {
                            triggerHaptic('light');
                            openLogTransaction('income');
                        }}
                        className="w-14 h-14 rounded-[18px] bg-white dark:bg-[#0842A0] border border-slate-200/90 dark:border-transparent hover:bg-slate-50 dark:hover:bg-[#0b4fc0] active:scale-95 transition-all shadow-xs flex items-center justify-center group cursor-pointer"
                        aria-label="Add Income"
                    >
                        <span className="material-symbols-outlined text-[24px] text-emerald-600 dark:text-[#D3E3FD] transition-transform group-hover:scale-110">payments</span>
                    </button>
                    <span className="text-[13px] font-semibold text-slate-700 dark:text-[#E3E3E3] text-center leading-tight">
                        Add<br />Income
                    </span>
                </div>

                {/* 3. Split Bill (multiple person icon) */}
                <div className="flex flex-col items-center gap-1.5">
                    <button
                        onClick={() => {
                            triggerHaptic('light');
                            setIsSplitBillOpen(true);
                        }}
                        className="w-14 h-14 rounded-[18px] bg-white dark:bg-[#0842A0] border border-slate-200/90 dark:border-transparent hover:bg-slate-50 dark:hover:bg-[#0b4fc0] active:scale-95 transition-all shadow-xs flex items-center justify-center group cursor-pointer"
                        aria-label="Split Bill"
                    >
                        <span className="material-symbols-outlined text-[24px] text-indigo-600 dark:text-[#D3E3FD] transition-transform group-hover:scale-110">group</span>
                    </button>
                    <span className="text-[13px] font-semibold text-slate-700 dark:text-[#E3E3E3] text-center leading-tight">
                        Split<br />Bill
                    </span>
                </div>

                {/* 4. Track Debts (Count badge removed per requirement) */}
                <div className="flex flex-col items-center gap-1.5">
                    <button
                        onClick={() => {
                            triggerHaptic('light');
                            router.push('/debts');
                        }}
                        className="w-14 h-14 rounded-[18px] bg-white dark:bg-[#0842A0] border border-slate-200/90 dark:border-transparent hover:bg-slate-50 dark:hover:bg-[#0b4fc0] active:scale-95 transition-all shadow-xs flex items-center justify-center group cursor-pointer"
                        aria-label={t('debts')}
                    >
                        <span className="material-symbols-outlined text-[24px] text-amber-600 dark:text-[#D3E3FD] transition-transform group-hover:scale-110">handshake</span>
                    </button>
                    <span className="text-[13px] font-semibold text-slate-700 dark:text-[#E3E3E3] text-center leading-tight">
                        Track<br />Debts
                    </span>
                </div>
            </div>

            {/* ── 3. Frequent Transaction Categories (Quick add expense) ── */}
            <section className="px-5 sm:px-6 pt-2 pb-4 shrink-0">
                <h2 className="text-[18px] sm:text-[19px] font-normal tracking-tight text-slate-900 dark:text-[#E3E3E3] mb-3.5 sm:mb-4">
                    Add expense
                </h2>

                <div className="grid grid-cols-4 gap-2 sm:gap-3 items-start">
                    {frequentCategories.slice(0, 3).map((entry) => (
                        <button
                            key={entry.id}
                            type="button"
                            onClick={() => {
                                triggerHaptic('light');
                                openLogExpenseWithCategory(entry.name);
                            }}
                            className="flex flex-col items-center group cursor-pointer text-center focus:outline-none"
                            title={`${entry.name} (${entry.count} transactions)`}
                        >
                            <div
                                className="w-[50px] h-[50px] rounded-full flex items-center justify-center text-white/95 shadow-xs transition-transform group-hover:scale-105 active:scale-95 border border-white/10"
                                style={{ backgroundColor: entry.bg }}
                            >
                                <span className="material-symbols-outlined text-[21px]">
                                    {entry.icon}
                                </span>
                            </div>
                            <div className="mt-2 text-[12px] font-normal text-slate-800 dark:text-[#E3E3E3] leading-[1.25] max-w-[74px] break-words">
                                <span className="block truncate">{entry.line1}</span>
                                <span className="block truncate">{entry.line2 || '\u00A0'}</span>
                            </div>
                        </button>
                    ))}

                    {/* 4th item: "More" button with downward chevron */}
                    <button
                        type="button"
                        onClick={() => {
                            triggerHaptic('light');
                            setIsMoreFrequentOpen(prev => !prev);
                        }}
                        className="flex flex-col items-center group cursor-pointer text-center focus:outline-none"
                    >
                        <div className="w-[50px] h-[50px] rounded-full bg-slate-200/80 dark:bg-[#1E2228] border border-slate-300/60 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-[#A8C7FA] shadow-xs transition-transform group-hover:scale-105 active:scale-95">
                            <span className={clsx(
                                "material-symbols-outlined text-[21px] transition-transform duration-200",
                                isMoreFrequentOpen && "rotate-180"
                            )}>
                                keyboard_arrow_down
                            </span>
                        </div>
                        <div className="mt-2 text-[12px] font-normal text-slate-800 dark:text-[#E3E3E3] leading-[1.25]">
                            <span className="block">More</span>
                            <span className="block">{'\u00A0'}</span>
                        </div>
                    </button>
                </div>

                {/* Expanded more categories if user taps More */}
                {isMoreFrequentOpen && frequentCategories.length > 3 && (
                    <div className="grid grid-cols-4 gap-2 sm:gap-3 items-start mt-3 pt-3 border-t border-slate-200/60 dark:border-white/5 animate-in fade-in duration-150">
                        {frequentCategories.slice(3).map((entry) => (
                            <button
                                key={entry.id}
                                type="button"
                                onClick={() => {
                                    triggerHaptic('light');
                                    openLogExpenseWithCategory(entry.name);
                                }}
                                className="flex flex-col items-center group cursor-pointer text-center focus:outline-none"
                                title={`${entry.name} (${entry.count} transactions)`}
                            >
                                <div
                                    className="w-[50px] h-[50px] rounded-full flex items-center justify-center text-white/95 shadow-xs transition-transform group-hover:scale-105 active:scale-95 border border-white/10"
                                    style={{ backgroundColor: entry.bg }}
                                >
                                    <span className="material-symbols-outlined text-[21px]">
                                        {entry.icon}
                                    </span>
                                </div>
                                <div className="mt-2 text-[12px] font-normal text-slate-800 dark:text-[#E3E3E3] leading-[1.25] max-w-[74px] break-words">
                                    <span className="block truncate">{entry.line1}</span>
                                    <span className="block truncate">{entry.line2 || '\u00A0'}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </section>

            {/* Autonomous Anomaly Banner */}
            <AnimatePresence>
                {anomalies.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        className="mx-5 sm:mx-6 mb-3 relative overflow-hidden rounded-2xl border border-amber-300/40 dark:border-amber-500/20 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/60 dark:from-amber-950/30 dark:via-[#141416] dark:to-orange-950/20 shadow-sm shrink-0"
                    >
                        <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-full bg-gradient-to-b from-amber-400 via-orange-500 to-rose-500" />
                        <div className="relative p-3 flex items-center justify-between gap-2.5" style={{ paddingLeft: '16px' }}>
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 dark:from-amber-500/20 dark:to-orange-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 ring-1 ring-amber-300/30 dark:ring-amber-500/20">
                                    <span className="material-symbols-outlined text-[17px]">
                                        {anomalies[0].type === 'duplicate' ? 'content_copy' : anomalies[0].type === 'price_hike' ? 'trending_up' : 'bolt'}
                                    </span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate">
                                        {anomalies[0].title}
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                                        {anomalies[0].description}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    onClick={() => {
                                        triggerHaptic('light');
                                        setEditingTransactionId(anomalies[0].txId);
                                        setIsLogExpenseOpen(true);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-950 text-[11px] font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer"
                                >
                                    Review
                                </button>
                                <button
                                    onClick={() => {
                                        triggerHaptic('light');
                                        setDismissedAnomalyIds(prev => [...prev, anomalies[0].id]);
                                    }}
                                    className="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-amber-100/50 dark:hover:bg-white/10 flex items-center justify-center cursor-pointer transition-colors"
                                    aria-label="Dismiss anomaly"
                                >
                                    <span className="material-symbols-outlined text-[15px]">close</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── 4. Transaction History Section ── */}
            <section className="flex flex-col mt-3 sm:mt-7 pb-8">
                <div className="flex items-center justify-between mb-2 px-5 sm:px-6 shrink-0">
                    <h2 className="text-[18px] sm:text-[19px] font-normal tracking-tight text-slate-900 dark:text-[#E3E3E3]">
                        Transaction history
                    </h2>
                    <button
                        onClick={() => router.push('/reports')}
                        className="text-[14px] font-medium text-[#0842A0] dark:text-[#A8C7FA] hover:underline transition-colors inline-flex items-center gap-0.5 cursor-pointer redirect-link"
                    >
                        <span>See all</span>
                        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    </button>
                </div>

                {/* Natural In-Page Content Flow (no nested scroll lock) */}
                <div className="w-full">
                    {displayedTransactions.length === 0 ? (
                        <div className="py-6 text-center px-5 sm:px-6">
                            <div className="w-16 h-16 rounded-full bg-slate-200/80 dark:bg-[#1E2020] flex items-center justify-center text-slate-700 dark:text-[#E3E3E3] mx-auto mb-3 shadow-xs">
                                <span className="material-symbols-outlined text-[42px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    receipt_long
                                </span>
                            </div>
                            <p className="text-base font-medium text-slate-800 dark:text-[#E3E3E3]">
                                {searchQuery ? `No transactions matching "${searchQuery}"` : `No transactions in ${currentMonthName}`}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-[#C4C7C5] font-normal mt-0.5 mb-6">
                                {searchQuery ? "Try a different search term" : "Tap a category to quickly record an expense"}
                            </p>

                            {!searchQuery && (
                                <div className="grid grid-cols-2 gap-3.5 max-w-sm mx-auto">
                                    {quickCategories.map((c) => (
                                        <button
                                            key={c.name}
                                            onClick={() => {
                                                triggerHaptic('light');
                                                openLogExpenseWithCategory(c.name);
                                            }}
                                            className="flex items-center gap-3 p-1.5 pr-4 pl-1.5 rounded-full bg-white dark:bg-[#1E2020] border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-[#282A2A] active:scale-95 transition-all text-left shadow-xs group cursor-pointer"
                                        >
                                            <div className={clsx(
                                                "w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-2xs",
                                                c.iconBg
                                            )}>
                                                <span className="material-symbols-outlined text-[24px] font-bold">{c.icon}</span>
                                            </div>
                                            <div className="truncate">
                                                <span className="text-[13.5px] font-bold text-slate-900 dark:text-[#E3E3E3] block truncate leading-tight">{c.name}</span>
                                                <span className="text-[11px] font-medium text-slate-500 dark:text-[#C4C7C5] block truncate">{c.subtitle}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {displayedTransactions.map((tx) => (
                                <SwipeableTransactionItem
                                    key={tx.id}
                                    tx={tx}
                                    category={categories[tx.category_id || '']}
                                    isSwiped={swipedTxId === tx.id}
                                    isPrivacyMode={isPrivacyMode}
                                    currencySymbol={currencySymbol}
                                    onSwipe={(id) => setSwipedTxId(id)}
                                    onReset={() => setSwipedTxId(null)}
                                    onResetOthers={() => {
                                        if (swipedTxId && swipedTxId !== tx.id) {
                                            setSwipedTxId(null);
                                        }
                                    }}
                                    onEdit={(id) => setEditingTransactionId(id)}
                                    onDelete={(item) => setDeleteConfirmTx(item)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* iOS-Style Delete Confirmation Dialog */}
            <AnimatePresence>
                {deleteConfirmTx && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setDeleteConfirmTx(null)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 16 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 16 }}
                            transition={{ type: "spring", stiffness: 450, damping: 30 }}
                            className="relative z-10 bg-white dark:bg-[#1E2020] rounded-[28px] p-6 max-w-xs w-full shadow-2xl border border-slate-200/80 dark:border-white/10 text-center"
                        >
                            <div className="w-12 h-12 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
                                <span className="material-symbols-outlined text-[26px]">delete</span>
                            </div>
                            <h3 className="text-[17px] font-bold text-slate-900 dark:text-white mb-1">
                                Delete Entry?
                            </h3>
                            <p className="text-[13px] text-slate-500 dark:text-zinc-400 mb-5 leading-normal">
                                Are you sure you want to remove this {currencySymbol}{deleteConfirmTx.amount} entry?
                            </p>
                            <div className="flex items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setDeleteConfirmTx(null)}
                                    className="flex-1 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-zinc-200 font-semibold text-sm active:scale-95 transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!db || !deleteConfirmTx) return;
                                        triggerHaptic('medium');
                                        await softDelete(db.transactions, deleteConfirmTx.id);
                                        showToast('Transaction deleted', 'info');
                                        setDeleteConfirmTx(null);
                                        setSwipedTxId(null);
                                    }}
                                    className="flex-1 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm active:scale-95 transition-all shadow-md cursor-pointer"
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </main>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<DashboardSkeleton />}>
            <DashboardContent />
        </Suspense>
    );
}
