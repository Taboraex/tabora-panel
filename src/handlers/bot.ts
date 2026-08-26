import { Settings } from '#types/settings';
import { Store } from '@storage/db';
import { UserService } from '@users/service';
import { saveSettings, getContext } from '@config/settings';
import { ok, badRequest, unauthorized, notFound, methodNotAllowed } from '@common/http';
import { formatBytes, isValidUUID } from '@common/utils';
import { logActivity } from './logs';

/**
 * Machine API for the Telegram launcher.
 *
 * Authenticated with `X-Tabora-Key` matching the `BOT_KEY` secret the
 * launcher injected at install/upgrade. Lives under the secret path so the
 * decoy still hides the panel from scanners. A wrong or missing key is a
 * 401 — never a 404 that would confirm the route exists to a guesser who
 * already knows the path.
 */

export function timingEqual(a: string, b: string): boolean {
    if (a.length !== b.length || a.length === 0) return false;
    let x = 0;
    for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return x === 0;
}

export function botAuthorized(request: Request, env: Env): boolean {
    const want = env.BOT_KEY ?? '';
    const got = request.headers.get('X-Tabora-Key') ?? '';
    return timingEqual(want, got);
}

export async function handleBot(
    request: Request,
    env: Env,
    settings: Settings,
    store: Store,
    users: UserService,
    subroute: string,
): Promise<Response> {
    if (!botAuthorized(request, env)) return unauthorized('Invalid bot key.');

    const url = new URL(request.url);
    const id = url.searchParams.get('id') ?? '';
    const action = url.searchParams.get('action') ?? '';
    const name = url.searchParams.get('u') ?? '';

    if (subroute === 'status' || subroute === 'health' || subroute === '') {
        if (request.method !== 'GET') return methodNotAllowed();
        const stats = await users.stats();
        const ctx = getContext();
        return ok({
            version: VERSION,
            hostname: ctx.hostname,
            colo: ctx.colo,
            paused: settings.isPaused,
            owner: env.TELEGRAM_OWNER ?? '',
            stats: {
                ...stats,
                totalFormatted: formatBytes(stats.totalBytes),
                todayFormatted: formatBytes(stats.todayBytes),
            },
            subscriptionBase: `${ctx.origin}/${settings.securePath}/sub`,
            panelUrl: `${ctx.origin}/${settings.securePath}/panel`,
        });
    }

    if (subroute === 'pause') {
        if (request.method !== 'POST') return methodNotAllowed();
        let body: { paused?: unknown } = {};
        try { body = (await request.json()) as { paused?: unknown }; } catch { /* empty */ }
        const paused = body.paused === undefined ? !settings.isPaused : Boolean(body.paused);
        await saveSettings(store, settings, { isPaused: paused });
        await logActivity(store, 'bot-pause', paused ? 'paused' : 'resumed');
        return ok({ paused });
    }

    if (subroute === 'users') {
        if (request.method === 'GET') {
            const list = await users.list();
            return ok({
                users: list.slice(0, 40).map((u) => ({
                    id: u.id,
                    name: u.name,
                    status: u.status,
                    usage: formatBytes(u.usage.totalBytes),
                    today: formatBytes(u.usage.dailyBytes),
                    expiryMs: u.expiryMs,
                })),
                total: list.length,
            });
        }

        if (request.method === 'POST' && action && id) {
            if (action === 'toggle') {
                const user = await users.toggle(id);
                if (!user) return notFound('User not found.');
                await logActivity(store, 'bot-user-toggled', user.name);
                return ok(await users.enrich(user));
            }
            if (action === 'reset-usage') {
                const user = await users.get(id);
                if (!user) return notFound('User not found.');
                await users.resetUsage(user.id);
                await logActivity(store, 'bot-usage-reset', user.name);
                return ok(await users.enrich(user));
            }
            if (action === 'delete') {
                const user = await users.get(id);
                if (!user) return notFound('User not found.');
                await users.remove(user.id);
                await logActivity(store, 'bot-user-deleted', user.name);
                return ok({ deleted: user.name });
            }
            return badRequest(`Unknown action: ${action}`);
        }

        if (request.method === 'POST') {
            let payload: { name?: unknown; limitGb?: unknown; expiryDays?: unknown };
            try {
                payload = (await request.json()) as typeof payload;
            } catch {
                return badRequest('Invalid JSON body');
            }
            const userName = String(payload.name ?? '').trim().slice(0, 64);
            if (!userName) return badRequest('Name is required.');
            if (await users.get(userName)) return badRequest('A user with that name already exists.');

            const limitGb = Number(payload.limitGb) || 0;
            const expiryDays = Number(payload.expiryDays) || 0;
            const created = await users.create({
                name: userName,
                limitBytes: limitGb > 0 ? Math.round(limitGb * 1024 ** 3) : 0,
                expiryMs: expiryDays > 0 ? Date.now() + expiryDays * 86_400_000 : 0,
            });
            await logActivity(store, 'bot-user-created', created.name);
            const ctx = getContext();
            return ok({
                user: await users.enrich(created),
                subUrl: `${ctx.origin}/${settings.securePath}/sub?u=${encodeURIComponent(created.name)}`,
            });
        }

        return methodNotAllowed();
    }

    if (subroute === 'sub') {
        if (request.method !== 'GET') return methodNotAllowed();
        const ctx = getContext();
        const base = `${ctx.origin}/${settings.securePath}/sub`;
        if (!name) return ok({ url: base });
        const user = await users.get(name);
        if (!user) return notFound('User not found.');
        return ok({
            url: `${base}?u=${encodeURIComponent(user.name)}`,
            name: user.name,
            uuid: isValidUUID(user.uuid) ? user.uuid : undefined,
        });
    }

    return notFound();
}
