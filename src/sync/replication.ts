import { replicateRxCollection, type RxReplicationState } from 'rxdb/plugins/replication';
import type { CategoryDocType, DebtDocType, DebtPaymentDocType, ProfileDocType, TransactionDocType } from '@/db/schema';
import type { ExpenseDatabase } from '@/db/database';
import { supabase } from '@/lib/supabase';
import { hlc } from './hlc';
import { useSyncStatus } from './syncStatus';
import { useAppStore } from '@/store/appStore';

async function recordMergedRows(db: ExpenseDatabase, collection: string, rows: Array<{ id: string }>): Promise<void> {
    await Promise.all(rows.map(async row => {
        const id = crypto.randomUUID();
        await db.sync_conflicts.insert({
            id, doc_id: row.id, collection_name: collection, field: '_merge', local_value: '', remote_value: JSON.stringify(row),
            winner: 'remote', resolved_at: new Date().toISOString(), resolved_by: 'automatic-lww',
            requires_prompt: false, _deleted: false, _modified: Date.now(),
        });
    }));
}

type Checkpoint = { updatedAt: string; id: string };
type ServerTransaction = {
    id: string; category_id: string | null; amount_minor: string | number; currency: string;
    note: string | null; occurred_at: string; field_clocks: Record<string, string>;
    deleted_at: string | null; updated_at: string; version: number; user_id: string;
    workspace_id?: string | null;
};
type ServerCategory = {
    id: string; name: string; icon: string | null; color: string | null; kind: 'expense' | 'income';
    field_clocks: Record<string, string>; deleted_at: string | null; updated_at: string; version: number; user_id: string;
    workspace_id?: string | null;
};
type ServerDebt = { id: string; counterparty: string; direction: 'owed_to_me' | 'i_owe'; principal_minor: string | number; currency: string; due_at: string | null; note: string | null; field_clocks: Record<string,string>; deleted_at: string | null; updated_at: string; version: number; user_id: string; workspace_id?: string | null };
type ServerPayment = { id: string; debt_id: string; amount_minor: string | number; paid_at: string; note: string | null; field_clocks: Record<string,string>; deleted_at: string | null; updated_at: string; version: number; user_id: string };
type ServerWorkspace = { id: string; name: string; theme: string | null; field_clocks: Record<string, string>; deleted_at: string | null; updated_at: string; version: number; user_id: string };


function isUuid(value: string | undefined | null): value is string {
    return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function remoteToLocal(remote: ServerTransaction): TransactionDocType {
    Object.values(remote.field_clocks ?? {}).forEach(clock => hlc.receive(clock, Date.parse(remote.updated_at)));
    const amountMinor = Number(remote.amount_minor);
    return {
        id: remote.id,
        profile_id: remote.workspace_id || 'personal-default',
        amount: Math.abs(amountMinor) / 100,
        type: amountMinor < 0 ? 'expense' : 'income',
        category_id: remote.category_id ?? '',
        timestamp: Date.parse(remote.occurred_at),
        note: remote.note ?? '',
        tag_ids: [],
        _deleted: Boolean(remote.deleted_at),
        _modified: Date.parse(remote.updated_at),
        field_clocks: remote.field_clocks ?? {},
        user_id: remote.user_id,
        updated_at: remote.updated_at,
        deleted_at: remote.deleted_at,
        version: remote.version,
    } as TransactionDocType;
}

function localToRemote(local: TransactionDocType) {
    const doc = local as TransactionDocType & Record<string, unknown>;
    const existingClocks = (doc.field_clocks as Record<string, string> | undefined) ?? {};
    const fields = ['category_id', 'workspace_id', 'amount_minor', 'currency', 'note', 'occurred_at', 'deleted_at'];
    const field_clocks = { ...existingClocks };
    for (const field of fields) field_clocks[field] ??= hlc.tick();
    return {
        id: doc.id,
        workspace_id: (doc.profile_id as string) || 'personal-default',
        category_id: isUuid(doc.category_id) ? doc.category_id : null,
        amount_minor: Math.round(Number(doc.amount) * 100) * (doc.type === 'expense' ? -1 : 1),
        currency: useAppStore.getState().currency?.code ?? 'USD',
        note: typeof doc.note === 'string' ? doc.note : null,
        occurred_at: new Date(Number(doc.timestamp)).toISOString(),
        deleted_at: doc._deleted ? (typeof doc.deleted_at === 'string' ? doc.deleted_at : new Date().toISOString()) : null,
        field_clocks,
    };
}

function remoteCategoryToLocal(remote: ServerCategory): CategoryDocType {
    Object.values(remote.field_clocks ?? {}).forEach(clock => hlc.receive(clock, Date.parse(remote.updated_at)));
    return {
        id: remote.id, profile_id: remote.workspace_id || 'personal-default', name: remote.name, icon: remote.icon ?? 'category',
        _deleted: Boolean(remote.deleted_at), _modified: Date.parse(remote.updated_at),
        field_clocks: remote.field_clocks ?? {}, user_id: remote.user_id, updated_at: remote.updated_at,
        deleted_at: remote.deleted_at, version: remote.version,
    } as CategoryDocType;
}

function localCategoryToRemote(local: CategoryDocType) {
    const doc = local as CategoryDocType & Record<string, unknown>;
    const field_clocks = { ...((doc.field_clocks as Record<string, string> | undefined) ?? {}) };
    for (const field of ['name', 'icon', 'color', 'kind', 'workspace_id', 'deleted_at']) field_clocks[field] ??= hlc.tick();
    return {
        id: doc.id, workspace_id: (doc.profile_id as string) || 'personal-default', name: doc.name, icon: doc.icon ?? null, color: null, kind: 'expense',
        deleted_at: doc._deleted ? (typeof doc.deleted_at === 'string' ? doc.deleted_at : new Date().toISOString()) : null,
        field_clocks,
    };
}

function debtToLocal(remote: ServerDebt): DebtDocType {
    Object.values(remote.field_clocks ?? {}).forEach(clock => hlc.receive(clock, Date.parse(remote.updated_at)));
    return { id: remote.id, profile_id: remote.workspace_id || 'personal-default', person_name: remote.counterparty, amount: Number(remote.principal_minor) / 100,
        type: remote.direction === 'i_owe' ? 'owe' : 'lent', purpose: remote.note ?? '', due_date: remote.due_at ? Date.parse(remote.due_at) : undefined,
        created_at: Date.parse(remote.updated_at), status: 'active', _deleted: Boolean(remote.deleted_at), _modified: Date.parse(remote.updated_at),
        field_clocks: remote.field_clocks, user_id: remote.user_id, updated_at: remote.updated_at, deleted_at: remote.deleted_at, version: remote.version } as DebtDocType;
}
function localDebtToRemote(local: DebtDocType) {
    const doc = local as DebtDocType & Record<string, unknown>; const field_clocks = { ...((doc.field_clocks as Record<string,string> | undefined) ?? {}) };
    for (const field of ['counterparty','direction','principal_minor','currency','due_at','note','workspace_id','deleted_at']) field_clocks[field] ??= hlc.tick();
    return { id: doc.id, workspace_id: (doc.profile_id as string) || 'personal-default', counterparty: doc.person_name, direction: doc.type === 'owe' ? 'i_owe' : 'owed_to_me', principal_minor: Math.round(Number(doc.amount) * 100), currency: useAppStore.getState().currency?.code ?? 'USD', due_at: doc.due_date ? new Date(Number(doc.due_date)).toISOString() : null, note: doc.purpose ?? null, deleted_at: doc._deleted ? (typeof doc.deleted_at === 'string' ? doc.deleted_at : new Date().toISOString()) : null, field_clocks };
}
function paymentToLocal(remote: ServerPayment): DebtPaymentDocType {
    return { id: remote.id, debt_id: remote.debt_id, amount: Number(remote.amount_minor) / 100, paid_at: Date.parse(remote.paid_at), note: remote.note ?? '', _deleted: Boolean(remote.deleted_at), _modified: Date.parse(remote.updated_at), field_clocks: remote.field_clocks, user_id: remote.user_id, updated_at: remote.updated_at, deleted_at: remote.deleted_at, version: remote.version } as DebtPaymentDocType;
}
function localPaymentToRemote(local: DebtPaymentDocType) {
    const doc = local as DebtPaymentDocType & Record<string, unknown>; const field_clocks = { ...((doc.field_clocks as Record<string,string> | undefined) ?? {}) };
    for (const field of ['debt_id','amount_minor','paid_at','note','deleted_at']) field_clocks[field] ??= hlc.tick();
    return { id: doc.id, debt_id: doc.debt_id, amount_minor: Math.round(Number(doc.amount) * 100), paid_at: new Date(Number(doc.paid_at)).toISOString(), note: doc.note ?? null, deleted_at: doc._deleted ? (typeof doc.deleted_at === 'string' ? doc.deleted_at : new Date().toISOString()) : null, field_clocks };
}

function workspaceToLocal(remote: ServerWorkspace): ProfileDocType {
    Object.values(remote.field_clocks ?? {}).forEach(clock => hlc.receive(clock, Date.parse(remote.updated_at)));
    return { id: remote.id, name: remote.name, theme: remote.theme ?? 'primary', _deleted: Boolean(remote.deleted_at), _modified: Date.parse(remote.updated_at), field_clocks: remote.field_clocks ?? {}, user_id: remote.user_id, updated_at: remote.updated_at, deleted_at: remote.deleted_at, version: remote.version } as ProfileDocType;
}

function localWorkspaceToRemote(local: ProfileDocType) {
    const doc = local as ProfileDocType & Record<string, unknown>;
    const field_clocks = { ...((doc.field_clocks as Record<string, string> | undefined) ?? {}) };
    for (const field of ['name', 'theme', 'deleted_at']) field_clocks[field] ??= hlc.tick();
    return { id: doc.id, name: doc.name, theme: doc.theme ?? 'primary', deleted_at: doc._deleted ? (typeof doc.deleted_at === 'string' ? doc.deleted_at : new Date().toISOString()) : null, field_clocks };
}

async function startWorkspaceReplication(db: ExpenseDatabase, userId: string): Promise<() => Promise<void>> {
    const state = replicateRxCollection<ProfileDocType, Checkpoint>({
        replicationIdentifier: `supabase:${userId}:profile-workspaces:v1`, collection: db.profiles, deletedField: '_deleted',
        live: true, retryTime: 5_000, waitForLeadership: false,
        pull: { batchSize: 200, handler: async (checkpoint, batchSize) => {
            const overlap = checkpoint ? new Date(Date.parse(checkpoint.updatedAt) - 5_000).toISOString() : null;
            const { data, error } = await supabase.rpc('pull_sync_rows', { p_table: 'profile_workspaces', p_updated_at: overlap, p_id: null, p_limit: Math.min(batchSize, 200) });
            if (error) throw error;
            const rows = (data ?? []) as ServerWorkspace[]; const newest = rows.at(-1);
            return { documents: rows.map(workspaceToLocal), checkpoint: newest ? { updatedAt: newest.updated_at, id: '' } : checkpoint };
        } },
        push: { batchSize: 200, handler: async rows => {
            const changes = rows.map(row => ({ assumedMasterState: row.assumedMasterState ? localWorkspaceToRemote(row.assumedMasterState as ProfileDocType) : undefined, newDocumentState: localWorkspaceToRemote(row.newDocumentState as ProfileDocType) }));
            const { data, error } = await supabase.rpc('push_profile_workspaces', { changes });
            if (error) throw error;
            const conflicts = (data ?? []) as ServerWorkspace[];
            await recordMergedRows(db, 'profile_workspaces', conflicts);
            return conflicts.map(workspaceToLocal);
        } },
    });
    const subscription = state.error$.subscribe(error => console.error('[Flux sync] workspace replication error:', error));
    return async () => { subscription.unsubscribe(); await state.cancel(); };
}

async function startCategoryReplication(db: ExpenseDatabase, userId: string): Promise<() => Promise<void>> {
    const state = replicateRxCollection<CategoryDocType, Checkpoint>({
        replicationIdentifier: `supabase:${userId}:categories:v1`, collection: db.categories, deletedField: '_deleted',
        live: true, retryTime: 5_000, waitForLeadership: false,
        pull: {
            batchSize: 200,
            handler: async (checkpoint, batchSize) => {
                const overlap = checkpoint ? new Date(Date.parse(checkpoint.updatedAt) - 5_000).toISOString() : null;
                const { data, error } = await supabase.rpc('pull_sync_rows', {
                    p_table: 'categories', p_updated_at: overlap, p_id: checkpoint?.id ?? null, p_limit: Math.min(batchSize, 200),
                });
                if (error) throw error;
                const rows = (data ?? []) as ServerCategory[];
                const newest = rows.at(-1);
                return { documents: rows.map(remoteCategoryToLocal), checkpoint: newest ? { updatedAt: newest.updated_at, id: newest.id } : checkpoint };
            },
        },
        push: {
            batchSize: 200,
            handler: async (rows) => {
                const changes = rows.map(row => ({
                    assumedMasterState: row.assumedMasterState ? localCategoryToRemote(row.assumedMasterState as CategoryDocType) : undefined,
                    newDocumentState: localCategoryToRemote(row.newDocumentState as CategoryDocType),
                }));
                const { data, error } = await supabase.rpc('push_categories', { changes });
                if (error) throw error;
                const conflicts = (data ?? []) as ServerCategory[];
                await recordMergedRows(db, 'categories', conflicts);
                return conflicts.map(remoteCategoryToLocal);
            },
        },
    });
    const subscription = state.error$.subscribe(error => {
        console.error('[Flux sync] replication error:', error);
        useSyncStatus.getState().setStatus(navigator.onLine ? 'error' : 'offline', error.message);
    });
    return async () => { subscription.unsubscribe(); await state.cancel(); };
}

async function startDebtReplication(db: ExpenseDatabase, userId: string): Promise<() => Promise<void>> {
    const start = <T extends { _deleted: boolean }, R extends { id: string; updated_at: string }>(collection: any, table: string, rpc: string, toLocal: (row: R) => T, toRemote: (doc: T) => unknown) => {
        const state = replicateRxCollection<T, Checkpoint>({
            replicationIdentifier: `supabase:${userId}:${table}:v1`, collection, deletedField: '_deleted', live: true, retryTime: 5_000, waitForLeadership: false,
            pull: { batchSize: 200, handler: async (checkpoint, batchSize) => {
                const overlap = checkpoint ? new Date(Date.parse(checkpoint.updatedAt) - 5_000).toISOString() : null;
                const { data, error } = await supabase.rpc('pull_sync_rows', { p_table: table, p_updated_at: overlap, p_id: checkpoint?.id ?? null, p_limit: Math.min(batchSize, 200) });
                if (error) throw error; const rows = (data ?? []) as R[]; const newest = rows.at(-1);
                return { documents: rows.map(toLocal), checkpoint: newest ? { updatedAt: newest.updated_at, id: newest.id } : checkpoint };
            } },
            push: { batchSize: 200, handler: async rows => {
                const changes = rows.map(row => ({ assumedMasterState: row.assumedMasterState ? toRemote(row.assumedMasterState as T) : undefined, newDocumentState: toRemote(row.newDocumentState as T) }));
                const { data, error } = await supabase.rpc(rpc, { changes }); if (error) throw error;
                const conflicts = (data ?? []) as R[]; await recordMergedRows(db, table, conflicts); return conflicts.map(toLocal) as any;
            } },
        });
        return state;
    };
    const debts = start<DebtDocType, ServerDebt>(db.debts, 'debts', 'push_debts', debtToLocal, localDebtToRemote);
    const payments = start<DebtPaymentDocType, ServerPayment>(db.debt_payments, 'debt_payments', 'push_debt_payments', paymentToLocal, localPaymentToRemote);
    const logError = (error: Error) => {
        console.error('[Flux sync] replication error:', error);
        useSyncStatus.getState().setStatus(navigator.onLine ? 'error' : 'offline', error.message);
    };
    const subA = debts.error$.subscribe(logError);
    const subB = payments.error$.subscribe(logError);
    return async () => { subA.unsubscribe(); subB.unsubscribe(); await debts.cancel(); await payments.cancel(); };
}

export async function startTransactionReplication(
    db: ExpenseDatabase,
    userId: string,
): Promise<() => Promise<void>> {
    const state = replicateRxCollection<TransactionDocType, Checkpoint>({
        replicationIdentifier: `supabase:${userId}:transactions:v1`,
        collection: db.transactions,
        deletedField: '_deleted',
        live: true,
        retryTime: 5_000,
        waitForLeadership: false,
        pull: {
            batchSize: 200,
            handler: async (checkpoint, batchSize) => {
                useSyncStatus.getState().setStatus('syncing');
                const overlap = checkpoint
                    ? new Date(Date.parse(checkpoint.updatedAt) - 5_000).toISOString()
                    : null;
                const { data, error } = await supabase.rpc('pull_sync_rows', {
                    p_table: 'transactions', p_updated_at: overlap, p_id: checkpoint?.id ?? null, p_limit: Math.min(batchSize, 200),
                });
                if (error) throw error;
                const rows = (data ?? []) as ServerTransaction[];
                const newest = rows.at(-1);
                if (rows.length < batchSize) useSyncStatus.getState().markSynced();
                return {
                    documents: rows.map(remoteToLocal),
                    checkpoint: newest ? { updatedAt: newest.updated_at, id: newest.id } : checkpoint,
                };
            },
        },
        push: {
            batchSize: 200,
            handler: async (rows) => {
                useSyncStatus.getState().setStatus('syncing');
                const changes = rows.map(row => ({
                    assumedMasterState: row.assumedMasterState ? localToRemote(row.assumedMasterState as TransactionDocType) : undefined,
                    newDocumentState: localToRemote(row.newDocumentState as TransactionDocType),
                }));
                const { data, error } = await supabase.rpc('push_transactions', { changes });
                if (error) throw error;
                useSyncStatus.getState().markSynced();
                const conflicts = (data ?? []) as ServerTransaction[];
                await recordMergedRows(db, 'transactions', conflicts);
                return conflicts.map(remoteToLocal);
            },
        },
    });

    const errorSubscription = state.error$.subscribe(error => {
        console.error('[Flux sync] replication error:', error);
        useSyncStatus.getState().setStatus(navigator.onLine ? 'error' : 'offline', error.message);
    });
    const stopWorkspaces = await startWorkspaceReplication(db, userId);
    const stopCategories = await startCategoryReplication(db, userId);
    const stopDebts = await startDebtReplication(db, userId);
    return async () => {
        errorSubscription.unsubscribe();
        await stopWorkspaces();
        await stopCategories();
        await stopDebts();
        await state.cancel();
    };
}

export type TransactionReplicationState = RxReplicationState<TransactionDocType, Checkpoint>;
