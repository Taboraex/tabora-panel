import {
    WORKER_FRONT_SEEDS,
    WORKER_FRONT_RANGES,
    isWorkerFrontIp,
    sampleFromRanges,
} from './candidates';

/**
 * Multi-wave plan for the clean-IP scanner.
 *
 * Country labels are gone. The only question is: which Worker-front IPv4s
 * are healthy *from this operator's network*? We walk, in order:
 *
 *   1. memory   — IPv4s this panel already pinned (they worked last time)
 *   2. seeds    — verified fronts that always answer
 *   3. catalog  — baked Worker-front addresses, spread across /16s
 *   4. neighbors— /24 of whatever just answered (filled in by the browser)
 *   5. explore  — a wider sample of the front ranges
 *
 * Smart mode stops as soon as it has enough healthy, diverse IPs.
 * Every address is filtered with `isWorkerFrontIp` — colo interconnects
 * never enter a wave.
 */

export type ScanDepth = 'quick' | 'smart' | 'deep';
export type WaveId = 'memory' | 'seeds' | 'catalog' | 'neighbors' | 'explore';

export interface ScanWave {
    id: WaveId;
    label: string;
    labelFa: string;
    addresses: string[];
}

const WAVE_META: Record<WaveId, { label: string; labelFa: string }> = {
    memory: { label: 'Previous winners', labelFa: 'برنده‌های قبلی' },
    seeds: { label: 'Verified fronts', labelFa: 'لبه‌های تاییدشده' },
    catalog: { label: 'Clean catalogue', labelFa: 'کاتالوگ تمیز' },
    neighbors: { label: 'Nearby /24', labelFa: 'همسایه‌های /۲۴' },
    explore: { label: 'Wider sample', labelFa: 'نمونهٔ گسترده‌تر' },
};

const HOSTS = [10, 16, 22, 36, 62, 80, 100, 147, 200];
const SECONDS_104 = [16, 17, 18, 19, 20, 21, 24, 25, 26, 27];
const THIRDS_104 = [0, 10, 26, 50, 83, 100, 147, 200];
const THIRDS_162 = [36, 46, 64, 134, 192, 200];

/** Baked Worker-front IPv4s. Generated, never fetched. */
export const CLEAN_IPS: string[] = (() => {
    const out = new Set<string>(WORKER_FRONT_SEEDS);
    for (const second of SECONDS_104) {
        for (const third of THIRDS_104) {
            for (const host of HOSTS) out.add(`104.${second}.${third}.${host}`);
        }
    }
    for (const third of THIRDS_162) {
        for (const host of HOSTS) out.add(`162.159.${third}.${host}`);
    }
    for (let third = 96; third <= 110; third++) {
        for (const host of HOSTS) out.add(`188.114.${third}.${host}`);
    }
    return [...out].filter(isWorkerFrontIp);
})();

export function parseDepth(value: unknown): ScanDepth {
    return value === 'quick' || value === 'deep' ? value : 'smart';
}

const takeUnique = (list: string[], seen: Set<string>): string[] => {
    const out: string[] = [];
    for (const ip of list) {
        if (seen.has(ip) || !isWorkerFrontIp(ip)) continue;
        seen.add(ip);
        out.push(ip);
    }
    return out;
};

/**
 * Spread catalogue picks across /16s so a scan is not 40 addresses in 104.16.
 */
export function pickCleanIps(count: number, seen = new Set<string>()): string[] {
    if (count <= 0) return [];
    const buckets = new Map<string, string[]>();
    for (const ip of CLEAN_IPS) {
        if (seen.has(ip)) continue;
        const key = ip.split('.').slice(0, 2).join('.');
        const bucket = buckets.get(key);
        if (bucket) bucket.push(ip);
        else buckets.set(key, [ip]);
    }
    const keys = [...buckets.keys()];
    const out: string[] = [];
    while (out.length < count) {
        let added = false;
        for (const key of keys) {
            const bucket = buckets.get(key);
            if (!bucket?.length) continue;
            const pick = bucket.shift();
            if (!pick || seen.has(pick)) continue;
            seen.add(pick);
            out.push(pick);
            added = true;
            if (out.length >= count) break;
        }
        if (!added) break;
    }
    return out;
}

export function neighborsOf(origin: string, count: number): string[] {
    const parts = origin.split('.').map(Number);
    if (parts.length !== 4) return [];
    const [a, b, c] = parts;
    const out: string[] = [];
    for (let i = 0; out.length < count && i < 64; i++) {
        const host = 16 + ((i * 17 + 23) % 224);
        const ip = `${a}.${b}.${c}.${host}`;
        if (ip === origin || !isWorkerFrontIp(ip)) continue;
        if (!out.includes(ip)) out.push(ip);
    }
    return out;
}

export function expandAround(winners: string[], per = 6, cap = 24): string[] {
    const seen = new Set(winners);
    const out: string[] = [];
    for (const ip of winners) {
        for (const n of neighborsOf(ip, per)) {
            if (seen.has(n)) continue;
            seen.add(n);
            out.push(n);
            if (out.length >= cap) return out;
        }
    }
    return out;
}

/**
 * Prefer a second /16, then a second /24, then a second host.
 * One throttled prefix cannot take every slot.
 */
export function pickDiverse<T extends { address: string }>(rows: T[], keep: number): T[] {
    const out: T[] = [];
    const taken = new Set<string>();
    const used16 = new Set<string>();
    const used24 = new Set<string>();
    const net16 = (ip: string) => ip.split('.').slice(0, 2).join('.');
    const net24 = (ip: string) => ip.split('.').slice(0, 3).join('.');

    const take = (pred: (row: T) => boolean) => {
        for (const row of rows) {
            if (out.length >= keep) return;
            if (taken.has(row.address)) continue;
            if (!pred(row)) continue;
            taken.add(row.address);
            used16.add(net16(row.address));
            used24.add(net24(row.address));
            out.push(row);
        }
    };

    take((row) => !used16.has(net16(row.address)));
    take((row) => !used24.has(net24(row.address)));
    take(() => true);
    return out;
}

export function flattenPlan(waves: ScanWave[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const wave of waves) {
        for (const ip of wave.addresses) {
            if (seen.has(ip)) continue;
            seen.add(ip);
            out.push(ip);
        }
    }
    return out;
}

export function clampKeep(value: unknown, fallback = 8): number {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(30, Math.max(1, Math.floor(n)));
}

export function planScan(opts: {
    previous?: string[];
    depth?: ScanDepth;
    keep?: number;
} = {}): ScanWave[] {
    const depth = parseDepth(opts.depth);
    const keep = clampKeep(opts.keep);
    const seen = new Set<string>();
    const waves: ScanWave[] = [];

    const memory = takeUnique(
        (opts.previous ?? []).filter(isWorkerFrontIp).slice(0, Math.max(12, keep)),
        seen,
    );
    if (memory.length) waves.push({ id: 'memory', ...WAVE_META.memory, addresses: memory });

    const seeds = takeUnique(WORKER_FRONT_SEEDS, seen);
    if (seeds.length) waves.push({ id: 'seeds', ...WAVE_META.seeds, addresses: seeds });

    const catalogWant = depth === 'quick'
        ? Math.max(24, keep * 3)
        : depth === 'deep'
            ? Math.max(72, keep * 6)
            : Math.max(48, keep * 4);
    const catalog = pickCleanIps(Math.min(180, catalogWant), seen);
    if (catalog.length) waves.push({ id: 'catalog', ...WAVE_META.catalog, addresses: catalog });

    if (depth !== 'quick') {
        const exploreWant = depth === 'deep' ? Math.max(40, keep * 3) : Math.max(24, keep * 2);
        const explore = takeUnique(sampleFromRanges(Math.min(96, exploreWant), WORKER_FRONT_RANGES), seen);
        if (explore.length) waves.push({ id: 'explore', ...WAVE_META.explore, addresses: explore });
    }

    return waves;
}

export const WAVE_LABELS = WAVE_META;
