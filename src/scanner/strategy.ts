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

/** Prefer a second /24 over a second host in the same /24. */
export function pickDiverse<T extends { address: string }>(rows: T[], keep: number): T[] {
    const used = new Set<string>();
    const first: T[] = [];
    const rest: T[] = [];
    for (const row of rows) {
        const net = row.address.split('.').slice(0, 3).join('.');
        if (used.has(net)) {
            rest.push(row);
            continue;
        }
        used.add(net);
        first.push(row);
        if (first.length >= keep) return first;
    }
    return [...first, ...rest].slice(0, keep);
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

export function planScan(opts: {
    previous?: string[];
    depth?: ScanDepth;
}): ScanWave[] {
    const depth = parseDepth(opts.depth);
    const seen = new Set<string>();
    const waves: ScanWave[] = [];

    const memory = takeUnique((opts.previous ?? []).filter(isWorkerFrontIp).slice(0, 12), seen);
    if (memory.length) waves.push({ id: 'memory', ...WAVE_META.memory, addresses: memory });

    const seeds = takeUnique(WORKER_FRONT_SEEDS, seen);
    if (seeds.length) waves.push({ id: 'seeds', ...WAVE_META.seeds, addresses: seeds });

    const catalogSize = depth === 'quick' ? 20 : depth === 'deep' ? 64 : 40;
    const catalog = pickCleanIps(catalogSize, seen);
    if (catalog.length) waves.push({ id: 'catalog', ...WAVE_META.catalog, addresses: catalog });

    if (depth !== 'quick') {
        const exploreSize = depth === 'deep' ? 40 : 24;
        const explore = takeUnique(sampleFromRanges(exploreSize, WORKER_FRONT_RANGES), seen);
        if (explore.length) waves.push({ id: 'explore', ...WAVE_META.explore, addresses: explore });
    }

    return waves;
}

export const WAVE_LABELS = WAVE_META;
