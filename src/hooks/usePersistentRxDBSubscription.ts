"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Keeps RxDB subscription data alive across page navigations.
 * 
 * Problem: When switching tabs, components unmount → subscriptions unsubscribe
 * → data is cleared → page shows empty state while re-subscribing
 * 
 * Solution: Cache last known subscription data globally, restore immediately
 * on mount, then update with fresh data in background.
 */

const subscriptionCache = new Map<string, {
    data: any[];
    timestamp: number;
}>();

export function usePersistentRxDBSubscription<T>(
    fetcher: () => { unsubscribe: () => void },
    cacheKey: string
): T[] {
    const pathname = usePathname();
    const [data, setData] = useState<T[]>(() => {
        // Restore from cache immediately to prevent empty state
        const cached = subscriptionCache.get(cacheKey);
        return cached ? cached.data : [];
    });
    const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

    useEffect(() => {
        // Subscribe to new data
        subscriptionRef.current = fetcher();

        return () => {
            // Unsubscribe but keep data in cache
            subscriptionRef.current?.unsubscribe();
            subscriptionRef.current = null;
        };
    }, [fetcher, cacheKey]);

    // Update cache whenever data changes
    const setDataWithCache = (newData: T[]) => {
        subscriptionCache.set(cacheKey, {
            data: newData,
            timestamp: Date.now(),
        });
        setData(newData);
    };

    // Wrap setData to include cache updates
    // This requires the component to call this instead of setData directly
    useEffect(() => {
        // Hook to watch state changes and update cache
        // Note: This is called after every render, which updates cache
        subscriptionCache.set(cacheKey, {
            data,
            timestamp: Date.now(),
        });
    }, [data, cacheKey]);

    return data;
}

/**
 * Clears the subscription cache (e.g., on logout).
 */
export function clearSubscriptionCache(key?: string) {
    if (key) {
        subscriptionCache.delete(key);
    } else {
        subscriptionCache.clear();
    }
}
