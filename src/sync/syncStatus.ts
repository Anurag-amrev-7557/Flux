import { create } from 'zustand';

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error';

type SyncStatusState = {
    status: SyncStatus;
    lastSyncedAt: string | null;
    error: string | null;
    setStatus: (status: SyncStatus, error?: string | null) => void;
    markSynced: () => void;
};

export const useSyncStatus = create<SyncStatusState>((set) => ({
    status: 'idle',
    lastSyncedAt: null,
    error: null,
    setStatus: (status, error = null) => set({ status, error }),
    markSynced: () => set({ status: 'idle', error: null, lastSyncedAt: new Date().toISOString() }),
}));
