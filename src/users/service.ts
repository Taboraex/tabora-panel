import { EnrichedUser, User, UserStatus, UserUsage } from '#types/settings';
import { Store } from '@storage/db';
import { cacheInvalidate, CacheKeys } from '@storage/cache';
import { randomUUID, todayKey, deriveUUID } from '@common/utils';

interface UserRow {
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

function rowToUser(row: UserRow): User {
    let meta: Partial<User> = {};
    try {
        meta = JSON.parse(row.meta ?? '{}');
    } catch {
        /* ignore malformed meta */
    }

    return {
        id: row.id,
        name: row.name,
        uuid: row.uuid,
        notes: row.notes ?? '',
        limitBytes: row.limit_bytes ?? 0,
        dailyLimitBytes: row.daily_limit ?? 0,
        expiryMs: row.expiry_ms ?? 0,
        isPaused: Boolean(row.is_paused),
        disabledReason: row.disabled_reason ?? '',
        createdAt: row.created_at,
        protocols: meta.protocols ?? '',
        ports: meta.ports ?? [],
        cleanIPs: meta.cleanIPs ?? [],
        panelUrl: meta.panelUrl ?? '',
        maxConfigs: meta.maxConfigs ?? 0,
    };
}

function userMeta(user: Partial<User>): string {
    return JSON.stringify({
        protocols: user.protocols ?? '',
        ports: user.ports ?? [],
        cleanIPs: user.cleanIPs ?? [],
        panelUrl: user.panelUrl ?? '',
        maxConfigs: user.maxConfigs ?? 0,
    });
}

export function resolveStatus(user: User, usage: UserUsage): UserStatus {
    if (user.isPaused) return user.disabledReason ? 'auto-disabled' : 'paused';
    if (user.expiryMs && Date.now() > user.expiryMs) return 'expired';
    if (user.limitBytes && usage.totalBytes >= user.limitBytes) return 'quota-exceeded';
    if (user.dailyLimitBytes && usage.dailyBytes >= user.dailyLimitBytes) return 'daily-limit';
    return 'active';
}

export const isUsable = (status: UserStatus): boolean => status === 'active';

export class UserService {
    constructor(private store: Store) {}

    async list(query = ''): Promise<EnrichedUser[]> {
        const rows = query
            ? await this.store.all<UserRow>(
                  `SELECT * FROM users
                   WHERE name LIKE ?1 OR id LIKE ?1 OR uuid LIKE ?1 OR notes LIKE ?1
                   ORDER BY created_at DESC`,
                  `%${query}%`,
              )
            : await this.store.all<UserRow>('SELECT * FROM users ORDER BY created_at DESC');

        const users = rows.map(rowToUser);
        return Promise.all(users.map((user) => this.enrich(user)));
    }

    async get(idOrName: string): Promise<User | null> {
        const row = await this.store.first<UserRow>(
            'SELECT * FROM users WHERE id = ?1 OR uuid = ?1 OR LOWER(name) = LOWER(?1) LIMIT 1',
            idOrName,
        );
        return row ? rowToUser(row) : null;
    }

    async enrich(user: User): Promise<EnrichedUser> {
        const usage = await this.getUsage(user.id);
        return { ...user, usage, status: resolveStatus(user, usage) };
    }

    async create(input: Partial<User> & { name: string }): Promise<User> {
        const id = randomUUID();
        const user: User = {
            id,
            name: input.name,
            uuid: input.uuid || (await deriveUUID(`${id}:${input.name}`)),
            notes: input.notes ?? '',
            limitBytes: input.limitBytes ?? 0,
            dailyLimitBytes: input.dailyLimitBytes ?? 0,
            expiryMs: input.expiryMs ?? 0,
            isPaused: input.isPaused ?? false,
            disabledReason: '',
            createdAt: Date.now(),
            protocols: input.protocols ?? '',
            ports: input.ports ?? [],
            cleanIPs: input.cleanIPs ?? [],
            panelUrl: input.panelUrl ?? '',
            maxConfigs: input.maxConfigs ?? 0,
        };

        await this.store.run(
            `INSERT INTO users
             (id, name, uuid, notes, limit_bytes, daily_limit, expiry_ms, is_paused, disabled_reason, created_at, meta)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            user.id, user.name, user.uuid, user.notes,
            user.limitBytes, user.dailyLimitBytes, user.expiryMs,
            user.isPaused ? 1 : 0, '', user.createdAt, userMeta(user),
        );

        cacheInvalidate(CacheKeys.users);
        return user;
    }

    async update(id: string, patch: Partial<User>): Promise<User | null> {
        const existing = await this.get(id);
        if (!existing) return null;

        const merged: User = { ...existing, ...patch, id: existing.id };

        await this.store.run(
            `UPDATE users SET
               name = ?, uuid = ?, notes = ?, limit_bytes = ?, daily_limit = ?,
               expiry_ms = ?, is_paused = ?, disabled_reason = ?, meta = ?
             WHERE id = ?`,
            merged.name, merged.uuid, merged.notes,
            merged.limitBytes, merged.dailyLimitBytes, merged.expiryMs,
            merged.isPaused ? 1 : 0, merged.disabledReason, userMeta(merged),
            merged.id,
        );

        cacheInvalidate(CacheKeys.users);
        return merged;
    }

    async remove(id: string): Promise<boolean> {
        const removed = await this.store.run('DELETE FROM users WHERE id = ?', id);
        await this.store.run('DELETE FROM usage WHERE user_id = ?', id);
        cacheInvalidate(CacheKeys.users);
        return removed;
    }

    async toggle(id: string): Promise<User | null> {
        const user = await this.get(id);
        if (!user) return null;
        return this.update(id, {
            isPaused: !user.isPaused,
            disabledReason: '',
        });
    }

    /* ------------------------------------------------------------- usage */

    async getUsage(userId: string): Promise<UserUsage> {
        const day = todayKey();

        const totals = await this.store.first<{ bytes: number; reqs: number }>(
            'SELECT COALESCE(SUM(bytes), 0) AS bytes, COALESCE(SUM(reqs), 0) AS reqs FROM usage WHERE user_id = ?',
            userId,
        );

        const today = await this.store.first<{ bytes: number; reqs: number }>(
            'SELECT bytes, reqs FROM usage WHERE user_id = ? AND day = ?',
            userId, day,
        );

        return {
            totalBytes: totals?.bytes ?? 0,
            totalReqs: totals?.reqs ?? 0,
            dailyBytes: today?.bytes ?? 0,
            dailyReqs: today?.reqs ?? 0,
            day,
        };
    }

    /** Increment counters for a user. Safe to call from ctx.waitUntil(). */
    async recordUsage(userId: string, bytes: number, reqs = 1): Promise<void> {
        await this.store.run(
            `INSERT INTO usage (user_id, day, bytes, reqs) VALUES (?, ?, ?, ?)
             ON CONFLICT(user_id, day) DO UPDATE SET
               bytes = bytes + excluded.bytes,
               reqs  = reqs  + excluded.reqs`,
            userId, todayKey(), bytes, reqs,
        );
    }

    async resetUsage(userId: string): Promise<void> {
        await this.store.run('DELETE FROM usage WHERE user_id = ?', userId);
        await this.update(userId, { isPaused: false, disabledReason: '' });
    }

    /** Pause users that ran out of quota or expired. Returns affected names. */
    async enforceQuotas(): Promise<string[]> {
        const users = await this.list();
        const disabled: string[] = [];

        for (const user of users) {
            if (user.isPaused) continue;
            const status = resolveStatus(user, user.usage);
            if (status === 'active') continue;

            await this.update(user.id, { isPaused: true, disabledReason: status });
            disabled.push(user.name);
        }

        return disabled;
    }

    /* ------------------------------------------------------------- stats */

    async stats() {
        const users = await this.list();
        const totalBytes = users.reduce((sum, u) => sum + u.usage.totalBytes, 0);
        const todayBytes = users.reduce((sum, u) => sum + u.usage.dailyBytes, 0);

        return {
            total: users.length,
            active: users.filter((u) => u.status === 'active').length,
            paused: users.filter((u) => u.status === 'paused').length,
            expired: users.filter((u) => u.status === 'expired').length,
            autoDisabled: users.filter((u) => u.status === 'auto-disabled').length,
            totalBytes,
            todayBytes,
        };
    }

    /** Credential lookup sets used by the proxy handshake. */
    async credentials(globalUUID: string, globalTrojanHash: string) {
        const users = await this.list();
        const uuids = new Set<string>([globalUUID]);
        const trojanHashes = new Set<string>([globalTrojanHash]);
        const byUUID = new Map<string, EnrichedUser>();

        for (const user of users) {
            if (!isUsable(user.status)) continue;
            uuids.add(user.uuid);
            byUUID.set(user.uuid, user);
        }

        return { uuids, trojanHashes, byUUID };
    }
}
