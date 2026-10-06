"use client";

import { useState, useEffect, useMemo, useCallback, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDatabase } from "@/db/DatabaseProvider";
import { useAppStore } from "@/store/appStore";
import { DebtDocType, CategoryDocType } from "@/db/schema";
import { mutate } from "@/sync/mutate";
import { v4 as uuidv4 } from "uuid";
import clsx from "clsx";
import PriceInput from "@/components/PriceInput";
import CustomSelect from "@/components/CustomSelect";
import { formatCompactCurrency, formatFullCurrency } from "@/utils/currency";
import { triggerHaptic } from "@/utils/haptics";
import { evaluateMathExpression } from "@/utils/mathEval";

interface SplitBillModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Participant {
    id: string;
    name: string;
    customAmount: string;
    shares?: number;
}

export default function SplitBillModal({ isOpen, onClose }: SplitBillModalProps) {
    const db = useDatabase();
    const { activeProfileId, showToast, currency } = useAppStore();
    const currencySymbol = currency?.symbol || '$';

    const [totalAmount, setTotalAmount] = useState("");
    const [description, setDescription] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState("");
    const [includeMyShare, setIncludeMyShare] = useState(true);
    const [recordMyExpense, setRecordMyExpense] = useState(true);
    const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");
    const [customType, setCustomType] = useState<"fixed" | "shares">("fixed");
    const [myShares, setMyShares] = useState(1);
    const [isReady, setIsReady] = useState(false);

    // Auto-focus and validation tracking
    const [focusTargetId, setFocusTargetId] = useState<string | null>(null);
    const [showValidationErrors, setShowValidationErrors] = useState(false);

    // Initial participants: 2 friends
    const [friends, setFriends] = useState<Participant[]>([
        { id: "1", name: "", customAmount: "", shares: 1 },
        { id: "2", name: "", customAmount: "", shares: 1 },
    ]);

    const [existingDebts, setExistingDebts] = useState<DebtDocType[]>([]);
    const [categories, setCategories] = useState<CategoryDocType[]>([]);

    useEffect(() => {
        if (!isOpen) {
            setIsReady(false);
            return;
        }

        // Fetch debts for autocomplete and quick-add chips
        const debtsSub = db.debts
            .find({ selector: { _deleted: false } })
            .$
            .subscribe((docs) => {
                setExistingDebts(docs.map((d) => d.toJSON() as DebtDocType));
            });

        // Fetch categories for active profile
        const catsSub = db.categories
            .find({ selector: { profile_id: activeProfileId, _deleted: false } })
            .$
            .subscribe((docs) => {
                const list = docs.map((d) => d.toJSON() as CategoryDocType);
                setCategories(list);
                if (list.length > 0 && !selectedCategoryId) {
                    const foodCat = list.find((c) =>
                        c.name.toLowerCase().includes("food") ||
                        c.name.toLowerCase().includes("drink") ||
                        c.name.toLowerCase().includes("dining")
                    );
                    setSelectedCategoryId(foodCat ? foodCat.id : list[0].id);
                }
            });

        return () => {
            debtsSub.unsubscribe();
            catsSub.unsubscribe();
        };
    }, [isOpen, db, activeProfileId, selectedCategoryId]);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setTotalAmount("");
            setDescription("");
            setIncludeMyShare(true);
            setRecordMyExpense(true);
            setSplitMode("equal");
            setCustomType("fixed");
            setMyShares(1);
            setShowValidationErrors(false);
            setFocusTargetId(null);
            setFriends([
                { id: uuidv4(), name: "", customAmount: "", shares: 1 },
                { id: uuidv4(), name: "", customAmount: "", shares: 1 },
            ]);
        }
    }, [isOpen]);

    // Unique past names
    const pastPeople = useMemo(() => {
        const names = new Set<string>();
        existingDebts.forEach((d) => {
            if (d.person_name && d.person_name.trim()) {
                names.add(d.person_name.trim());
            }
        });
        return Array.from(names);
    }, [existingDebts]);

    // Recent unadded names
    const unaddedRecentPeople = useMemo(() => {
        const addedNames = new Set(friends.map((f) => f.name.trim().toLowerCase()));
        return pastPeople.filter((p) => !addedNames.has(p.toLowerCase())).slice(0, 5);
    }, [pastPeople, friends]);

    // Financial calculations
    const parsedTotal = useMemo(() => {
        return evaluateMathExpression(totalAmount) ?? (parseFloat(totalAmount) || 0);
    }, [totalAmount]);
    const totalPeopleCount = (includeMyShare ? 1 : 0) + friends.length;

    // Equal Split Calculation
    const equalShare = useMemo(() => {
        if (parsedTotal <= 0 || totalPeopleCount <= 0) return 0;
        return Math.round((parsedTotal / totalPeopleCount) * 100) / 100;
    }, [parsedTotal, totalPeopleCount]);

    // Shares Calculations
    const totalSharesCount = useMemo(() => {
        const friendsSharesTotal = friends.reduce((sum, f) => sum + (f.shares || 1), 0);
        return friendsSharesTotal + (includeMyShare ? (myShares || 1) : 0);
    }, [friends, includeMyShare, myShares]);

    const perShareCost = useMemo(() => {
        if (parsedTotal <= 0 || totalSharesCount <= 0) return 0;
        return parsedTotal / totalSharesCount;
    }, [parsedTotal, totalSharesCount]);

    const getFriendShareAmount = useCallback((friend: Participant) => {
        return Math.round(perShareCost * (friend.shares || 1) * 100) / 100;
    }, [perShareCost]);

    // Custom Fixed Amount Balance Calculations
    const customAssignedTotal = useMemo(() => {
        return friends.reduce((sum, f) => {
            const val = evaluateMathExpression(f.customAmount) ?? (parseFloat(f.customAmount) || 0);
            return sum + val;
        }, 0);
    }, [friends]);

    const customDifference = Math.round((parsedTotal - customAssignedTotal) * 100) / 100;

    // Derived Net Financial Outcomes
    const { myShare, totalToCollect } = useMemo(() => {
        if (splitMode === "equal") {
            const userPart = includeMyShare ? equalShare : 0;
            const friendsPart = equalShare * friends.length;
            return {
                myShare: userPart,
                totalToCollect: friendsPart,
            };
        } else if (customType === "shares") {
            const userPart = includeMyShare ? Math.round(perShareCost * (myShares || 1) * 100) / 100 : 0;
            let friendsSum = 0;
            friends.forEach((f) => {
                friendsSum += getFriendShareAmount(f);
            });
            return {
                myShare: userPart,
                totalToCollect: friendsSum,
            };
        } else {
            let collected = 0;
            friends.forEach((f) => {
                collected += parseFloat(f.customAmount) || 0;
            });
            const userPart = Math.max(0, parsedTotal - collected);
            return {
                myShare: userPart,
                totalToCollect: collected,
            };
        }
    }, [splitMode, customType, includeMyShare, equalShare, friends, parsedTotal, perShareCost, myShares, getFriendShareAmount]);

    // Auto-fill Remaining in Custom Fixed Mode
    const autoFillRemaining = () => {
        if (customDifference <= 0) return;
        const targetIndex = friends.findIndex((f) => !f.customAmount || parseFloat(f.customAmount) === 0);
        const indexToFill = targetIndex !== -1 ? targetIndex : friends.length - 1;
        const updated = [...friends];
        const currentVal = parseFloat(updated[indexToFill].customAmount) || 0;
        updated[indexToFill] = {
            ...updated[indexToFill],
            customAmount: (currentVal + customDifference).toFixed(2),
        };
        setFriends(updated);
    };

    const addFriendRow = () => {
        triggerHaptic('light');
        const newId = uuidv4();
        setFriends([...friends, { id: newId, name: "", customAmount: "", shares: 1 }]);
        setFocusTargetId(newId);
    };

    const addFriendWithName = (name: string) => {
        triggerHaptic('light');
        const emptyIndex = friends.findIndex((f) => !f.name.trim());
        if (emptyIndex !== -1) {
            const updated = [...friends];
            updated[emptyIndex].name = name;
            setFriends(updated);
        } else {
            const newId = uuidv4();
            setFriends([...friends, { id: newId, name, customAmount: "", shares: 1 }]);
        }
    };

    const removeFriendRow = (id: string) => {
        if (friends.length <= 1) return;
        triggerHaptic('light');
        setFriends(friends.filter((f) => f.id !== id));
    };

    const updateFriendName = (id: string, name: string) => {
        setFriends(friends.map((f) => (f.id === id ? { ...f, name } : f)));
    };

    const updateFriendCustomAmount = (id: string, customAmount: string) => {
        setFriends(friends.map((f) => (f.id === id ? { ...f, customAmount } : f)));
    };

    const updateFriendShares = (id: string, delta: number) => {
        triggerHaptic('light');
        setFriends(friends.map((f) => {
            if (f.id === id) {
                const current = f.shares || 1;
                const next = Math.max(0.5, Math.min(10, current + delta));
                return { ...f, shares: next };
            }
            return f;
        }));
    };

    // Deterministic palette for initials
    const getAvatarBadge = (name: string, index: number) => {
        const trimmed = name.trim();
        if (!trimmed) {
            return {
                label: (index + 1).toString(),
                bgClass: "bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-zinc-300",
            };
        }
        const initial = trimmed.charAt(0).toUpperCase();
        const palettes = [
            "bg-slate-800 text-white dark:bg-zinc-800 dark:text-zinc-100",
            "bg-zinc-700 text-white dark:bg-zinc-700 dark:text-zinc-100",
            "bg-neutral-800 text-white dark:bg-neutral-800 dark:text-zinc-100",
            "bg-slate-700 text-white dark:bg-slate-700 dark:text-zinc-100",
            "bg-stone-700 text-white dark:bg-stone-700 dark:text-zinc-100",
        ];
        let hash = 0;
        for (let i = 0; i < trimmed.length; i++) {
            hash = trimmed.charCodeAt(i) + ((hash << 5) - hash);
        }
        const colorClass = palettes[Math.abs(hash) % palettes.length];
        return { label: initial, bgClass: colorClass };
    };

    // Build aesthetic formatted summary for WhatsApp and clipboard
    const buildFormattedSummary = () => {
        const billName = description.trim() || "Shared Expense";

        const friendLines = friends.map((f, i) => {
            const friendName = f.name.trim() || `Friend ${i + 1}`;
            const amt =
                splitMode === "equal"
                    ? equalShare
                    : customType === "shares"
                    ? getFriendShareAmount(f)
                    : parseFloat(f.customAmount) || 0;
            return `• *${friendName}:* ${formatFullCurrency(amt, currencySymbol)}`;
        }).join("\n");

        return [
            "*━━━━━━━━━━━━━━━━━━━━*",
            "*⚡ FLUX · BILL SPLIT*",
            "*━━━━━━━━━━━━━━━━━━━━*",
            `📌 *Expense:* ${billName}`,
            `💰 *Total Bill:* ${formatFullCurrency(parsedTotal, currencySymbol)}`,
            `👥 *Split between:* ${totalPeopleCount} ${totalPeopleCount === 1 ? "person" : "people"}`,
            "",
            "*Pending Shares:*",
            friendLines,
            "",
            includeMyShare
                ? `👤 *You (Payer):* ${formatFullCurrency(myShare, currencySymbol)} net`
                : `👤 *You (Payer):* Full amount collected`,
            "*━━━━━━━━━━━━━━━━━━━━*",
            "✨ _Please settle up when you get a chance!_",
            "⚡ _Logged via Flux_",
        ].join("\n");
    };

    // Copy bill summary to clipboard
    const handleCopySummary = async () => {
        triggerHaptic('medium');
        const text = buildFormattedSummary();
        try {
            await navigator.clipboard.writeText(text);
            showToast("Formatted breakdown copied to clipboard!", "success");
        } catch {
            showToast("Failed to copy summary", "error");
        }
    };

    // Share breakdown via WhatsApp (using api.whatsapp.com to prevent wa.me redirect emoji corruption)
    const handleShareWhatsApp = () => {
        triggerHaptic('medium');
        const text = buildFormattedSummary();
        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(url, "_blank", "noopener,noreferrer");
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (parsedTotal <= 0) {
            triggerHaptic('error');
            showToast("Please enter a valid bill amount", "error");
            return;
        }

        // Validate friend names
        const emptyFriendIndex = friends.findIndex((f) => !f.name.trim());
        if (emptyFriendIndex !== -1) {
            triggerHaptic('error');
            setShowValidationErrors(true);
            setFocusTargetId(friends[emptyFriendIndex].id);
            showToast("Please enter names for all participants", "error");
            return;
        }

        const validFriends = friends.filter((f) => f.name.trim().length > 0);
        if (validFriends.length === 0) {
            triggerHaptic('error');
            showToast("Please add at least one person to split with", "error");
            return;
        }

        try {
            triggerHaptic('success');
            const now = Date.now();
            const billDesc = description.trim() ? `Split: ${description.trim()}` : "Split Bill";

            // 1. Create debt for each friend (money they owe you)
            for (const friend of validFriends) {
                const amountForFriend =
                    splitMode === "equal"
                        ? equalShare
                        : customType === "shares"
                        ? getFriendShareAmount(friend)
                        : (evaluateMathExpression(friend.customAmount) ?? (parseFloat(friend.customAmount) || 0));

                if (amountForFriend > 0) {
                    await mutate(db.debts, uuidv4(), {
                        profile_id: activeProfileId,
                        person_name: friend.name.trim(),
                        amount: amountForFriend,
                        type: "lent", // They owe you
                        purpose: billDesc,
                        status: "active",
                        created_at: now,
                    });
                }
            }

            // 2. Optionally record your own share as an expense
            if (recordMyExpense && myShare > 0) {
                await mutate(db.transactions, uuidv4(), {
                    profile_id: activeProfileId,
                    category_id: selectedCategoryId || undefined,
                    amount: myShare,
                    type: "expense",
                    note: description.trim() ? `My share: ${description.trim()}` : "My share (Split bill)",
                    timestamp: now,
                    tag_ids: [],
                });
            }

            showToast(
                `Split bill saved: ${validFriends.length} ${validFriends.length === 1 ? "debt" : "debts"} logged`,
                "success"
            );
            onClose();
        } catch (error) {
            console.error("Failed to save split bill", error);
            showToast("Failed to save split bill", "error");
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="split-bill-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[90] pointer-events-auto"
                    />

                    {/* Bottom Sheet Drawer */}
                    <div
                        key="split-bill-modal-container"
                        className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none"
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            onAnimationComplete={() => setIsReady(true)}
                            transition={{ duration: 0.16, ease: "easeOut" }}
                            className="bg-white dark:bg-[#141414] text-slate-900 dark:text-[#E3E3E3] w-full max-w-md rounded-t-[32px] shadow-2xl dark:shadow-[0_-12px_40px_rgba(0,0,0,0.85)] overflow-hidden pointer-events-auto border-t border-slate-100 dark:border-white/10 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] max-h-[90vh] flex flex-col relative z-[100]"
                            drag="y"
                            dragConstraints={{ top: 0, bottom: 0 }}
                            dragElastic={{ top: 0, bottom: 0.8 }}
                            onDragEnd={(_, info) => {
                                if (info.offset.y > 100 || info.velocity.y > 500) onClose();
                            }}
                        >
                            {/* Sticky Header */}
                            <header className="px-6 py-4 flex flex-col items-center sticky top-0 bg-white dark:bg-[#141414] z-20 border-b border-slate-100 dark:border-white/5">
                                <div className="w-full flex justify-center py-2 -mt-2 cursor-grab active:cursor-grabbing sm:hidden">
                                    <div className="w-12 h-1.5 bg-slate-200 dark:bg-white/20 rounded-full" />
                                </div>
                                <div className="w-full flex items-center justify-between relative">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="m3-icon-btn text-slate-400 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
                                        aria-label="Close modal"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">close</span>
                                    </button>

                                    <div className="text-center absolute left-1/2 -translate-x-1/2">
                                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Split a Bill</h2>
                                        <p className="text-slate-500 dark:text-zinc-400 text-xs font-medium mt-0.5">
                                            Divide shared cost with friends
                                        </p>
                                    </div>

                                    <div className="w-10" />
                                </div>
                            </header>

                            {/* Scrollable Form Body: Spacious & Clear Hierarchy */}
                            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                                <form onSubmit={handleSubmit} className="w-full space-y-6">
                                    {/* 1. Hero Amount Section: Clean, Prominent, Airy */}
                                    <div className="flex flex-col items-center pt-1 pb-2">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-400 mb-1.5">
                                            Total Bill Amount
                                        </span>

                                        <PriceInput
                                            value={totalAmount}
                                            onChange={setTotalAmount}
                                            placeholder="0.00"
                                            isReady={isReady}
                                        />

                                        {parsedTotal > 0 && splitMode === "equal" && (
                                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-white/10 text-xs font-semibold text-slate-700 dark:text-zinc-200 mt-3 border border-slate-200/60 dark:border-white/10">
                                                <span className="material-symbols-outlined text-[15px] text-slate-500 dark:text-zinc-400">group</span>
                                                <span>{formatFullCurrency(equalShare, currencySymbol)} each · {totalPeopleCount} {totalPeopleCount === 1 ? "person" : "people"}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* 2. Bill Details (Description & Category Side-by-Side) */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        {/* Description */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 px-1">
                                                Description
                                            </label>
                                            <div className="relative">
                                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 z-10 pointer-events-none text-[20px]">
                                                    receipt_long
                                                </span>
                                                <input
                                                    type="text"
                                                    value={description}
                                                    onChange={(e) => setDescription(e.target.value)}
                                                    placeholder="e.g. Dinner, Groceries"
                                                    className="w-full h-13 pl-12 pr-4 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-slate-900 dark:focus:border-white/30"
                                                />
                                            </div>
                                        </div>

                                        {/* Category */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 px-1">
                                                Category
                                            </label>
                                            <CustomSelect
                                                value={selectedCategoryId}
                                                onChange={setSelectedCategoryId}
                                                options={categories.map((c) => ({
                                                    id: c.id,
                                                    name: c.name,
                                                    icon: c.icon,
                                                }))}
                                                placeholder="Select Category"
                                                icon="category"
                                                className="w-full"
                                                triggerClassName="w-full h-13 pl-12 pr-10 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-medium text-slate-900 dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    {/* 3. Split Mode Segmented Bar */}
                                    <div className="space-y-2.5">
                                        <div className="p-1 bg-slate-100 dark:bg-black/30 rounded-full border border-slate-200/80 dark:border-white/5 flex items-center relative">
                                            {/* Horizontally sliding pill indicator - locked vertically */}
                                            <div
                                                className={clsx(
                                                    "absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-[#2c2c30] rounded-full shadow-xs border border-slate-200/80 dark:border-white/10 transition-transform duration-200 ease-out pointer-events-none z-0",
                                                    splitMode === "equal" ? "left-1 translate-x-0" : "left-1 translate-x-full"
                                                )}
                                            />

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSplitMode("equal");
                                                    triggerHaptic('light');
                                                }}
                                                className={clsx(
                                                    "flex-1 text-xs sm:text-sm font-semibold h-11 rounded-full transition-colors relative z-10 flex items-center justify-center gap-2 cursor-pointer",
                                                    splitMode === "equal"
                                                        ? "text-slate-900 dark:text-white font-bold"
                                                        : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
                                                )}
                                            >
                                                <span className="material-symbols-outlined text-[18px]">equalizer</span>
                                                <span>Split Equally</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSplitMode("custom");
                                                    triggerHaptic('light');
                                                }}
                                                className={clsx(
                                                    "flex-1 text-xs sm:text-sm font-semibold h-11 rounded-full transition-colors relative z-10 flex items-center justify-center gap-2 cursor-pointer",
                                                    splitMode === "custom"
                                                        ? "text-slate-900 dark:text-white font-bold"
                                                        : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
                                                )}
                                            >
                                                <span className="material-symbols-outlined text-[18px]">tune</span>
                                                <span>Custom Shares</span>
                                            </button>
                                        </div>

                                        {/* Sub-toggle for Custom Mode: Fixed Amount vs Shares Multiplier */}
                                        {splitMode === "custom" && (
                                            <div className="flex items-center justify-between px-1.5 pt-1">
                                                <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-white/[0.04] rounded-xl border border-slate-200/60 dark:border-white/10 text-xs">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setCustomType("fixed");
                                                            triggerHaptic('light');
                                                        }}
                                                        className={clsx(
                                                            "px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer",
                                                            customType === "fixed"
                                                                ? "bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-2xs"
                                                                : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
                                                        )}
                                                    >
                                                        Exact Amount ({currencySymbol})
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setCustomType("shares");
                                                            triggerHaptic('light');
                                                        }}
                                                        className={clsx(
                                                            "px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer",
                                                            customType === "shares"
                                                                ? "bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-2xs"
                                                                : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
                                                        )}
                                                    >
                                                        By Shares (1x, 2x)
                                                    </button>
                                                </div>

                                                {/* Live Balance Status in Fixed Custom Mode */}
                                                {customType === "fixed" && parsedTotal > 0 && (
                                                    <div className="flex items-center gap-2">
                                                        {customDifference === 0 ? (
                                                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                                                ✓ Balanced
                                                            </span>
                                                        ) : customDifference > 0 ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    autoFillRemaining();
                                                                    triggerHaptic('light');
                                                                }}
                                                                className="text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white underline underline-offset-2 cursor-pointer"
                                                            >
                                                                Fill remaining ({formatCompactCurrency(customDifference, currencySymbol)})
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs font-semibold text-rose-500">
                                                                Over by {formatCompactCurrency(Math.abs(customDifference), currencySymbol)}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* 4. Participants Table Card (Clean Inset Group, No Nested Pills) */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between px-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                    Participants
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-xs font-semibold text-slate-600 dark:text-zinc-300">
                                                    {totalPeopleCount}
                                                </span>
                                            </div>
                                            {splitMode === "equal" && parsedTotal > 0 && (
                                                <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                                                    {formatFullCurrency(equalShare, currencySymbol)} each
                                                </span>
                                            )}
                                        </div>

                                        <div className="bg-slate-50/80 dark:bg-white/[0.03] rounded-2xl border border-slate-200/80 dark:border-white/10 divide-y divide-slate-200/60 dark:divide-white/[0.06] overflow-hidden">
                                            {/* Row: "You" (Payer) */}
                                            <div className="min-h-[64px] px-4 py-3 flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white dark:bg-white dark:text-zinc-950 font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                                        YOU
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="text-sm font-bold text-slate-900 dark:text-white block leading-tight truncate">
                                                            You (Paid full bill)
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setIncludeMyShare(!includeMyShare);
                                                                triggerHaptic('light');
                                                            }}
                                                            className="inline-flex items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                                                        >
                                                            <span
                                                                className={clsx(
                                                                    "w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold border transition-colors",
                                                                    includeMyShare
                                                                        ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-950 border-slate-900 dark:border-white"
                                                                        : "border-slate-400 dark:border-zinc-600 bg-transparent text-transparent"
                                                                )}
                                                            >
                                                                ✓
                                                            </span>
                                                            <span>Include my share</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* You Share / Amount Display */}
                                                <div className="shrink-0 flex items-center gap-2">
                                                    {splitMode === "custom" && customType === "shares" && includeMyShare && (
                                                        <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-white/10 rounded-lg p-0.5 mr-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setMyShares(Math.max(0.5, myShares - 0.5));
                                                                    triggerHaptic('light');
                                                                }}
                                                                className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-white/20 transition-colors cursor-pointer"
                                                            >
                                                                -
                                                            </button>
                                                            <span className="text-xs font-bold px-1 tabular-nums">
                                                                {myShares}x
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setMyShares(myShares + 0.5);
                                                                    triggerHaptic('light');
                                                                }}
                                                                className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-white/20 transition-colors cursor-pointer"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    )}
                                                    <span className="text-base font-bold text-slate-900 dark:text-white tabular-nums shrink-0">
                                                        {formatFullCurrency(myShare, currencySymbol)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Friend Rows with Exit Animations */}
                                            <AnimatePresence initial={false}>
                                                {friends.map((friend, index) => {
                                                    const badge = getAvatarBadge(friend.name, index);
                                                    const hasError = showValidationErrors && !friend.name.trim();

                                                    return (
                                                        <motion.div
                                                            key={friend.id}
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: "auto" }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            transition={{ duration: 0.16, ease: "easeInOut" }}
                                                            className={clsx(
                                                                "min-h-[64px] px-4 py-3 flex items-center gap-3 transition-colors hover:bg-slate-100/50 dark:hover:bg-white/[0.02]",
                                                                hasError && "bg-rose-50/40 dark:bg-rose-500/10"
                                                            )}
                                                        >
                                                            <div className={clsx(
                                                                "w-10 h-10 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border border-slate-300/80 dark:border-white/10 transition-colors",
                                                                badge.bgClass
                                                            )}>
                                                                {badge.label}
                                                            </div>

                                                            {/* Friend Name: Borderless input with Enter key to add next friend */}
                                                            <div className="flex-1 min-w-0">
                                                                <input
                                                                    ref={(el) => {
                                                                        if (el && focusTargetId === friend.id) {
                                                                            el.focus();
                                                                            setFocusTargetId(null);
                                                                        }
                                                                    }}
                                                                    type="text"
                                                                    required
                                                                    list="past-debt-people"
                                                                    value={friend.name}
                                                                    onChange={(e) => {
                                                                        updateFriendName(friend.id, e.target.value);
                                                                        if (showValidationErrors) setShowValidationErrors(false);
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter") {
                                                                            e.preventDefault();
                                                                            if (friend.name.trim()) {
                                                                                addFriendRow();
                                                                            }
                                                                        }
                                                                    }}
                                                                    placeholder={hasError ? "Name is required" : "Friend's name"}
                                                                    className={clsx(
                                                                        "w-full bg-transparent text-sm sm:text-base font-medium placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none transition-colors",
                                                                        hasError
                                                                            ? "text-rose-600 dark:text-rose-400 placeholder:text-rose-400 dark:placeholder:text-rose-400/70"
                                                                            : "text-slate-900 dark:text-white"
                                                                    )}
                                                                />
                                                            </div>

                                                            {/* Amount Display, Shares Stepper, or Custom Input */}
                                                            <div className="shrink-0 flex items-center gap-2">
                                                                {splitMode === "equal" ? (
                                                                    <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tabular-nums px-1">
                                                                        {formatFullCurrency(equalShare, currencySymbol)}
                                                                    </span>
                                                                ) : customType === "shares" ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-white/10 rounded-lg p-0.5">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => updateFriendShares(friend.id, -0.5)}
                                                                                className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-white/20 transition-colors cursor-pointer"
                                                                            >
                                                                                -
                                                                            </button>
                                                                            <span className="text-xs font-bold px-1 tabular-nums">
                                                                                {friend.shares || 1}x
                                                                            </span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => updateFriendShares(friend.id, 0.5)}
                                                                                className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-white/20 transition-colors cursor-pointer"
                                                                            >
                                                                                +
                                                                            </button>
                                                                        </div>
                                                                        <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tabular-nums px-1">
                                                                            {formatFullCurrency(getFriendShareAmount(friend), currencySymbol)}
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="relative w-28 sm:w-32">
                                                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-zinc-500 pointer-events-none">
                                                                            {currencySymbol}
                                                                        </span>
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            min="0"
                                                                            value={friend.customAmount}
                                                                            onChange={(e) => updateFriendCustomAmount(friend.id, e.target.value)}
                                                                            placeholder="0.00"
                                                                            className="w-full h-10 pl-7 pr-2.5 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/15 rounded-xl text-sm font-bold text-slate-900 dark:text-white tabular-nums text-right focus:outline-none focus:border-slate-900 dark:focus:border-white/30"
                                                                        />
                                                                    </div>
                                                                )}

                                                                {friends.length > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeFriendRow(friend.id)}
                                                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                                                                        title="Remove friend"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[18px]">close</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </AnimatePresence>

                                            {/* Bottom Inset Action: + Add friend */}
                                            <button
                                                type="button"
                                                onClick={addFriendRow}
                                                className="w-full h-12 px-4 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">person_add</span>
                                                <span>Add another person</span>
                                            </button>
                                        </div>

                                        {/* Quick-add chips for recent contacts */}
                                        {unaddedRecentPeople.length > 0 && (
                                            <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 no-scrollbar">
                                                <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500 shrink-0 mr-0.5">
                                                    Recent:
                                                </span>
                                                {unaddedRecentPeople.map((name) => (
                                                    <button
                                                        key={name}
                                                        type="button"
                                                        onClick={() => addFriendWithName(name)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95 shrink-0 cursor-pointer"
                                                    >
                                                        <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-400">+</span>
                                                        <span>{name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <datalist id="past-debt-people">
                                            {pastPeople.map((p) => (
                                                <option key={p} value={p} />
                                            ))}
                                        </datalist>
                                    </div>

                                    {/* 5. Financial Summary Breakdown Card (Only when amount > 0) */}
                                    {parsedTotal > 0 && (
                                        <div className="bg-slate-50/80 dark:bg-white/[0.03] rounded-2xl p-4 border border-slate-200/80 dark:border-white/10 space-y-3.5">
                                            <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-200/70 dark:border-white/10">
                                                <div>
                                                    <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 block leading-tight">
                                                        Friends will owe you
                                                    </span>
                                                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums block mt-1">
                                                        +{formatFullCurrency(totalToCollect, currencySymbol)}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 block leading-tight">
                                                        Your net expense
                                                    </span>
                                                    <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums block mt-1">
                                                        {formatFullCurrency(myShare, currencySymbol)}
                                                    </span>
                                                </div>
                                            </div>

                                            {includeMyShare && (
                                                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={recordMyExpense}
                                                        onChange={(e) => setRecordMyExpense(e.target.checked)}
                                                        className="w-4 h-4 accent-slate-900 dark:accent-white rounded cursor-pointer shrink-0"
                                                    />
                                                    <span className="text-xs text-slate-600 dark:text-zinc-300 font-medium leading-snug">
                                                        Record my share ({formatCompactCurrency(myShare, currencySymbol)}) in Expense Transactions
                                                    </span>
                                                </label>
                                            )}

                                            {/* One-Tap Share / Copy Summary Actions */}
                                            <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-white/10">
                                                <button
                                                    type="button"
                                                    onClick={handleCopySummary}
                                                    className="flex-1 h-9 px-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/10 text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                                                    <span>Copy Breakdown</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleShareWhatsApp}
                                                    className="h-9 px-3.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                                    title="Share to WhatsApp"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">share</span>
                                                    <span>WhatsApp</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* 6. Action Footer: Balanced Bottom Spacing & High Contrast CTA */}
                                    <div className="grid grid-cols-2 gap-3 pt-3 pb-8 sm:pb-6">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="h-13 rounded-full font-bold text-sm bg-slate-100 hover:bg-slate-200/80 dark:bg-[#252528] dark:hover:bg-[#2e2e33] text-slate-700 dark:text-zinc-200 border border-slate-200/80 dark:border-white/10 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={parsedTotal <= 0}
                                            className={clsx(
                                                "h-13 rounded-full font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 border border-transparent",
                                                "bg-slate-900 text-white dark:bg-[#0842A0] dark:text-[#D3E3FD]",
                                                parsedTotal > 0
                                                    ? "hover:opacity-90 active:scale-95 cursor-pointer"
                                                    : "opacity-40 cursor-not-allowed border-transparent shadow-none"
                                            )}
                                        >
                                            <span className="material-symbols-outlined text-[19px] dark:text-[#D3E3FD]">group</span>
                                            <span>Save & Split</span>
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
