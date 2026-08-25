import { Store } from '@storage/db';
import { LogEntry } from '#types/settings';
import { ok, methodNotAllowed } from '@common/http';

const MAX_LOG_ROWS = 500;

/** Append an audit entry. Never throws — logging must not break a request. */
export async function logActivity(store: Store, type: string, detail: string): Promise<void> {
    try {
        await store.run(
            'INSERT INTO logs (ts, type, detail) VALUES (?, ?, ?)',
            Date.now(), type, detail.slice(0, 500),
        );

        // Opportunistic trim so the table cannot grow without bound.
        if (Math.random() < 0.05) {
            await store.run(
                `DELETE FROM logs WHERE id NOT IN (
                     SELECT id FROM logs ORDER BY ts DESC LIMIT ?
                 )`,
                MAX_LOG_ROWS,
            );
        }
    } catch {
        /* logging is best-effort */
    }
}

export async function handleLogs(request: Request, store: Store): Promise<Response> {
    if (request.method === 'DELETE') {
        await store.run('DELETE FROM logs');
        return ok(null, 'Logs cleared.');
    }

    if (request.method !== 'GET') return methodNotAllowed();

    const limit = Math.min(Number(new URL(request.url).searchParams.get('limit') ?? 100), MAX_LOG_ROWS);
    const rows = await store.all<LogEntry>(
        'SELECT id, ts, type, detail FROM logs ORDER BY ts DESC LIMIT ?',
        limit,
    );

    return ok({ logs: rows, total: rows.length });
}
