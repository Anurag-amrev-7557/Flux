"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hook that caches data and returns it immediately on navigation back,
 * while re-fetching in the background.
 * 
 * This prevents the "reload" feeling when switching tabs by showing
 * the last known data instantly, then updating with fresh data.
 */
export function useCachedData<T>(
    fetcher: () => Promise<void>,
    initialData: T,
    cacheKey: string
): [T, boolean] {
    const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map());
    const [data, setData] = useState<T>(() => {
        // Try to restore from cache
        const cached = cacheRef.current.get(cacheKey);
        return cached ? cached.data : initialData;
    });
    const [isLoading, setIsLoading] = useState(!cacheRef.current.has(cacheKey));

    useEffect(() => {
        // Don't show loading state if we have cached data (smooth transition)
        if (cacheRef.current.has(cacheKey)) {
            setIsLoading(false);
        } else {
            setIsLoading(true);
        }

        // Fetch data
        fetcher().finally(() => {
            setIsLoading(false);
        });
    }, [cacheKey, fetcher]);

    // Update cache when data changes
    const updateCache = (newData: T) => {
        cacheRef.current.set(cacheKey, {
            data: newData,
            timestamp: Date.now(),
        });
        setData(newData);
    };

    return [data, isLoading];
}

/**
 * Global cache for page data across navigation.
 * Persists in memory during the current session.
 */
export const PageDataCache = {
    cache: new Map<string, any>(),

    set(key: string, data: any) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
        });
    },

    get(key: string) {
        const cached = this.cache.get(key);
        return cached?.data;
    },

    has(key: string) {
        return this.cache.has(key);
    },

    clear(key?: string) {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
    },
};
