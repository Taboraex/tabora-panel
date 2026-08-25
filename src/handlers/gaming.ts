import { GamingProfile, Settings } from '#types/settings';
import { Store } from '@storage/db';
import { saveSettings, getContext } from '@config/settings';
import { ok, badRequest, methodNotAllowed, subscriptionResponse } from '@common/http';
import { resolveBuildContext } from '@cores/shared';
import { P, PROJECT } from '@config/obfuscation';
import { sampleGamingIPs, gamingPorts, isIPv4Literal } from '@gaming/candidates';
import { summarise, rank, type EndpointStats, type Sample } from '@gaming/scoring';
import {
    buildGamingBase64, buildGamingUriList, buildGamingClash, buildGamingSingbox,
} from '@gaming/builder';
import { GAMING_PROBES_PER_IP } from '@config/constants';
import { logActivity } from './logs';

/**
 * Gaming endpoints.
 *
 *   GET  api/gaming/candidates  — IPs for the browser to measure
 *   POST api/gaming/rank        — turn raw browser samples into ranked stats
 *   POST api/gaming/pin         — freeze a chosen endpoint as a profile
 *   POST api/gaming/unpin       — remove a profile
 *   GET  api/gaming/config      — download the pinned config
 *
 * Measurement deliberately happens in the browser. The worker sits in a
 * Cloudflare datacentre, so any RTT it measures describes the datacentre's
 * network, not the player's. Worse, a worker cannot open a socket into
 * Cloudflare's own address space at all, so probing edge IPs from here returns
 * a uniform failure regardless of edge health. The browser is on the real
 * connection, so its numbers are the ones that predict in-game ping.
 */

const MAX_PROFILES = 5;
const MAX_CANDIDATES = 40;

/** GET api/gaming/candidates */
export function handleGamingCandidates(): Response {
    const count = 24;
    return ok({
        addresses: sampleGamingIPs(count),
        ports: gamingPorts(),
        probesPerIp: GAMING_PROBES_PER_IP,
        // Served by every edge and cheap to fetch; we time the TLS settle, not the body.
        probePath: '/cdn-cgi/trace',
    });
}

interface RankRequest {
    /** [{ address, port, samples: [ms, ms, ...] }] — ms of -1 means the probe failed. */
    measurements?: Array<{ address?: unknown; port?: unknown; samples?: unknown }>;
}

/** POST api/gaming/rank */
export async function handleGamingRank(request: Request): Promise<Response> {
    if (request.method !== 'POST') return methodNotAllowed();

    let body: RankRequest;
    try {
        body = (await request.json()) as RankRequest;
    } catch {
        return badRequest('Invalid JSON body');
    }

    const measurements = Array.isArray(body.measurements) ? body.measurements : [];
    if (!measurements.length) return badRequest('No measurements supplied');

    const stats: EndpointStats[] = [];
    for (const entry of measurements.slice(0, MAX_CANDIDATES)) {
        const address = String(entry.address ?? '').trim();
        const port = Number(entry.port);
        if (!isIPv4Literal(address)) continue;
        if (!Number.isInteger(port) || port < 1 || port > 65535) continue;

        const raw = Array.isArray(entry.samples) ? entry.samples : [];
        const samples: Sample[] = raw
            .slice(0, 20)
            .map((v) => ({ ms: Number.isFinite(Number(v)) ? Number(v) : -1 }));
        if (!samples.length) continue;

        stats.push(summarise(address, port, samples));
    }

    if (!stats.length) return badRequest('No valid measurements supplied');

    const ranked = rank(stats, 10);
    const best = ranked.find((r) => r.ok) ?? null;

    return ok({ ranked, best, scored: stats.length });
}

interface PinRequest {
    name?: unknown;
    address?: unknown;
    port?: unknown;
    protocol?: unknown;
    medianMs?: unknown;
    jitterMs?: unknown;
    lossPct?: unknown;
    grade?: unknown;
}

const num = (value: unknown, fallback = 0): number => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

/** POST api/gaming/pin */
export async function handleGamingPin(
    request: Request,
    settings: Settings,
    store: Store,
): Promise<Response> {
    if (request.method !== 'POST') return methodNotAllowed();

    let body: PinRequest;
    try {
        body = (await request.json()) as PinRequest;
    } catch {
        return badRequest('Invalid JSON body');
    }

    const address = String(body.address ?? '').trim();
    // A hostname would re-resolve on reconnect and could land on a different
    // edge, which is precisely the instability a pinned profile prevents.
    if (!isIPv4Literal(address)) {
        return badRequest('A gaming profile must pin an IPv4 address, not a hostname.');
    }

    const port = Number(body.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        return badRequest('Invalid port.');
    }

    const requested = String(body.protocol ?? P.VL).toLowerCase();
    const protocol = requested === P.TR ? P.TR : P.VL;
    if (!settings.protocols.toLowerCase().includes(protocol)) {
        return badRequest(`Protocol ${protocol} is disabled in settings.`);
    }

    const name = String(body.name ?? '').trim().slice(0, 40) || `${address}:${port}`;

    const profile: GamingProfile = {
        id: crypto.randomUUID(),
        name,
        address,
        port,
        protocol,
        medianMs: Math.round(num(body.medianMs, -1)),
        jitterMs: Math.round(num(body.jitterMs)),
        lossPct: Number(num(body.lossPct).toFixed(1)),
        grade: String(body.grade ?? '?').slice(0, 2),
        pinnedAt: Date.now(),
    };

    const existing = settings.gaming?.profiles ?? [];
    // Re-pinning the same endpoint refreshes its measurements instead of
    // stacking duplicates.
    const deduped = existing.filter((p) => !(p.address === address && p.port === port));
    const profiles = [profile, ...deduped].slice(0, MAX_PROFILES);

    const updated = await saveSettings(store, settings, {
        gaming: { ...settings.gaming, enabled: true, profiles },
    });

    await logActivity(store, 'gaming-pin', `${name} → ${address}:${port} (${profile.grade})`);

    return ok({ profile, profiles: updated.gaming.profiles });
}

/** POST api/gaming/unpin */
export async function handleGamingUnpin(
    request: Request,
    settings: Settings,
    store: Store,
): Promise<Response> {
    if (request.method !== 'POST') return methodNotAllowed();

    let body: { id?: unknown };
    try {
        body = (await request.json()) as { id?: unknown };
    } catch {
        return badRequest('Invalid JSON body');
    }

    const id = String(body.id ?? '');
    const existing = settings.gaming?.profiles ?? [];
    const profiles = existing.filter((p) => p.id !== id);

    if (profiles.length === existing.length) return badRequest('Profile not found.');

    const updated = await saveSettings(store, settings, {
        gaming: { ...settings.gaming, profiles, enabled: profiles.length > 0 },
    });

    await logActivity(store, 'gaming-unpin', id);
    return ok({ profiles: updated.gaming.profiles });
}

/**
 * GET api/gaming/config?format=…
 *
 * Emits only the pinned profiles — never the full endpoint list — so the
 * client has exactly one route available and cannot drift off it.
 */
export function handleGamingConfig(settings: Settings): Response {
    const requested = (getContext().searchParams.get('format') ?? 'base64').toLowerCase();
    const format =
        ['clash', 'mihomo', 'meta'].includes(requested) ? 'clash'
        : ['singbox', 'sing-box', 'sb'].includes(requested) ? 'singbox'
        : ['plain', 'raw', 'uri'].includes(requested) ? 'plain'
        : 'base64';

    return renderGamingSubscription(settings, format, null);
}

/** Shared by the subscription route: render pinned profiles in the requested format. */
export function renderGamingSubscription(
    settings: Settings,
    format: string,
    user: Parameters<typeof resolveBuildContext>[1],
): Response {
    const profiles = settings.gaming?.profiles ?? [];
    if (!profiles.length) {
        return subscriptionResponse('', `${PROJECT.slug}-gaming.txt`, 'text/plain; charset=utf-8');
    }

    const ctx = resolveBuildContext(settings, user);

    switch (format) {
        case 'clash':
            return subscriptionResponse(
                buildGamingClash(ctx, profiles),
                `${PROJECT.slug}-gaming.yaml`,
                'text/yaml; charset=utf-8',
            );
        case 'singbox':
            return subscriptionResponse(
                buildGamingSingbox(ctx, profiles),
                `${PROJECT.slug}-gaming.json`,
                'application/json; charset=utf-8',
            );
        case 'plain':
            return subscriptionResponse(
                buildGamingUriList(ctx, profiles),
                `${PROJECT.slug}-gaming.txt`,
                'text/plain; charset=utf-8',
            );
        default:
            return subscriptionResponse(
                buildGamingBase64(ctx, profiles),
                `${PROJECT.slug}-gaming.txt`,
                'text/plain; charset=utf-8',
            );
    }
}
