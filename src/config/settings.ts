import { Settings, RequestContext } from '#types/settings';
import { DEFAULT_SETTINGS } from './defaults';
import { Store } from '@storage/db';
import { cached, cacheInvalidate, CacheKeys, cacheSet } from '@storage/cache';
import { CACHE_TTL_SETTINGS, HTTP_PORTS, HTTPS_PORTS } from './constants';
import { deriveUUID, isValidUUID } from '@common/utils';

const SETTINGS_KEY = 'settings';

/** Per-request context. Rebuilt on every fetch, never cached across requests. */
let ctx: RequestContext;

export function initContext(request: Request): RequestContext {
    const url = new URL(request.url);
    ctx = {
        origin: url.origin,
        hostname: url.hostname,
        pathname: decodeURIComponent(url.pathname),
        searchParams: url.searchParams,
        client: decodeURIComponent(url.searchParams.get('app') ?? ''),
        userAgent: request.headers.get('User-Agent') ?? '',
        clientIp:
            request.headers.get('CF-Connecting-IP') ??
            request.headers.get('X-Real-IP') ??
            request.headers.get('X-Forwarded-For') ??
            '',
        colo: (request as { cf?: IncomingRequestCfProperties }).cf?.colo ?? '',
        httpPorts: HTTP_PORTS,
        httpsPorts: HTTPS_PORTS,
    };
    return ctx;
}

export const getContext = (): RequestContext => ctx;

/**
 * Load settings, layering: defaults <- env overrides <- stored values.
 * Secrets absent from both env and storage are derived deterministically so a
 * fresh deploy is usable with zero configuration.
 */
export async function loadSettings(store: Store, env: Env): Promise<Settings> {
    return cached(CacheKeys.settings, CACHE_TTL_SETTINGS, async () => {
        const stored = await store.getJSON<Partial<Settings>>(SETTINGS_KEY);
        const settings: Settings = { ...DEFAULT_SETTINGS, ...(stored ?? {}) };

        // env wins for deployment-level knobs
        if (env.SECURE_PATH) settings.securePath = env.SECURE_PATH;
        if (env.FALLBACK) settings.fallback = env.FALLBACK;
        // PROXY_IP seeds the relay list, overriding the shipped defaults — but
        // it must not mask a list the operator saved from the panel or a scan,
        // otherwise applying scan results would silently do nothing.
        if (env.PROXY_IP && !stored?.proxyIPs?.length) {
            const fromEnv = env.PROXY_IP.split(',').map((s) => s.trim()).filter(Boolean);
            if (fromEnv.length) settings.proxyIPs = fromEnv;
        }

        const password = env.ADMIN_PASSWORD || 'admin';

        if (env.UUID && isValidUUID(env.UUID)) {
            settings.uuid = env.UUID.toLowerCase();
        } else if (!settings.uuid || !isValidUUID(settings.uuid)) {
            settings.uuid = await deriveUUID(`${password}:${settings.securePath}:vl`);
        }

        settings.trojanPassword =
            env.TROJAN_PASSWORD ||
            settings.trojanPassword ||
            (await deriveUUID(`${password}:${settings.securePath}:tr`)).replace(/-/g, '');

        settings.panelVersion = VERSION;

        // Persist the first materialised copy so the panel has something to edit.
        if (!stored && store.isPersistent) {
            await store.putJSON(SETTINGS_KEY, settings);
        }

        return settings;
    });
}

export async function saveSettings(
    store: Store,
    current: Settings,
    patch: Partial<Settings>,
): Promise<Settings> {
    const merged: Settings = { ...current, ...patch, panelVersion: VERSION };
    await store.putJSON(SETTINGS_KEY, merged);
    cacheSet(CacheKeys.settings, merged, CACHE_TTL_SETTINGS);
    return merged;
}

export async function resetSettings(store: Store, env: Env): Promise<Settings> {
    await store.delete(SETTINGS_KEY);
    cacheInvalidate(CacheKeys.settings);
    return loadSettings(store, env);
}
