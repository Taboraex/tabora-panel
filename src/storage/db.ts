import { SCHEMA_STATEMENTS } from './schema';
import { safeError } from '@common/http';

/**
 * Storage abstraction over D1 with an optional KV fallback.
 *
 * D1 is preferred: it gives us real queries for users/usage/logs and has no
 * eventual-consistency window. When only KV is bound we degrade to a key-value
 * shim so the panel still boots and saves settings.
 */

let schemaReady = false;

export class Store {
    constructor(private env: Env) {}

    get hasD1(): boolean {
        return Boolean(this.env.DB);
    }

    get hasKV(): boolean {
        return Boolean(this.env.KV);
    }

    get isPersistent(): boolean {
        return this.hasD1 || this.hasKV;
    }

    /** Create tables once per isolate. */
    async init(): Promise<void> {
        if (schemaReady || !this.env.DB) return;
        try {
            await this.env.DB.batch(SCHEMA_STATEMENTS.map((sql) => this.env.DB!.prepare(sql)));
            schemaReady = true;
        } catch (error) {
            console.error('Schema init failed:', safeError(error));
            // Mark ready anyway: a partially-initialised DB should not spin.
            schemaReady = true;
        }
    }

    /* ------------------------------------------------------------- key/value */

    async get(key: string): Promise<string | null> {
        if (this.env.DB) {
            await this.init();
            try {
                const row = await this.env.DB.prepare('SELECT value FROM settings WHERE key = ?')
                    .bind(key)
                    .first<{ value: string }>();
                return row?.value ?? null;
            } catch (error) {
                console.error(`get(${key}) failed:`, safeError(error));
                return null;
            }
        }

        if (this.env.KV) return this.env.KV.get(key);
        return null;
    }

    async getJSON<T>(key: string): Promise<T | null> {
        const raw = await this.get(key);
        if (!raw) return null;
        try {
            return JSON.parse(raw) as T;
        } catch {
            return null;
        }
    }

    /**
     * Store a value. `ttlSeconds` is honoured on KV, which expires the key on
     * its own; D1 has no TTL, so callers that rely on expiry must treat a
     * stale value as absent (the rate limiter checks the window itself).
     */
    async put(key: string, value: string, ttlSeconds?: number): Promise<void> {
        if (this.env.DB) {
            await this.init();
            try {
                await this.env.DB.prepare(
                    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
                     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
                )
                    .bind(key, value, Date.now())
                    .run();
                return;
            } catch (error) {
                console.error(`put(${key}) failed:`, safeError(error));
                return;
            }
        }

        if (this.env.KV) {
            /*
             * Never let a failed write take down the page.
             *
             * The D1 branch above already swallows its errors, but this one
             * did not, so any KV failure propagated all the way out as a 500.
             * The common one is the free plan's 1000-writes-per-day ceiling:
             * once it is hit every put() throws, and because loadSettings
             * persists a copy on first read, simply opening the panel returned
             * `KV put() limit exceeded for the day.` and nothing rendered.
             *
             * A write that does not stick is a degraded panel — settings fall
             * back to their derived defaults on the next load — but a panel
             * that will not open at all is a broken one.
             */
            try {
                // KV rejects a TTL below 60s.
                await this.env.KV.put(
                    key,
                    value,
                    ttlSeconds && ttlSeconds >= 60 ? { expirationTtl: ttlSeconds } : undefined,
                );
            } catch (error) {
                console.error(`put(${key}) failed:`, safeError(error));
            }
        }
    }

    async putJSON(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
        await this.put(key, JSON.stringify(value), ttlSeconds);
    }

    async delete(key: string): Promise<void> {
        if (this.env.DB) {
            await this.init();
            try {
                await this.env.DB.prepare('DELETE FROM settings WHERE key = ?').bind(key).run();
                return;
            } catch (error) {
                console.error(`delete(${key}) failed:`, safeError(error));
                return;
            }
        }

        if (this.env.KV) {
            // Same reasoning as put(): a failed delete must not become a 500.
            try {
                await this.env.KV.delete(key);
            } catch (error) {
                console.error(`delete(${key}) failed:`, safeError(error));
            }
        }
    }

    /* -------------------------------------------------------------- raw SQL */

    /** Run a query returning rows. Returns [] when D1 is unavailable. */
    async all<T = Record<string, unknown>>(sql: string, ...params: unknown[]): Promise<T[]> {
        if (!this.env.DB) return [];
        await this.init();
        try {
            const { results } = await this.env.DB.prepare(sql).bind(...params).all<T>();
            return results ?? [];
        } catch (error) {
            console.error('Query failed:', sql, safeError(error));
            return [];
        }
    }

    async first<T = Record<string, unknown>>(sql: string, ...params: unknown[]): Promise<T | null> {
        if (!this.env.DB) return null;
        await this.init();
        try {
            return await this.env.DB.prepare(sql).bind(...params).first<T>();
        } catch (error) {
            console.error('Query failed:', sql, safeError(error));
            return null;
        }
    }

    async run(sql: string, ...params: unknown[]): Promise<boolean> {
        if (!this.env.DB) return false;
        await this.init();
        try {
            await this.env.DB.prepare(sql).bind(...params).run();
            return true;
        } catch (error) {
            console.error('Statement failed:', sql, safeError(error));
            return false;
        }
    }

    async batch(statements: Array<{ sql: string; params: unknown[] }>): Promise<boolean> {
        if (!this.env.DB || statements.length === 0) return false;
        await this.init();
        try {
            await this.env.DB.batch(
                statements.map(({ sql, params }) => this.env.DB!.prepare(sql).bind(...params)),
            );
            return true;
        } catch (error) {
            console.error('Batch failed:', safeError(error));
            return false;
        }
    }
}

export function createStore(env: Env): Store {
    return new Store(env);
}
