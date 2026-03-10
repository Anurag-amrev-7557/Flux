"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getDatabase, ExpenseDatabase } from './database';

const DatabaseContext = createContext<ExpenseDatabase | null>(null);

export function DatabaseProvider({ children }: { children: ReactNode }) {
    const [db, setDb] = useState<ExpenseDatabase | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        async function initDB() {
            try {
                console.log('[DatabaseProvider] Starting initialization...');
                const database = await getDatabase();
                if (mounted) {
                    setDb(database);
                    console.log('[DatabaseProvider] Initialization successful.');
                }
            } catch (err: any) {
                console.error('[DatabaseProvider] Initialization failed:', err);
                if (mounted) {
                    setError(err.message || String(err));
                }
            }
        }

        initDB();

        return () => {
            mounted = false;
        };
    }, []);

    if (error) {
        return (
            <div className="min-h-[100dvh] bg-background-light flex flex-col items-center justify-center p-6 text-center">
                <span className="material-symbols-outlined text-red-500 text-5xl mb-4">error</span>
                <h2 className="text-xl font-bold mb-2">Database Error</h2>
                <p className="text-sm text-slate-500 mb-6 max-w-xs">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-primary text-slate-900 px-6 py-2 rounded-lg font-bold"
                >
                    Retry Loading
                </button>
            </div>
        );
    }

    if (!db) {
        // Basic loading skeleton for PWA initial load
        return (
            <div className="min-h-[100dvh] bg-background-light flex flex-col items-center justify-center p-4">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-semibold text-slate-500 font-display">Initializing offline database...</p>
            </div>
        );
    }

    return (
        <DatabaseContext.Provider value={db}>
            {children}
        </DatabaseContext.Provider>
    );
}

export function useDatabase() {
    const context = useContext(DatabaseContext);
    if (!context) {
        throw new Error('useDatabase must be used within a DatabaseProvider');
    }
    return context;
}
