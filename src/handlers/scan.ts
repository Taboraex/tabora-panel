import { Settings } from '#types/settings';
import { Store } from '@storage/db';
import { saveSettings } from '@config/settings';
import { ok, badRequest, methodNotAllowed, safeError } from '@common/http';
import { CANDIDATE_DOMAINS, RELAY_CANDIDATES, sampleCloudflareIPs } from '@scanner/candidates';
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
    keep: { min: 1, max: 30, fallback: 10 },
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
 * GET api/scan/candidates — hand the browser a list of edges to probe itself.
 *
 * The browser sits on the operator's real network, so its timings reflect what
 * their users will actually experience. It fetches each candidate's
 * /cdn-cgi/trace and reports back via POST api/scan/apply.
 */
export function handleScanCandidates(): Response {
    return ok({
        domains: CANDIDATE_DOMAINS,
        sample: sampleCloudflareIPs(24),
        // /cdn-cgi/trace is served by every edge and names the colo that answered.
        probePath: '/cdn-cgi/trace',
    });
}

/**
 * POST api/scan/apply — store the clean IPs the browser found to be healthy.
 */
export async function handleScanApply(
    request: Request,
    settings: Settings,
    store: Store,
): Promise<Response> {
    if (request.method !== 'POST') return methodNotAllowed();

    let body: { addresses?: unknown };
    try {
        body = (await request.json()) as { addresses?: unknown };
    } catch {
        return badRequest('Invalid JSON body');
    }

    const supplied = Array.isArray(body.addresses) ? body.addresses : [];
    const cleanIPs = supplied
        .map((a) => String(a).trim())
        .filter(isProbeTarget)
        .slice(0, LIMITS.keep.max);

    if (!cleanIPs.length) return badRequest('No valid addresses supplied');

    await saveSettings(store, settings, { cleanIPs });
    await logActivity(store, 'scan-applied', cleanIPs.join(', ').slice(0, 200));

    return ok({ applied: true, cleanIPs });
}
