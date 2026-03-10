"use client";

import { useAppStore } from "@/store/appStore";
import { useDatabase } from "@/db/DatabaseProvider";
import { useEffect, useState, useMemo } from "react";
import { TransactionDocType, ProfileDocType, CategoryDocType } from "@/db/schema";
import Link from 'next/link';
import { useRouter } from "next/navigation";
import clsx from 'clsx';
import { EmptyState } from "@/components/EmptyState";
import { NotificationOverlay } from "@/components/NotificationOverlay";
import { MenuOverlay } from "@/components/MenuOverlay";
import { useI18n } from "@/hooks/useI18n";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function DashboardContent() {
    const router = useRouter();
    const { activeProfileId } = useAppStore();
    const { t } = useI18n();
    const db = useDatabase();
    const searchParams = useSearchParams();

    const [profile, setProfile] = useState<ProfileDocType | null>(null);
    const [transactions, setTransactions] = useState<TransactionDocType[]>([]);
    const [categories, setCategories] = useState<Record<string, CategoryDocType>>({});

    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [notificationOrigin, setNotificationOrigin] = useState<{ x: number; y: number } | null>(null);

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuOrigin, setMenuOrigin] = useState<{ x: number; y: number } | null>(null);

    const { isLogExpenseOpen, setIsLogExpenseOpen } = useAppStore();

    const handleNotificationClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setNotificationOrigin({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        });
        setIsNotificationOpen(true);
    };

    const handleMenuClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuOrigin({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        });
        setIsMenuOpen(true);
    };

    useEffect(() => {
        const action = searchParams.get('action');
        if (action === 'log-expense') {
            setIsLogExpenseOpen(true);
            window.history.replaceState({}, '', '/');
        }
    }, [searchParams, setIsLogExpenseOpen]);

    useEffect(() => {
        if (!activeProfileId) return;

        // 1. Subscribe to Active Profile
        const profileSub = db.profiles
            .findOne(activeProfileId)
            .$
            .subscribe((doc) => {
                if (doc) setProfile(doc.toJSON() as ProfileDocType);
            });

        // 2. Subscribe to ALL Transactions for Active Profile (to calculate balance/stats)
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

        // 3. Subscribe to Categories
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
            profileSub.unsubscribe();
            txSub.unsubscribe();
            catSub.unsubscribe();
        };
    }, [activeProfileId, db]);

    // Data Aggregation
    const { balance, recentTransactions } = useMemo(() => {
        let totalBalance = 0;
        transactions.forEach(tx => {
            if (tx.type === 'income') {
                totalBalance += tx.amount;
            } else {
                totalBalance -= tx.amount;
            }
        });

        return {
            balance: totalBalance,
            recentTransactions: transactions.slice(0, 5)
        };
    }, [transactions]);

    const currentMonthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date());

    return (
        <main className="flex-1 overflow-y-auto px-6 pb-24">
            <header className="sticky top-0 z-10 bg-background-light/80 backdrop-blur-md py-4 flex items-center justify-between -mx-6 px-3">
                <button
                    onClick={handleMenuClick}
                    className="p-2 rounded-full hover:bg-primary/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-slate-700">menu</span>
                </button>
                <h1 className="text-lg font-bold tracking-tight">{profile?.name || t('dashboard')}</h1>
                <button
                    onClick={handleNotificationClick}
                    className="p-2 rounded-full hover:bg-primary/10 transition-colors relative"
                >
                    <span className="material-symbols-outlined text-slate-700">notifications</span>
                    <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-background-light"></span>
                </button>
            </header>

            <NotificationOverlay
                isOpen={isNotificationOpen}
                onClose={() => setIsNotificationOpen(false)}
                origin={notificationOrigin}
            />

            <MenuOverlay
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                origin={menuOrigin}
            />

            <section className="mt-4 mb-8">
                <div className="relative overflow-hidden rounded-xl h-48 flex flex-col justify-end p-6 bg-gradient-to-br from-[#FFFDF5] to-white border border-slate-100 shadow-sm">
                    <div className="glass-card absolute inset-0 z-0"></div>
                    <div className="relative z-10">
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-1">{t('spendable_balance')}</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold">${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="mt-4 flex justify-between items-center">
                            <p className="text-sm font-medium text-slate-500">{t('safe_to_spend')} {currentMonthName}</p>
                            <button
                                onClick={() => router.push('/reports')}
                                className="bg-slate-100 text-slate-700 text-background-dark px-4 py-2 rounded-full text-sm font-bold hover:bg-primary/30 transition-all"
                            >
                                Details
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mb-8">
                <div className="flex items-center justify-between mb-4 ml-2">
                    <h2 className="text-lg font-bold">{t('quick_actions')}</h2>
                </div>
                <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="flex flex-col items-center gap-2">
                        <button
                            onClick={() => setIsLogExpenseOpen(true)}
                            className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/30 transition-colors"
                        >
                            <span className="material-symbols-outlined">add_card</span>
                        </button>
                        <span className="text-xs font-medium">{t('add')}</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <button
                            onClick={() => router.push('/reports')}
                            className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center text-slate-700"
                        >
                            <span className="material-symbols-outlined">analytics</span>
                        </button>
                        <span className="text-xs font-medium">{t('stats')}</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <button
                            onClick={() => router.push('/profiles')}
                            className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center text-slate-700"
                        >
                            <span className="material-symbols-outlined">group</span>
                        </button>
                        <span className="text-xs font-medium">{t('profiles')}</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <button
                            onClick={() => router.push('/debts')}
                            className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center text-slate-700"
                        >
                            <span className="material-symbols-outlined">payments</span>
                        </button>
                        <span className="text-xs font-medium">{t('debts')}</span>
                    </div>
                </div>
            </section>

            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">{t('recent_transactions')}</h2>
                    <button
                        onClick={() => router.push('/reports')}
                        className="text-sm font-semibold text-primary"
                    >
                        {t('see_all')}
                    </button>
                </div>
                <div className="space-y-3">
                    {recentTransactions.length === 0 ? (
                        <EmptyState
                            type="transactions"
                            title={t('no_transactions')}
                            description={t('log_expense_desc')}
                            action={{
                                label: t('log_expense'),
                                onClick: () => router.push('/log-expense')
                            }}
                        />
                    ) : (
                        recentTransactions.map((tx) => {
                            const cat = categories[tx.category_id || ''];
                            return (
                                <div key={tx.id} className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                    <div className={clsx(
                                        "w-12 h-12 rounded-lg flex items-center justify-center",
                                        tx.type === 'income' ? "bg-green-100 text-green-600" : "bg-primary/10 text-primary"
                                    )}>
                                        <span className="material-symbols-outlined">
                                            {cat?.icon || (tx.type === 'income' ? 'payments' : 'shopping_cart')}
                                        </span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-800">{tx.note || cat?.name || (tx.type === 'income' ? 'Income' : 'Expense')}</p>
                                        <p className="text-xs text-slate-500">
                                            {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {cat?.name || 'Uncategorized'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className={clsx(
                                            "font-bold",
                                            tx.type === 'income' ? "text-green-600" : "text-slate-800"
                                        )}>
                                            {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </section>
        </main>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-300">Loading...</div>}>
            <DashboardContent />
        </Suspense>
    );
}
