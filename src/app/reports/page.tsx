"use client";

import { useDatabase } from "@/db/DatabaseProvider";
import { useAppStore } from "@/store/appStore";
import { TransactionDocType, CategoryDocType } from "@/db/schema";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { ActionModal } from "@/components/ActionModal";
import { EmptyState } from "@/components/EmptyState";

function DonutChart({ data, total, isExpense }: { data: any[], total: number, isExpense: boolean }) {
    let cumulativePercentage = 0;
    const radius = 35;
    const circumference = 2 * Math.PI * radius;

    return (
        <div className="relative w-48 h-48 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    stroke="#f1f5f9"
                    strokeWidth="12"
                />
                {/* Data segments */}
                {data.map((item, index) => {
                    const percentage = (item.amount / total) * 100;
                    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
                    const strokeDashoffset = -((cumulativePercentage / 100) * circumference);
                    cumulativePercentage += percentage;

                    return (
                        <circle
                            key={item.categoryId}
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="transparent"
                            stroke={`hsl(215, 25%, ${20 + index * 10}%)`}
                            strokeWidth="12"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                        />
                    );
                })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Total</span>
                <span className="text-xl font-black text-slate-900">${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
        </div>
    );
}

export default function ReportsPage() {
    const router = useRouter();
    const db = useDatabase();
    const { activeProfileId } = useAppStore();

    const [transactions, setTransactions] = useState<TransactionDocType[]>([]);
    const [categories, setCategories] = useState<Record<string, CategoryDocType>>({});
    const [timeframe, setTimeframe] = useState<"week" | "month" | "year">("month");
    const [reportType, setReportType] = useState<"expense" | "income">("expense");
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        // Fetch Categories mapping
        const catSub = db.categories
            .find({ selector: { profile_id: activeProfileId, _deleted: false } })
            .$
            .subscribe(docs => {
                const catMap: Record<string, CategoryDocType> = {};
                docs.forEach(d => {
                    const data = d.toJSON() as CategoryDocType;
                    catMap[data.id] = data;
                });
                setCategories(catMap);
            });

        // Fetch Transactions mapping
        const txSub = db.transactions
            .find({ selector: { profile_id: activeProfileId, _deleted: false } })
            .$
            .subscribe(docs => {
                setTransactions(docs.map(d => d.toJSON() as TransactionDocType));
            });

        return () => {
            catSub.unsubscribe();
            txSub.unsubscribe();
        };
    }, [activeProfileId, db]);

    // Data Aggregation
    const { totalAmount, prevTotalAmount, percentChange, categoryBreakdown, maxCategoryAmount } = useMemo(() => {
        const now = new Date();
        let currentStartTime = 0;
        let prevStartTime = 0;

        if (timeframe === 'week') {
            const start = new Date(now);
            start.setDate(start.getDate() - 7);
            currentStartTime = start.getTime();

            const prevStart = new Date(start);
            prevStart.setDate(prevStart.getDate() - 7);
            prevStartTime = prevStart.getTime();
        } else if (timeframe === 'month') {
            const start = new Date(now);
            start.setMonth(start.getMonth() - 1);
            currentStartTime = start.getTime();

            const prevStart = new Date(start);
            prevStart.setMonth(prevStart.getMonth() - 1);
            prevStartTime = prevStart.getTime();
        } else if (timeframe === 'year') {
            const start = new Date(now);
            start.setFullYear(start.getFullYear() - 1);
            currentStartTime = start.getTime();

            const prevStart = new Date(start);
            prevStart.setFullYear(prevStart.getFullYear() - 1);
            prevStartTime = prevStart.getTime();
        }

        const currentTxs = transactions.filter(tx => tx.timestamp >= currentStartTime && tx.type === reportType);
        const prevTxs = transactions.filter(tx => tx.timestamp >= prevStartTime && tx.timestamp < currentStartTime && tx.type === reportType);

        let total = 0;
        let prevTotal = 0;
        const breakdown: Record<string, { amount: number; count: number }> = {};

        currentTxs.forEach(tx => {
            total += tx.amount;
            const catId = tx.category_id || 'uncategorized';
            if (!breakdown[catId]) {
                breakdown[catId] = { amount: 0, count: 0 };
            }
            breakdown[catId].amount += tx.amount;
            breakdown[catId].count += 1;
        });

        prevTxs.forEach(tx => {
            prevTotal += tx.amount;
        });

        // Calculate Percentage Change
        let change = 0;
        if (prevTotal > 0) {
            change = ((total - prevTotal) / prevTotal) * 100;
        } else if (total > 0) {
            change = 100;
        }

        // Convert to array and sort by amount descending
        const sortedBreakdown = Object.entries(breakdown)
            .map(([id, data]) => ({
                categoryId: id,
                ...data,
                percentage: total > 0 ? (data.amount / total) * 100 : 0
            }))
            .sort((a, b) => b.amount - a.amount);

        const maxCat = sortedBreakdown.length > 0 ? Math.max(...sortedBreakdown.map(b => b.amount)) : 0;

        return {
            totalAmount: total,
            prevTotalAmount: prevTotal,
            percentChange: change,
            categoryBreakdown: sortedBreakdown,
            maxCategoryAmount: maxCat
        };
    }, [transactions, timeframe, reportType]);

    const displayedBreakdown = showAll ? categoryBreakdown : categoryBreakdown.slice(0, 5);

    return (
        <main className="flex-1 px-4 pb-24 overflow-y-auto max-w-md mx-auto w-full">
            {/* Header Section */}
            <header className="sticky top-0 z-20 bg-background-light/80 backdrop-blur-md py-4 -mx-4 px-4">
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => router.back()}
                        className="p-2 px-0 hover:bg-slate-900/5 rounded-full transition-colors flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-slate-900">arrow_back</span>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900">Reports</h1>
                    </button>

                    <div className="flex gap-1 bg-slate-900/5 p-1 rounded-xl border border-slate-900/10 relative">
                        <button
                            onClick={() => setReportType('expense')}
                            className={clsx(
                                "relative px-3 h-8 text-xs font-bold rounded-lg transition-colors duration-200 z-10",
                                reportType === 'expense' ? "text-white" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            {reportType === 'expense' && (
                                <motion.div
                                    layoutId="reportTypeBg"
                                    className="absolute inset-0 bg-slate-900 rounded-lg shadow-sm -z-10"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            Expense
                        </button>
                        <button
                            onClick={() => setReportType('income')}
                            className={clsx(
                                "relative px-3 h-8 text-xs font-bold rounded-lg transition-colors duration-200 z-10",
                                reportType === 'income' ? "text-white" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            {reportType === 'income' && (
                                <motion.div
                                    layoutId="reportTypeBg"
                                    className="absolute inset-0 bg-slate-900 rounded-lg shadow-sm -z-10"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            Income
                        </button>
                    </div>
                </div>

                {/* Time Period Selector */}
                <div className="flex p-1 bg-slate-900/5 rounded-xl gap-1">
                    {['week', 'month', 'year'].map((item) => (
                        <button
                            key={item}
                            onClick={() => setTimeframe(item as any)}
                            className={clsx(
                                "relative flex-1 h-10 text-sm font-semibold rounded-lg transition-colors duration-200 z-10 capitalize",
                                timeframe === item ? "text-slate-900" : "text-slate-500 hover:text-slate-900"
                            )}
                        >
                            {timeframe === item && (
                                <motion.div
                                    layoutId="timeframeBg"
                                    className="absolute inset-0 bg-white rounded-full shadow-sm -z-10"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            {item}
                        </button>
                    ))}
                </div>
            </header>

            {/* Summary Card */}
            <div className="mb-8 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <p className="text-sm font-medium text-slate-500 mb-1">Total {reportType === 'expense' ? 'Spending' : 'Income'}</p>
                <div className="flex items-baseline gap-2">
                    <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
                    {percentChange !== 0 && (
                        <span className={clsx(
                            "text-sm font-bold flex items-center px-2 py-0.5 rounded-full border",
                            percentChange > 0
                                ? (reportType === 'expense' ? "text-rose-600 bg-rose-50 border-rose-100" : "text-slate-900 bg-slate-100 border-slate-200")
                                : (reportType === 'expense' ? "text-slate-900 bg-slate-100 border-slate-200" : "text-rose-600 bg-rose-50 border-rose-100")
                        )}>
                            <span className="material-symbols-outlined text-sm mr-1">
                                {percentChange > 0 ? 'trending_up' : 'trending_down'}
                            </span>
                            {Math.abs(percentChange).toFixed(1)}%
                        </span>
                    )}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                    {percentChange > 0 ? 'Increased' : 'Decreased'} compared to previous {timeframe}.
                </p>
            </div>

            {/* Distribution View */}
            <div className="relative bg-white rounded-2xl p-6 mb-8 border border-slate-100 shadow-sm overflow-hidden transition-all hover:shadow-md group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-900/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />

                <h3 className="text-lg font-bold mb-6 relative text-slate-900">Category Distribution</h3>

                <div className="flex flex-col gap-8 relative">
                    {categoryBreakdown.length > 0 && (
                        <div className="flex justify-center py-4">
                            <DonutChart
                                data={categoryBreakdown.slice(0, 5)}
                                total={totalAmount}
                                isExpense={reportType === 'expense'}
                            />
                        </div>
                    )}

                    <div className="flex items-end justify-between h-40 gap-3 px-2 relative">
                        {categoryBreakdown.length === 0 ? (
                            <EmptyState
                                type="stats"
                                title={`No ${reportType}s`}
                                compact
                            />
                        ) : (
                            categoryBreakdown.slice(0, 5).map((item) => {
                                const catName = categories[item.categoryId]?.name || 'Misc';
                                const heightPercent = maxCategoryAmount > 0 ? (item.amount / maxCategoryAmount) * 100 : 0;

                                return (
                                    <div key={item.categoryId} className="flex flex-col items-center flex-1 gap-2 h-full justify-end group/bar" title={`$${item.amount.toFixed(2)}`}>
                                        <div
                                            className="w-full bg-slate-100 rounded-t-xl relative transition-all duration-500 ease-out cursor-pointer hover:bg-slate-200"
                                            style={{ height: `${Math.max(8, heightPercent)}%` }}
                                        >
                                            <div
                                                className="absolute bottom-0 w-full bg-slate-900 rounded-t-xl transition-all duration-500 group-hover/bar:bg-slate-800"
                                                style={{ height: "100%" }}
                                            />
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] px-2 py-1 rounded pointer-events-none whitespace-nowrap z-10 font-bold shadow-lg">
                                                ${item.amount.toLocaleString()}
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate w-full text-center" title={catName}>
                                            {catName.substring(0, 4)}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Breakdown List */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Category Breakdown</h3>
                    {categoryBreakdown.length > 5 && (
                        <button
                            onClick={() => setShowAll(!showAll)}
                            className="text-slate-900 text-sm font-bold hover:underline"
                        >
                            {showAll ? 'Show Less' : 'View All'}
                        </button>
                    )}
                </div>
                <div className="space-y-3">
                    {categoryBreakdown.length === 0 ? (
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                            <EmptyState
                                type="categories"
                                title="No breakdown"
                                description="Start logging expenses to see how your money is distributed."
                            />
                        </div>
                    ) : (
                        displayedBreakdown.map((item, index) => {
                            const cat = categories[item.categoryId];

                            return (
                                <div
                                    key={item.categoryId}
                                    className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-slate-900/30 hover:shadow-md cursor-pointer animate-in fade-in slide-in-from-right-4 duration-300"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-900/5 text-slate-900 flex items-center justify-center transition-colors">
                                            <span className="material-symbols-outlined text-2xl">{cat?.icon || 'category'}</span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-slate-900">{cat?.name || 'Uncategorized'}</p>
                                            <p className="text-xs text-slate-400 font-medium">
                                                {item.count} {item.count === 1 ? 'transaction' : 'transactions'} • Avg. ${(item.amount / item.count).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-sm text-slate-900">${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-slate-900"
                                                    style={{ width: `${item.percentage}%` }}
                                                />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-900">
                                                {item.percentage.toFixed(0)}%
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </main>
    );
}
