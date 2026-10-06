"use client";

import { useState, FormEvent, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDatabase } from "@/db/DatabaseProvider";
import { useAppStore } from "@/store/appStore";
import { v4 as uuidv4 } from "uuid";
import { ProfileDocType, DebtDocType } from "@/db/schema";
import clsx from "clsx";
import CustomSelect from "@/components/CustomSelect";
import PriceInput from "@/components/PriceInput";
import CustomDatePicker from "@/components/CustomDatePicker";
import { useI18n } from "@/hooks/useI18n";
import { mutate } from "@/sync/mutate";
import { triggerHaptic } from "@/utils/haptics";
import { evaluateMathExpression } from "@/utils/mathEval";

interface AddDebtModalProps {
    isOpen: boolean;
    onClose: () => void;
    debtId?: string; // If provided, we are editing
    initialType?: "owe" | "lent";
    initialPurpose?: string;
    initialPersonName?: string;
}

export default function AddDebtModal({ isOpen, onClose, debtId, initialType, initialPurpose, initialPersonName }: AddDebtModalProps) {
    const db = useDatabase();
    const { activeProfileId } = useAppStore();
    const { t } = useI18n();

    const [amount, setAmount] = useState("");
    const [personName, setPersonName] = useState("");
    const [purpose, setPurpose] = useState("");
    const [type, setType] = useState<"owe" | "lent">("lent");
    const [dueDate, setDueDate] = useState("");
    const [selectedProfile, setSelectedProfile] = useState(activeProfileId);
    const [profiles, setProfiles] = useState<ProfileDocType[]>([]);
    const [existingDebts, setExistingDebts] = useState<DebtDocType[]>([]);
    const [isReady, setIsReady] = useState(false);
    useEffect(() => { if (!isOpen) setIsReady(false); }, [isOpen]);

    // Prediction states
    const [isPersonFocused, setIsPersonFocused] = useState(false);
    const [personHighlightIndex, setPersonHighlightIndex] = useState(-1);
    const [isPurposeFocused, setIsPurposeFocused] = useState(false);
    const [purposeHighlightIndex, setPurposeHighlightIndex] = useState(-1);

    const lastPeopleRef = useRef<string[]>([]);
    const lastPurposesRef = useRef<string[]>([]);

    useEffect(() => {
        const sub = db.profiles.find({ selector: { _deleted: false } }).$.subscribe(docs => {
            setProfiles(docs.map(d => d.toJSON() as ProfileDocType));
        });

        const debtsSub = db.debts.find({ selector: { _deleted: false } }).$.subscribe(docs => {
            setExistingDebts(docs.map(d => d.toJSON() as DebtDocType));
        });

        if (debtId) {
            // Fetch debt details if editing
            db.debts.findOne(debtId).exec().then(doc => {
                if (doc) {
                    const data = doc.toJSON();
                    setAmount(data.amount.toString());
                    setPersonName(data.person_name);
                    setPurpose(data.purpose || "");
                    setType(data.type as "owe" | "lent");
                    setSelectedProfile(data.profile_id);
                    if (data.due_date) {
                        setDueDate(new Date(data.due_date).toISOString().split('T')[0]);
                    }
                }
            });
        } else {
            // Reset fields for new entry
            setAmount("");
            setPersonName(initialPersonName || "");
            setPurpose(initialPurpose || "");
            setType(initialType || "lent");
            setDueDate("");
            setSelectedProfile(activeProfileId);
        }

        return () => {
            sub.unsubscribe();
            debtsSub.unsubscribe();
        };
    }, [db, debtId, isOpen, activeProfileId, initialType, initialPurpose, initialPersonName]);

    // Derived suggestions for Person (only real counterparties from debts, NEVER workspace profiles like "Personal")
    const allPeople = useMemo(() => {
        const names = new Set<string>();
        existingDebts.forEach(d => {
            if (d.person_name && d.person_name.trim()) {
                names.add(d.person_name.trim());
            }
        });
        return Array.from(names);
    }, [existingDebts]);

    const filteredPeople = useMemo(() => {
        const trimmed = personName.trim().toLowerCase();
        // If there are no past counterparty names, don't show any suggestions
        if (allPeople.length === 0) return [];

        if (!trimmed) {
            return allPeople.slice(0, 5);
        }
        return allPeople.filter(name =>
            name.toLowerCase().includes(trimmed) &&
            name.toLowerCase() !== trimmed
        ).slice(0, 5);
    }, [allPeople, personName]);

    // Derived suggestions for Purpose
    const allPurposes = useMemo(() => {
        const set = new Set<string>();
        existingDebts.forEach(d => {
            if (d.purpose && d.purpose.trim()) {
                set.add(d.purpose.trim());
            }
        });
        const defaultCommon = ["Dinner", "Rent", "Groceries", "Coffee", "Travel", "Shopping", "Bills", "Loan"];
        defaultCommon.forEach(item => set.add(item));
        return Array.from(set);
    }, [existingDebts]);

    const filteredPurposes = useMemo(() => {
        const trimmed = purpose.trim().toLowerCase();
        if (!trimmed) {
            return allPurposes.slice(0, 5);
        }
        return allPurposes.filter(item =>
            item.toLowerCase().includes(trimmed) &&
            item.toLowerCase() !== trimmed
        ).slice(0, 5);
    }, [allPurposes, purpose]);

    const handlePersonKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isPersonFocused || filteredPeople.length === 0) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setPersonHighlightIndex(prev => (prev < filteredPeople.length - 1 ? prev + 1 : 0));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setPersonHighlightIndex(prev => (prev > 0 ? prev - 1 : filteredPeople.length - 1));
        } else if (e.key === "Enter" && personHighlightIndex >= 0 && personHighlightIndex < filteredPeople.length) {
            e.preventDefault();
            setPersonName(filteredPeople[personHighlightIndex]);
            setIsPersonFocused(false);
            setPersonHighlightIndex(-1);
        } else if (e.key === "Escape") {
            setIsPersonFocused(false);
            setPersonHighlightIndex(-1);
        }
    };

    const handlePurposeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isPurposeFocused || filteredPurposes.length === 0) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setPurposeHighlightIndex(prev => (prev < filteredPurposes.length - 1 ? prev + 1 : 0));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setPurposeHighlightIndex(prev => (prev > 0 ? prev - 1 : filteredPurposes.length - 1));
        } else if (e.key === "Enter" && purposeHighlightIndex >= 0 && purposeHighlightIndex < filteredPurposes.length) {
            e.preventDefault();
            setPurpose(filteredPurposes[purposeHighlightIndex]);
            setIsPurposeFocused(false);
            setPurposeHighlightIndex(-1);
        } else if (e.key === "Escape") {
            setIsPurposeFocused(false);
            setPurposeHighlightIndex(-1);
        }
    };

    const evaluatedAmount = useMemo(() => {
        const hasMath = /[+\-*/xX()÷]/.test(amount);
        if (hasMath) return evaluateMathExpression(amount);
        const parsed = parseFloat(amount);
        return isNaN(parsed) || !isFinite(parsed) ? null : parsed;
    }, [amount]);

    const isFormValid = evaluatedAmount !== null && evaluatedAmount > 0 && personName.trim().length > 0;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!isFormValid || evaluatedAmount === null) return;

        try {
            triggerHaptic('success');
            if (debtId) {
                const doc = await db.debts.findOne(debtId).exec();
                if (doc) {
                    await mutate(db.debts, debtId, {
                        profile_id: selectedProfile,
                        person_name: personName,
                        amount: evaluatedAmount,
                        type: type,
                        purpose: purpose || undefined,
                        due_date: dueDate ? new Date(dueDate).getTime() : undefined,
                    });
                }
            } else {
                await mutate(db.debts, uuidv4(), {
                    profile_id: selectedProfile,
                    person_name: personName,
                    amount: evaluatedAmount,
                    type: type,
                    purpose: purpose || undefined,
                    due_date: dueDate ? new Date(dueDate).getTime() : undefined,
                    created_at: Date.now(),
                    status: 'active',
                });
            }

            onClose();
        } catch (error) {
            console.error("Failed to save debt", error);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="add-debt-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.16, ease: 'easeOut' }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[90] pointer-events-auto"
                    />

                    {/* Modal Content container */}
                    <div key="add-debt-modal-container" className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            onAnimationComplete={() => setIsReady(true)}
                            transition={{ duration: 0.16, ease: "easeOut" }}
                            className="bg-white dark:bg-[#141414] w-full max-w-md rounded-t-[32px] shadow-2xl dark:shadow-[0_-8px_32px_rgba(0,0,0,0.8)] overflow-hidden pointer-events-auto border-t border-slate-100 dark:border-white/10 pb-safe origin-bottom max-h-[92vh] flex flex-col relative z-[100]"
                            style={{ willChange: 'transform' }}
                            drag="y"
                            dragConstraints={{ top: 0, bottom: 0 }}
                            dragElastic={{ top: 0, bottom: 0.8 }}
                            onDragEnd={(_, info) => {
                                if (info.offset.y > 100 || info.velocity.y > 500) onClose();
                            }}
                        >
                            {/* Modal Header */}
                            <header className="px-6 py-4 flex flex-col items-center sticky top-0 bg-white dark:bg-[#141414] z-20 border-b border-slate-50 dark:border-white/5">
                                <div className="w-full flex justify-center py-2 -mt-2 cursor-grab active:cursor-grabbing sm:hidden">
                                    <div className="w-12 h-1.5 bg-slate-200 dark:bg-white/20 rounded-full" />
                                </div>
                                <div className="w-full flex items-center justify-between relative">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="m3-icon-btn text-slate-400 dark:text-[#C4C7C5] hover:text-slate-700 dark:hover:text-[#E3E3E3] hover:bg-slate-100 dark:hover:bg-white/10"
                                        aria-label="Close modal"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">close</span>
                                    </button>
                                    <div className="text-center absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                                        <h2 className="text-xl font-black text-slate-900 dark:text-[#E3E3E3]">{debtId ? (t('edit') || 'Edit Debt') : (t('add_debt') || 'Add Debt')}</h2>
                                        <p className="text-slate-500 dark:text-[#8A8D8B] text-[10px] font-bold uppercase tracking-wider leading-tight">{debtId ? (t('update_entry') || 'Update entry') : (t('log_debt_desc') || 'Log a new debt or loan')}</p>
                                    </div>
                                    <div className="w-10"></div>
                                </div>
                            </header>

                            <div className="flex-1 overflow-y-auto px-6 pb-10 pt-6">
                                <form onSubmit={handleSubmit} className="w-full space-y-6">
                                    {/* Type Selection */}
                                    <div className="flex bg-slate-100 dark:bg-black/40 p-1 rounded-full mb-6 w-full relative shadow-[inset_0_1px_4px_rgba(0,0,0,0.06)] dark:border dark:border-white/5">
                                        <div
                                            className={clsx(
                                                "absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-[#27272a] dark:border dark:border-white/10 rounded-full shadow-sm transition-transform duration-200 ease-out pointer-events-none z-0",
                                                type === "lent" ? "left-1 translate-x-0" : "left-1 translate-x-full"
                                            )}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setType("lent");
                                                triggerHaptic("light");
                                            }}
                                            className={clsx(
                                                "flex-1 text-sm font-semibold h-11 rounded-full transition-colors relative z-10 flex items-center justify-center gap-2 px-4 cursor-pointer",
                                                type === "lent" ? "text-slate-900 dark:text-white font-bold" : "text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200"
                                            )}
                                        >
                                            <span className={clsx(
                                                "material-symbols-outlined text-[19px] transition-colors",
                                                type === "lent" ? "text-emerald-500" : "text-slate-400 dark:text-zinc-500"
                                            )}>
                                                arrow_upward
                                            </span>
                                            <span>{t('lent')}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setType("owe");
                                                triggerHaptic("light");
                                            }}
                                            className={clsx(
                                                "flex-1 text-sm font-semibold h-11 rounded-full transition-colors relative z-10 flex items-center justify-center gap-2 px-4 cursor-pointer",
                                                type === "owe" ? "text-slate-900 dark:text-white font-bold" : "text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200"
                                            )}
                                        >
                                            <span className={clsx(
                                                "material-symbols-outlined text-[19px] transition-colors",
                                                type === "owe" ? "text-rose-500" : "text-slate-400 dark:text-zinc-500"
                                            )}>
                                                arrow_downward
                                            </span>
                                            <span>{t('owe')}</span>
                                        </button>
                                    </div>

                                    {/* Amount */}
                                    <div className="flex flex-col items-center">
                                        <PriceInput
                                            value={amount}
                                            onChange={setAmount}
                                            placeholder="0.00"
                                            isReady={isReady}
                                        />
                                    </div>

                                    {/* Person Name with Predictive Search Dropdown */}
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-600 dark:text-zinc-400 px-1">{t('person')}</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 z-10 pointer-events-none text-[20px]">person</span>
                                            <input
                                                type="text"
                                                required
                                                value={personName}
                                                onChange={(e) => {
                                                    setPersonName(e.target.value);
                                                    setIsPersonFocused(true);
                                                    setPersonHighlightIndex(-1);
                                                }}
                                                onFocus={() => setIsPersonFocused(true)}
                                                onBlur={() => setTimeout(() => setIsPersonFocused(false), 200)}
                                                onKeyDown={handlePersonKeyDown}
                                                placeholder={t('person_placeholder')}
                                                className="w-full h-14 pl-12 pr-4 bg-slate-50 dark:bg-[#1E2020] border border-slate-200 dark:border-white/10 rounded-full text-base font-medium text-slate-900 dark:text-[#E3E3E3] transition-all focus:outline-none focus:border-primary dark:focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-slate-400 dark:placeholder:text-[#8A8D8B]"
                                                autoComplete="off"
                                            />

                                            {/* Person Predictions Floating Dropdown */}
                                            <AnimatePresence>
                                                {isPersonFocused && filteredPeople.length > 0 && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                                                        transition={{ duration: 0.14, ease: [0.2, 0, 0, 1] }}
                                                        style={{ originY: 0 }}
                                                        className="absolute left-0 right-0 top-full mt-2 z-50 bg-white dark:bg-[#1E2020] rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-xl shadow-slate-900/10 dark:shadow-[0_12px_32px_rgba(0,0,0,0.6)] overflow-hidden py-1.5 pointer-events-auto"
                                                    >
                                                        <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400 flex items-center gap-1.5 border-b border-slate-100 dark:border-white/10">
                                                            <span className="material-symbols-outlined text-[13px]">history</span>
                                                            <span>Suggested People</span>
                                                        </div>
                                                        <div className="p-1 space-y-0.5">
                                                            {(filteredPeople.length > 0 ? filteredPeople : lastPeopleRef.current).map((p, idx) => (
                                                                <button
                                                                    key={p}
                                                                    type="button"
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        setPersonName(p);
                                                                        setIsPersonFocused(false);
                                                                    }}
                                                                    className={clsx(
                                                                        "w-full px-3.5 py-2.5 rounded-xl text-left flex items-center justify-between text-sm transition-colors",
                                                                        idx === personHighlightIndex ? "bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white font-semibold" : "hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-zinc-300"
                                                                    )}
                                                                >
                                                                    <div className="flex items-center gap-2.5">
                                                                        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 flex items-center justify-center text-xs font-bold border border-slate-200/60 dark:border-white/10">
                                                                            {p.charAt(0).toUpperCase()}
                                                                        </div>
                                                                        <span>{p}</span>
                                                                    </div>
                                                                    <span className="material-symbols-outlined text-[16px] text-slate-400 dark:text-zinc-500">north_west</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    {/* Purpose with Predictive Search Dropdown */}
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-600 dark:text-zinc-400 px-1">{t('purpose')}</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 z-10 pointer-events-none text-[20px]">description</span>
                                            <input
                                                type="text"
                                                value={purpose}
                                                onChange={(e) => {
                                                    setPurpose(e.target.value);
                                                    setIsPurposeFocused(true);
                                                    setPurposeHighlightIndex(-1);
                                                }}
                                                onFocus={() => setIsPurposeFocused(true)}
                                                onBlur={() => setTimeout(() => setIsPurposeFocused(false), 100)}
                                                onKeyDown={handlePurposeKeyDown}
                                                placeholder={t('purpose_placeholder')}
                                                className="w-full h-14 pl-12 pr-4 bg-slate-50 dark:bg-[#1E2020] border border-slate-200 dark:border-white/10 rounded-full text-base font-medium text-slate-900 dark:text-[#E3E3E3] transition-all focus:outline-none focus:border-primary dark:focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-slate-400 dark:placeholder:text-[#8A8D8B]"
                                                autoComplete="off"
                                            />

                                            {/* Purpose Predictions Floating Dropdown */}
                                            <AnimatePresence>
                                                {isPurposeFocused && filteredPurposes.length > 0 && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                                                        transition={{ duration: 0.14, ease: [0.2, 0, 0, 1] }}
                                                        style={{ originY: 0 }}
                                                        className="absolute left-0 right-0 top-full mt-2 z-50 bg-white dark:bg-[#1E2020] rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-xl shadow-slate-900/10 dark:shadow-[0_12px_32px_rgba(0,0,0,0.6)] overflow-hidden py-1.5 pointer-events-auto"
                                                    >
                                                        <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400 flex items-center gap-1.5 border-b border-slate-50 dark:border-white/10">
                                                            <span className="material-symbols-outlined text-[13px]">label</span>
                                                            <span>Suggested Purposes</span>
                                                        </div>
                                                        <div className="p-1 space-y-0.5">
                                                            {(filteredPurposes.length > 0 ? filteredPurposes : lastPurposesRef.current).map((purp, idx) => (
                                                                <button
                                                                    key={purp}
                                                                    type="button"
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        setPurpose(purp);
                                                                        setIsPurposeFocused(false);
                                                                    }}
                                                                    className={clsx(
                                                                        "w-full px-3.5 py-2.5 rounded-xl text-left flex items-center justify-between text-sm transition-colors",
                                                                        idx === purposeHighlightIndex ? "bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white font-semibold" : "hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-zinc-300"
                                                                    )}
                                                                >
                                                                    <div className="flex items-center gap-2.5">
                                                                        <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-200 flex items-center justify-center text-xs border border-slate-200/60 dark:border-white/10">
                                                                            <span className="material-symbols-outlined text-[14px]">local_offer</span>
                                                                        </div>
                                                                        <span>{purp}</span>
                                                                    </div>
                                                                    <span className="material-symbols-outlined text-[16px] text-slate-400 dark:text-zinc-500">north_west</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* Profile Selection */}
                                        <CustomSelect
                                            label={t('profiles')}
                                            icon="group"
                                            value={selectedProfile}
                                            onChange={setSelectedProfile}
                                            options={profiles.map(p => ({ id: p.id, name: p.name }))}
                                            direction="up"
                                        />

                                        {/* Due Date */}
                                        <CustomDatePicker
                                            label={t('due_date')}
                                            value={dueDate}
                                            onChange={setDueDate}
                                            direction="up"
                                        />
                                    </div>

                                    {/* Submit Button */}
                                    <button
                                        type="submit"
                                        disabled={!isFormValid}
                                        className={clsx(
                                            "m3-btn m3-btn-filled w-full shadow-lg shadow-primary/20 mt-4 transition-all",
                                            !isFormValid && "opacity-40 cursor-not-allowed shadow-none"
                                        )}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">{debtId ? 'save' : 'add'}</span>
                                        {debtId ? t('save') : t('add_debt')}
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
