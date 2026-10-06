import type { RxCollection } from 'rxdb';
import { hlc } from './hlc';

export type SyncFields = {
    field_clocks?: Record<string, string>;
    deleted_at?: string | null;
    _deleted?: boolean;
    _modified?: number;
};

/** The sole write primitive for synced documents. */
export async function mutate<T extends SyncFields>(
    collection: RxCollection<T>,
    id: string,
    patch: Partial<T>,
): Promise<void> {
    const document = await collection.findOne(id).exec();
    const changedFields = Object.keys(patch).filter(key => key !== 'field_clocks' && key !== '_deleted');
    const clocks = { ...(document?.get('field_clocks') ?? {}) };
    for (const field of changedFields) clocks[field] = hlc.tick();

    const syncedPatch = { ...patch, field_clocks: clocks } as Partial<T>;
    if (!document) {
        await collection.insert({ id, _deleted: false, _modified: Date.now(), ...syncedPatch } as unknown as T);
        return;
    }
    await document.incrementalPatch({ ...syncedPatch, _modified: Date.now() } as Partial<T>);
}

export async function softDelete<T extends SyncFields>(collection: RxCollection<T>, id: string): Promise<void> {
    await mutate(collection, id, {
        _deleted: true,
        deleted_at: new Date().toISOString(),
    } as Partial<T>);
}
