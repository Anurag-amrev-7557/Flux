import type { ExpenseDatabase } from '@/db/database';

type CollectionName = 'profiles' | 'categories' | 'transactions' | 'debts' | 'debt_payments';
export type LocalDataSnapshot = Record<CollectionName, Array<{ id: string; [key: string]: unknown }>>;
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export async function snapshotLocalData(source: ExpenseDatabase): Promise<LocalDataSnapshot> {
    const collections: CollectionName[] = ['profiles', 'categories', 'transactions', 'debts', 'debt_payments'];
    const entries = await Promise.all(collections.map(async name => [
        name, (await source[name].find().exec()).map(document => document.toJSON() as { id: string; [key: string]: unknown }),
    ] as const));
    return Object.fromEntries(entries) as LocalDataSnapshot;
}

/**
 * Copies anonymous local documents into a newly authenticated database once. IDs are
 * retained, so the later server push is idempotent even if this browser is interrupted.
 */
export async function claimLocalData(source: LocalDataSnapshot, target: ExpenseDatabase, userId?: string): Promise<void> {
    const collections: CollectionName[] = ['profiles', 'categories', 'transactions', 'debts', 'debt_payments'];
    for (const name of collections) {
        for (const value of source[name]) {
            // Legacy seeded category ids (cat-food, etc.) are replaced by the new UUID
            // defaults created during target bootstrap. Keeping them would poison pushes.
            if (name === 'categories' && !isUuid(value.id)) continue;
            const existing = await target[name].findOne(value.id).exec();
            if (!existing) {
                const doc = userId ? { ...value, user_id: userId } : value;
                await target[name].insert(doc as never);
            } else if (userId && !(existing as unknown as { user_id?: string }).user_id) {
                await existing.patch({ user_id: userId } as never);
            }
        }
    }
}

