"use client";

import { useAppStore } from "@/store/appStore";
import { useDatabase } from "@/db/DatabaseProvider";
import { useEffect, useState, useMemo, FormEvent } from "react";
import { TransactionDocType, ProfileDocType, CategoryDocType } from "@/db/schema";
import { v4 as uuidv4 } from "uuid";
import clsx from 'clsx';
import { motion, AnimatePresence } from "framer-motion";
import CustomSelect from "@/components/CustomSelect";
import PriceInput from "@/components/PriceInput";
import CustomDatePicker from "@/components/CustomDatePicker";
import AddCategoryModal from "@/components/AddCategoryModal";
import { ActionModal } from "@/components/ActionModal";
import { useI18n } from "@/hooks/useI18n";
import { mutate, softDelete } from "@/sync/mutate";
import { triggerHaptic } from "@/utils/haptics";
import { evaluateMathExpression } from "@/utils/mathEval";

const CATEGORY_KEYWORD_MAP: Record<string, string[]> = {
    food: ['coffee', 'starbucks', 'mcdonald', 'burger', 'pizza', 'lunch', 'dinner', 'breakfast', 'restaurant', 'cafe', 'bar', 'drinks', 'snack', 'subway', 'chipotle', 'eats', 'doordash', 'zomato', 'swiggy', 'boba', 'bakery', 'tea', 'dining', 'beer', 'cocktail', 'sandwich', 'kfc', 'taco'],
    transport: ['uber', 'lyft', 'taxi', 'gas', 'fuel', 'petrol', 'parking', 'metro', 'train', 'subway', 'bus', 'flight', 'airline', 'toll', 'ola', 'auto', 'transit', 'car', 'cab', 'airline'],
    shopping: ['groceries', 'supermarket', 'walmart', 'target', 'amazon', 'costco', 'trader', 'market', 'clothes', 'shoes', 'mall', 'ikea', 'shopping', 'store', 'apparel', 'zara', 'h&m'],
    housing: ['rent', 'electricity', 'water', 'wifi', 'internet', 'power', 'maintenance', 'repair', 'plumber', 'cleaning', 'utilities', 'home', 'mortgage', 'lease'],
    entertainment: ['netflix', 'spotify', 'movie', 'cinema', 'theatre', 'concert', 'game', 'playstation', 'steam', 'disney', 'hulu', 'hbo', 'club', 'party', 'youtube', 'apple tv'],
    health: ['gym', 'fitness', 'doctor', 'hospital', 'pharmacy', 'medicine', 'dental', 'clinic', 'workout', 'yoga', 'vitamins', 'dentist', 'therapy', 'medical'],
    work: ['salary', 'freelance', 'client', 'payroll', 'consulting', 'bonus', 'invoice', 'dividend', 'stipend'],
    education: ['books', 'course', 'tuition', 'udemy', 'coursera', 'school', 'university', 'college', 'exam'],
};

interface LogExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactionId?: string;
    initialCategoryName?: string;
    initialType?: "expense" | "income";
}

export default function LogExpenseModal({ isOpen, onClose, transactionId, initialCategoryName, initialType }: LogExpenseModalProps) {
    const { activeProfileId, showToast, initialTransactionType } = useAppStore();
    const db = useDatabase();
    const { t } = useI18n();

    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [type, setType] = useState<"expense" | "income">("expense");
    const [selectedProfile, setSelectedProfile] = useState(activeProfileId);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString());

    const [profiles, setProfiles] = useState<ProfileDocType[]>([]);
    const [categories, setCategories] = useState<CategoryDocType[]>([]);
    const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isReady, setIsReady] = useState(false);
    useEffect(() => { if (!isOpen) setIsReady(false); }, [isOpen]);

    useEffect(() => {
        const sub = db.profiles.find({ selector: { _deleted: false } }).$.subscribe(docs => {
            setProfiles(docs.map(d => d.toJSON() as ProfileDocType));
        });
        return () => sub.unsubscribe();
    }, [db]);

    useEffect(() => {
        if (!selectedProfile) return;
        const sub = db.categories.find({
            selector: {
                _deleted: false,
                profile_id: selectedProfile
            }
        }).$.subscribe(docs => {
            const catDocs = docs.map(d => d.toJSON() as CategoryDocType);
            setCategories(catDocs);
            // Auto-select first category if none selected
            if (catDocs.length > 0 && !selectedCategory) {
                setSelectedCategory(catDocs[0].id);
            }
        });
        return () => sub.unsubscribe();
    }, [db, selectedProfile, selectedCategory]);

    // Anti-Duplicate Radar: track recent transactions (last 30 mins)
    const [recentTransactions, setRecentTransactions] = useState<TransactionDocType[]>([]);
    useEffect(() => {
        if (!isOpen) return;
        const thirtyMinsAgo = Date.now() - 30 * 60 * 1000;
        const sub = db.transactions.find({
            selector: {
                timestamp: { $gte: thirtyMinsAgo },
                _deleted: false,
            }
        }).$.subscribe(docs => {
            setRecentTransactions(docs.map(d => d.toJSON() as TransactionDocType));
        });
        return () => sub.unsubscribe();
    }, [isOpen, db]);

    // Match and auto-select initialCategoryName when passed (e.g. from empty state suggestion pills)
    useEffect(() => {
        if (!isOpen || transactionId || !initialCategoryName || categories.length === 0) return;
        const target = initialCategoryName.toLowerCase().trim();

        // Check exact or partial match first
        const directMatch = categories.find(c => {
            const name = c.name.toLowerCase().trim();
            return name === target || name.includes(target) || target.includes(name);
        });

        if (directMatch) {
            setSelectedCategory(directMatch.id);
            return;
        }

        // Common aliases mapping to avoid creating redundant categories
        const aliasMap: Record<string, string[]> = {
            'food & drinks': ['dining', 'food', 'groceries', 'coffee', 'cafe', 'restaurant', 'meals'],
            'transport': ['transit', 'fuel', 'gas', 'commute', 'metro', 'taxi', 'ride'],
            'shopping': ['groceries', 'supermarket', 'retail', 'clothes', 'supplies'],
            'housing': ['rent', 'utilities', 'bills', 'home', 'maintenance'],
            'entertainment': ['movies', 'fun', 'games', 'leisure', 'events']
        };

        const aliasMatch = categories.find(c => {
            const cName = c.name.toLowerCase().trim();
            for (const [canonical, aliases] of Object.entries(aliasMap)) {
                if (cName.includes(canonical) || canonical.includes(cName)) {
                    if (aliases.includes(target)) return true;
                }
            }
            return false;
        });

        if (aliasMatch) {
            setSelectedCategory(aliasMatch.id);
        } else if (categories.length > 0) {
            setSelectedCategory(categories[0].id);
        }
    }, [isOpen, transactionId, initialCategoryName, categories]);

    // Smart Category Suggestion from Note Keywords
    const suggestedCategory = useMemo(() => {
        if (!note.trim() || categories.length === 0) return null;
        const lowerNote = note.toLowerCase();

        for (const [group, keywords] of Object.entries(CATEGORY_KEYWORD_MAP)) {
            const hasKeyword = keywords.some(k => lowerNote.includes(k));
            if (hasKeyword) {
                // Find category matching group name or keyword
                const matched = categories.find(c => {
                    const cName = c.name.toLowerCase();
                    return cName.includes(group) || keywords.some(k => cName.includes(k));
                });
                if (matched && matched.id !== selectedCategory) {
                    return matched;
                }
            }
        }
        return null;
    }, [note, categories, selectedCategory]);

    // Handle initial state or load transaction data if editing
    useEffect(() => {
        if (isOpen) {
            if (transactionId) {
                db.transactions.findOne(transactionId).exec().then((doc) => {
                    if (doc) {
                        const data = doc.toJSON() as TransactionDocType;
                        setAmount(data.amount.toString());
                        setNote(data.note || "");
                        setType(data.type);
                        setSelectedProfile(data.profile_id);
                        setSelectedCategory(data.category_id || "");
                        setSelectedDate(new Date(data.timestamp).toISOString());
                    }
                });
            } else {
                setAmount("");
                setNote("");
                setType(initialType || initialTransactionType || "expense");
                setSelectedDate(new Date().toISOString());
                setSelectedCategory("");
                if (activeProfileId) {
                    setSelectedProfile(activeProfileId);
                }
            }
        }
    }, [isOpen, transactionId, initialType, initialTransactionType, activeProfileId, db]);

    const evaluatedAmountNumber = useMemo(() => {
        const hasMath = /[+\-*/xX()÷]/.test(amount);
        if (hasMath) {
            return evaluateMathExpression(amount);
        }
        const parsed = parseFloat(amount);
        return isNaN(parsed) || !isFinite(parsed) ? null : parsed;
    }, [amount]);

    // Anti-Duplicate Radar Check
    const duplicateWarning = useMemo(() => {
        if (transactionId || evaluatedAmountNumber === null || evaluatedAmountNumber <= 0) return null;
        const match = recentTransactions.find(t =>
            t.type === type &&
            t.profile_id === selectedProfile &&
            (t.category_id === selectedCategory || (!selectedCategory && true)) &&
            Math.abs(t.amount - evaluatedAmountNumber) < 0.01
        );
        if (!match) return null;
        const minsAgo = Math.max(1, Math.round((Date.now() - match.timestamp) / 60000));
        return {
            matchedTx: match,
            minsAgo,
        };
    }, [transactionId, evaluatedAmountNumber, selectedCategory, type, selectedProfile, recentTransactions]);

    const isFormValid = evaluatedAmountNumber !== null && evaluatedAmountNumber > 0 && !!selectedCategory;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!isFormValid || evaluatedAmountNumber === null) return;

        try {
            triggerHaptic('success');
            if (transactionId) {
                const doc = await db.transactions.findOne(transactionId).exec();
                if (doc) {
                    await mutate(db.transactions, transactionId, {
                        profile_id: selectedProfile,
                        category_id: selectedCategory,
                        amount: evaluatedAmountNumber,
                        type: type,
                        note: note,
                        timestamp: new Date(selectedDate).getTime(),
                    });
                    showToast('Transaction updated', 'success');
                }
            } else {
                await mutate(db.transactions, uuidv4(), {
                    profile_id: selectedProfile,
                    category_id: selectedCategory,
                    amount: evaluatedAmountNumber,
                    type: type,
                    note: note,
                    timestamp: new Date(selectedDate).getTime(),
                    tag_ids: [],
                });
                showToast(type === 'expense' ? 'Expense logged' : 'Income logged', 'success');
            }

            // Reset and close
            setAmount("");
            setNote("");
            setSelectedCategory("");
            onClose();
        } catch (error) {
            console.error("Failed to save transaction", error);
            showToast('Failed to save transaction', 'error');
        }
    };

    const confirmDelete = async () => {
        if (!transactionId) return;
        setIsDeleting(true);
        try {
            triggerHaptic('medium');
            const doc = await db.transactions.findOne(transactionId).exec();
            if (doc) {
                await softDelete(db.transactions, transactionId);
                showToast('Transaction deleted', 'info');
            }
            setIsDeleteModalOpen(false);
            onClose();
        } catch (error) {
            console.error("Failed to delete transaction", error);
            showToast('Failed to delete transaction', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            key="log-expense-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[90] pointer-events-auto"
                        />

                        {/* Modal Container */}
                        <div key="log-expense-modal-container" className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
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
                                            className="m3-icon-btn text-slate-400 dark:text-zinc-300 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
                                            aria-label="Close modal"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">close</span>
                                        </button>
                                        <div className="text-center absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                                            <h2 className="text-xl font-black text-slate-900 dark:text-white">
                                                {transactionId ? (t('edit') || 'Edit Transaction') : t('log_expense')}
                                            </h2>
                                            <p className="text-slate-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider leading-tight">
                                                {transactionId ? (t('update_entry') || 'Update your entry') : t('log_entry_desc')}
                                            </p>
                                        </div>
                                        <div className="w-10"></div>
                                    </div>
                                </header>

                                <div className="flex-1 overflow-y-auto px-6 pb-12 pt-6">
                                    <form onSubmit={handleSubmit} className="w-full space-y-6">
                                        {/* Type Selection */}
                                        <div className="flex bg-slate-100 dark:bg-black/40 p-1 rounded-full mb-6 w-full relative shadow-[inset_0_1px_4px_rgba(0,0,0,0.06)] dark:border dark:border-white/10">
                                            <div
                                                className={clsx(
                                                    "absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-white rounded-full shadow-sm transition-transform duration-200 ease-out pointer-events-none z-0",
                                                    type === "expense" ? "left-1 translate-x-0" : "left-1 translate-x-full"
                                                )}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setType("expense");
                                                    triggerHaptic("light");
                                                }}
                                                className={clsx(
                                                    "flex-1 text-sm font-semibold h-11 rounded-full transition-colors relative z-10 flex items-center justify-center gap-2 px-4 cursor-pointer",
                                                    type === "expense" ? "text-slate-900 dark:text-black font-bold" : "text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-white"
                                                )}
                                            >
                                                <span className={clsx(
                                                    "material-symbols-outlined text-[19px] transition-colors",
                                                    type === "expense" ? "text-rose-500 dark:text-rose-600" : "text-slate-400 dark:text-zinc-500"
                                                )}>
                                                    arrow_upward
                                                </span>
                                                <span>{t('expense')}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setType("income");
                                                    triggerHaptic("light");
                                                }}
                                                className={clsx(
                                                    "flex-1 text-sm font-semibold h-11 rounded-full transition-colors relative z-10 flex items-center justify-center gap-2 px-4 cursor-pointer",
                                                    type === "income" ? "text-slate-900 dark:text-black font-bold" : "text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-white"
                                                )}
                                            >
                                                <span className={clsx(
                                                    "material-symbols-outlined text-[19px] transition-colors",
                                                    type === "income" ? "text-emerald-600 dark:text-emerald-700" : "text-slate-400 dark:text-zinc-500"
                                                )}>
                                                    arrow_downward
                                                </span>
                                                <span>{t('income')}</span>
                                            </button>
                                        </div>

                                        <div className="flex flex-col items-center">
                                            <PriceInput
                                                value={amount}
                                                onChange={setAmount}
                                                placeholder="0.00"
                                                isReady={isReady}
                                            />

                                            {/* Anti-Duplicate Radar Warning */}
                                            <AnimatePresence>
                                                {duplicateWarning && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -4 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -4 }}
                                                        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs mt-3 text-amber-900 dark:text-amber-200"
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="material-symbols-outlined text-[17px] text-amber-500 shrink-0">history</span>
                                                            <span className="truncate">
                                                                Logged similar {duplicateWarning.minsAgo}m ago: <strong>{duplicateWarning.matchedTx.note || 'Expense'}</strong>
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full shrink-0 ml-2">
                                                            Duplicate?
                                                        </span>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        <div className="space-y-6">
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

                                                {/* Date Selection */}
                                                <CustomDatePicker
                                                    label={t('date')}
                                                    value={selectedDate}
                                                    onChange={setSelectedDate}
                                                    direction="up"
                                                />
                                            </div>

                                            {/* Category Selection */}
                                            <CustomSelect
                                                label={t('category')}
                                                icon="category"
                                                value={selectedCategory}
                                                onChange={setSelectedCategory}
                                                options={categories.map(c => ({ id: c.id, name: c.name, icon: c.icon }))}
                                                direction="up"
                                                onAddClick={() => setIsAddCategoryModalOpen(true)}
                                                onDeleteItem={async (id) => {
                                                    if (id.startsWith('cat-')) return;
                                                    try {
                                                        await softDelete(db.categories, id);
                                                    } catch (error) {
                                                        console.error("Failed to delete category", error);
                                                    }
                                                }}
                                            />

                                            {/* Remarks */}
                                            <div className="space-y-2">
                                                <label className="block text-sm font-semibold text-slate-600 dark:text-zinc-300 px-1">{t('remarks')}</label>
                                                <div className="relative">
                                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 z-10 pointer-events-none">description</span>
                                                    <input
                                                        type="text"
                                                        value={note}
                                                        onChange={(e) => setNote(e.target.value)}
                                                        placeholder={t('add_remarks')}
                                                        className="w-full h-14 pl-12 pr-4 bg-slate-50 dark:bg-[#1E2020] border border-slate-200 dark:border-white/10 rounded-full focus:outline-none focus:ring-2 focus:ring-primary text-base font-medium dark:text-[#E3E3E3] placeholder:text-slate-400 dark:placeholder:text-[#8A8D8B]"
                                                    />
                                                </div>

                                                {/* Smart Category Auto-Detection Suggestion Pill */}
                                                <AnimatePresence>
                                                    {suggestedCategory && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -4 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -4 }}
                                                            className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-amber-50/90 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 text-xs mt-2"
                                                        >
                                                            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300">
                                                                <span className="material-symbols-outlined text-[17px] text-amber-600 dark:text-amber-400">auto_awesome</span>
                                                                <span>Detected: <strong>{suggestedCategory.name}</strong></span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    triggerHaptic('success');
                                                                    setSelectedCategory(suggestedCategory.id);
                                                                }}
                                                                className="px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 active:scale-95 transition-all cursor-pointer shadow-xs"
                                                            >
                                                                Switch
                                                            </button>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            {/* Submit / Action Buttons */}
                                            {transactionId ? (
                                                <div className="flex items-center gap-3 mt-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsDeleteModalOpen(true)}
                                                        className="h-12 px-4 rounded-full bg-rose-50 hover:bg-rose-100/90 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 font-semibold text-sm flex items-center gap-1.5 transition-all active:scale-95 shrink-0 cursor-pointer shadow-2xs"
                                                        title="Delete Transaction"
                                                        aria-label="Delete Transaction"
                                                    >
                                                        <span className="material-symbols-outlined text-[19px]">delete</span>
                                                        <span>Delete</span>
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        disabled={!isFormValid}
                                                        className={clsx(
                                                            "m3-btn m3-btn-filled flex-1 shadow-lg shadow-primary/20 transition-all",
                                                            !isFormValid && "opacity-40 cursor-not-allowed shadow-none"
                                                        )}
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">save</span>
                                                        {t('save')}
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    type="submit"
                                                    disabled={!isFormValid}
                                                    className={clsx(
                                                        "m3-btn m3-btn-filled w-full shadow-lg shadow-primary/20 mt-4 transition-all",
                                                        !isFormValid && "opacity-40 cursor-not-allowed shadow-none"
                                                    )}
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">add</span>
                                                    {t('log_transaction')}
                                                </button>
                                            )}
                                        </div>
                                    </form>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>

            <AddCategoryModal
                isOpen={isAddCategoryModalOpen}
                onClose={() => setIsAddCategoryModalOpen(false)}
                profileId={selectedProfile}
            />

            <ActionModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Transaction?"
                description="Are you sure you want to delete this transaction? This action cannot be undone."
                confirmLabel="Delete"
                confirmVariant="danger"
                onConfirm={confirmDelete}
                isConfirmLoading={isDeleting}
            />
        </>
    );
}
