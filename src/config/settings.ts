import { Settings, RequestContext } from '#types/settings';
import { DEFAULT_SETTINGS, LEGACY_NAME_TEMPLATE } from './defaults';
import { Store } from '@storage/db';
import { cached, cacheInvalidate, CacheKeys, cacheSet } from '@storage/cache';
import { CACHE_TTL_SETTINGS, DEFAULT_PROXY_IPS, HTTP_PORTS, HTTPS_PORTS } from './constants';
import { deriveUUID, isValidUUID } from '@common/utils';
import { isWorkerFrontIp } from '@scanner/candidates';

const SETTINGS_KEY = 'settings';

/**
 * Drop colo-interconnect IPs pinned by v0.7.0. Those never front a Worker, so
 * every generated config was dead and Hiddify hid them as unreachable.
 * Returns true when the object was mutated and should be persisted.
 */
function healIpPool(settings: Settings): boolean {
    let changed = false;
    const pool = settings.ipPool;

    if (!pool || !Array.isArray(pool.entries)) {
        settings.ipPool = { ...DEFAULT_SETTINGS.ipPool };
        return true;
    }

    const kept = pool.entries.filter((entry) => isWorkerFrontIp(entry.address));
    if (kept.length !== pool.entries.length) {
        const dropped = new Set(
            pool.entries.filter((entry) => !isWorkerFrontIp(entry.address)).map((entry) => entry.address),
        );
        settings.ipPool = kept.length
            ? { ...pool, entries: kept, enabled: true }
            : { ...DEFAULT_SETTINGS.ipPool };
        if (dropped.size) {
            settings.cleanIPs = (settings.cleanIPs ?? []).filter((ip) => !dropped.has(ip));
        }
        changed = true;
    }

    if (settings.nameTemplate === LEGACY_NAME_TEMPLATE) {
        settings.nameTemplate = DEFAULT_SETTINGS.nameTemplate;
        changed = true;
    }

    return changed;
}

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

        // Panels stored before 0.7.0 have no pool object. A null/partial
        // value would crash the scanner tab, so rebuild it from defaults.
        if (!settings.ipPool || !Array.isArray(settings.ipPool.entries)) {
            settings.ipPool = {
                ...DEFAULT_SETTINGS.ipPool,
                ...(settings.ipPool ?? {}),
                entries: settings.ipPool?.entries ?? [],
            };
        }

        // Panels created before relays shipped stored an empty list, and an
        // empty list means every Cloudflare-hosted destination silently fails.
        // Treat it as "never configured" and adopt the defaults; an operator
        // who genuinely wants no relay can pick a different proxyIpMode.
        let migrated = false;
        if (stored && Array.isArray(stored.proxyIPs) && stored.proxyIPs.length === 0) {
            settings.proxyIPs = [...DEFAULT_PROXY_IPS];
            migrated = true;
        }
        if (healIpPool(settings)) migrated = true;

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

        /*
         * Persist the first materialised copy so the panel has something to
         * edit, and write back the relay migration so it happens only once.
         *
         * Best-effort on purpose. Everything above is derived deterministically
         * from the password, the secure path and the environment, so the exact
         * same settings object is rebuilt on the next request whether or not
         * this write lands. Making a read path depend on a successful write is
         * what turned a full storage quota into a panel that would not open:
         * the write threw, and the throw escaped as a 500 before any HTML was
         * produced.
         */
        if ((!stored || migrated) && store.isPersistent) {
            try {
                await store.putJSON(SETTINGS_KEY, settings);
            } catch (error) {
                console.error('Could not persist initial settings:', error);
            }
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
    healIpPool(merged);
    await store.putJSON(SETTINGS_KEY, merged);
    cacheSet(CacheKeys.settings, merged, CACHE_TTL_SETTINGS);
    return merged;
}

export async function resetSettings(store: Store, env: Env): Promise<Settings> {
    await store.delete(SETTINGS_KEY);
    cacheInvalidate(CacheKeys.settings);
    return loadSettings(store, env);
}
