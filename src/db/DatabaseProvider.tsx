"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { getDatabase, type ExpenseDatabase } from './database';
import { useAppStore } from '@/store/appStore';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { startTransactionReplication } from '@/sync/replication';
import { useSyncStatus } from '@/sync/syncStatus';
import { claimLocalData, snapshotLocalData } from '@/sync/claimLocalData';

const DatabaseContext = createContext<ExpenseDatabase | null>(null);

/** Starts persistent local storage first; authenticated replication attaches later. */
export function DatabaseProvider({ children }: { children: ReactNode }) {
    const [db, setDb] = useState<ExpenseDatabase | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { setOfflineStatus, showToast } = useAppStore();
    const stopSync = useRef<(() => Promise<void>) | null>(null);
    const syncedUser = useRef<string | null>(null);
    const hasLoadedOnce = useRef(false); // Track if DB has ever been loaded to prevent loading screen on navigation

    useEffect(() => {
        const online = () => { setOfflineStatus(false); showToast('Connected to network', 'info'); };
        const offline = () => { setOfflineStatus(true); showToast('Offline mode active', 'info'); };
        setOfflineStatus(!navigator.onLine);
        window.addEventListener('online', online);
        window.addEventListener('offline', offline);
        return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
    }, [setOfflineStatus, showToast]);

    useEffect(() => {
        let alive = true;
        let localDb: ExpenseDatabase | null = null;

        // Check if database is already initialized globally (prevents re-initialization on navigation)
        if (globalThis.__rxdb_instance && !globalThis.__rxdb_instance.closed) {
            console.debug('[RxDB] Using existing database instance from global cache');
            hasLoadedOnce.current = true;
            setDb(globalThis.__rxdb_instance);
            return;
        }

        const timeout = setTimeout(() => {
            if (alive && !localDb) {
                console.warn('[RxDB] Primary storage initialization slow/stalled. Attempting memory fallback...');
                getDatabase(null, true)
                    .then(fallbackDb => { if (alive) setDb(fallbackDb); })
                    .catch(() => {});
            }
        }, 5000);

        const startTime = Date.now();
        getDatabase()
            .then(async database => {
                localDb = database;
                const elapsed = Date.now() - startTime;
                // Only show loading animation on first load, not on navigation
                const minDisplayTime = hasLoadedOnce.current ? 0 : 800; // Reduced from 1200ms to 800ms for faster transition
                if (elapsed < minDisplayTime) {
                    await new Promise(resolve => setTimeout(resolve, minDisplayTime - elapsed));
                }
                if (alive) {
                    hasLoadedOnce.current = true; // Mark as loaded
                    setDb(database);
                }
            })
            .catch(initError => { if (alive) setError(initError instanceof Error ? initError.message : String(initError)); });

        return () => {
            alive = false;
            clearTimeout(timeout);
        };
    }, []);

    useEffect(() => {
        if (!db || !isSupabaseConfigured) return;
        let alive = true;
        const connect = async (userId?: string) => {
            if (!alive) return;
            if (!userId) {
                // User signed out or session ended: stop replication immediately
                if (stopSync.current) {
                    await stopSync.current();
                    stopSync.current = null;
                }
                syncedUser.current = null;
                useSyncStatus.getState().setStatus('idle');
                return;
            }
            if (syncedUser.current === userId) return;

            const { data: { user } } = await supabase.auth.getUser();
            if (!alive) return;
            // The app's local profiles are UI workspaces. This row is the
            // authenticated account profile, so create it independently.
            const displayName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email ?? 'Flux user';
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({ user_id: userId, display_name: displayName }, { onConflict: 'user_id', ignoreDuplicates: true });
            if (profileError) console.error('[Flux sync] profile bootstrap error:', profileError);
            await stopSync.current?.();
            if (!alive) return;
            try {
                const guestData = await snapshotLocalData(db);
                await claimLocalData(guestData, db, userId);
            } catch (claimErr) {
                console.warn('[Flux sync] guest data claim notice:', claimErr);
            }
            stopSync.current = await startTransactionReplication(db, userId);
            syncedUser.current = userId;
        };
        void supabase.auth.getSession().then(({ data }) => connect(data.session?.user.id));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { void connect(session?.user.id); });
        return () => { alive = false; subscription.unsubscribe(); void stopSync.current?.(); stopSync.current = null; syncedUser.current = null; };
    }, [db]);

    if (error) return <div className="min-h-[100dvh] bg-background-light flex items-center justify-center p-6 text-center"><div><h2 className="text-xl font-bold mb-2">Storage Error</h2><p className="text-sm text-slate-500">{error}</p></div></div>;
    // Only show loading screen if database has never been loaded (prevents loading on navigation)
    if (!db && !hasLoadedOnce.current) return <div className="min-h-[100dvh] bg-background-light dark:bg-[#141414] flex flex-col items-center justify-center p-4"><LoadingIndicator variant="contained" size={56} className="mb-4 text-primary dark:text-[#E3E3E3]" label="Starting Flux" /><p className="text-sm font-semibold text-slate-500 dark:text-[#C4C7C5] font-display">Starting Flux…</p></div>;
    // If db is temporarily null but was loaded before, return children immediately to prevent flash
    if (!db && hasLoadedOnce.current) return <DatabaseContext.Provider value={null}>{children}</DatabaseContext.Provider>;
    return <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>;
}

export function useDatabase() {
    const context = useContext(DatabaseContext);
    if (!context) throw new Error('useDatabase must be used within a DatabaseProvider');
    return context;
}
