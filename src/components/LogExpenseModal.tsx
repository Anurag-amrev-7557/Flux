"use client";

import { useAppStore } from "@/store/appStore";
import { useDatabase } from "@/db/DatabaseProvider";
import { useEffect, useState, FormEvent } from "react";
import { TransactionDocType, ProfileDocType, CategoryDocType } from "@/db/schema";
import { v4 as uuidv4 } from "uuid";
import clsx from 'clsx';
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import CustomSelect from "@/components/CustomSelect";
import PriceInput from "@/components/PriceInput";
import CustomDatePicker from "@/components/CustomDatePicker";
import AddCategoryModal from "@/components/AddCategoryModal";
import { useI18n } from "@/hooks/useI18n";

interface LogExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LogExpenseModal({ isOpen, onClose }: LogExpenseModalProps) {
    const { activeProfileId } = useAppStore();
    const db = useDatabase();
    const { t } = useI18n();
    const dragControls = useDragControls();

    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [type, setType] = useState<"expense" | "income">("expense");
    const [selectedProfile, setSelectedProfile] = useState(activeProfileId);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString());

    const [profiles, setProfiles] = useState<ProfileDocType[]>([]);
    const [categories, setCategories] = useState<CategoryDocType[]>([]);
    const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
    const [isReady, setIsReady] = useState(false);

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

    // Update selected profile when activeProfileId changes or modal opens
    useEffect(() => {
        if (isOpen && activeProfileId) {
            setSelectedProfile(activeProfileId);
        }
    }, [isOpen, activeProfileId]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!amount || isNaN(Number(amount))) return;

        try {
            await db.transactions.insert({
                id: uuidv4(),
                profile_id: selectedProfile,
                category_id: selectedCategory,
                amount: Number(amount),
                type: type,
                note: note,
                timestamp: new Date(selectedDate).getTime(),
                tag_ids: [],
                _deleted: false,
                _modified: Date.now()
            });

            // Reset and close
            setAmount("");
            setNote("");
            onClose();
        } catch (error) {
            console.error("Failed to log transaction", error);
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
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90] pointer-events-auto"
                        />

                        {/* Modal Container */}
                        <div key="log-expense-modal-container" className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
                            <motion.div
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                onAnimationComplete={() => setIsReady(true)}
                                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                className="bg-white w-full max-w-md rounded-t-[32px] shadow-2xl overflow-hidden pointer-events-auto border-t border-slate-100 pb-safe origin-bottom max-h-[92vh] flex flex-col relative z-[100]"
                                drag="y"
                                dragControls={dragControls}
                                dragListener={false}
                                dragConstraints={{ top: 0, bottom: 0 }}
                                dragElastic={{ top: 0, bottom: 0.8 }}
                                onDragEnd={(_, info) => {
                                    if (info.offset.y > 100 || info.velocity.y > 500) {
                                        onClose();
                                    }
                                }}
                            >
                                {/* Modal Header */}
                                <header
                                    className="px-6 py-6 flex flex-col items-center sticky top-0 bg-white z-20 touch-none cursor-grab active:cursor-grabbing"
                                >
                                    <div className="text-center">
                                        <h2 className="text-xl font-black text-slate-900">{t('log_expense')}</h2>
                                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider leading-tight">{t('log_entry_desc')}</p>
                                    </div>
                                </header>

                                <div className="flex-1 overflow-y-auto px-6 pb-12 pt-6">
                                    <form onSubmit={handleSubmit} className="w-full space-y-6">
                                        {/* Type Selection */}
                                        <div className="flex bg-slate-100 p-1 rounded-full mb-6 w-full relative shadow-[inset_0_2px_8_rgba(0,0,0,0.15)]">
                                            <button
                                                type="button"
                                                onClick={() => setType("expense")}
                                                className={clsx(
                                                    "flex-1 text-sm font-bold h-12 rounded-full transition-colors relative z-10 flex items-center justify-center gap-2 px-4",
                                                    type === "expense" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                                                )}
                                            >
                                                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                                                    <AnimatePresence mode="wait" initial={false}>
                                                        {type === "expense" ? (
                                                            <motion.svg
                                                                key="expense-icon"
                                                                initial={{ scale: 0.2, opacity: 0 }}
                                                                animate={{ scale: 1, opacity: 1 }}
                                                                exit={{ scale: 0.2, opacity: 0 }}
                                                                width="18"
                                                                height="18"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="3"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            >
                                                                <motion.path
                                                                    initial={isReady ? { pathLength: 0, opacity: 0 } : { pathLength: 1, opacity: 1 }}
                                                                    animate={{ pathLength: 1, opacity: 1 }}
                                                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                                                    d="M12 19V5"
                                                                />
                                                                <motion.path
                                                                    initial={isReady ? { pathLength: 0, opacity: 0 } : { pathLength: 1, opacity: 1 }}
                                                                    animate={{ pathLength: 1, opacity: 1 }}
                                                                    transition={{ duration: 0.2, delay: 0.2, ease: "easeOut" }}
                                                                    d="m5 12 7-7 7 7"
                                                                />
                                                            </motion.svg>
                                                        ) : (
                                                            <motion.span
                                                                key="expense-placeholder"
                                                                initial={{ scale: 0.5, opacity: 0 }}
                                                                animate={{ scale: 1, opacity: 1 }}
                                                                exit={{ scale: 0.5, opacity: 0 }}
                                                                className="material-symbols-outlined text-[20px]"
                                                            >
                                                                arrow_upward
                                                            </motion.span>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                                <motion.span layout transition={{ type: "spring", bounce: 0, duration: 0.4 }}>{t('expense')}</motion.span>
                                                {type === "expense" && (
                                                    <motion.div
                                                        layoutId="type-bg"
                                                        className="absolute inset-0 bg-white rounded-full shadow-sm -z-10"
                                                    />
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setType("income")}
                                                className={clsx(
                                                    "flex-1 text-sm font-bold h-12 rounded-full transition-colors relative z-10 flex items-center justify-center gap-2 px-4",
                                                    type === "income" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                                                )}
                                            >
                                                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                                                    <AnimatePresence mode="wait" initial={false}>
                                                        {type === "income" ? (
                                                            <motion.svg
                                                                key="income-icon"
                                                                initial={{ scale: 0.2, opacity: 0 }}
                                                                animate={{ scale: 1, opacity: 1 }}
                                                                exit={{ scale: 0.2, opacity: 0 }}
                                                                width="18"
                                                                height="18"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="3"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            >
                                                                <motion.path
                                                                    initial={isReady ? { pathLength: 0, opacity: 0 } : { pathLength: 1, opacity: 1 }}
                                                                    animate={{ pathLength: 1, opacity: 1 }}
                                                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                                                    d="M12 5v14"
                                                                />
                                                                <motion.path
                                                                    initial={isReady ? { pathLength: 0, opacity: 0 } : { pathLength: 1, opacity: 1 }}
                                                                    animate={{ pathLength: 1, opacity: 1 }}
                                                                    transition={{ duration: 0.2, delay: 0.2, ease: "easeOut" }}
                                                                    d="m19 12-7 7-7-7"
                                                                />
                                                            </motion.svg>
                                                        ) : (
                                                            <motion.span
                                                                key="income-placeholder"
                                                                initial={{ scale: 0.5, opacity: 0 }}
                                                                animate={{ scale: 1, opacity: 1 }}
                                                                exit={{ scale: 0.5, opacity: 0 }}
                                                                className="material-symbols-outlined text-[20px]"
                                                            >
                                                                arrow_downward
                                                            </motion.span>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                                <motion.span layout transition={{ type: "spring", bounce: 0, duration: 0.4 }}>{t('income')}</motion.span>
                                                {type === "income" && (
                                                    <motion.div
                                                        layoutId="type-bg"
                                                        className="absolute inset-0 bg-white rounded-full shadow-sm -z-10"
                                                    />
                                                )}
                                            </button>
                                        </div>

                                        <div className="flex flex-col items-center">
                                            <PriceInput
                                                value={amount}
                                                onChange={setAmount}
                                                placeholder="0.00"
                                                isReady={isReady}
                                            />
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
                                                        const doc = await db.categories.findOne(id).exec();
                                                        if (doc) {
                                                            await doc.remove();
                                                        }
                                                    } catch (error) {
                                                        console.error("Failed to delete category", error);
                                                    }
                                                }}
                                            />

                                            {/* Remarks */}
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-600 px-1">{t('remarks')}</label>
                                                <div className="relative">
                                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none">description</span>
                                                    <input
                                                        type="text"
                                                        value={note}
                                                        onChange={(e) => setNote(e.target.value)}
                                                        placeholder={t('add_remarks')}
                                                        className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary text-base font-medium"
                                                    />
                                                </div>
                                            </div>

                                            {/* Submit Button */}
                                            <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-full shadow-lg shadow-primary/20 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2">
                                                <span className="material-symbols-outlined">add</span>
                                                {t('log_transaction')}
                                            </button>
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
        </>
    );
}
