/**
 * Global cache for RxDB subscription data across page navigations.
 * 
 * When switching tabs, components unmount → subscriptions reset → data is cleared.
 * This cache stores the last known data globally, allowing instant restoration
 * when returning to a page, while fresh data loads in the background.
 */

interface CachedData<T> {
    data: T;
    timestamp: number;
}

class SubscriptionCache {
    private cache = new Map<string, CachedData<any>>();

    /**
     * Store data in cache. Call from your state setter to keep cache in sync.
     */
    set<T>(key: string, data: T): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
        });
    }

    /**
     * Retrieve cached data if available.
     */
    get<T>(key: string): T | null {
        const cached = this.cache.get(key);
        return cached ? cached.data : null;
    }

    /**
     * Check if key has cached data.
     */
    has(key: string): boolean {
        return this.cache.has(key);
    }

    /**
     * Clear one or all cached entries.
     */
    clear(key?: string): void {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
    }

    /**
     * Get all cached keys (useful for debugging).
     */
    keys(): string[] {
        return Array.from(this.cache.keys());
    }
}

// Export singleton instance
export const subscriptionCache = new SubscriptionCache();

/**
 * Example usage in a React component:
 * 
 * ```tsx
 * const [profiles, setProfiles] = useState<ProfileDocType[]>(
 *   () => subscriptionCache.get('profiles') ?? []
 * );
 * 
 * useEffect(() => {
 *   const sub = db.profiles.find(...).$.subscribe(docs => {
 *     const data = docs.map(d => d.toJSON());
 *     subscriptionCache.set('profiles', data);  // Cache update
 *     setProfiles(data);
 *   });
 *   return () => sub.unsubscribe();
 * }, [db]);
 * ```
 */
