"use client";

import { useAppStore } from "@/store/appStore";
import { useDatabase } from "@/db/DatabaseProvider";
import { useEffect, useState, useMemo } from "react";
import { DebtDocType } from "@/db/schema";
import { useRouter } from "next/navigation";
import clsx from 'clsx';
import { EmptyState } from "@/components/EmptyState";
import { useI18n } from "@/hooks/useI18n";
import AddDebtModal from "@/components/AddDebtModal";
import { ActionModal } from "@/components/ActionModal";
import { motion, AnimatePresence } from "framer-motion";

export default function DebtsPage() {
    const router = useRouter();
    const { activeProfileId } = useAppStore();
    const { t } = useI18n();
    const db = useDatabase();

    const [debts, setDebts] = useState<DebtDocType[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<'active' | 'settled'>('active');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingDebtId, setEditingDebtId] = useState<string | undefined>(undefined);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [debtToDeleteId, setDebtToDeleteId] = useState<string | null>(null);

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

        return () => sub.unsubscribe();
    }, [activeProfileId, db]);

    const filteredDebts = useMemo(() => {
        return debts.filter(debt => {
            const matchesSearch = debt.person_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (debt.purpose || "").toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = debt.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [debts, searchQuery, statusFilter]);

    // Calculate totals for the summary dashboard
    const totals = useMemo(() => {
        return debts.reduce((acc, debt) => {
            if (debt.status === 'active') {
                if (debt.type === 'lent') acc.lent += debt.amount;
                else acc.owe += debt.amount;
            }
            return acc;
        }, { lent: 0, owe: 0 });
    }, [debts]);

    const groupedDebts = useMemo(() => {
        const groups: Record<string, {
            personName: string;
            totalLent: number;
            totalOwe: number;
            items: DebtDocType[];
        }> = {};

        filteredDebts.forEach(debt => {
            const personKey = debt.person_name.trim().toLowerCase();

            if (!groups[personKey]) {
                groups[personKey] = {
                    personName: debt.person_name.trim(),
                    totalLent: 0,
                    totalOwe: 0,
                    items: []
                };
            }

            const pGroup = groups[personKey];
            pGroup.items.push(debt);

            if (debt.type === 'lent') {
                pGroup.totalLent += debt.amount;
            } else {
                pGroup.totalOwe += debt.amount;
            }
        });

        // Sort items within each group by date (descending)
        Object.values(groups).forEach(group => {
            group.items.sort((a, b) => b.created_at - a.created_at);
        });

        return Object.values(groups).sort((a, b) => a.personName.localeCompare(b.personName));
    }, [filteredDebts]);

    const handleToggleStatus = async (debt: DebtDocType) => {
        try {
            const doc = await db.debts.findOne(debt.id).exec();
            if (doc) {
                await doc.patch({
                    status: debt.status === 'active' ? 'settled' : 'active',
                    _modified: Date.now()
                });
            }
        } catch (error) {
            console.error("Failed to update debt status", error);
        }
    };

    const handleDelete = (id: string) => {
        setDebtToDeleteId(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!debtToDeleteId) return;
        try {
            const doc = await db.debts.findOne(debtToDeleteId).exec();
            if (doc) {
                await doc.remove();
            }
            setIsDeleteModalOpen(false);
            setDebtToDeleteId(null);
        } catch (error) {
            console.error("Failed to delete debt", error);
        }
    };

    const openEditModal = (id: string) => {
        setEditingDebtId(id);
        setIsAddModalOpen(true);
    };

    const closeAddModal = () => {
        setIsAddModalOpen(false);
        setEditingDebtId(undefined);
    };

    const [expandedPerson, setExpandedPerson] = useState<string | null>(null);

    const toggleExpand = (personName: string) => {
        setExpandedPerson(expandedPerson === personName ? null : personName);
    };

    return (
        <main className="flex-1 overflow-y-auto px-4 pb-24 min-h-screen bg-slate-50/50 overflow-x-hidden">
            <header className="sticky top-0 z-20 bg-slate-50/80 backdrop-blur-md py-4 flex items-center justify-between -mx-6 px-6">
                <button
                    onClick={() => router.back()}
                    className="w-10 h-10 rounded-full hover:bg-white transition-all flex items-center justify-center shadow-sm border border-slate-100"
                >
                    <span className="material-symbols-outlined text-slate-600 text-[20px]">arrow_back</span>
                </button>
                <div className="text-center">
                    <h1 className="text-lg font-black text-slate-900 leading-tight">{t('debts')}</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{filteredDebts.length} {t('transactions')}</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="w-10 h-10 rounded-full bg-primary text-white shadow-lg shadow-primary/25 flex items-center justify-center active:scale-95 transition-transform"
                >
                    <span className="material-symbols-outlined text-[24px]">add</span>
                </button>
            </header>

            {/* Summary Dashboard */}
            <div className="mt-2 grid grid-cols-2 gap-3">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-4 rounded-[24px] shadow-sm border border-slate-100 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider relative z-10">{t('you_lent')}</p>
                    <p className="text-xl font-black text-green-600 mt-1 relative z-10 mt-2">
                        ${totals.lent.toLocaleString()}
                    </p>
                    <span className="material-symbols-outlined absolute bottom-3 right-3 text-green-100 text-3xl opacity-50">arrow_upward</span>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white p-4 rounded-[24px] shadow-sm border border-slate-100 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider relative z-10">{t('you_owe')}</p>
                    <p className="text-xl font-black text-red-600 mt-1 relative z-10">
                        ${totals.owe.toLocaleString()}
                    </p>
                    <span className="material-symbols-outlined absolute bottom-3 right-3 text-red-100 text-3xl opacity-50">arrow_downward</span>
                </motion.div>
            </div>

            {/* Search and Filters */}
            <div className="mt-4 space-y-4">
                <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary text-[20px]">search</span>
                    <input
                        type="text"
                        placeholder="Search debts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-12 pl-12 pr-4 bg-white border border-slate-100 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm shadow-sm transition-all"
                    />
                </div>

                <div className="flex bg-slate-100 p-1 rounded-full w-full relative shadow-[inset_0_1px_4px_rgba(0,0,0,0.05)]">
                    <button
                        onClick={() => setStatusFilter('active')}
                        className={clsx(
                            "flex-1 h-11 text-xs font-bold rounded-xl transition-all relative z-10 flex items-center justify-center gap-2",
                            statusFilter === 'active' ? "text-slate-900" : "text-slate-500"
                        )}
                    >
                        <span className="material-symbols-outlined text-[18px]">pending_actions</span>
                        {t('active')}
                        {statusFilter === 'active' && (
                            <motion.div
                                layoutId="status-bg"
                                className="absolute inset-0 bg-white rounded-xl shadow-sm -z-10"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setStatusFilter('settled')}
                        className={clsx(
                            "flex-1 h-11 text-xs font-bold rounded-xl transition-all relative z-10 flex items-center justify-center gap-2",
                            statusFilter === 'settled' ? "text-slate-900" : "text-slate-500"
                        )}
                    >
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        {t('settled')}
                        {statusFilter === 'settled' && (
                            <motion.div
                                layoutId="status-bg"
                                className="absolute inset-0 bg-white rounded-xl shadow-sm -z-10"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                    </button>
                </div>
            </div>

            {/* Debt List */}
            <section className="mt-4 pb-12">
                <AnimatePresence mode="popLayout">
                    {groupedDebts.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                        >
                            <EmptyState
                                type="transactions"
                                title={t('no_debts')}
                                description={t('debts_desc')}
                                action={{
                                    label: t('add_debt'),
                                    onClick: () => setIsAddModalOpen(true)
                                }}
                            />
                        </motion.div>
                    ) : (
                        <div className="space-y-4">
                            {groupedDebts.map((group) => {
                                const isExpanded = expandedPerson === group.personName;
                                const netBalance = group.totalLent - group.totalOwe;

                                return (
                                    <motion.div
                                        key={group.personName}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white rounded-[28px] shadow-sm border border-slate-100 overflow-hidden transition-all duration-300"
                                    >
                                        <div
                                            className={clsx(
                                                "p-4 flex items-center gap-4 cursor-pointer transition-colors",
                                                isExpanded ? "bg-slate-50/50" : "hover:bg-slate-50/30"
                                            )}
                                            onClick={() => toggleExpand(group.personName)}
                                        >
                                            <div className={clsx(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black shadow-sm transition-transform active:scale-90",
                                                netBalance >= 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                            )}>
                                                {group.personName.charAt(0).toUpperCase()}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-slate-800 truncate text-base">{group.personName}</h3>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                    {group.items.length} {group.items.length === 1 ? t('transaction') : t('transactions')}
                                                </p>
                                            </div>

                                            <div className="text-right flex items-center gap-3">
                                                <div className="flex flex-col items-end">
                                                    <p className={clsx(
                                                        "font-black text-lg leading-tight",
                                                        netBalance >= 0 ? "text-green-600" : "text-red-600"
                                                    )}>
                                                        {netBalance > 0 ? '+' : ''}${netBalance.toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className={clsx(
                                                    "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                                                    isExpanded ? "bg-primary text-white" : "bg-slate-50 text-slate-300"
                                                )}>
                                                    <span className={clsx(
                                                        "material-symbols-outlined text-[20px] transition-transform duration-300",
                                                        isExpanded && "rotate-180"
                                                    )}>
                                                        expand_more
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="bg-slate-50/30 backdrop-blur-md"
                                                >
                                                    <div className="px-4 pb-1 space-y-2">
                                                        <div className="h-px bg-slate-100 mb-2 mx-2" />
                                                        {group.items.map((debt) => (
                                                            <div
                                                                key={debt.id}
                                                                className="group/item mb-0 flex items-center gap-4 p-3 px-0 bg-white/60 hover:bg-white rounded-[20px] transition-all border border-transparent hover:border-slate-100 hover:shadow-md cursor-pointer"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openEditModal(debt.id);
                                                                }}
                                                            >
                                                                <div className={clsx(
                                                                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                                                                    debt.type === 'lent' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                                                                )}>
                                                                    <span className="material-symbols-outlined text-[20px]">
                                                                        {debt.type === 'lent' ? 'north_east' : 'south_west'}
                                                                    </span>
                                                                </div>

                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="text-sm font-bold text-slate-700 truncate">
                                                                            {debt.purpose || t('purpose')}
                                                                        </p>
                                                                    </div>
                                                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">
                                                                        {new Date(debt.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                    </p>
                                                                </div>

                                                                <div className="text-right flex items-center gap-4">
                                                                    <p className={clsx(
                                                                        "text-base font-black transition-opacity",
                                                                        debt.status === 'settled' ? "text-slate-300" : (debt.type === 'lent' ? "text-green-600" : "text-red-600")
                                                                    )}>
                                                                        ${debt.amount.toLocaleString()}
                                                                    </p>
                                                                    <div className="flex items-center gap-1 transition-opacity">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleToggleStatus(debt);
                                                                            }}
                                                                            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-primary transition-colors active:scale-90"
                                                                        >
                                                                            <span className="material-symbols-outlined text-[18px]">
                                                                                {debt.status === 'active' ? 'done' : 'undo'}
                                                                            </span>
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleDelete(debt.id);
                                                                            }}
                                                                            className="w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors active:scale-90"
                                                                        >
                                                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </AnimatePresence>
            </section>

            <AddDebtModal
                isOpen={isAddModalOpen}
                onClose={closeAddModal}
                debtId={editingDebtId}
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
        </main>
    );
}
