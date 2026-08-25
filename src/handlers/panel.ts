import { Settings } from '#types/settings';
import { Store } from '@storage/db';
import { UserService } from '@users/service';
import { saveSettings, resetSettings, getContext } from '@config/settings';
import { validateSettings } from '@config/validators';
import { isDefaultPassword } from '@auth/password';
import {
    ok, badRequest, methodNotAllowed, htmlResponse, respond, HttpStatus,
} from '@common/http';
import { gunzipBase64, parseList, parsePorts, formatBytes } from '@common/utils';
import { renderTemplate } from '@common/template';
import { PROJECT } from '@config/obfuscation';
import { logActivity } from './logs';
import { DAILY_REQUEST_LIMIT } from '@config/constants';

export async function renderPanel(settings: Settings, store: Store): Promise<Response> {
    if (!PANEL_HTML) return new Response('Panel unavailable.', { status: 500 });

    const html = renderTemplate(await gunzipBase64(PANEL_HTML), {
        PROJECT: PROJECT.name,
        VERSION,
        BASE: `/${settings.securePath}`,
        REPO: PROJECT.repo,
        WARN_STORAGE: store.isPersistent ? '' : 'true',
    });

    return htmlResponse(html);
}

/** GET current settings for the panel form. */
export async function handleGetSettings(
    settings: Settings,
    store: Store,
    users: UserService,
    env: Env,
): Promise<Response> {
    const ctx = getContext();

    return ok({
        settings,
        stats: await users.stats(),
        meta: {
            version: VERSION,
            hostname: ctx.hostname,
            origin: ctx.origin,
            colo: ctx.colo,
            hasD1: store.hasD1,
            hasKV: store.hasKV,
            persistent: store.isPersistent,
            defaultPassword: await isDefaultPassword(store, env),
            dailyRequestLimit: DAILY_REQUEST_LIMIT,
            subscriptionBase: `${ctx.origin}/${settings.securePath}/sub`,
        },
    });
}

/** Normalise textarea/CSV inputs coming from the panel form. */
function normalisePayload(raw: Record<string, unknown>): Partial<Settings> {
    const out: Record<string, unknown> = { ...raw };

    const listFields = [
        'proxyIPs', 'nat64Prefixes', 'cleanIPs',
        'customBypassRules', 'customBlockRules',
    ] as const;

    for (const field of listFields) {
        if (raw[field] !== undefined) {
            out[field] = parseList(raw[field] as string | string[]);
        }
    }

    if (raw.ports !== undefined) out.ports = parsePorts(raw.ports as string | number[]);
    if (raw.maxConfigs !== undefined) out.maxConfigs = Number(raw.maxConfigs) || 30;

    if (Array.isArray(raw.protocols)) out.protocols = (raw.protocols as string[]).join(',');

    // Never let the client rewrite derived/managed fields.
    delete out.panelVersion;

    return out as Partial<Settings>;
}

export async function handleUpdateSettings(
    request: Request,
    settings: Settings,
    store: Store,
): Promise<Response> {
    if (request.method !== 'PUT' && request.method !== 'POST') return methodNotAllowed();

    let raw: Record<string, unknown>;
    try {
        raw = (await request.json()) as Record<string, unknown>;
    } catch {
        return badRequest('Invalid request body.');
    }

    const patch = normalisePayload(raw);
    const errors = validateSettings(patch);
    if (errors) return respond(false, HttpStatus.BAD_REQUEST, 'Validation failed.', errors);

    const updated = await saveSettings(store, settings, patch);
    await logActivity(store, 'settings-updated', Object.keys(patch).join(', ').slice(0, 200));

    return ok(updated, 'Settings saved.');
}

export async function handleResetSettings(
    request: Request,
    store: Store,
    env: Env,
): Promise<Response> {
    if (request.method !== 'POST') return methodNotAllowed();
    const fresh = await resetSettings(store, env);
    await logActivity(store, 'settings-reset', '');
    return ok(fresh, 'Settings restored to defaults.');
}

/** Export the full configuration (settings + users) as a backup file. */
export async function handleExport(
    settings: Settings,
    users: UserService,
): Promise<Response> {
    const payload = {
        project: PROJECT.name,
        version: VERSION,
        exportedAt: new Date().toISOString(),
        settings,
        users: (await users.list()).map(({ usage, status, ...user }) => user),
    };

    return new Response(JSON.stringify(payload, null, 2), {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': `attachment; filename=${PROJECT.slug}-backup.json`,
        },
    });
}

export async function handleImport(
    request: Request,
    settings: Settings,
    store: Store,
    users: UserService,
): Promise<Response> {
    if (request.method !== 'POST') return methodNotAllowed();

    let payload: { settings?: Partial<Settings>; users?: Array<Record<string, unknown>> };
    try {
        payload = (await request.json()) as typeof payload;
    } catch {
        return badRequest('Invalid backup file.');
    }

    if (!payload.settings && !payload.users) {
        return badRequest('Backup contains no settings or users.');
    }

    let restoredUsers = 0;

    if (payload.settings) {
        const patch = normalisePayload(payload.settings as Record<string, unknown>);
        const errors = validateSettings(patch);
        if (errors) return respond(false, HttpStatus.BAD_REQUEST, 'Backup failed validation.', errors);
        await saveSettings(store, settings, patch);
    }

    if (Array.isArray(payload.users)) {
        for (const entry of payload.users) {
            const name = String(entry.name ?? '').trim();
            if (!name) continue;
            const existing = await users.get(name);
            if (existing) continue;
            await users.create({
                name,
                uuid: String(entry.uuid ?? ''),
                notes: String(entry.notes ?? ''),
                limitBytes: Number(entry.limitBytes ?? 0),
                dailyLimitBytes: Number(entry.dailyLimitBytes ?? 0),
                expiryMs: Number(entry.expiryMs ?? 0),
            });
            restoredUsers++;
        }
    }

    await logActivity(store, 'backup-imported', `users=${restoredUsers}`);
    return ok({ restoredUsers }, `Backup restored (${restoredUsers} new user(s)).`);
}

/** Look up geolocation for the caller's IP — shown on the panel dashboard. */
export async function handleMyIp(): Promise<Response> {
    const ctx = getContext();
    if (!ctx.clientIp) return ok({ ip: 'unknown' });

    try {
        const res = await fetch(`http://ip-api.com/json/${ctx.clientIp}?nocache=${Date.now()}`);
        const geo = await res.json();
        return ok(geo);
    } catch {
        return ok({ ip: ctx.clientIp, colo: ctx.colo });
    }
}

/** GET api/usage-history — daily totals for the traffic chart. */
export async function handleUsageHistory(
    request: Request,
    users: UserService,
): Promise<Response> {
    const days = Math.min(90, Math.max(7, Number(new URL(request.url).searchParams.get('days')) || 30));
    return ok({ history: await users.usageHistory(days) });
}

export async function handleStats(users: UserService): Promise<Response> {
    const stats = await users.stats();
    return ok({
        ...stats,
        totalFormatted: formatBytes(stats.totalBytes),
        todayFormatted: formatBytes(stats.todayBytes),
    });
}
