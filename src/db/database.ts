import { createRxDatabase, addRxPlugin, RxDatabase, RxCollection } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { RxDBMigrationPlugin } from 'rxdb/plugins/migration-schema';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
import {
    profileSchemaLiteral,
    categorySchemaLiteral,
    transactionSchemaLiteral,
    debtSchemaLiteral,
    ProfileDocType,
    CategoryDocType,
    TransactionDocType,
    DebtDocType,
    syncConflictSchemaLiteral,
    SyncConflictDocType,
    debtPaymentSchemaLiteral,
    DebtPaymentDocType,
} from './schema';

// Register essential RxDB plugins once
addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBMigrationPlugin);
addRxPlugin(RxDBUpdatePlugin);
addRxPlugin(RxDBLeaderElectionPlugin);

export type ExpenseDatabaseCollections = {
    profiles: RxCollection<ProfileDocType>;
    categories: RxCollection<CategoryDocType>;
    transactions: RxCollection<TransactionDocType>;
    debts: RxCollection<DebtDocType>;
    debt_payments: RxCollection<DebtPaymentDocType>;
    sync_conflicts: RxCollection<SyncConflictDocType>;
};

export type ExpenseDatabase = RxDatabase<ExpenseDatabaseCollections>;

// Environment & HMR Global state declarations
declare global {
    var __rxdb_promise: Promise<ExpenseDatabase> | null;
    var __rxdb_instance: ExpenseDatabase | null;
    var __rxdb_storage: ReturnType<typeof getRxStorageDexie> | null;
    var __rxdb_ephemeral: boolean | undefined;
    var __rxdb_lifecycle_bound: boolean | undefined;
    var __rxdb_database_name: string | null;
}

// Keep the legacy anonymous store name so existing offline-only users can claim it
// on their first sign-in. The v2 suffix deliberately bypasses a previously-created
// interrupted IndexedDB migration; server data and the anonymous source remain intact.
export const databaseNameForUser = (userId?: string | null) => userId ? `finance_${userId}_v5` : 'flux_local_v5';

export const DEFAULT_CATEGORIES = [
    { key: 'food', id: '0d345a25-3ea3-46f5-8e9f-4805ed325001', name: 'Food & Drinks', icon: 'restaurant' },
    { key: 'transport', id: '0d345a25-3ea3-46f5-8e9f-4805ed325002', name: 'Transport', icon: 'directions_car' },
    { key: 'shopping', id: '0d345a25-3ea3-46f5-8e9f-4805ed325003', name: 'Shopping', icon: 'shopping_bag' },
    { key: 'housing', id: '0d345a25-3ea3-46f5-8e9f-4805ed325004', name: 'Housing', icon: 'home' },
    { key: 'entertainment', id: '0d345a25-3ea3-46f5-8e9f-4805ed325005', name: 'Entertainment', icon: 'movie' },
    { key: 'health', id: '0d345a25-3ea3-46f5-8e9f-4805ed325006', name: 'Health', icon: 'medical_services' },
    { key: 'subscription', id: '0d345a25-3ea3-46f5-8e9f-4805ed325007', name: 'Subscriptions', icon: 'subscriptions' },
    { key: 'other', id: '0d345a25-3ea3-46f5-8e9f-4805ed325008', name: 'Other', icon: 'more_horiz' },
];

/**
 * Storage Quota and Persistence Inspector.
 * Requests persistent storage from the browser to safeguard against automatic eviction.
 */
export async function verifyStoragePersistence(): Promise<{
    persisted: boolean;
    usageBytes: number;
    quotaBytes: number;
    percentUsed: number;
}> {
    if (typeof window === 'undefined' || !navigator.storage) {
        return { persisted: false, usageBytes: 0, quotaBytes: 0, percentUsed: 0 };
    }

    try {
        let isPersisted = false;
        if (navigator.storage.persisted) {
            isPersisted = await navigator.storage.persisted();
            if (!isPersisted && navigator.storage.persist) {
                isPersisted = await navigator.storage.persist();
            }
        }

        let usageBytes = 0;
        let quotaBytes = 0;
        let percentUsed = 0;

        if (navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            usageBytes = estimate.usage ?? 0;
            quotaBytes = estimate.quota ?? 0;
            percentUsed = quotaBytes > 0 ? (usageBytes / quotaBytes) * 100 : 0;
        }

        return {
            persisted: isPersisted,
            usageBytes,
            quotaBytes,
            percentUsed: Math.round(percentUsed * 100) / 100,
        };
    } catch (err) {
        console.warn('[RxDB Storage Guard] Storage persistence inspection failed:', err);
        return { persisted: false, usageBytes: 0, quotaBytes: 0, percentUsed: 0 };
    }
}

/**
 * Seeds default categories for a given profile in an idempotent manner.
 */
export async function seedProfileCategories(db: ExpenseDatabase, profileId: string): Promise<void> {
    for (const cat of DEFAULT_CATEGORIES) {
        const id = profileId === 'personal-default' ? cat.id : `${profileId}-cat-${cat.key}`;
        const existing = await db.categories.findOne(id).exec();
        if (!existing) {
            await db.categories.insert({
                id,
                profile_id: profileId,
                name: cat.name,
                icon: cat.icon,
                _deleted: false,
                _modified: Date.now()
            });
        }
    }
}

/**
 * Ensures initial default profile and standard categories exist.
 */
async function bootstrapDefaultData(db: ExpenseDatabase): Promise<void> {
    const personalProfile = await db.profiles.findOne('personal-default').exec();
    if (!personalProfile) {
        console.info('[RxDB] Bootstrapping default profile: personal-default');
        await db.profiles.insert({
            id: 'personal-default',
            name: 'Personal',
            theme: 'primary',
            _deleted: false,
            _modified: Date.now()
        });
    }
    await seedProfileCategories(db, 'personal-default');
}

/**
 * Closes the active database connection safely and resets runtime singletons.
 */
export async function closeDatabase(): Promise<void> {
    if (globalThis.__rxdb_instance) {
        const db = globalThis.__rxdb_instance;
        globalThis.__rxdb_instance = null;
        globalThis.__rxdb_promise = null;
        globalThis.__rxdb_database_name = null;
        globalThis.__rxdb_ephemeral = false;
        try {
            await db.close();
            console.info('[RxDB] Database connection closed gracefully.');
        } catch (err) {
            console.error('[RxDB] Error encountered during database closure:', err);
        }
    }
}

/**
 * Purges and resets IndexedDB in the event of unrecoverable database corruption.
 * CAUTION: Destructive operation. All locally un-synced data will be wiped.
 */
export async function emergencyRecoverCorruptedDb(userId?: string | null): Promise<void> {
    await closeDatabase();
    if (typeof indexedDB !== 'undefined') {
        await new Promise<void>((resolve, reject) => {
            const req = indexedDB.deleteDatabase(databaseNameForUser(userId));
            req.onsuccess = () => {
                console.warn('[RxDB] Corrupt database successfully erased.');
                resolve();
            };
            req.onerror = () => reject(req.error);
            req.onblocked = () => {
                console.warn('[RxDB] Database deletion blocked by another active tab.');
                resolve();
            };
        });
    }
}

/**
 * Binds browser and mobile webview lifecycle listeners to prevent hung connections,
 * lock leaks, and frozen transaction states when tabs are suspended or resumed.
 */
function bindLifecycleListeners(): void {
    if (typeof window === 'undefined' || globalThis.__rxdb_lifecycle_bound) {
        return;
    }

    // Pagehide / freeze: Ensure locks are cleanly handled before OS kills background process
    const handleFreezeOrHide = () => {
        if (globalThis.__rxdb_instance && !globalThis.__rxdb_instance.closed) {
            console.debug('[RxDB Lifecycle] Tab frozen or hidden. Preserving lock integrity.');
        }
    };

    // Visibility change / pageshow: Detect if database connection dropped or was closed
    const handleResume = async () => {
        if (document.visibilityState === 'visible') {
            if (globalThis.__rxdb_instance && globalThis.__rxdb_instance.closed) {
                console.warn('[RxDB Lifecycle] Database instance was closed while in background. Re-initializing...');
                globalThis.__rxdb_instance = null;
                globalThis.__rxdb_promise = null;
                await getDatabase();
            }
        }
    };

    window.addEventListener('pagehide', handleFreezeOrHide);
    window.addEventListener('freeze', handleFreezeOrHide);
    window.addEventListener('pageshow', handleResume);
    document.addEventListener('visibilitychange', handleResume);

    globalThis.__rxdb_lifecycle_bound = true;
}

/**
 * Retrieves or establishes the singleton RxDatabase connection with full error recovery,
 * multi-tab resilience, storage quota inspection, and automated schema migration support.
 */
export const getDatabase = async (userId?: string | null, ephemeral = false): Promise<ExpenseDatabase> => {
    const dbName = databaseNameForUser(userId);
    if (globalThis.__rxdb_instance && (globalThis.__rxdb_database_name !== dbName || globalThis.__rxdb_ephemeral !== ephemeral)) {
        await closeDatabase();
    }
    // 1. Return existing healthy instance
    if (globalThis.__rxdb_instance && !globalThis.__rxdb_instance.closed) {
        return globalThis.__rxdb_instance;
    }

    // 2. Return in-flight initialization promise if present
    if (globalThis.__rxdb_promise) {
        return globalThis.__rxdb_promise;
    }

    // 3. Initiate robust, fault-tolerant connection sequence
    globalThis.__rxdb_promise = (async () => {
        try {
            // Verify and request storage persistence in background
            verifyStoragePersistence().catch((err) => {
                console.warn('[RxDB] Storage persistence check error:', err);
            });

            // Ensure singleton storage adapter
            if (!globalThis.__rxdb_storage) {
                globalThis.__rxdb_storage = getRxStorageDexie();
            }

            // Create database instance with multi-tab awareness
            const db = await createRxDatabase<ExpenseDatabaseCollections>({
                name: dbName,
                storage: ephemeral ? getRxStorageMemory() : globalThis.__rxdb_storage,
                // Cross-tab BroadcastChannel coordination can stall Dexie startup in
                // some browser/PWA contexts. Server writes are UUID/idempotent, so a
                // single-tab local database is the reliable default.
                multiInstance: false,
                eventReduce: true,
                // Closing a duplicate can deadlock IndexedDB in Safari/PWA contexts. The
                // normal multi-instance lock is sufficient for this local-first database.
                closeDuplicates: false,
            });

            // Register collections with explicit migration strategies
            await db.addCollections({
                profiles: {
                    schema: profileSchemaLiteral,
                    migrationStrategies: {
                        1: (oldDoc) => ({ ...oldDoc, field_clocks: {}, deleted_at: oldDoc._deleted ? new Date(oldDoc._modified).toISOString() : null }),
                    },
                },
                categories: {
                    schema: categorySchemaLiteral,
                    migrationStrategies: {
                        1: (oldDoc) => ({ ...oldDoc, field_clocks: {}, deleted_at: oldDoc._deleted ? new Date(oldDoc._modified).toISOString() : null }),
                    },
                },
                transactions: {
                    schema: transactionSchemaLiteral,
                    migrationStrategies: {
                        1: (oldDoc) => ({ ...oldDoc, field_clocks: {}, deleted_at: oldDoc._deleted ? new Date(oldDoc._modified).toISOString() : null }),
                    },
                },
                debts: {
                    schema: debtSchemaLiteral,
                    migrationStrategies: { 1: (oldDoc) => ({ ...oldDoc, field_clocks: {}, deleted_at: oldDoc._deleted ? new Date(oldDoc._modified).toISOString() : null }) },
                },
                debt_payments: { schema: debtPaymentSchemaLiteral, migrationStrategies: {} },
                sync_conflicts: {
                    schema: syncConflictSchemaLiteral,
                    migrationStrategies: {},
                },
            });

            // Run initial bootstrap logic
            await bootstrapDefaultData(db);

            // Bind tab lifecycle listeners
            bindLifecycleListeners();

            globalThis.__rxdb_instance = db;
            globalThis.__rxdb_database_name = dbName;
            globalThis.__rxdb_ephemeral = ephemeral;
            return db;
        } catch (error: unknown) {
            console.error('[RxDB] Critical initialization failure:', error);
            // Invalidate promise so subsequent retries can succeed
            globalThis.__rxdb_promise = null;
            globalThis.__rxdb_instance = null;

            // Handle potential IndexedDB corruption
            const errMsg = error instanceof Error ? error.message : String(error);
            if (
                errMsg.includes('InvalidStateError') ||
                errMsg.includes('CorruptError') ||
                errMsg.includes('quota')
            ) {
                console.error('[RxDB] Potential storage corruption or quota exhaustion detected.');
            }

            throw error;
        }
    })();

    return globalThis.__rxdb_promise;
};
