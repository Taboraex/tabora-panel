import { Settings } from '#types/settings';
import { Store } from '@storage/db';
import { saveSettings } from '@config/settings';
import { ok, badRequest, methodNotAllowed, safeError } from '@common/http';
import {
    CANDIDATE_DOMAINS,
    RELAY_CANDIDATES,
    isWorkerFrontIp,
} from '@scanner/candidates';
import {
    CLEAN_IPS,
    expandAround,
    flattenPlan,
    parseDepth,
    planScan,
    WAVE_LABELS,
} from '@scanner/strategy';
import { rankClean, type CleanMeasurement } from '@scanner/rank';
import { scan, pickBest, type ProbeMode, type ProbeResult } from '@scanner/scanner';
import { logActivity } from './logs';

/**
 * POST api/scan — probe candidate edges and report which ones work.
 *
 * The Worker CPU budget is the real constraint here, so the batch size is
 * clamped and the caller drives repeated rounds rather than us trying to sweep
 * an entire range in one request.
 */

/** Upper bounds chosen to stay comfortably inside a Worker invocation. */
const LIMITS = {
    count: { min: 1, max: 64, fallback: 20 },
    concurrency: { min: 1, max: 12, fallback: 8 },
    timeoutMs: { min: 500, max: 8000, fallback: 3000 },
    keep: { min: 1, max: 24, fallback: 8 },
};

const clamp = (value: unknown, { min, max, fallback }: { min: number; max: number; fallback: number }): number => {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.floor(n)));
};

interface ScanRequest {
    /**
     * 'relay'   probes ProxyIP relays — the only source a Worker can probe meaningfully.
     * 'custom'  probes caller-supplied hosts.
     * 'sample' / 'domains' are Cloudflare edges and are rejected here; the
     *          browser scans those instead (see api/scan/candidates).
     */
    source?: 'relay' | 'sample' | 'domains' | 'custom';
    addresses?: string[];
    port?: number;
    mode?: ProbeMode;
    count?: number;
    concurrency?: number;
    timeoutMs?: number;
    /** When true, healthy results replace the stored list for that source. */
    apply?: boolean;
    keep?: number;
}

/** Only accept hostnames and IPv4 literals — never arbitrary strings. */
const isProbeTarget = (value: string): boolean =>
    /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(value) ||
    /^(\d{1,3}\.){3}\d{1,3}$/.test(value);

export async function handleScan(
    request: Request,
    settings: Settings,
    store: Store,
): Promise<Response> {
    if (request.method !== 'POST') return methodNotAllowed();

    let body: ScanRequest;
    try {
        body = (await request.json()) as ScanRequest;
    } catch {
        return badRequest('Invalid JSON body');
    }

    const port = clamp(body.port ?? 443, { min: 1, max: 65535, fallback: 443 });
    const mode: ProbeMode = body.mode === 'tcp' ? 'tcp' : 'tls';
    const count = clamp(body.count, LIMITS.count);

    // Build the candidate list.
    //
    // Cloudflare forbids a Worker from opening a socket into its own network,
    // so probing edge IPs from here fails uniformly whether the edge is
    // healthy or not — a scan that always returns zero is worse than none.
    // Those sources are served to the browser instead, which probes from the
    // operator's real network where "clean" actually means something.
    const source = body.source ?? 'relay';
    if (source === 'sample' || source === 'domains') {
        return badRequest(
            'Cloudflare edges cannot be probed from the Worker; use GET api/scan/candidates and scan from the browser.',
        );
    }

    let addresses: string[];
    if (source === 'custom') {
        const supplied = Array.isArray(body.addresses) ? body.addresses : [];
        addresses = supplied
            .map((a) => String(a).trim())
            .filter((a) => isProbeTarget(a.replace(/:\d+$/, '')))
            .slice(0, LIMITS.count.max);
        if (!addresses.length) return badRequest('No valid addresses supplied');
    } else {
        addresses = RELAY_CANDIDATES.slice(0, count);
    }

    // A candidate may carry its own port ("host:443"); that wins over `port`.
    const targets = addresses.map((entry) => {
        const match = entry.match(/^(.*):(\d+)$/);
        return match
            ? { host: match[1], port: Number(match[2]) }
            : { host: entry, port };
    });

    let results: ProbeResult[];
    try {
        results = await scan({
            targets,
            mode,
            concurrency: clamp(body.concurrency, LIMITS.concurrency),
            timeoutMs: clamp(body.timeoutMs, LIMITS.timeoutMs),
        });
    } catch (error) {
        return badRequest(`Scan failed: ${safeError(error)}`);
    }

    const healthy = results.filter((r) => r.ok);
    let applied = false;

    // Optionally promote the winners into the live clean-IP list.
    if (body.apply && healthy.length) {
        const keep = clamp(body.keep, LIMITS.keep);
        const best = pickBest(results, keep).map((r) => `${r.address}:${r.port}`);
        // Relay results feed proxyIPs; custom probes feed the clean-IP list.
        const patch = source === 'relay'
            ? { proxyIPs: best }
            : { cleanIPs: best.map((b) => b.replace(/:443$/, '')) };
        await saveSettings(store, settings, patch);
        await logActivity(store, 'scan-applied', best.join(', ').slice(0, 200));
        applied = true;
    }

    return ok({
        applied,
        scanned: results.length,
        healthy: healthy.length,
        mode,
        source,
        // Median of the healthy set is a better signal than the mean here.
        medianLatency: healthy.length
            ? healthy.map((r) => r.latency).sort((a, b) => a - b)[Math.floor(healthy.length / 2)]
            : null,
        results,
    });
}

/**
 * GET api/scan/candidates — multi-wave plan the browser walks itself.
 *
 * Depth: quick | smart | deep. Previous Worker-front pins become the memory
 * wave so a rescan starts from what already worked on this network.
 */
export function handleScanCandidates(request: Request, settings: Settings): Response {
    const url = new URL(request.url);
    const depth = parseDepth(url.searchParams.get('depth'));
    const previous = (settings.cleanIPs ?? []).filter((a) => isWorkerFrontIp(String(a)));
    const waves = planScan({ previous, depth });
    const sample = flattenPlan(waves);
    return ok({
        domains: CANDIDATE_DOMAINS,
        sample,
        waves,
        depth,
        probesPerIp: depth === 'quick' ? 3 : 5,
        earlyStop: depth !== 'deep',
        keepMax: LIMITS.keep.max,
        catalogSize: CLEAN_IPS.length,
        probePath: '/cdn-cgi/trace',
    });
}

/**
 * GET api/scan/expand?around=ip1,ip2&count=16 — /24 neighbours of winners.
 */
export function handleScanExpand(request: Request): Response {
    const url = new URL(request.url);
    const around = (url.searchParams.get('around') ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(isWorkerFrontIp);
    const count = clamp(url.searchParams.get('count'), { min: 4, max: 32, fallback: 16 });
    const addresses = expandAround(around, 6, count);
    return ok({
        id: 'neighbors' as const,
        ...WAVE_LABELS.neighbors,
        addresses,
    });
}

/**
 * POST api/scan/rank — turn browser samples into a healthy, diverse shortlist.
 *
 * Lossy addresses are dropped, never padded into `keep`. Distinct /24s win
 * over a second host in the same prefix.
 */
export async function handleScanRank(request: Request): Promise<Response> {
    if (request.method !== 'POST') return methodNotAllowed();

    let body: { measurements?: unknown; keep?: unknown };
    try {
        body = (await request.json()) as { measurements?: unknown; keep?: unknown };
    } catch {
        return badRequest('Invalid JSON body');
    }

    const raw = Array.isArray(body.measurements) ? body.measurements : [];
    if (!raw.length) return badRequest('No measurements supplied');

    const measurements: CleanMeasurement[] = [];
    for (const entry of raw.slice(0, 160)) {
        const rec = entry as { address?: unknown; samples?: unknown };
        const address = String(rec.address ?? '').trim();
        if (!isWorkerFrontIp(address)) continue;
        const samples = Array.isArray(rec.samples)
            ? rec.samples.slice(0, 12).map((v) => (Number.isFinite(Number(v)) ? Number(v) : -1))
            : [];
        if (!samples.length) continue;
        measurements.push({ address, samples });
    }

    if (!measurements.length) return badRequest('No valid measurements supplied');

    const keep = clamp(body.keep, LIMITS.keep);
    const ranked = rankClean(measurements, keep);
    return ok({ ranked, best: ranked[0] ?? null, healthy: ranked.length });
}

/**
 * POST api/scan/apply — store the clean IPs the browser found to be healthy.
 *
 * `{ clear: true }` drops the pin list so configs fall back to the worker
 * hostname. Otherwise `addresses` is filtered to Worker-front IPv4s (and
 * hostnames) and capped at `keep` max.
 */
export async function handleScanApply(
    request: Request,
    settings: Settings,
    store: Store,
): Promise<Response> {
    if (request.method !== 'POST') return methodNotAllowed();

    let body: { addresses?: unknown; clear?: unknown };
    try {
        body = (await request.json()) as { addresses?: unknown; clear?: unknown };
    } catch {
        return badRequest('Invalid JSON body');
    }

    if (body.clear === true) {
        await saveSettings(store, settings, { cleanIPs: [] });
        await logActivity(store, 'scan-cleared', '');
        return ok({ applied: true, cleanIPs: [], cleared: true });
    }

    const supplied = Array.isArray(body.addresses) ? body.addresses : [];
    const cleanIPs = supplied
        .map((a) => String(a).trim())
        .filter(isProbeTarget)
        .filter((a) => !/^(?:\d{1,3}\.){3}\d{1,3}$/.test(a) || isWorkerFrontIp(a))
        .slice(0, LIMITS.keep.max);

    if (!cleanIPs.length) return badRequest('No valid addresses supplied');

    await saveSettings(store, settings, { cleanIPs });
    await logActivity(store, 'scan-applied', cleanIPs.join(', ').slice(0, 200));

    return ok({ applied: true, cleanIPs });
}
