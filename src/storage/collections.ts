import { Store } from './db';

/**
 * Collection abstraction over the two possible datastores.
 *
 * D1 gives us real tables and queries. When only KV is bound we emulate each
 * collection as a single JSON document, which is correct for the scale a
 * Workers panel operates at (tens of users, hundreds of log lines) and keeps
 * the panel fully functional instead of silently dropping writes.
 */

export interface UserRecord {
    id: string;
    name: string;
    uuid: string;
    notes: string;
    limit_bytes: number;
    daily_limit: number;
    expiry_ms: number;
    is_paused: number;
    disabled_reason: string;
    created_at: number;
    meta: string;
}

export interface UsageRecord {
    user_id: string;
    day: string;
    bytes: number;
    reqs: number;
}

export interface LogRecord {
    id?: number;
    ts: number;
    type: string;
    detail: string;
}

const KV_USERS = 'kv:users';
const KV_USAGE = 'kv:usage';
const KV_LOGS = 'kv:logs';

const MAX_LOG_ROWS = 500;

export class Collections {
    constructor(private store: Store) {}

    private get useSql(): boolean {
        return this.store.hasD1;
    }

    /* ─────────────────────────────────────────────────────────── users ── */

    async listUsers(): Promise<UserRecord[]> {
        if (this.useSql) {
            return this.store.all<UserRecord>('SELECT * FROM users ORDER BY created_at DESC');
        }

        const rows = (await this.store.getJSON<UserRecord[]>(KV_USERS)) ?? [];
        return [...rows].sort((a, b) => b.created_at - a.created_at);
    }

    async findUser(idOrName: string): Promise<UserRecord | null> {
        if (this.useSql) {
            return this.store.first<UserRecord>(
                'SELECT * FROM users WHERE id = ?1 OR uuid = ?1 OR LOWER(name) = LOWER(?1) LIMIT 1',
                idOrName,
            );
        }

        const needle = idOrName.toLowerCase();
        const rows = await this.listUsers();
        return rows.find(
            (u) => u.id === idOrName || u.uuid === idOrName || u.name.toLowerCase() === needle,
        ) ?? null;
    }

    async insertUser(row: UserRecord): Promise<void> {
        if (this.useSql) {
            await this.store.run(
                `INSERT INTO users
                 (id, name, uuid, notes, limit_bytes, daily_limit, expiry_ms,
                  is_paused, disabled_reason, created_at, meta)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                row.id, row.name, row.uuid, row.notes, row.limit_bytes, row.daily_limit,
                row.expiry_ms, row.is_paused, row.disabled_reason, row.created_at, row.meta,
            );
            return;
        }

        const rows = await this.listUsers();
        rows.push(row);
        await this.store.putJSON(KV_USERS, rows);
    }

    async updateUser(row: UserRecord): Promise<void> {
        if (this.useSql) {
            await this.store.run(
                `UPDATE users SET
                   name = ?, uuid = ?, notes = ?, limit_bytes = ?, daily_limit = ?,
                   expiry_ms = ?, is_paused = ?, disabled_reason = ?, meta = ?
                 WHERE id = ?`,
                row.name, row.uuid, row.notes, row.limit_bytes, row.daily_limit,
                row.expiry_ms, row.is_paused, row.disabled_reason, row.meta, row.id,
            );
            return;
        }

        const rows = await this.listUsers();
        const index = rows.findIndex((u) => u.id === row.id);
        if (index === -1) return;
        rows[index] = row;
        await this.store.putJSON(KV_USERS, rows);
    }

    async deleteUser(id: string): Promise<void> {
        if (this.useSql) {
            await this.store.run('DELETE FROM users WHERE id = ?', id);
            await this.store.run('DELETE FROM usage WHERE user_id = ?', id);
            return;
        }

        const rows = (await this.listUsers()).filter((u) => u.id !== id);
        await this.store.putJSON(KV_USERS, rows);

        const usage = (await this.allUsage()).filter((u) => u.user_id !== id);
        await this.store.putJSON(KV_USAGE, usage);
    }

    /* ─────────────────────────────────────────────────────────── usage ── */

    private async allUsage(): Promise<UsageRecord[]> {
        if (this.useSql) return this.store.all<UsageRecord>('SELECT * FROM usage');
        return (await this.store.getJSON<UsageRecord[]>(KV_USAGE)) ?? [];
    }

    async usageTotals(userId: string): Promise<{ bytes: number; reqs: number }> {
        if (this.useSql) {
            const row = await this.store.first<{ bytes: number; reqs: number }>(
                `SELECT COALESCE(SUM(bytes), 0) AS bytes, COALESCE(SUM(reqs), 0) AS reqs
                 FROM usage WHERE user_id = ?`,
                userId,
            );
            return { bytes: row?.bytes ?? 0, reqs: row?.reqs ?? 0 };
        }

        const rows = (await this.allUsage()).filter((u) => u.user_id === userId);
        return {
            bytes: rows.reduce((sum, r) => sum + r.bytes, 0),
            reqs: rows.reduce((sum, r) => sum + r.reqs, 0),
        };
    }

    async usageForDay(userId: string, day: string): Promise<{ bytes: number; reqs: number }> {
        if (this.useSql) {
            const row = await this.store.first<{ bytes: number; reqs: number }>(
                'SELECT bytes, reqs FROM usage WHERE user_id = ? AND day = ?',
                userId, day,
            );
            return { bytes: row?.bytes ?? 0, reqs: row?.reqs ?? 0 };
        }

        const row = (await this.allUsage()).find((u) => u.user_id === userId && u.day === day);
        return { bytes: row?.bytes ?? 0, reqs: row?.reqs ?? 0 };
    }

    /**
     * Total traffic per day across all users, oldest first.
     *
     * Aggregated in the store rather than the handler so the SQL path can do
     * the grouping itself instead of shipping every row to the worker.
     */
    async usageByDay(days: string[]): Promise<Map<string, number>> {
        const out = new Map<string, number>(days.map((d) => [d, 0]));

        if (this.useSql) {
            const placeholders = days.map(() => '?').join(',');
            const rows = await this.store.all<{ day: string; bytes: number }>(
                `SELECT day, COALESCE(SUM(bytes), 0) AS bytes FROM usage
                 WHERE day IN (${placeholders}) GROUP BY day`,
                ...days,
            );
            for (const row of rows) out.set(row.day, row.bytes);
            return out;
        }

        for (const row of await this.allUsage()) {
            if (out.has(row.day)) out.set(row.day, (out.get(row.day) ?? 0) + row.bytes);
        }
        return out;
    }

    async addUsage(userId: string, day: string, bytes: number, reqs: number): Promise<void> {
        if (this.useSql) {
            await this.store.run(
                `INSERT INTO usage (user_id, day, bytes, reqs) VALUES (?, ?, ?, ?)
                 ON CONFLICT(user_id, day) DO UPDATE SET
                   bytes = bytes + excluded.bytes,
                   reqs  = reqs  + excluded.reqs`,
                userId, day, bytes, reqs,
            );
            return;
        }

        const rows = await this.allUsage();
        const row = rows.find((u) => u.user_id === userId && u.day === day);
        if (row) {
            row.bytes += bytes;
            row.reqs += reqs;
        } else {
            rows.push({ user_id: userId, day, bytes, reqs });
        }
        await this.store.putJSON(KV_USAGE, rows);
    }

    async clearUsage(userId: string): Promise<void> {
        if (this.useSql) {
            await this.store.run('DELETE FROM usage WHERE user_id = ?', userId);
            return;
        }

        const rows = (await this.allUsage()).filter((u) => u.user_id !== userId);
        await this.store.putJSON(KV_USAGE, rows);
    }

    /* ──────────────────────────────────────────────────────────── logs ── */

    async listLogs(limit: number): Promise<LogRecord[]> {
        if (this.useSql) {
            return this.store.all<LogRecord>(
                'SELECT id, ts, type, detail FROM logs ORDER BY ts DESC LIMIT ?',
                limit,
            );
        }

        const rows = (await this.store.getJSON<LogRecord[]>(KV_LOGS)) ?? [];
        return rows.slice(0, limit);
    }

    async appendLog(entry: LogRecord): Promise<void> {
        if (this.useSql) {
            await this.store.run(
                'INSERT INTO logs (ts, type, detail) VALUES (?, ?, ?)',
                entry.ts, entry.type, entry.detail,
            );

            // Opportunistic trim so the table cannot grow without bound.
            if (Math.random() < 0.05) {
                await this.store.run(
                    'DELETE FROM logs WHERE id NOT IN (SELECT id FROM logs ORDER BY ts DESC LIMIT ?)',
                    MAX_LOG_ROWS,
                );
            }
            return;
        }

        const rows = (await this.store.getJSON<LogRecord[]>(KV_LOGS)) ?? [];
        rows.unshift(entry);
        await this.store.putJSON(KV_LOGS, rows.slice(0, MAX_LOG_ROWS));
    }

    async clearLogs(): Promise<void> {
        if (this.useSql) {
            await this.store.run('DELETE FROM logs');
            return;
        }
        await this.store.putJSON(KV_LOGS, []);
    }
}
