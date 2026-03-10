import { createRxDatabase, addRxPlugin, RxDatabase, RxCollection } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { RxDBMigrationPlugin } from 'rxdb/plugins/migration-schema';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import {
    profileSchemaLiteral,
    categorySchemaLiteral,
    transactionSchemaLiteral,
    debtSchemaLiteral,
    ProfileDocType,
    CategoryDocType,
    TransactionDocType,
    DebtDocType
} from './schema';

// Add plugins
addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBMigrationPlugin);
addRxPlugin(RxDBUpdatePlugin);

export type ExpenseDatabaseCollections = {
    profiles: RxCollection<ProfileDocType>;
    categories: RxCollection<CategoryDocType>;
    transactions: RxCollection<TransactionDocType>;
    debts: RxCollection<DebtDocType>;
};

export type ExpenseDatabase = RxDatabase<ExpenseDatabaseCollections>;

// Define the global types for persistence across HMR
declare global {
    // eslint-disable-next-line no-var
    var __rxdb_promise: Promise<ExpenseDatabase> | null;
    // eslint-disable-next-line no-var
    var __rxdb_instance: ExpenseDatabase | null;
    // eslint-disable-next-line no-var
    var __rxdb_storage: any | null;
}

export const getDatabase = async (): Promise<ExpenseDatabase> => {
    // 1. If we already have a resolved instance, return it immediately
    if (globalThis.__rxdb_instance) {
        return globalThis.__rxdb_instance;
    }

    // 2. If we are already in the process of initializing, return that promise
    if (globalThis.__rxdb_promise) {
        console.log('[RxDB] Reusing existing initialization promise.');
        return globalThis.__rxdb_promise;
    }

    console.log('[RxDB] Starting fresh initialization.');

    // 3. Create the initialization promise
    globalThis.__rxdb_promise = (async () => {
        try {
            // Ensure storage is a singleton too
            if (!globalThis.__rxdb_storage) {
                globalThis.__rxdb_storage = getRxStorageDexie();
            }

            console.log('[RxDB] createRxDatabase call...');
            const db = await createRxDatabase<ExpenseDatabaseCollections>({
                name: 'expense_tracker_db',
                storage: globalThis.__rxdb_storage,
                multiInstance: true,
                eventReduce: true,
            });

            console.log('[RxDB] Adding collections...');
            await db.addCollections({
                profiles: { schema: profileSchemaLiteral },
                categories: { schema: categorySchemaLiteral },
                transactions: { schema: transactionSchemaLiteral },
                debts: { schema: debtSchemaLiteral }
            });

            // Initialize default profile
            const personalProfile = await db.profiles.findOne('personal-default').exec();
            if (!personalProfile) {
                console.log('[RxDB] Inserting default profile...');
                await db.profiles.insert({
                    id: 'personal-default',
                    name: 'Personal',
                    theme: 'primary',
                    _deleted: false,
                    _modified: Date.now()
                });
            }

            // Seed default categories for the default profile
            const defaultCategories = [
                { id: 'cat-food', name: 'Food & Drinks', icon: 'restaurant' },
                { id: 'cat-transport', name: 'Transport', icon: 'directions_car' },
                { id: 'cat-shopping', name: 'Shopping', icon: 'shopping_bag' },
                { id: 'cat-housing', name: 'Housing', icon: 'home' },
                { id: 'cat-entertainment', name: 'Entertainment', icon: 'movie' },
                { id: 'cat-health', name: 'Health', icon: 'medical_services' },
                { id: 'cat-subscription', name: 'Subscriptions', icon: 'subscriptions' },
                { id: 'cat-other', name: 'Other', icon: 'more_horiz' },
            ];

            for (const cat of defaultCategories) {
                const existing = await db.categories.findOne(cat.id).exec();
                if (!existing) {
                    await db.categories.insert({
                        ...cat,
                        profile_id: 'personal-default',
                        _deleted: false,
                        _modified: Date.now()
                    });
                }
            }

            globalThis.__rxdb_instance = db;
            return db;
        } catch (error) {
            console.error('[RxDB] Critical initialization error:', error);
            // Reset promise so next attempt can try again
            globalThis.__rxdb_promise = null;
            throw error;
        }
    })();

    return globalThis.__rxdb_promise;
};
