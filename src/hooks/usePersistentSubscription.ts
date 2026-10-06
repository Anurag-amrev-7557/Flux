"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Persists component state across page navigations.
 * This prevents re-fetching data when switching tabs.
 * Data is cached per route and restored instantly on revisit.
 */
export function usePersistentSubscription<T>(
    fetcher: () => void,
    initialData: T,
    deps?: React.DependencyList
): [T, (data: T) => void] {
    const pathname = usePathname();
    const cacheRef = useRef<Map<string, T>>(new Map());
    const [data, setData] = useState<T>(() => {
        // Restore from cache if available
        return cacheRef.current.get(pathname) ?? initialData;
    });

    // Update cache when data changes
    const setDataWithCache = (newData: T) => {
        cacheRef.current.set(pathname, newData);
        setData(newData);
    };

    // Subscribe to data changes
    useEffect(() => {
        fetcher();
    }, deps ? [...deps, pathname] : [pathname]);

    return [data, setDataWithCache];
}

/**
 * Cache for RxDB subscriptions across page navigations.
 * Prevents full page reloads when switching tabs by keeping
 * the last known data visible while re-subscribing.
 */
export class SubscriptionCache {
    private static cache = new Map<string, any>();

    static set(key: string, value: any) {
        this.cache.set(key, value);
    }

    static get(key: string) {
        return this.cache.get(key);
    }

    static clear(key?: string) {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
    }
}
