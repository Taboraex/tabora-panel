import { Store } from '@storage/db';
import { Collections } from '@storage/collections';
import { ok, methodNotAllowed } from '@common/http';

const MAX_LOG_ROWS = 500;

/** Append an audit entry. Never throws — logging must not break a request. */
export async function logActivity(store: Store, type: string, detail: string): Promise<void> {
    try {
        await new Collections(store).appendLog({
            ts: Date.now(),
            type,
            detail: detail.slice(0, 500),
        });
    } catch {
        /* logging is best-effort */
    }
}

export async function handleLogs(request: Request, store: Store): Promise<Response> {
    const db = new Collections(store);

    if (request.method === 'DELETE') {
        await db.clearLogs();
        return ok(null, 'Logs cleared.');
    }

    if (request.method !== 'GET') return methodNotAllowed();

    const requested = Number(new URL(request.url).searchParams.get('limit') ?? 100);
    const limit = Math.min(Number.isFinite(requested) ? requested : 100, MAX_LOG_ROWS);
    const logs = await db.listLogs(limit);

    return ok({ logs, total: logs.length });
}
