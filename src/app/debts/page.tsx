"use client";

import { useAppStore } from "@/store/appStore";
import { useDatabase } from "@/db/DatabaseProvider";
import { useEffect, useState, useMemo } from "react";
import { DebtDocType, DebtPaymentDocType } from "@/db/schema";
import clsx from 'clsx';
import { useI18n } from "@/hooks/useI18n";
import AddDebtModal from "@/components/AddDebtModal";
import { ActionModal } from "@/components/ActionModal";
import { M3Search, SearchSuggestion } from "@/components/M3Search";
import { formatCompactCurrency, formatFullCurrency } from "@/utils/currency";
import { mutate, softDelete } from "@/sync/mutate";
import { v4 as uuidv4 } from 'uuid';
import { triggerHaptic } from "@/utils/haptics";
import { evaluateMathExpression } from "@/utils/mathEval";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getAvatarStyle } from "@/utils/avatar";

const DEBT_TICKER_PROMPTS = [
    "Search debts by person or note...",
    "Track who owes you with Debts",
    "Split bills with multiple friends",
    "Filter: Money Lent or Borrowed",
];

function DebtHeroScenery() {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
            {/* ── Light Mode Daytime Scenery ── */}
            <svg
                viewBox="0 0 400 280"
                className="block dark:hidden w-full h-full object-cover"
                preserveAspectRatio="xMidYMid slice"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id="debtSkyGradLight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#BAE6FD" />
                        <stop offset="45%" stopColor="#E0F2FE" />
                        <stop offset="85%" stopColor="#F0F9FF" />
                        <stop offset="100%" stopColor="#F8FAFC" />
                    </linearGradient>
                    <radialGradient id="debtSunGlowLight" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.4" />
                        <stop offset="50%" stopColor="#FBBF24" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="debtBottomBlendLight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F8FAFC" stopOpacity="0" />
                        <stop offset="60%" stopColor="#F8FAFC" stopOpacity="0.75" />
                        <stop offset="100%" stopColor="#F8FAFC" stopOpacity="1" />
                    </linearGradient>
                </defs>

                {/* 1. Daytime Clear Sky */}
                <rect width="400" height="280" fill="url(#debtSkyGradLight)" />

                {/* 2. Morning Sun */}
                <circle cx="340" cy="46" r="32" fill="url(#debtSunGlowLight)" />
                <circle cx="340" cy="46" r="14" fill="#F59E0B" opacity="0.9" />
                <circle cx="340" cy="46" r="10" fill="#FDE68A" />

                {/* Fluffy Soft Morning Clouds */}
                <g opacity="0.75">
                    <path d="M 50 44 Q 62 34 78 40 Q 94 32 106 42 Q 114 40 120 48 L 50 48 Z" fill="#FFFFFF" />
                    <path d="M 190 34 Q 202 26 216 30 Q 228 22 240 32 Q 248 30 254 38 L 190 38 Z" fill="#FFFFFF" opacity="0.6" />
                </g>

                {/* 3. Distant Mountains */}
                <path
                    d="M-20 162 C 60 135, 140 155, 230 138 C 300 125, 360 142, 420 134 L 420 280 L -20 280 Z"
                    fill="#93C5FD"
                    opacity="0.5"
                />
                <path
                    d="M-20 178 C 80 148, 180 168, 290 146 C 345 136, 385 152, 420 148 L 420 280 L -20 280 Z"
                    fill="#86EFAC"
                    opacity="0.8"
                />

                {/* 4. Left Hill Landmark: Quaint Classical Merchant's Ledger Pavilion */}
                <g transform="translate(18, 138)">
                    <rect x="12" y="16" width="38" height="28" fill="#F1F5F9" rx="1" />
                    <path d="M8 16 L31 4 L54 16 Z" fill="#E2E8F0" />
                    <path d="M25 22 A 6 6 0 0 1 37 22 L 37 34 L 25 34 Z" fill="#38BDF8" opacity="0.7" />
                    <rect x="30" y="22" width="2" height="12" fill="#CBD5E1" />
                    <rect x="25" y="27" width="12" height="2" fill="#CBD5E1" />
                    <circle cx="31" cy="11" r="3" fill="#F59E0B" />
                </g>

                {/* Pines on Left Hill */}
                <g transform="translate(68, 134)">
                    <rect x="4" y="22" width="2.5" height="18" fill="#78350F" />
                    <polygon points="5,8 -3,24 13,24" fill="#15803D" />
                    <polygon points="5,2 -1,16 11,16" fill="#16A34A" />
                </g>
                <g transform="translate(86, 142)">
                    <rect x="3" y="18" width="2" height="14" fill="#78350F" />
                    <polygon points="4,7 -2,20 10,20" fill="#16A34A" />
                </g>

                {/* 5. The Central Bridge of Trust */}
                <path
                    d="M 165 194 Q 220 166 275 194 L 275 210 Q 220 186 165 210 Z"
                    fill="#E2E8F0"
                />
                <path
                    d="M 175 210 Q 220 188 265 210 Z"
                    fill="#CBD5E1"
                />
                <path
                    d="M 163 192 Q 220 164 277 192"
                    stroke="#94A3B8"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                />

                {/* 6. Two Friends on Bridge */}
                <g transform="translate(202, 160)">
                    <circle cx="6" cy="5" r="3" fill="#334155" />
                    <path d="M3 8 L9 8 L10 18 L2 18 Z" fill="#475569" />
                    <line x1="8" y1="11" x2="14" y2="13" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" />
                    <circle cx="15" cy="13" r="1.5" fill="#F59E0B" />
                </g>
                <g transform="translate(225, 161)">
                    <circle cx="6" cy="5" r="3" fill="#334155" />
                    <path d="M3 8 L9 8 L10 17 L2 17 Z" fill="#475569" />
                    <line x1="4" y1="11" x2="-2" y2="13" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" />
                </g>

                {/* Lantern Post on Bridge */}
                <g transform="translate(216, 146)">
                    <line x1="4" y1="0" x2="4" y2="28" stroke="#64748B" strokeWidth="1.5" />
                    <polygon points="1,4 7,4 6,10 2,10" fill="#334155" />
                    <circle cx="4" cy="7" r="2.5" fill="#F59E0B" />
                </g>

                {/* 8. Right Hill Slope & Cypress Trees */}
                <path
                    d="M 255 186 C 300 162, 360 175, 420 168 L 420 280 L 255 280 Z"
                    fill="#4ADE80"
                />
                <g transform="translate(320, 142)">
                    <rect x="4" y="24" width="2" height="16" fill="#78350F" />
                    <ellipse cx="5" cy="16" rx="6" ry="16" fill="#15803D" />
                    <ellipse cx="5" cy="14" rx="4" ry="12" fill="#16A34A" />
                </g>
                <g transform="translate(345, 148)">
                    <rect x="4" y="22" width="2" height="14" fill="#78350F" />
                    <ellipse cx="5" cy="14" rx="5" ry="14" fill="#16A34A" />
                </g>
                <g transform="translate(372, 144)">
                    <rect x="4" y="24" width="2" height="16" fill="#78350F" />
                    <ellipse cx="5" cy="15" rx="6.5" ry="16" fill="#15803D" />
                </g>

                {/* 9. Foreground Sweeping Emerald Ridge */}
                <path
                    d="M-20 215 C 80 185, 200 205, 320 185 C 370 176, 400 192, 420 188 L 420 280 L -20 280 Z"
                    fill="#22C55E"
                />
                <ellipse cx="14" cy="225" rx="16" ry="8" fill="#16A34A" />
                <ellipse cx="110" cy="232" rx="14" ry="7" fill="#16A34A" />
                <ellipse cx="295" cy="228" rx="18" ry="9" fill="#16A34A" />

                {/* 10. Solid Wavy Ground Boundary Separation */}
                <path
                    d="M-10 250 C 85 232, 180 254, 280 236 C 335 224, 375 244, 410 238 L 410 280 L -10 280 Z"
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
                    {/* Sky Gradient: Pure velvety night transitioning smoothly into dusky forest hills */}
                    <linearGradient id="debtSkyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#000000" />
                        <stop offset="50%" stopColor="#060C09" />
                        <stop offset="80%" stopColor="#0B1611" />
                        <stop offset="100%" stopColor="#0E1E17" />
                    </linearGradient>

                    {/* Warm Lantern Glow */}
                    <radialGradient id="debtLanternGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#FFA000" stopOpacity="0.85" />
                        <stop offset="40%" stopColor="#FFB300" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#FF8F00" stopOpacity="0" />
                    </radialGradient>

                    {/* Moon Glow */}
                    <radialGradient id="debtMoonGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.25" />
                        <stop offset="60%" stopColor="#FDE68A" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#FDE68A" stopOpacity="0" />
                    </radialGradient>

                    {/* Bottom Edge Fade for seamless blend into page */}
                    <linearGradient id="debtBottomBlend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#141414" stopOpacity="0" />
                        <stop offset="60%" stopColor="#141414" stopOpacity="0.75" />
                        <stop offset="100%" stopColor="#141414" stopOpacity="1" />
                    </linearGradient>
                </defs>

                {/* 1. Velvety Night Sky */}
                <rect width="400" height="280" fill="url(#debtSkyGrad)" />

                {/* 2. Stars & Moon */}
                <circle cx="340" cy="46" r="24" fill="url(#debtMoonGlow)" />
                {/* Crescent Moon */}
                <path
                    d="M 346 36 A 12 12 0 1 0 354 54 A 10 10 0 1 1 346 36 Z"
                    fill="#FDE68A"
                    opacity="0.9"
                />
                {/* Sparkling Stars */}
                <circle cx="36" cy="32" r="1.1" fill="#FFFFFF" opacity="0.6" />
                <circle cx="78" cy="22" r="1.3" fill="#FFFFFF" opacity="0.8" />
                <circle cx="125" cy="38" r="0.9" fill="#FFFFFF" opacity="0.4" />
                <circle cx="170" cy="25" r="1.2" fill="#FDE68A" opacity="0.7" />
                <circle cx="218" cy="44" r="1" fill="#FFFFFF" opacity="0.5" />
                <circle cx="270" cy="28" r="1.4" fill="#FFFFFF" opacity="0.85" />
                <circle cx="308" cy="58" r="0.8" fill="#FFFFFF" opacity="0.4" />
                <circle cx="380" cy="35" r="1.2" fill="#FFFFFF" opacity="0.6" />

                {/* 3. Deep Distant Mountain Ridges */}
                <path
                    d="M-20 162 C 60 135, 140 155, 230 138 C 300 125, 360 142, 420 134 L 420 280 L -20 280 Z"
                    fill="#0A150F"
                />
                <path
                    d="M-20 178 C 80 148, 180 168, 290 146 C 345 136, 385 152, 420 148 L 420 280 L -20 280 Z"
                    fill="#0F1F17"
                />

                {/* 4. Left Hill Landmark: Quaint Classical Merchant's Ledger Pavilion */}
                <g transform="translate(18, 138)">
                    {/* Building Base & Pillars */}
                    <rect x="12" y="16" width="38" height="28" fill="#13231B" rx="1" />
                    {/* Pitched Roof */}
                    <path d="M8 16 L31 4 L54 16 Z" fill="#1A3326" />
                    {/* Arched Amber Window with Warm Glow */}
                    <path d="M25 22 A 6 6 0 0 1 37 22 L 37 34 L 25 34 Z" fill="#FFA000" opacity="0.85" />
                    <rect x="30" y="22" width="2" height="12" fill="#13231B" opacity="0.7" />
                    <rect x="25" y="27" width="12" height="2" fill="#13231B" opacity="0.7" />
                    {/* Tiny Clock / Balance Scale Crest */}
                    <circle cx="31" cy="11" r="3" fill="#FDE68A" opacity="0.8" />
                </g>

                {/* Classical Pines on Left Hill */}
                <g transform="translate(68, 134)">
                    <rect x="4" y="22" width="2.5" height="18" fill="#2E1C0C" />
                    <polygon points="5,8 -3,24 13,24" fill="#162E21" />
                    <polygon points="5,2 -1,16 11,16" fill="#1D3B2B" />
                </g>
                <g transform="translate(86, 142)">
                    <rect x="3" y="18" width="2" height="14" fill="#2E1C0C" />
                    <polygon points="4,7 -2,20 10,20" fill="#183324" />
                </g>

                {/* 5. The Central Bridge of Trust (Connecting two hills) */}
                {/* Arch Body */}
                <path
                    d="M 165 194 Q 220 166 275 194 L 275 210 Q 220 186 165 210 Z"
                    fill="#152B1F"
                />
                {/* Under-Arch Void (Silhouette dark opening) */}
                <path
                    d="M 175 210 Q 220 188 265 210 Z"
                    fill="#080F0B"
                />
                {/* Bridge Balustrade & Walkway */}
                <path
                    d="M 163 192 Q 220 164 277 192"
                    stroke="#1E3E2D"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                />

                {/* 6. Two Friends on the Bridge (Symbolizing debts, lending, repayment) */}
                {/* Person 1 (Lender / Friend on Left) */}
                <g transform="translate(202, 160)">
                    {/* Head */}
                    <circle cx="6" cy="5" r="3" fill="#E3E3E3" opacity="0.85" />
                    {/* Body */}
                    <path d="M3 8 L9 8 L10 18 L2 18 Z" fill="#C4C7C5" opacity="0.8" />
                    {/* Extended Arm holding token/ledger */}
                    <line x1="8" y1="11" x2="14" y2="13" stroke="#FDE68A" strokeWidth="1.8" strokeLinecap="round" />
                    <circle cx="15" cy="13" r="1.5" fill="#FFA000" />
                </g>

                {/* Person 2 (Borrower / Partner on Right) */}
                <g transform="translate(225, 161)">
                    {/* Head */}
                    <circle cx="6" cy="5" r="3" fill="#E3E3E3" opacity="0.85" />
                    {/* Body */}
                    <path d="M3 8 L9 8 L10 17 L2 17 Z" fill="#C4C7C5" opacity="0.8" />
                    {/* Receiving arm */}
                    <line x1="4" y1="11" x2="-2" y2="13" stroke="#FDE68A" strokeWidth="1.8" strokeLinecap="round" />
                </g>

                {/* 7. Lantern Post on Bridge (Casting Warm Amber Light) */}
                <g transform="translate(216, 146)">
                    <line x1="4" y1="0" x2="4" y2="28" stroke="#374151" strokeWidth="1.5" />
                    {/* Lantern Head */}
                    <polygon points="1,4 7,4 6,10 2,10" fill="#1F2937" />
                    {/* Glowing Amber Light Bulb */}
                    <circle cx="4" cy="7" r="2.5" fill="#FFB300" />
                    {/* Radial Glow Halo */}
                    <circle cx="4" cy="7" r="18" fill="url(#debtLanternGlow)" />
                </g>

                {/* 8. Right Hill Slope & Lush Foliage */}
                <path
                    d="M 255 186 C 300 162, 360 175, 420 168 L 420 280 L 255 280 Z"
                    fill="#183324"
                />
                {/* Stylized Cypress Trees on Right Hill */}
                <g transform="translate(320, 142)">
                    <rect x="4" y="24" width="2" height="16" fill="#2E1C0C" />
                    <ellipse cx="5" cy="16" rx="6" ry="16" fill="#1C3828" />
                    <ellipse cx="5" cy="14" rx="4" ry="12" fill="#254B36" opacity="0.8" />
                </g>
                <g transform="translate(345, 148)">
                    <rect x="4" y="22" width="2" height="14" fill="#2E1C0C" />
                    <ellipse cx="5" cy="14" rx="5" ry="14" fill="#1E3E2C" />
                </g>
                <g transform="translate(372, 144)">
                    <rect x="4" y="24" width="2" height="16" fill="#2E1C0C" />
                    <ellipse cx="5" cy="15" rx="6.5" ry="16" fill="#193525" />
                </g>

                {/* 9. Foreground Sweeping Emerald Ridge */}
                <path
                    d="M-20 215 C 80 185, 200 205, 320 185 C 370 176, 400 192, 420 188 L 420 280 L -20 280 Z"
                    fill="#1C3829"
                />
                {/* Foreground Bush Clumps */}
                <ellipse cx="14" cy="225" rx="16" ry="8" fill="#224733" />
                <ellipse cx="110" cy="232" rx="14" ry="7" fill="#1F402E" />
                <ellipse cx="295" cy="228" rx="18" ry="9" fill="#224733" />

                {/* 10. Seamless Bottom Blend into Page */}
                <rect x="0" y="220" width="400" height="60" fill="url(#debtBottomBlend)" />
            </svg>
        </div>
    );
}

type DebtDateSection = {
    key: string;
    label: string;
    items: DebtDocType[];
};

function getDebtDateSections(items: DebtDocType[]): DebtDateSection[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sections = new Map<string, DebtDateSection>();
    [...items]
        .sort((a, b) => b.created_at - a.created_at || b.id.localeCompare(a.id))
        .forEach((debt) => {
            const date = new Date(debt.created_at);
            const day = new Date(date);
            day.setHours(0, 0, 0, 0);
            const daysAgo = Math.round((today.getTime() - day.getTime()) / 86_400_000);
            const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;

            let label: string;
            if (daysAgo === 0) label = 'Today';
            else if (daysAgo === 1) label = 'Yesterday';
            else {
                label = date.toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    ...(date.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
                });
            }

            const section = sections.get(key) ?? { key, label, items: [] };
            section.items.push(debt);
            sections.set(key, section);
        });

    return [...sections.values()];
}

export default function DebtsPage() {
    const router = useRouter();
    const { activeProfileId, showToast, currency, setIsSplitBillOpen, isPrivacyMode, togglePrivacyMode, user } = useAppStore();
    const currencySymbol = currency?.symbol || '$';
    const { t } = useI18n();
    const db = useDatabase();

    const [tickerIndex, setTickerIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setTickerIndex((prev) => (prev + 1) % DEBT_TICKER_PROMPTS.length);
        }, 3200);
        return () => clearInterval(interval);
    }, []);

    const [debts, setDebts] = useState<DebtDocType[]>([]);
    const [payments, setPayments] = useState<DebtPaymentDocType[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingDebtId, setEditingDebtId] = useState<string | undefined>(undefined);
    const [addModalInitialType, setAddModalInitialType] = useState<"lent" | "owe">("lent");
    const [addModalInitialPurpose, setAddModalInitialPurpose] = useState<string>("");
    const [addModalInitialPersonName, setAddModalInitialPersonName] = useState<string>("");
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [debtToDeleteId, setDebtToDeleteId] = useState<string | null>(null);
    const [expandedPerson, setExpandedPerson] = useState<string | null>(null);
    const [settledHistoryPerson, setSettledHistoryPerson] = useState<string | null>(null);

    // Partial Repayment Modal State
    const [paymentModalDebt, setPaymentModalDebt] = useState<DebtDocType | null>(null);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [paymentNote, setPaymentNote] = useState("");
    const [isSavingPayment, setIsSavingPayment] = useState(false);

    useEffect(() => {
        if (!activeProfileId) return;

        const sub = db.debts
            .find({
                selector: {
                    profile_id: activeProfileId,
                    _deleted: false,
                },
                sort: [{ created_at: 'desc' }],
            })
            .$
            .subscribe((docs) => {
                setDebts(docs.map(d => d.toJSON() as DebtDocType));
            });

        const paySub = db.debt_payments
            .find({
                selector: {
                    _deleted: false,
                }
            })
            .$
            .subscribe((docs) => {
                setPayments(docs.map(d => d.toJSON() as DebtPaymentDocType));
            });

        return () => {
            sub.unsubscribe();
            paySub.unsubscribe();
        };
    }, [activeProfileId, db]);

    // Map debt payments for quick lookup
    const debtPaymentsMap = useMemo(() => {
        const map: Record<string, { totalPaid: number; list: DebtPaymentDocType[] }> = {};
        payments.forEach(p => {
            if (!p._deleted) {
                if (!map[p.debt_id]) {
                    map[p.debt_id] = { totalPaid: 0, list: [] };
                }
                map[p.debt_id].totalPaid += p.amount;
                map[p.debt_id].list.push(p);
            }
        });
        return map;
    }, [payments]);

    const searchSuggestions: SearchSuggestion[] = useMemo(() => {
        const people = Array.from(new Set(debts.map(d => d.person_name.trim()))).filter(Boolean);
        const purposes = Array.from(new Set(debts.map(d => d.purpose?.trim()))).filter(Boolean) as string[];

        const results: SearchSuggestion[] = [];
        people.forEach((p) => {
            results.push({
                id: `person-${p}`,
                label: p,
                icon: "person",
                group: "People",
            });
        });
        purposes.forEach((purp) => {
            results.push({
                id: `purpose-${purp}`,
                label: purp,
                icon: "description",
                group: "Purposes",
            });
        });
        return results;
    }, [debts]);

    const filteredDebts = useMemo(() => {
        if (!searchQuery.trim()) return debts;
        const q = searchQuery.toLowerCase().trim();
        return debts.filter(debt => {
            return debt.person_name.toLowerCase().includes(q) ||
                (debt.purpose || "").toLowerCase().includes(q);
        });
    }, [debts, searchQuery]);

    // Calculate totals for active summary dashboard with accurate remaining balances
    const totals = useMemo(() => {
        return debts.reduce((acc, debt) => {
            if (debt.status === 'active') {
                const paid = debtPaymentsMap[debt.id]?.totalPaid || 0;
                const remaining = Math.max(0, debt.amount - paid);
                if (debt.type === 'lent') acc.lent += remaining;
                else acc.owe += remaining;
            }
            return acc;
        }, { lent: 0, owe: 0 });
    }, [debts, debtPaymentsMap]);

    const netBalance = totals.lent - totals.owe;

    const groupedDebts = useMemo(() => {
        const groups: Record<string, {
            personName: string;
            totalLent: number;
            totalOwe: number;
            activeCount: number;
            settledCount: number;
            items: DebtDocType[];
        }> = {};

        filteredDebts.forEach(debt => {
            const personKey = debt.person_name.trim().toLowerCase();

            if (!groups[personKey]) {
                groups[personKey] = {
                    personName: debt.person_name.trim(),
                    totalLent: 0,
                    totalOwe: 0,
                    activeCount: 0,
                    settledCount: 0,
                    items: []
                };
            }

            const pGroup = groups[personKey];
            pGroup.items.push(debt);

            if (debt.status === 'active') {
                const paid = debtPaymentsMap[debt.id]?.totalPaid || 0;
                const remaining = Math.max(0, debt.amount - paid);
                pGroup.activeCount += 1;
                if (debt.type === 'lent') {
                    pGroup.totalLent += remaining;
                } else {
                    pGroup.totalOwe += remaining;
                }
            } else {
                pGroup.settledCount += 1;
            }
        });

        // Sort items within each group by date (descending)
        Object.values(groups).forEach(group => {
            group.items.sort((a, b) => b.created_at - a.created_at);
        });

        // Sort: People with active debts first, then fully settled
        return Object.values(groups).sort((a, b) => {
            const aActive = a.activeCount > 0;
            const bActive = b.activeCount > 0;
            if (aActive && !bActive) return -1;
            if (!aActive && bActive) return 1;
            return a.personName.localeCompare(b.personName);
        });
    }, [filteredDebts, debtPaymentsMap]);

    const handleToggleStatus = async (debt: DebtDocType) => {
        try {
            triggerHaptic('success');
            const doc = await db.debts.findOne(debt.id).exec();
            if (doc) {
                const nextStatus = debt.status === 'active' ? 'settled' : 'active';
                if (nextStatus === 'settled') {
                    await mutate(db.debt_payments, uuidv4(), {
                        debt_id: debt.id, amount: debt.amount, paid_at: Date.now(), note: 'Marked settled',
                    });
                } else {
                    const settlementPayments = await db.debt_payments.find({
                        selector: {
                            debt_id: debt.id,
                            _deleted: false,
                            note: 'Marked settled',
                        }
                    }).exec();
                    await Promise.all(settlementPayments.map(p => softDelete(db.debt_payments, p.id)));
                }
                await mutate(db.debts, debt.id, { status: nextStatus });
                showToast(nextStatus === 'settled' ? 'Debt marked as settled' : 'Debt reactivated', 'success');
            }
        } catch (error) {
            console.error("Failed to update debt status", error);
            showToast("Failed to update debt status", "error");
        }
    };

    const handleDelete = (id: string) => {
        setDebtToDeleteId(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!debtToDeleteId) return;
        try {
            triggerHaptic('medium');
            const relatedPayments = await db.debt_payments.find({
                selector: { debt_id: debtToDeleteId, _deleted: false }
            }).exec();
            await Promise.all(relatedPayments.map(p => softDelete(db.debt_payments, p.id)));
            await softDelete(db.debts, debtToDeleteId);
            showToast("Debt record deleted", "info");
            setIsDeleteModalOpen(false);
            setDebtToDeleteId(null);
        } catch (error) {
            console.error("Failed to delete debt", error);
            showToast("Failed to delete debt", "error");
        }
    };

    const openEditModal = (id: string) => {
        setEditingDebtId(id);
        setIsAddModalOpen(true);
    };

    const closeAddModal = () => {
        setIsAddModalOpen(false);
        setEditingDebtId(undefined);
        setAddModalInitialType("lent");
        setAddModalInitialPurpose("");
        setAddModalInitialPersonName("");
    };

    const toggleExpand = (personName: string) => {
        setExpandedPerson(expandedPerson === personName ? null : personName);
    };

    const handleSimplifyDebt = async (group: { personName: string; totalLent: number; totalOwe: number; items: DebtDocType[] }) => {
        try {
            const offsetAmount = Math.min(group.totalLent, group.totalOwe);
            if (offsetAmount <= 0) return;

            triggerHaptic('success');
            const now = Date.now();

            // 1. Offset owe debts
            let remainingOweOffset = offsetAmount;
            const activeOwe = group.items.filter(d => d.status === 'active' && d.type === 'owe');
            for (const debt of activeOwe) {
                if (remainingOweOffset <= 0) break;
                const paid = debtPaymentsMap[debt.id]?.totalPaid || 0;
                const remaining = Math.max(0, debt.amount - paid);
                const toApply = Math.min(remainingOweOffset, remaining);
                if (toApply > 0) {
                    await mutate(db.debt_payments, uuidv4(), {
                        debt_id: debt.id,
                        amount: toApply,
                        paid_at: now,
                        note: `Mutual debt offset with ${group.personName}`,
                    });
                    remainingOweOffset -= toApply;
                    if (Math.abs(remaining - toApply) < 0.01) {
                        await mutate(db.debts, debt.id, { status: 'settled' });
                    }
                }
            }

            // 2. Offset lent debts
            let remainingLentOffset = offsetAmount;
            const activeLent = group.items.filter(d => d.status === 'active' && d.type === 'lent');
            for (const debt of activeLent) {
                if (remainingLentOffset <= 0) break;
                const paid = debtPaymentsMap[debt.id]?.totalPaid || 0;
                const remaining = Math.max(0, debt.amount - paid);
                const toApply = Math.min(remainingLentOffset, remaining);
                if (toApply > 0) {
                    await mutate(db.debt_payments, uuidv4(), {
                        debt_id: debt.id,
                        amount: toApply,
                        paid_at: now,
                        note: `Mutual debt offset with ${group.personName}`,
                    });
                    remainingLentOffset -= toApply;
                    if (Math.abs(remaining - toApply) < 0.01) {
                        await mutate(db.debts, debt.id, { status: 'settled' });
                    }
                }
            }

            showToast(`Simplified: ${currencySymbol}${offsetAmount.toFixed(2)} offset for ${group.personName}`, 'success');
        } catch (e) {
            console.error("Failed to simplify debts", e);
            showToast("Failed to simplify debts", "error");
        }
    };

    const toggleSettledHistory = (personName: string) => {
        setSettledHistoryPerson(settledHistoryPerson === personName ? null : personName);
    };

    const renderDebtItem = (debt: DebtDocType) => {
        const isLent = debt.type === 'lent';
        const isSettled = debt.status === 'settled';
        const isOverdue = debt.status === 'active' && Boolean(debt.due_date && debt.due_date < Date.now());
        const directionLabel = isLent ? 'They owe you' : 'You owe them';

        const paid = debtPaymentsMap[debt.id]?.totalPaid || 0;
        const remaining = Math.max(0, debt.amount - paid);
        const percentPaid = debt.amount > 0 ? Math.min(100, Math.round((paid / debt.amount) * 100)) : 0;
        const displayAmount = (paid > 0 && !isSettled) ? remaining : debt.amount;
        const formattedAmount = Number.isInteger(displayAmount) ? displayAmount.toLocaleString() : displayAmount.toFixed(2);

        return (
            <div
                key={debt.id}
                onClick={() => openEditModal(debt.id)}
                className="group relative z-10 bg-slate-50 dark:bg-[#141414] hover:bg-slate-100/70 dark:hover:bg-white/[0.04] active:bg-slate-200/50 dark:active:bg-white/[0.08] flex flex-col py-2.5 px-2 rounded-xl transition-colors cursor-pointer select-none"
            >
                <div className="flex items-center gap-3.5 w-full">
                    {/* Circular Avatar matching Homepage Transactions */}
                    <div className={clsx(
                        "w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                        isSettled
                            ? "bg-slate-200/80 dark:bg-white/10 text-slate-500 dark:text-[#C4C7C5]"
                            : isLent
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-[#6DD58C]"
                            : "bg-rose-500/15 text-rose-600 dark:text-[#F2B8B5]"
                    )}>
                        <span className="material-symbols-outlined text-[20px]">
                            {isSettled ? 'check' : isLent ? 'arrow_downward' : 'arrow_upward'}
                        </span>
                    </div>

                    {/* Title and Subtitle Info */}
                    <div className="flex-1 min-w-0">
                        <p className={clsx(
                            "text-[15.5px] sm:text-[16px] font-normal truncate leading-tight",
                            isSettled ? "text-slate-400 dark:text-zinc-500 line-through" : "text-slate-900 dark:text-[#E3E3E3]"
                        )}>
                            {debt.purpose || t('purpose')}
                        </p>
                        <p className="text-[13px] sm:text-[13.5px] font-normal text-slate-500 dark:text-[#C4C7C5] truncate mt-1 leading-normal">
                            <span>{directionLabel}</span>
                            {debt.due_date && (
                                <span className={clsx(isOverdue && "text-rose-600 dark:text-[#F2B8B5] font-medium")}>
                                    {` • `}{isOverdue ? 'Overdue' : `Due ${new Date(debt.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                                </span>
                            )}
                        </p>
                    </div>

                    {/* Amount & Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                            <p
                                title={formatFullCurrency(isLent ? displayAmount : -displayAmount, currencySymbol, true)}
                                className={clsx(
                                    "text-[16px] sm:text-[17px] font-normal tabular-nums whitespace-nowrap privacy-mask",
                                    isPrivacyMode && "privacy-blur",
                                    isSettled
                                        ? "text-slate-400 dark:text-[#C4C7C5] line-through"
                                        : isLent
                                        ? "text-emerald-600 dark:text-[#6DD58C]"
                                        : "text-rose-600 dark:text-[#F2B8B5]"
                                )}
                            >
                                {isSettled
                                    ? `${currencySymbol}${formattedAmount}`
                                    : isLent
                                    ? `+ ${currencySymbol}${formattedAmount}`
                                    : `- ${currencySymbol}${formattedAmount}`
                                }
                            </p>
                            {paid > 0 && !isSettled && (
                                <span className={clsx("text-[11px] font-normal text-slate-500 dark:text-[#C4C7C5] block tabular-nums privacy-mask", isPrivacyMode && "privacy-blur")}>
                                    of {currencySymbol}{Number.isInteger(debt.amount) ? debt.amount.toLocaleString() : debt.amount.toFixed(2)}
                                </span>
                            )}
                        </div>

                        {/* Inline Actions */}
                        <div className="flex items-center gap-0.5 shrink-0">
                            {!isSettled && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        triggerHaptic('light');
                                        setPaymentModalDebt(debt);
                                        setPaymentAmount(remaining.toString());
                                        setPaymentNote("");
                                    }}
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-sky-600 dark:text-[#78D9EC] hover:bg-sky-500/15 active:scale-90 transition-all cursor-pointer"
                                    title="Record Partial Payment"
                                    aria-label="Record Partial Payment"
                                >
                                    <span className="material-symbols-outlined text-[17px]">payments</span>
                                </button>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); handleToggleStatus(debt); }}
                                className={clsx(
                                    "w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer",
                                    isSettled
                                        ? "text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10"
                                        : "text-emerald-600 dark:text-[#6DD58C] hover:bg-emerald-500/15"
                                )}
                                title={isSettled ? "Reactivate Debt" : "Mark as Settled"}
                                aria-label={isSettled ? "Reactivate Debt" : "Mark as Settled"}
                            >
                                <span className="material-symbols-outlined text-[17px]">{isSettled ? 'undo' : 'check'}</span>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(debt.id); }}
                                className="w-8 h-8 rounded-full text-slate-400 hover:text-rose-600 dark:text-zinc-500 dark:hover:text-[#F2B8B5] hover:bg-rose-500/10 flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                                title="Delete Debt"
                                aria-label="Delete Debt"
                            >
                                <span className="material-symbols-outlined text-[17px]">delete</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Partial Repayment Progress Bar */}
                {paid > 0 && !isSettled && (
                    <div className="w-full pt-2 mt-1 border-t border-slate-200/60 dark:border-white/5">
                        <div className="flex items-center justify-between text-[11px] font-normal text-slate-500 dark:text-[#C4C7C5] mb-1">
                            <span className={clsx("privacy-mask", isPrivacyMode && "privacy-blur")}>Paid: {formatCompactCurrency(paid, currencySymbol, 1000)} ({percentPaid}%)</span>
                            <span className={clsx("privacy-mask", isPrivacyMode && "privacy-blur")}>Left: {formatCompactCurrency(remaining, currencySymbol, 1000)}</span>
                        </div>
                        <div className="w-full h-1 bg-slate-200/80 dark:bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 dark:bg-[#6DD58C] rounded-full transition-all duration-300"
                                style={{ width: `${percentPaid}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <main className="flex-1 min-h-[100dvh] !bg-slate-50 dark:!bg-[#141414] max-w-md mx-auto w-full pb-28 sm:pb-32 flex flex-col overflow-y-auto m3-scrollable">
            {/* ── 1. Hero Section with Scenery Background (Same Depth & Rhythm as Homepage) ── */}
            <div className="relative shrink-0 overflow-hidden bg-gradient-to-b from-[#BAE6FD]/40 via-[#E0F2FE]/60 to-[#F0F9FF] dark:from-[#070B0E] dark:via-[#0A0E12] dark:to-[#141414] text-slate-900 dark:text-white min-h-[280px] sm:min-h-[305px] flex flex-col justify-start">
                <DebtHeroScenery />

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
                                            {DEBT_TICKER_PROMPTS[tickerIndex]}
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

                {/* Net Debt Position & Right-Shifted Tag */}
                <div className="relative z-10 px-5 sm:px-6 pt-2 sm:pt-3.5 pb-4 flex flex-col items-start text-left">
                    <div className="flex items-center justify-between w-full">
                        <span className="text-[11px] sm:text-[12px] font-semibold text-slate-600 dark:text-slate-300/85 tracking-wider uppercase drop-shadow-xs">
                            Net Position
                        </span>

                        <div className={clsx(
                            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/80 dark:bg-black/60 backdrop-blur-md border border-slate-200/90 dark:border-white/15 text-[11px] font-semibold shadow-xs mt-1 sm:mt-1.5 privacy-mask",
                            isPrivacyMode && "privacy-blur"
                        )}>
                            <span className={clsx(
                                "material-symbols-outlined text-[13px]",
                                netBalance >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"
                            )}>
                                {netBalance >= 0 ? "trending_up" : "trending_down"}
                            </span>
                            <span className={clsx(
                                "font-bold tabular-nums text-[11px]",
                                netBalance >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"
                            )}>
                                {netBalance >= 0 ? "You're Owed" : "You Owe"}
                            </span>
                        </div>
                    </div>

                    <h1
                        title={formatFullCurrency(netBalance, currencySymbol, true)}
                        className={clsx(
                            "text-[36px] sm:text-[40px] font-semibold tracking-tight text-slate-900 dark:text-white leading-tight my-0.5 m3-tabular-nums cursor-default privacy-mask drop-shadow-sm",
                            isPrivacyMode && "privacy-blur"
                        )}
                    >
                        {netBalance === 0 ? `${currencySymbol}0.00` : formatCompactCurrency(netBalance, currencySymbol, 1000, true)}
                    </h1>
                </div>
            </div>
                
                {/* ── 2. Symmetrical Action Row (Matching Homepage Style & Spacing) ── */}
                <div className="flex items-center justify-between w-full px-5 sm:px-6 pt-3.5 pb-4 shrink-0">
                    {/* 1. I Lent */}
                    <div className="flex flex-col items-center gap-1.5">
                        <button
                            onClick={() => {
                                setAddModalInitialPersonName("");
                                setAddModalInitialType("lent");
                                setAddModalInitialPurpose("");
                                setIsAddModalOpen(true);
                            }}
                            className="w-14 h-14 rounded-[18px] bg-white dark:bg-[#0842A0] border border-slate-200/90 dark:border-transparent hover:bg-slate-50 dark:hover:bg-[#0b4fc0] active:scale-95 transition-all shadow-xs flex items-center justify-center group cursor-pointer"
                            aria-label="I Lent"
                        >
                            <span className="material-symbols-outlined text-[24px] text-emerald-600 dark:text-[#D3E3FD] transition-transform group-hover:scale-110">arrow_downward</span>
                        </button>
                        <span className="text-[13px] font-semibold text-slate-700 dark:text-[#E3E3E3] text-center leading-tight">
                            I<br />Lent
                        </span>
                    </div>

                    {/* 2. I Borrowed */}
                    <div className="flex flex-col items-center gap-1.5">
                        <button
                            onClick={() => {
                                setAddModalInitialPersonName("");
                                setAddModalInitialType("owe");
                                setAddModalInitialPurpose("");
                                setIsAddModalOpen(true);
                            }}
                            className="w-14 h-14 rounded-[18px] bg-white dark:bg-[#0842A0] border border-slate-200/90 dark:border-transparent hover:bg-slate-50 dark:hover:bg-[#0b4fc0] active:scale-95 transition-all shadow-xs flex items-center justify-center group cursor-pointer"
                            aria-label="I Borrowed"
                        >
                            <span className="material-symbols-outlined text-[24px] text-rose-500 dark:text-[#D3E3FD] transition-transform group-hover:scale-110">arrow_upward</span>
                        </button>
                        <span className="text-[13px] font-semibold text-slate-700 dark:text-[#E3E3E3] text-center leading-tight">
                            I<br />Borrowed
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

                    {/* 4. New Debt */}
                    <div className="flex flex-col items-center gap-1.5">
                        <button
                            onClick={() => {
                                setAddModalInitialPersonName("");
                                setAddModalInitialType("lent");
                                setAddModalInitialPurpose("");
                                setIsAddModalOpen(true);
                            }}
                            className="w-14 h-14 rounded-[18px] bg-white dark:bg-[#0842A0] border border-slate-200/90 dark:border-transparent hover:bg-slate-50 dark:hover:bg-[#0b4fc0] active:scale-95 transition-all shadow-xs flex items-center justify-center group cursor-pointer"
                            aria-label="New Debt"
                        >
                            <span className="material-symbols-outlined text-[24px] text-amber-600 dark:text-[#D3E3FD] transition-transform group-hover:scale-110">add</span>
                        </button>
                        <span className="text-[13px] font-semibold text-slate-700 dark:text-[#E3E3E3] text-center leading-tight">
                            New<br />Debt
                        </span>
                    </div>
                </div>

                {/* ── 3. Telemetry Breakdown (You've Lent & You Owe) ── */}
                <section className="px-5 sm:px-6 pt-1 pb-4 shrink-0">
                    <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-white dark:bg-[#1E2020] border border-slate-200/80 dark:border-white/10 shadow-xs">
                        {/* Lent Metric */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-500/30 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-[20px]">arrow_downward</span>
                            </div>
                            <div className="min-w-0">
                                <span className="text-[10.5px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block leading-tight">
                                    {"You've Lent"}
                                </span>
                                <span
                                    title={formatFullCurrency(totals.lent, currencySymbol)}
                                    className={clsx(
                                        "text-[16px] font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums block leading-snug truncate privacy-mask",
                                        isPrivacyMode && "privacy-blur"
                                    )}
                                >
                                    {formatCompactCurrency(totals.lent, currencySymbol, 1000)}
                                </span>
                            </div>
                        </div>

                        {/* Owe Metric */}
                        <div className="flex items-center gap-3 border-l border-slate-200/80 dark:border-white/10 pl-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-200/80 dark:border-rose-500/30 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
                            </div>
                            <div className="min-w-0">
                                <span className="text-[10.5px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block leading-tight">
                                    You Owe
                                </span>
                                <span
                                    title={formatFullCurrency(totals.owe, currencySymbol)}
                                    className={clsx(
                                        "text-[16px] font-extrabold text-rose-700 dark:text-rose-400 tabular-nums block leading-snug truncate privacy-mask",
                                        isPrivacyMode && "privacy-blur"
                                    )}
                                >
                                    {formatCompactCurrency(totals.owe, currencySymbol, 1000)}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── 4. Debts Heading Section (matching homepage Recent Transactions) ── */}
                <div className="flex items-center justify-between mb-2 px-5 sm:px-6 shrink-0 mt-2 sm:mt-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-[18px] sm:text-[19px] font-normal tracking-tight text-slate-900 dark:text-[#E3E3E3]">
                            {t('debts') || 'Debts'}
                        </h2>
                        {groupedDebts.length > 0 && (
                            <span className="text-[12px] font-normal px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-[#C4C7C5]">
                                {groupedDebts.length}
                            </span>
                        )}
                    </div>
                    {debts.length > 0 && (
                        <span className="text-[13px] sm:text-[13.5px] font-normal text-slate-500 dark:text-[#C4C7C5]">
                            {debts.filter(d => d.status === 'active').length} active
                        </span>
                    )}
                </div>

                {/* ── 5. Refined Debt Entries List ── */}
                <section className="px-5 sm:px-6 pb-12 flex flex-col flex-1">
                {groupedDebts.length === 0 ? (
                    <div className="flex-1 min-h-full flex flex-col items-center justify-center py-6 px-4 text-center my-auto">
                        {/* Prominent High-Contrast Icon Container */}
                        <div className="w-16 h-16 rounded-full bg-slate-200/80 dark:bg-zinc-800 flex items-center justify-center mb-3 text-slate-500 dark:text-zinc-400">
                            <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                                handshake
                            </span>
                        </div>

                        <p className="text-base font-normal text-slate-800 dark:text-[#E3E3E3]">
                            {searchQuery ? "No Matching Debts Found" : "No Debts Logged"}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-[#C4C7C5] font-normal mt-0.5 mb-6">
                            {searchQuery
                                ? `No debts match "${searchQuery}". Try a different search.`
                                : "Tap a quick action to log money lent or borrowed"}
                        </p>

                        {!searchQuery ? (
                            <div className="grid grid-cols-2 gap-3.5 max-w-sm w-full mx-auto">
                                <button
                                    onClick={() => {
                                        setAddModalInitialPersonName("");
                                        setAddModalInitialType("lent");
                                        setAddModalInitialPurpose("");
                                        setIsAddModalOpen(true);
                                    }}
                                    className="flex items-center gap-3 p-1.5 pr-4 pl-1.5 rounded-full bg-white dark:bg-[#1E2020] border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-[#282A2A] active:scale-95 transition-all text-left shadow-xs group cursor-pointer"
                                >
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 shadow-2xs group-hover:scale-105 transition-transform">
                                        <span className="material-symbols-outlined text-[24px] font-bold">arrow_downward</span>
                                    </div>
                                    <div className="truncate">
                                        <span className="text-[13.5px] font-bold text-slate-900 dark:text-[#E3E3E3] block truncate leading-tight">I Lent</span>
                                        <span className="text-[11px] font-medium text-slate-500 dark:text-[#C4C7C5] block truncate">Money given</span>
                                    </div>
                                </button>

                                <button
                                    onClick={() => {
                                        setAddModalInitialPersonName("");
                                        setAddModalInitialType("owe");
                                        setAddModalInitialPurpose("");
                                        setIsAddModalOpen(true);
                                    }}
                                    className="flex items-center gap-3 p-1.5 pr-4 pl-1.5 rounded-full bg-white dark:bg-[#1E2020] border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-[#282A2A] active:scale-95 transition-all text-left shadow-xs group cursor-pointer"
                                >
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 shadow-2xs group-hover:scale-105 transition-transform">
                                        <span className="material-symbols-outlined text-[24px] font-bold">arrow_upward</span>
                                    </div>
                                    <div className="truncate">
                                        <span className="text-[13.5px] font-bold text-slate-900 dark:text-[#E3E3E3] block truncate leading-tight">I Borrowed</span>
                                        <span className="text-[11px] font-medium text-slate-500 dark:text-[#C4C7C5] block truncate">Money taken</span>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setIsSplitBillOpen(true)}
                                    className="flex items-center gap-3 p-1.5 pr-4 pl-1.5 rounded-full bg-white dark:bg-[#1E2020] border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-[#282A2A] active:scale-95 transition-all text-left shadow-xs group cursor-pointer"
                                >
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400 shadow-2xs group-hover:scale-105 transition-transform">
                                        <span className="material-symbols-outlined text-[24px] font-bold">receipt_long</span>
                                    </div>
                                    <div className="truncate">
                                        <span className="text-[13.5px] font-bold text-slate-900 dark:text-[#E3E3E3] block truncate leading-tight">Split Bill</span>
                                        <span className="text-[11px] font-medium text-slate-500 dark:text-[#C4C7C5] block truncate">Shared cost</span>
                                    </div>
                                </button>

                                <button
                                    onClick={() => {
                                        setAddModalInitialPersonName("");
                                        setAddModalInitialType("lent");
                                        setAddModalInitialPurpose("Personal Loan");
                                        setIsAddModalOpen(true);
                                    }}
                                    className="flex items-center gap-3 p-1.5 pr-4 pl-1.5 rounded-full bg-white dark:bg-[#1E2020] border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-[#282A2A] active:scale-95 transition-all text-left shadow-xs group cursor-pointer"
                                >
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-400 shadow-2xs group-hover:scale-105 transition-transform">
                                        <span className="material-symbols-outlined text-[24px] font-bold">handshake</span>
                                    </div>
                                    <div className="truncate">
                                        <span className="text-[13.5px] font-bold text-slate-900 dark:text-[#E3E3E3] block truncate leading-tight">Personal</span>
                                        <span className="text-[11px] font-medium text-slate-500 dark:text-[#C4C7C5] block truncate">Friend loan</span>
                                    </div>
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full bg-slate-900 dark:bg-white text-white dark:text-zinc-950 hover:bg-slate-800 dark:hover:bg-zinc-200 active:scale-95 transition-all text-xs font-semibold shadow-xs mt-2"
                            >
                                Clear Search
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-1 w-full">
                        {groupedDebts.map((group) => {
                            const isExpanded = expandedPerson === group.personName;
                            const personNet = group.totalLent - group.totalOwe;
                            const isOwed = personNet > 0;
                            const isOwing = personNet < 0;
                            const isAllSettled = group.activeCount === 0;

                            const recordSubtitle = group.activeCount > 0
                                ? `${group.activeCount} ${group.activeCount === 1 ? 'record' : 'records'}`
                                : `${group.settledCount} settled`;

                            const avatarStyle = getAvatarStyle(group.personName);

                            return (
                                <div
                                    key={group.personName}
                                    className="transition-colors overflow-hidden"
                                >
                                    {/* Person Row (matching Homepage Recent Transactions) */}
                                    <div
                                        onClick={() => toggleExpand(group.personName)}
                                        className="group relative z-10 bg-slate-50 dark:bg-[#141414] flex items-center gap-4 py-3 px-1.5 hover:bg-slate-100/70 dark:hover:bg-white/[0.04] active:bg-slate-200/50 dark:active:bg-white/[0.08] transition-colors cursor-pointer select-none rounded-xl"
                                    >
                                        {/* Avatar (matching Homepage Avatars) */}
                                        <div
                                            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                                            style={{
                                                backgroundColor: avatarStyle.bg,
                                                color: avatarStyle.text,
                                            }}
                                        >
                                            <span className="text-[20px] font-normal leading-none select-none">
                                                {group.personName.trim().charAt(0).toUpperCase()}
                                            </span>
                                        </div>

                                        {/* Name & Subtitle Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[15.5px] sm:text-[16px] font-normal text-slate-900 dark:text-[#E3E3E3] truncate leading-tight">
                                                {group.personName}
                                            </p>
                                            <p className="text-[13px] sm:text-[13.5px] font-normal text-slate-500 dark:text-[#C4C7C5] truncate mt-1 leading-normal">
                                                {recordSubtitle} • {isOwed ? "Owes you" : isOwing ? "You owe" : "All settled"}
                                            </p>
                                        </div>

                                        {/* Net Amount & Chevron */}
                                        <div className="flex items-center gap-2.5 text-right shrink-0">
                                            <p
                                                title={formatFullCurrency(personNet, currencySymbol, true)}
                                                className={clsx(
                                                    "text-[16px] sm:text-[17px] font-normal tabular-nums whitespace-nowrap privacy-mask",
                                                    isPrivacyMode && "privacy-blur",
                                                    isAllSettled
                                                        ? "text-slate-500 dark:text-[#C4C7C5]"
                                                        : isOwed
                                                        ? "text-emerald-600 dark:text-[#6DD58C]"
                                                        : "text-rose-600 dark:text-[#F2B8B5]"
                                                )}
                                            >
                                                {isAllSettled
                                                    ? "Settled"
                                                    : isOwed
                                                    ? `+ ${currencySymbol}${formatCompactCurrency(Math.abs(personNet), currencySymbol, 1000).replace(currencySymbol, '')}`
                                                    : `- ${currencySymbol}${formatCompactCurrency(Math.abs(personNet), currencySymbol, 1000).replace(currencySymbol, '')}`
                                                }
                                            </p>
                                            <span className={clsx(
                                                "material-symbols-outlined text-[20px] text-slate-400 dark:text-[#C4C7C5] transition-transform duration-200",
                                                isExpanded && "rotate-180"
                                            )}>
                                                expand_more
                                            </span>
                                        </div>
                                    </div>

                                    {/* Expanded History Drawer */}
                                    <div
                                        className={clsx(
                                            "grid transition-[grid-template-rows] duration-200 ease-out",
                                            isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                                        )}
                                    >
                                        <div className="overflow-hidden pl-2 sm:pl-4 pr-0.5 py-1">
                                            <div className="bg-slate-100/70 dark:bg-white/[0.03] rounded-2xl p-2.5 sm:p-3 space-y-2 border border-slate-200/60 dark:border-white/5 my-0.5">
                                                {/* Drawer Subheader with Quick-Add */}
                                                <div className="flex items-center justify-between pb-0.5 px-1.5 gap-2">
                                                    <span className="text-[13px] font-normal text-slate-500 dark:text-[#C4C7C5]">
                                                        History with {group.personName}
                                                    </span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setAddModalInitialPersonName(group.personName);
                                                            setAddModalInitialType("lent");
                                                            setAddModalInitialPurpose("");
                                                            setIsAddModalOpen(true);
                                                        }}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white dark:bg-white/10 hover:bg-slate-50 dark:hover:bg-white/15 active:scale-95 text-slate-800 dark:text-[#E3E3E3] text-[12px] font-normal border border-slate-200/80 dark:border-white/10 shadow-2xs transition-all shrink-0 cursor-pointer"
                                                    >
                                                        <span className="material-symbols-outlined text-[15px]">add</span>
                                                        <span className="truncate max-w-[120px] sm:max-w-none">Add</span>
                                                    </button>
                                                </div>

                                                {/* Circular Debt Simplification Banner */}
                                                {group.totalLent > 0 && group.totalOwe > 0 && (
                                                    <div className="px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                                                <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                                                            </div>
                                                            <div className="truncate">
                                                                <span className={clsx("text-[13px] font-medium text-slate-900 dark:text-[#E3E3E3] block truncate privacy-mask", isPrivacyMode && "privacy-blur")}>
                                                                    Mutual Debts: Offset {currencySymbol}{Math.min(group.totalLent, group.totalOwe).toFixed(2)}
                                                                </span>
                                                                <span className={clsx("text-[11.5px] text-slate-500 dark:text-[#C4C7C5] block truncate privacy-mask", isPrivacyMode && "privacy-blur")}>
                                                                    {personNet > 0
                                                                        ? `${group.personName} pays you ${currencySymbol}${personNet.toFixed(2)} net`
                                                                        : `You pay ${group.personName} ${currencySymbol}${Math.abs(personNet).toFixed(2)} net`
                                                                    }
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleSimplifyDebt(group);
                                                            }}
                                                            className="px-3 py-1 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11.5px] active:scale-95 transition-all shadow-xs shrink-0 cursor-pointer"
                                                        >
                                                            Simplify
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Active and Settled Records */}
                                                {(() => {
                                                    const activeSections = getDebtDateSections(group.items.filter((debt) => debt.status === 'active'));
                                                    const settledSections = getDebtDateSections(group.items.filter((debt) => debt.status === 'settled'));
                                                    const isSettledHistoryOpen = settledHistoryPerson === group.personName;

                                                    return (
                                                        <>
                                                            {activeSections.length > 0 && (
                                                                <div className="space-y-1.5 pt-0.5">
                                                                    <div className="flex items-center justify-between px-1.5">
                                                                        <span className="text-[12px] font-normal text-slate-500 dark:text-[#C4C7C5]">
                                                                            Active
                                                                        </span>
                                                                    </div>
                                                                    {activeSections.map((section) => (
                                                                        <div key={section.key} className="space-y-1">
                                                                            <h5 className="px-1.5 text-[11.5px] font-normal text-slate-400 dark:text-zinc-500">{section.label}</h5>
                                                                            <div className="space-y-1">
                                                                                {section.items.map(renderDebtItem)}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {settledSections.length > 0 && (
                                                                <div className={clsx(activeSections.length > 0 && "border-t border-slate-200/60 dark:border-white/5 pt-2")}>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); toggleSettledHistory(group.personName); }}
                                                                        className="w-full px-1.5 py-1 flex items-center justify-between text-left cursor-pointer hover:bg-slate-200/40 dark:hover:bg-white/[0.03] rounded-lg transition-colors"
                                                                        aria-expanded={isSettledHistoryOpen}
                                                                    >
                                                                        <span className="text-[12px] font-normal text-slate-500 dark:text-[#C4C7C5]">
                                                                            Settled history ({group.settledCount})
                                                                        </span>
                                                                        <span className={clsx(
                                                                            "material-symbols-outlined text-[18px] text-slate-400 dark:text-[#C4C7C5] transition-transform",
                                                                            isSettledHistoryOpen && "rotate-180"
                                                                        )}>expand_more</span>
                                                                    </button>
                                                                    {isSettledHistoryOpen && (
                                                                        <div className="mt-1 space-y-2">
                                                                            {settledSections.map((section) => (
                                                                                <div key={section.key} className="space-y-1">
                                                                                    <h5 className="px-1.5 text-[11.5px] font-normal text-slate-400 dark:text-zinc-500">{section.label}</h5>
                                                                                    <div className="space-y-1">
                                                                                        {section.items.map(renderDebtItem)}
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            <AddDebtModal
                isOpen={isAddModalOpen}
                onClose={closeAddModal}
                debtId={editingDebtId}
                initialType={addModalInitialType}
                initialPurpose={addModalInitialPurpose}
                initialPersonName={addModalInitialPersonName}
            />

            <ActionModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Debt?"
                description="Are you sure you want to delete this debt? This action cannot be undone."
                confirmLabel="Delete"
                confirmVariant="danger"
                onConfirm={confirmDelete}
            />

            {/* Record Repayment Modal */}
            <ActionModal
                isOpen={Boolean(paymentModalDebt)}
                onClose={() => setPaymentModalDebt(null)}
                title="Record Repayment"
                subtitle={paymentModalDebt ? `${paymentModalDebt.type === 'lent' ? 'Received from' : 'Paid to'} ${paymentModalDebt.person_name}` : undefined}
                confirmLabel="Record Payment"
                confirmVariant="primary"
                isConfirmLoading={isSavingPayment}
                onConfirm={async () => {
                    if (!paymentModalDebt) return;
                    const evalAmt = evaluateMathExpression(paymentAmount) ?? parseFloat(paymentAmount);
                    if (isNaN(evalAmt) || evalAmt <= 0) {
                        showToast("Enter a valid payment amount", "error");
                        return;
                    }
                    setIsSavingPayment(true);
                    try {
                        triggerHaptic('success');
                        await mutate(db.debt_payments, uuidv4(), {
                            debt_id: paymentModalDebt.id,
                            amount: evalAmt,
                            paid_at: Date.now(),
                            note: paymentNote.trim() || 'Partial payment',
                        });
                        const currentPaid = (debtPaymentsMap[paymentModalDebt.id]?.totalPaid || 0) + evalAmt;
                        if (currentPaid >= paymentModalDebt.amount) {
                            await mutate(db.debts, paymentModalDebt.id, { status: 'settled' });
                            showToast("Debt marked as fully settled!", "success");
                        } else {
                            showToast(`Payment of ${formatFullCurrency(evalAmt, currencySymbol)} recorded`, "success");
                        }
                        setPaymentModalDebt(null);
                        setPaymentAmount("");
                        setPaymentNote("");
                    } catch (err) {
                        console.error(err);
                        showToast("Failed to record payment", "error");
                    } finally {
                        setIsSavingPayment(false);
                    }
                }}
            >
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                            Repayment Amount ({currencySymbol})
                        </label>
                        <input
                            autoFocus
                            type="text"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        {paymentModalDebt && (
                            <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 mt-1">
                                Remaining balance: <span className={clsx("privacy-mask", isPrivacyMode && "privacy-blur")}>{formatFullCurrency(Math.max(0, paymentModalDebt.amount - (debtPaymentsMap[paymentModalDebt.id]?.totalPaid || 0)), currencySymbol)}</span>
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                            Payment Note (Optional)
                        </label>
                        <input
                            type="text"
                            value={paymentNote}
                            onChange={(e) => setPaymentNote(e.target.value)}
                            placeholder="e.g. Venmo, Cash, Bank Transfer"
                            className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>
            </ActionModal>
        </main>
    );
}
