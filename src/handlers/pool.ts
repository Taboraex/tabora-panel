import { Settings } from '#types/settings';
import { Store } from '@storage/db';
import { saveSettings } from '@config/settings';
import { DEFAULT_SETTINGS, LEGACY_NAME_TEMPLATE } from '@config/defaults';
import { ok, badRequest, methodNotAllowed } from '@common/http';
import {
    publicCountries, findCountry, candidatesFor, isPoolAddress,
} from '@scanner/countries';
import {
    POOL_LIMITS, clampPool, rankPool, toPoolEntries, buildPoolSettings, DEFAULT_IP_POOL,
    type PoolMeasurement,
} from '@scanner/pool';
import { logActivity } from './logs';

/**
 * Proxy IP Pool endpoints.
 *
 *   GET  api/scan/pool              — country catalogue + the pinned pool
 *   GET  api/scan/pool/candidates   — IPv4s for the browser to probe
 *   POST api/scan/pool/apply        — rank samples, pin the winners
 *   POST api/scan/pool/clear        — forget the pinned pool
 *
 * Measurement stays in the browser: a Worker cannot open a socket into
 * Cloudflare's own address space, and even a successful fetch would describe
 * the datacentre's path, not the operator's. The worker only supplies the
 * country-filtered candidate list and writes the winners into settings.
 */

export function handlePoolMeta(settings: Settings): Response {
    const pool = settings.ipPool ?? DEFAULT_IP_POOL;
    const country = findCountry(pool.country);
    return ok({
        countries: publicCountries(),
        pool,
        country: country
            ? { code: country.code, name: country.name, nameFa: country.nameFa, flag: country.flag, colo: country.colo }
            : null,
        probesPerIp: POOL_LIMITS.probes.fallback,
        probePath: '/cdn-cgi/trace',
    });
}

export function handlePoolCandidates(request: Request, settings: Settings): Response {
    const url = new URL(request.url);
    const code = (url.searchParams.get('country') ?? '').trim().toUpperCase();
    if (!code || !findCountry(code)) {
        return badRequest('Unknown country. Pick one from GET api/scan/pool.');
    }

    const count = clampPool(url.searchParams.get('count'), POOL_LIMITS.count);
    const previous = settings.ipPool?.country === code
        ? (settings.ipPool.entries ?? []).map((e) => e.address)
        : [];

    const addresses = candidatesFor(code, count, previous);
    if (!addresses.length) {
        return badRequest('No candidates available for that country.');
    }

    const country = findCountry(code)!;
    return ok({
        country: {
            code: country.code,
            name: country.name,
            nameFa: country.nameFa,
            flag: country.flag,
            colo: country.colo,
        },
        addresses,
        probesPerIp: POOL_LIMITS.probes.fallback,
        probePath: '/cdn-cgi/trace',
    });
}

interface ApplyBody {
    country?: unknown;
    keep?: unknown;
    lockToPool?: unknown;
    measurements?: unknown;
}

export async function handlePoolApply(
    request: Request,
    settings: Settings,
    store: Store,
): Promise<Response> {
    if (request.method !== 'POST') return methodNotAllowed();

    let body: ApplyBody;
    try {
        body = (await request.json()) as ApplyBody;
    } catch {
        return badRequest('Invalid JSON body');
    }

    const code = String(body.country ?? '').trim().toUpperCase();
    const country = findCountry(code);
    if (!country) return badRequest('Unknown country.');

    const raw = Array.isArray(body.measurements) ? body.measurements : [];
    const measurements: PoolMeasurement[] = [];
    for (const entry of raw.slice(0, POOL_LIMITS.count.max)) {
        if (!entry || typeof entry !== 'object') continue;
        const rec = entry as { address?: unknown; samples?: unknown };
        const address = String(rec.address ?? '').trim();
        if (!isPoolAddress(address)) continue;
        const samples = Array.isArray(rec.samples)
            ? rec.samples.map((v) => Number(v)).filter((n) => Number.isFinite(n))
            : [];
        if (!samples.length) continue;
        measurements.push({ address, samples });
    }

    if (!measurements.length) return badRequest('No valid measurements supplied.');

    const keep = clampPool(body.keep ?? settings.ipPool?.keep, POOL_LIMITS.keep);
    const ranked = rankPool(measurements, country.code, keep);
    const scannedAt = Date.now();
    const entries = toPoolEntries(ranked, scannedAt);

    if (!entries.length) {
        return badRequest('No healthy Cloudflare IP found for that country from your network.');
    }

    const lockToPool = body.lockToPool !== false;
    const ipPool = buildPoolSettings(settings.ipPool, {
        country: country.code,
        lockToPool,
        keep,
        entries,
        scannedAt,
    });

    // Mirror the winners into cleanIPs so older code paths and backups
    // still see the same address list the subscription builder uses.
    const patch: Partial<Settings> = {
        ipPool,
        cleanIPs: entries.map((e) => e.address),
    };
    if (!settings.nameTemplate || settings.nameTemplate === LEGACY_NAME_TEMPLATE) {
        patch.nameTemplate = DEFAULT_SETTINGS.nameTemplate;
    }

    const updated = await saveSettings(store, settings, patch);

    const best = entries[0];
    await logActivity(
        store,
        'ip-pool',
        `${country.flag} ${country.code} → ${best.address} (${best.latency}ms, ${best.grade}) ×${entries.length}`,
    );

    return ok({
        applied: true,
        country: {
            code: country.code,
            name: country.name,
            nameFa: country.nameFa,
            flag: country.flag,
            colo: country.colo,
        },
        best,
        entries,
        ranked,
        pool: updated.ipPool,
    });
}

export async function handlePoolClear(
    request: Request,
    settings: Settings,
    store: Store,
): Promise<Response> {
    if (request.method !== 'POST') return methodNotAllowed();

    await saveSettings(store, settings, { ipPool: { ...DEFAULT_IP_POOL } });
    await logActivity(store, 'ip-pool-clear', settings.ipPool?.country ?? '');
    return ok({ pool: DEFAULT_IP_POOL }, 'Proxy IP Pool cleared.');
}
