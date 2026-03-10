"use client";

import { useState, FormEvent, useEffect } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useDatabase } from "@/db/DatabaseProvider";
import { useAppStore } from "@/store/appStore";
import { v4 as uuidv4 } from "uuid";
import { ProfileDocType } from "@/db/schema";
import clsx from "clsx";
import CustomSelect from "@/components/CustomSelect";
import PriceInput from "@/components/PriceInput";
import CustomDatePicker from "@/components/CustomDatePicker";
import { useI18n } from "@/hooks/useI18n";

interface AddDebtModalProps {
    isOpen: boolean;
    onClose: () => void;
    debtId?: string; // If provided, we are editing
}

export default function AddDebtModal({ isOpen, onClose, debtId }: AddDebtModalProps) {
    const db = useDatabase();
    const { activeProfileId } = useAppStore();
    const { t } = useI18n();
    const dragControls = useDragControls();

    const [amount, setAmount] = useState("");
    const [personName, setPersonName] = useState("");
    const [purpose, setPurpose] = useState("");
    const [type, setType] = useState<"owe" | "lent">("lent");
    const [dueDate, setDueDate] = useState("");
    const [selectedProfile, setSelectedProfile] = useState(activeProfileId);
    const [profiles, setProfiles] = useState<ProfileDocType[]>([]);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const sub = db.profiles.find({ selector: { _deleted: false } }).$.subscribe(docs => {
            setProfiles(docs.map(d => d.toJSON() as ProfileDocType));
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
            setPersonName("");
            setPurpose("");
            setType("lent");
            setDueDate("");
            setSelectedProfile(activeProfileId);
        }

        return () => sub.unsubscribe();
    }, [db, debtId, isOpen, activeProfileId]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!amount || isNaN(Number(amount)) || !personName) return;

        try {
            const debtData = {
                id: debtId || uuidv4(),
                profile_id: selectedProfile,
                person_name: personName,
                amount: Number(amount),
                type: type,
                purpose: purpose,
                due_date: dueDate ? new Date(dueDate).getTime() : undefined,
                created_at: debtId ? undefined : Date.now(),
                status: 'active' as const,
                _deleted: false,
                _modified: Date.now()
            };

            if (debtId) {
                const doc = await db.debts.findOne(debtId).exec();
                if (doc) {
                    await doc.patch(debtData);
                }
            } else {
                await db.debts.insert(debtData as any);
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
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90] pointer-events-auto"
                    />

                    {/* Modal Content container */}
                    <div key="add-debt-modal-container" className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
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
                                    <h2 className="text-xl font-black text-slate-900">{debtId ? t('edit') : t('add_debt')}</h2>
                                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider leading-tight">{debtId ? t('update_entry') : t('log_debt_desc')}</p>
                                </div>
                            </header>

                            <div className="flex-1 overflow-y-auto px-6 pb-10 pt-6">
                                <form onSubmit={handleSubmit} className="w-full space-y-6">
                                    {/* Type Selection */}
                                    <div className="flex bg-slate-100 p-1 rounded-full mb-6 w-full relative shadow-[inset_0_2px_8px_rgba(0,0,0,0.15)]">
                                        <button
                                            type="button"
                                            onClick={() => setType("lent")}
                                            className={clsx(
                                                "flex-1 text-sm font-bold h-12 rounded-full transition-colors relative z-10 flex items-center justify-center gap-2 px-4",
                                                type === "lent" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                                            )}
                                        >
                                            <div className="w-6 h-6 flex items-center justify-center shrink-0">
                                                <AnimatePresence mode="wait" initial={false}>
                                                    {type === "lent" ? (
                                                        <motion.svg
                                                            key="lent-icon"
                                                            initial={{ scale: 0.5, opacity: 0 }}
                                                            animate={{ scale: 1, opacity: 1 }}
                                                            exit={{ scale: 0.5, opacity: 0 }}
                                                            width="20"
                                                            height="20"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2.5"
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
                                                            key="lent-placeholder"
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
                                            <motion.span layout transition={{ type: "spring", bounce: 0, duration: 0.4 }}>{t('lent')}</motion.span>
                                            {type === "lent" && (
                                                <motion.div
                                                    layoutId="debt-type-bg"
                                                    className="absolute inset-0 bg-white rounded-full shadow-sm -z-10"
                                                />
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setType("owe")}
                                            className={clsx(
                                                "flex-1 text-sm font-bold h-12 rounded-full transition-colors relative z-10 flex items-center justify-center gap-2 px-4",
                                                type === "owe" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
                                            )}
                                        >
                                            <div className="w-6 h-6 flex items-center justify-center shrink-0">
                                                <AnimatePresence mode="wait" initial={false}>
                                                    {type === "owe" ? (
                                                        <motion.svg
                                                            key="owe-icon"
                                                            initial={{ scale: 0.5, opacity: 0 }}
                                                            animate={{ scale: 1, opacity: 1 }}
                                                            exit={{ scale: 0.5, opacity: 0 }}
                                                            width="20"
                                                            height="20"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2.5"
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
                                                            key="owe-placeholder"
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
                                            <motion.span layout transition={{ type: "spring", bounce: 0, duration: 0.4 }}>{t('owe')}</motion.span>
                                            {type === "owe" && (
                                                <motion.div
                                                    layoutId="debt-type-bg"
                                                    className="absolute inset-0 bg-white rounded-full shadow-sm -z-10"
                                                />
                                            )}
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

                                    {/* Person Name */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-600 px-1">{t('person')}</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-4 top-1/2 mt-1 -translate-y-1/2 text-slate-400 z-10 pointer-events-none">person</span>
                                            <input
                                                type="text"
                                                required
                                                value={personName}
                                                onChange={(e) => setPersonName(e.target.value)}
                                                placeholder={t('person_placeholder')}
                                                className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-full mt-2 focus:outline-none focus:ring-2 focus:ring-primary text-base font-medium"
                                            />
                                        </div>
                                    </div>

                                    {/* Purpose */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-600 px-1">{t('purpose')}</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-4 top-1/2 mt-1 -translate-y-1/2 text-slate-400 z-10 pointer-events-none">description</span>
                                            <input
                                                type="text"
                                                value={purpose}
                                                onChange={(e) => setPurpose(e.target.value)}
                                                placeholder={t('purpose_placeholder')}
                                                className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-full mt-2 focus:outline-none focus:ring-2 focus:ring-primary text-base font-medium"
                                            />
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
                                        className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-full shadow-lg shadow-primary/20 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined">{debtId ? 'save' : 'add'}</span>
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
