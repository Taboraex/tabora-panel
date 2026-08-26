import { IpPoolEntry, IpPoolSettings } from '#types/settings';
import { summarise, rank, type EndpointStats } from '@gaming/scoring';
import { findCountry, isPoolAddress } from './countries';
import { WORKER_FRONT_SEEDS } from './candidates';

/** Soft ceilings so a malformed apply cannot bloat settings. */
export const POOL_LIMITS = {
    count: { min: 8, max: 48, fallback: 32 },
    keep: { min: 1, max: 8, fallback: 3 },
    probes: { min: 1, max: 8, fallback: 5 },
};

export const DEFAULT_IP_POOL: IpPoolSettings = {
    enabled: false,
    country: '',
    lockToPool: true,
    keep: 3,
    entries: [],
    scannedAt: 0,
};

export interface PoolMeasurement {
    address: string;
    samples: number[];
}

export interface RankedPoolEntry extends EndpointStats {
    country: string;
    flag: string;
    colo: string;
}

export function clampPool(value: unknown, spec: { min: number; max: number; fallback: number }): number {
    const n = Number(value);
    if (!Number.isFinite(n)) return spec.fallback;
    return Math.min(spec.max, Math.max(spec.min, Math.floor(n)));
}

/** Turn raw browser samples into a ranked list, tagged with the chosen country. */
export function rankPool(
    measurements: PoolMeasurement[],
    countryCode: string,
    keep: number,
): RankedPoolEntry[] {
    const country = findCountry(countryCode);
    const code = country?.code === 'AUTO' ? 'AUTO' : (country?.code ?? countryCode.toUpperCase());
    const flag = country?.flag ?? '🌐';
    const colo = country?.colo ?? '';

    const stats: EndpointStats[] = [];
    for (const item of measurements) {
        if (!isPoolAddress(item.address)) continue;
        const samples = item.samples
            .slice(0, 20)
            .map((ms) => ({ ms: Number.isFinite(ms) ? ms : -1 }));
        if (!samples.length) continue;
        stats.push(summarise(item.address, 443, samples));
    }

    const ranked = rank(stats, stats.length).map((row) => ({
        ...row,
        country: code,
        flag,
        colo,
    }));
    return pickPoolWinners(ranked, keep);
}

/**
 * A pin has to actually front a Worker, not merely open TCP once.
 * Browser no-cors probes abort on GC; require several successes and
 * drop anything with more than a quarter of samples lost.
 */
export function isPoolHealthy(row: EndpointStats): boolean {
    const successes = Math.round((1 - row.lossRate) * row.samples);
    return row.ok && row.medianMs > 0 && row.lossRate <= 0.25 && successes >= 3;
}

/**
 * Prefer verified Worker-front seeds when enough of them are healthy.
 * Random samples in a live /14 often time out for HTTP even though they
 * are "in range"; filling `keep` with those is how 0.7.0/0.7.1 shipped
 * IPs that never connected.
 */
export function pickPoolWinners(ranked: RankedPoolEntry[], keep: number): RankedPoolEntry[] {
    const cap = Math.max(1, Math.min(8, Math.floor(keep) || 1));
    const healthy = ranked.filter(isPoolHealthy);
    const seeds = new Set(WORKER_FRONT_SEEDS);
    const seedHits = healthy.filter((row) => seeds.has(row.address));
    if (seedHits.length >= cap) return seedHits.slice(0, cap);
    const rest = healthy.filter((row) => !seeds.has(row.address));
    return [...seedHits, ...rest].slice(0, cap);
}

export function toPoolEntries(ranked: RankedPoolEntry[], scannedAt = Date.now()): IpPoolEntry[] {
    return ranked
        .filter(isPoolHealthy)
        .map((row) => ({
            address: row.address,
            latency: row.medianMs,
            jitter: row.jitterMs,
            lossPct: Number((row.lossRate * 100).toFixed(1)),
            grade: row.grade,
            colo: row.colo,
            country: row.country,
            scannedAt,
        }));
}

export function buildPoolSettings(
    current: IpPoolSettings | undefined,
    patch: {
        country: string;
        lockToPool: boolean;
        keep: number;
        entries: IpPoolEntry[];
        scannedAt: number;
    },
): IpPoolSettings {
    const base = current ?? DEFAULT_IP_POOL;
    return {
        ...base,
        enabled: patch.entries.length > 0,
        country: patch.country,
        lockToPool: patch.lockToPool,
        keep: patch.keep,
        entries: patch.entries,
        scannedAt: patch.scannedAt,
    };
}
