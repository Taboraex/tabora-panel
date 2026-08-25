/**
 * D1 schema. Applied lazily once per isolate; every statement is idempotent so
 * repeated boots and version upgrades are safe.
 */
export const SCHEMA_STATEMENTS = [
    `CREATE TABLE IF NOT EXISTS settings (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL,
        updated_at INTEGER NOT NULL DEFAULT 0
    )`,

    `CREATE TABLE IF NOT EXISTS users (
        id              TEXT PRIMARY KEY,
        name            TEXT NOT NULL,
        uuid            TEXT NOT NULL,
        notes           TEXT NOT NULL DEFAULT '',
        limit_bytes     INTEGER NOT NULL DEFAULT 0,
        daily_limit     INTEGER NOT NULL DEFAULT 0,
        expiry_ms       INTEGER NOT NULL DEFAULT 0,
        is_paused       INTEGER NOT NULL DEFAULT 0,
        disabled_reason TEXT NOT NULL DEFAULT '',
        created_at      INTEGER NOT NULL,
        meta            TEXT NOT NULL DEFAULT '{}'
    )`,

    `CREATE TABLE IF NOT EXISTS usage (
        user_id TEXT NOT NULL,
        day     TEXT NOT NULL,
        bytes   INTEGER NOT NULL DEFAULT 0,
        reqs    INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, day)
    )`,

    `CREATE TABLE IF NOT EXISTS logs (
        id     INTEGER PRIMARY KEY AUTOINCREMENT,
        ts     INTEGER NOT NULL,
        type   TEXT NOT NULL,
        detail TEXT NOT NULL DEFAULT ''
    )`,

    `CREATE TABLE IF NOT EXISTS api_keys (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL,
        hash       TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_used  INTEGER NOT NULL DEFAULT 0
    )`,

    `CREATE INDEX IF NOT EXISTS idx_users_uuid ON users(uuid)`,
    `CREATE INDEX IF NOT EXISTS idx_users_name ON users(name)`,
    `CREATE INDEX IF NOT EXISTS idx_usage_day  ON usage(day)`,
    `CREATE INDEX IF NOT EXISTS idx_logs_ts    ON logs(ts DESC)`,
];
