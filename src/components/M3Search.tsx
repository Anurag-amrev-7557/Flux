"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

export interface SearchSuggestion {
    id: string;
    label: string;
    subLabel?: string;
    icon?: string;
    /** Group header according to M3 spec, e.g. "Recent", "People", "Categories", "Actions" */
    group?: string;
    shortcut?: string;
    badge?: string;
}

export interface ParsedQuickEntry {
    raw: string;
    title: string;
    amount: number | null;
    currency: string;
    category: string | null;
    isQuickEntry: boolean;
}

export interface M3SearchProps {
    /** Current search text (controlled) */
    value: string;
    /** Called when search text changes */
    onChange: (value: string) => void;
    /** Called when search is submitted (Enter key) */
    onSubmit?: (value: string, parsed?: ParsedQuickEntry) => void;
    /** Hinted search text / placeholder according to M3 (e.g. "Search debts by person or note...") */
    placeholder?: string;
    /** Suggestions or results to display when focused */
    suggestions?: SearchSuggestion[];
    /** Called when a suggestion is selected */
    onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
    /** Trailing icon name (Material Symbols), defaults to none */
    trailingIcon?: string;
    /** Called when trailing icon is clicked */
    onTrailingIconClick?: () => void;
    /** Layout mode per M3 guidelines: "docked" (default) or "fullscreen" */
    layout?: "docked" | "fullscreen" | "auto";
    /** Style configuration: "divided" (solid divider between input & results) or "contained" (separated filled container) */
    styleVariant?: "divided" | "contained";
    /** Accessibility label */
    label?: string;
    className?: string;
    /** Called when back button or Escape key is pressed */
    onBack?: () => void;
    /** Automatically focus input on mount */
    autoFocus?: boolean;
    /** Optional avatar image URL or component to render in trailing slot per M3 anatomy */
    avatarUrl?: string;
    /** Privacy Masking Mode State */
    isPrivacyMode?: boolean;
    onTogglePrivacy?: () => void;
}

// M3 Expressive smooth motion curves
const m3ExpressiveSpring = {
    duration: 0.22,
    ease: [0.2, 0, 0, 1] as const, // M3 standard easing
};

const microSpring = {
    type: "spring" as const,
    stiffness: 550,
    damping: 35,
    mass: 0.4,
};

/**
 * Material 3 (M3) Search Component
 * Compliant with Material Design 3 guidelines:
 * - 56dp height standard container with 28dp pill radius
 * - "Divided" style with crisp solid divider between search input and results
 * - "Contained" style with persistent filled container and separated result surface
 * - M3 Surface Container High tonal color mapping
 * - High-contrast light theme without dark box artifacts or blue focus rings
 * - Accessible combobox & listbox pattern with keyboard navigation
 */
export const M3Search: React.FC<M3SearchProps> = ({
    value,
    onChange,
    onSubmit,
    placeholder = "Search debts, transactions, or actions...",
    suggestions = [],
    onSuggestionSelect,
    trailingIcon,
    onTrailingIconClick,
    styleVariant = "divided",
    label,
    className,
    onBack,
    autoFocus = false,
    avatarUrl,
    isPrivacyMode = false,
    onTogglePrivacy,
}) => {
    const [isFocused, setIsFocused] = useState(autoFocus);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (autoFocus) {
            setIsFocused(true);
            inputRef.current?.focus();
        }
    }, [autoFocus]);

    // 1. Global Keyboard Shortcut: Cmd+K / Ctrl+K & Escape
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setIsFocused((prev) => {
                    if (!prev) {
                        setTimeout(() => inputRef.current?.focus(), 50);
                    }
                    return !prev;
                });
            }
            if (e.key === "Escape" && isFocused) {
                e.preventDefault();
                setIsFocused(false);
                inputRef.current?.blur();
                onBack?.();
            }
        };

        window.addEventListener("keydown", handleGlobalKeyDown);
        return () => window.removeEventListener("keydown", handleGlobalKeyDown);
    }, [isFocused, onBack]);

    // 2. Deterministic Natural Language Quick Entry Tokenizer
    const parsedEntry = useMemo<ParsedQuickEntry>(() => {
        if (!value.trim()) {
            return { raw: "", title: "", amount: null, currency: "$", category: null, isQuickEntry: false };
        }

        const text = value.trim();
        const amountRegex = /(?:(\$|€|£|₹)\s*)?(\b\d+(?:\.\d{1,2})?\b)(?:\s*(usd|eur|gbp|inr|\$|€|£|₹))?/i;
        const match = text.match(amountRegex);

        if (!match) {
            return { raw: text, title: text, amount: null, currency: "$", category: null, isQuickEntry: false };
        }

        const rawAmount = parseFloat(match[2]);
        const detectedCurrency = match[1] || match[3]?.toUpperCase() || "$";

        const catMatch = text.match(/#([a-zA-Z0-9_-]+)/);
        const category = catMatch ? catMatch[1] : null;

        let title = text
            .replace(match[0], "")
            .replace(/#([a-zA-Z0-9_-]+)/, "")
            .trim();

        if (!title) title = "Quick Entry";

        return {
            raw: text,
            title,
            amount: isNaN(rawAmount) ? null : rawAmount,
            currency: detectedCurrency,
            category,
            isQuickEntry: rawAmount !== null && !isNaN(rawAmount),
        };
    }, [value]);

    // 3. Filter suggestions based on query
    const filteredSuggestions = useMemo(() => {
        if (!value.trim()) return suggestions;
        const q = value.toLowerCase();
        return suggestions.filter(
            (s) =>
                s.label.toLowerCase().includes(q) ||
                s.subLabel?.toLowerCase().includes(q) ||
                s.group?.toLowerCase().includes(q)
        );
    }, [suggestions, value]);

    const showResults = isFocused && (filteredSuggestions.length > 0 || parsedEntry.isQuickEntry);

    // Group suggestions with M3 gaps
    const groupedSuggestions = useMemo(() => {
        return filteredSuggestions.reduce<{ group: string; items: SearchSuggestion[] }[]>((acc, s) => {
            const groupName = s.group || "";
            const existing = acc.find((g) => g.group === groupName);
            if (existing) {
                existing.items.push(s);
            } else {
                acc.push({ group: groupName, items: [s] });
            }
            return acc;
        }, []);
    }, [filteredSuggestions]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsFocused(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Reset highlight when suggestions change
    useEffect(() => {
        setHighlightedIndex(-1);
    }, [filteredSuggestions.length]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightedIndex((prev) =>
                    prev < filteredSuggestions.length - 1 ? prev + 1 : 0
                );
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightedIndex((prev) =>
                    prev > 0 ? prev - 1 : filteredSuggestions.length - 1
                );
            } else if (e.key === "Enter") {
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
                    const s = filteredSuggestions[highlightedIndex];
                    onChange(s.label);
                    onSuggestionSelect?.(s);
                    setIsFocused(false);
                    inputRef.current?.blur();
                } else if (parsedEntry.isQuickEntry) {
                    onSubmit?.(value, parsedEntry);
                    onChange("");
                    setIsFocused(false);
                    inputRef.current?.blur();
                } else if (value.trim()) {
                    onSubmit?.(value, parsedEntry);
                    setIsFocused(false);
                    inputRef.current?.blur();
                }
            } else if (e.key === "Escape") {
                setIsFocused(false);
                inputRef.current?.blur();
                onBack?.();
            }
        },
        [
            filteredSuggestions,
            highlightedIndex,
            onChange,
            onSuggestionSelect,
            onSubmit,
            onBack,
            parsedEntry,
            value,
        ]
    );

    const handleClear = () => {
        onChange("");
        inputRef.current?.focus();
    };

    const handleBack = () => {
        setIsFocused(false);
        inputRef.current?.blur();
        onBack?.();
    };

    const isDividedActive = styleVariant === "divided" && showResults;

    return (
        <>
            {/* Backdrop Scrim: Absorbs outside clicks so underlying window elements aren't accidentally triggered */}
            {isFocused && (
                <div
                    className="fixed inset-0 z-40 bg-black/30 backdrop-blur-2xs transition-opacity"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsFocused(false);
                        inputRef.current?.blur();
                        onBack?.();
                    }}
                    onTouchStart={(e) => {
                        e.stopPropagation();
                        setIsFocused(false);
                        inputRef.current?.blur();
                        onBack?.();
                    }}
                    aria-hidden="true"
                />
            )}

            <div
                ref={containerRef}
                className={clsx("relative w-full", isFocused ? "z-50" : "z-10", className)}
            >
            {/* Screen Reader Live Region */}
            <div aria-live="polite" className="sr-only">
                {showResults
                    ? `${filteredSuggestions.length} suggestions available.`
                    : ""}
            </div>

            {/* ── M3 Search Bar Container (56dp standard height, 28dp pill radius) ── */}
            <div
                className={clsx(
                    "relative z-10 flex items-center transition-all duration-200 ease-out",
                    "bg-white dark:bg-[#1E2020] border text-slate-900 dark:text-[#E3E3E3]",
                    "shadow-[0_1px_3px_rgba(0,0,0,0.03)]",
                    isDividedActive
                        ? "rounded-t-[28px] rounded-b-none border-slate-200/90 dark:border-white/10 border-b border-b-slate-200 dark:border-b-white/10 shadow-md shadow-slate-900/5"
                        : "rounded-[28px] border-slate-200/90 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 focus-within:border-slate-300 dark:focus-within:border-white/25 focus-within:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                )}
                style={{ height: 56, outline: "none" }}
            >
                {/* Leading Navigational Icon Button or Search Icon (M3 40dp tap target with morphic transition) */}
                <div className="shrink-0 pl-2 pr-1 flex items-center justify-center">
                    <AnimatePresence mode="wait" initial={false}>
                        {isFocused ? (
                            <motion.button
                                key="back-icon"
                                initial={{ opacity: 0, scale: 0.75, x: 4 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.75, x: -4 }}
                                transition={{ duration: 0.16, ease: "easeOut" }}
                                type="button"
                                onClick={handleBack}
                                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all text-slate-700 dark:text-[#E3E3E3] outline-none focus:outline-none"
                                aria-label="Back / Dismiss Search"
                                title="Back"
                            >
                                <span className="material-symbols-outlined text-[22px]">
                                    arrow_back
                                </span>
                            </motion.button>
                        ) : (
                            <motion.button
                                key="search-icon"
                                initial={{ opacity: 0, scale: 0.75, x: -4 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.75, x: 4 }}
                                transition={{ duration: 0.16, ease: "easeOut" }}
                                type="button"
                                onClick={() => {
                                    setIsFocused(true);
                                    inputRef.current?.focus();
                                }}
                                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100/70 dark:hover:bg-white/10 text-slate-500 dark:text-[#8A8D8B] hover:text-slate-800 dark:hover:text-[#E3E3E3] transition-colors"
                                aria-label="Search"
                            >
                                <span className="material-symbols-outlined text-[22px]">
                                    search
                                </span>
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>

                {/* Input Field (Start-aligned, No Blue Focus Outline) */}
                <input
                    ref={inputRef}
                    type="text"
                    role="combobox"
                    aria-expanded={showResults}
                    aria-controls="m3-search-listbox"
                    aria-haspopup="listbox"
                    aria-autocomplete="list"
                    aria-label={label || placeholder}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={(e) => {
                        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
                            setIsFocused(false);
                        }
                    }}
                    onKeyDown={handleKeyDown}
                    className={clsx(
                        "flex-1 bg-transparent border-none text-[15px] text-slate-900 dark:text-[#E3E3E3] font-normal",
                        "placeholder:text-slate-400 dark:placeholder:text-[#8A8D8B] caret-slate-800 dark:caret-white",
                        "h-full py-0 px-1 outline-none focus:outline-none focus:ring-0 shadow-none"
                    )}
                    style={{ outline: "none", boxShadow: "none" }}
                    autoComplete="off"
                />

                {/* Trailing Actions (Max 2 per M3 spec: Privacy toggle, Clear, Trailing action, or Avatar) */}
                <div className="flex items-center shrink-0 pr-2 gap-0.5">
                    {/* Privacy Toggle */}
                    {onTogglePrivacy && (
                        <button
                            type="button"
                            onClick={onTogglePrivacy}
                            title={isPrivacyMode ? "Disable Privacy Mask" : "Enable Privacy Mask"}
                            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 dark:text-[#8A8D8B] hover:text-slate-700 dark:hover:text-[#E3E3E3] transition-colors outline-none focus:outline-none"
                            aria-label={isPrivacyMode ? "Disable Privacy Mask" : "Enable Privacy Mask"}
                        >
                            <span className="material-symbols-outlined text-[19px]">
                                {isPrivacyMode ? "visibility_off" : "visibility"}
                            </span>
                        </button>
                    )}

                    {/* Clear button (M3: Shown when input text exists) */}
                    <AnimatePresence>
                        {value.length > 0 && (
                            <motion.button
                                type="button"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={microSpring}
                                onClick={handleClear}
                                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10 active:scale-90 transition-colors text-slate-400 dark:text-[#8A8D8B] hover:text-slate-600 dark:hover:text-[#E3E3E3] outline-none focus:outline-none"
                                aria-label="Clear search query"
                            >
                                <span className="material-symbols-outlined text-[19px]">
                                    close
                                </span>
                            </motion.button>
                        )}
                    </AnimatePresence>

                    {/* Custom Trailing Action */}
                    {trailingIcon && (
                        <button
                            type="button"
                            onClick={onTrailingIconClick}
                            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 active:scale-90 transition-colors text-slate-600 outline-none focus:outline-none"
                            aria-label={trailingIcon}
                        >
                            <span className="material-symbols-outlined text-[19px]">
                                {trailingIcon}
                            </span>
                        </button>
                    )}

                    {/* Optional M3 Avatar */}
                    {avatarUrl && (
                        <div className="w-[30px] h-[30px] rounded-full overflow-hidden border border-slate-200 ml-1">
                            <img src={avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
                        </div>
                    )}

                    {/* Desktop Command Palette Shortcut Hint */}
                    <div className="hidden sm:flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 text-[10px] font-mono text-slate-400 ml-1">
                        <span>⌘</span>
                        <span>K</span>
                    </div>
                </div>
            </div>

            {/* ── M3 Results & Suggestions Panel ── */}
            <AnimatePresence>
                {showResults && (
                    <motion.div
                        id="m3-search-listbox"
                        role="listbox"
                        aria-label="Search suggestions"
                        initial={{ opacity: 0, y: -4, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.99 }}
                        transition={m3ExpressiveSpring}
                        className={clsx(
                            "absolute left-0 right-0 z-50 overflow-hidden",
                            "bg-white dark:bg-[#1E2020]",
                            styleVariant === "divided"
                                ? "border-x border-b border-slate-200/90 dark:border-white/10 rounded-b-[28px] shadow-xl shadow-slate-900/10"
                                : "mt-2 border border-slate-200/90 dark:border-white/10 rounded-[24px] shadow-xl shadow-slate-900/10"
                        )}
                        style={{ top: styleVariant === "divided" ? 56 : undefined }}
                    >
                        {/* Quick-Log Preview Banner */}
                        {parsedEntry.isQuickEntry && (
                            <div className="p-3 bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[17px] text-slate-700 dark:text-[#E3E3E3]">
                                            bolt
                                        </span>
                                        <span className="text-[11px] font-bold text-slate-800 dark:text-[#E3E3E3] uppercase tracking-wider">
                                            Quick Entry Detected
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-500 dark:text-[#8A8D8B]">
                                        Press ↵ to Log
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                    <span className="px-2 py-0.5 rounded-md bg-white dark:bg-[#141414] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-[#E3E3E3]">
                                        {parsedEntry.title}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                        {parsedEntry.currency}
                                        {parsedEntry.amount?.toFixed(2)}
                                    </span>
                                    {parsedEntry.category && (
                                        <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-xs font-mono text-amber-700 dark:text-amber-400">
                                            #{parsedEntry.category}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* M3 Suggestions List with Group Gaps */}
                        <div className="py-2 max-h-[min(380px,55vh)] overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                            {groupedSuggestions.map((group, groupIdx) => (
                                <div
                                    key={group.group || `group-${groupIdx}`}
                                    className={clsx(groupIdx > 0 ? "pt-2 pb-1" : "pb-1")}
                                >
                                    {group.group && (
                                        <p className="px-4 pt-1.5 pb-1 text-[11px] font-bold text-slate-400 dark:text-[#8A8D8B] uppercase tracking-wider">
                                            {group.group}
                                        </p>
                                    )}
                                    {group.items.map((suggestion) => {
                                        const flatIdx = filteredSuggestions.indexOf(suggestion);
                                        const isHighlighted = flatIdx === highlightedIndex;
                                        return (
                                            <button
                                                key={suggestion.id}
                                                role="option"
                                                aria-selected={isHighlighted}
                                                onClick={() => {
                                                    onChange(suggestion.label);
                                                    onSuggestionSelect?.(suggestion);
                                                    setIsFocused(false);
                                                    inputRef.current?.blur();
                                                }}
                                                onMouseEnter={() => setHighlightedIndex(flatIdx)}
                                                className={clsx(
                                                    "w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors outline-none",
                                                    isHighlighted
                                                        ? "bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-[#E3E3E3]"
                                                        : "hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-[#E3E3E3]"
                                                )}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <span className="material-symbols-outlined text-[20px] text-slate-400 dark:text-[#8A8D8B] shrink-0">
                                                        {suggestion.icon || "history"}
                                                    </span>
                                                    <div className="truncate">
                                                        <span className="text-sm font-medium text-slate-800 dark:text-[#E3E3E3] block truncate">
                                                            {suggestion.label}
                                                        </span>
                                                        {suggestion.subLabel && (
                                                            <span className="text-xs text-slate-400 dark:text-[#C4C7C5] block truncate mt-0.5">
                                                                {suggestion.subLabel}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {suggestion.shortcut && (
                                                    <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200/80">
                                                        {suggestion.shortcut}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    </>
);
};

export default M3Search;
