import { IpPoolEntry, IpPoolSettings } from '#types/settings';
import { summarise, rank, type EndpointStats } from '@gaming/scoring';
import { findCountry, isPoolAddress } from './countries';

/** Soft ceilings so a malformed apply cannot bloat settings. */
export const POOL_LIMITS = {
    count: { min: 8, max: 48, fallback: 32 },
    keep: { min: 1, max: 8, fallback: 3 },
    probes: { min: 1, max: 8, fallback: 3 },
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

    return rank(stats, keep).map((row) => ({
        ...row,
        country: code,
        flag,
        colo,
    }));
}

export function toPoolEntries(ranked: RankedPoolEntry[], scannedAt = Date.now()): IpPoolEntry[] {
    return ranked
        .filter((row) => row.ok)
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
