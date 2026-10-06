"use client";

export function DashboardSkeleton() {
    return (
        <div className="flex-1 overflow-y-auto">
            {/* Header Skeleton */}
            <div className="sticky top-0 z-10 backdrop-blur-md bg-background-light/40 dark:bg-slate-950/40 px-4 py-4 border-b border-slate-200/40 dark:border-white/10">
                <div className="flex justify-between items-center gap-3">
                    {/* Profile dropdown skeleton */}
                    <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
                    {/* Privacy mode toggle skeleton */}
                    <div className="h-10 w-10 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
                </div>
            </div>

            {/* Content area */}
            <div className="p-4 space-y-4">
                {/* Balance card skeleton */}
                <div className="space-y-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-white/10">
                    <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                    <div className="h-8 w-40 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                    <div className="grid grid-cols-2 gap-3">
                        <div className="h-12 bg-slate-100 dark:bg-slate-800/50 rounded-lg animate-pulse" />
                        <div className="h-12 bg-slate-100 dark:bg-slate-800/50 rounded-lg animate-pulse" />
                    </div>
                </div>

                {/* Budget card skeleton */}
                <div className="space-y-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/50 dark:border-white/10">
                    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
                    <div className="flex justify-between">
                        <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                        <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                    </div>
                </div>

                {/* Quick Categories skeleton */}
                <div className="space-y-3">
                    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                    <div className="grid grid-cols-4 gap-2">
                        {[...Array(4)].map((_, i) => (
                            <div
                                key={i}
                                className="h-20 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse"
                            />
                        ))}
                    </div>
                </div>

                {/* Recent transactions skeleton */}
                <div className="space-y-3">
                    <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                    <div className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                            <div
                                key={i}
                                className="h-16 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse"
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DashboardSkeleton;
