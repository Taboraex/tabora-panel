/**
 * Tiny TTL cache scoped to the current Worker isolate.
 *
 * D1 reads are cheap but not free, and settings are read on nearly every
 * request. Caching for a few seconds keeps hot paths (subscriptions, the
 * WebSocket handshake) from hitting the database repeatedly, while still
 * picking up panel edits almost immediately.
 */
interface Entry<T> {
    value: T;
    expires: number;
}

const store = new Map<string, Entry<unknown>>();

export function cacheGet<T>(key: string): T | undefined {
    const hit = store.get(key);
    if (!hit) return undefined;
    if (Date.now() > hit.expires) {
        store.delete(key);
        return undefined;
    }
    return hit.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): T {
    store.set(key, { value, expires: Date.now() + ttlMs });
    return value;
}

export function cacheInvalidate(key?: string): void {
    if (key) store.delete(key);
    else store.clear();
}

/** Read-through helper: return the cached value or populate it via `loader`. */
export async function cached<T>(
    key: string,
    ttlMs: number,
    loader: () => Promise<T>,
): Promise<T> {
    const hit = cacheGet<T>(key);
    if (hit !== undefined) return hit;
    return cacheSet(key, await loader(), ttlMs);
}

export const CacheKeys = {
    settings: 'settings',
    users: 'users',
    usage: 'usage',
    apiKeys: 'api-keys',
} as const;
