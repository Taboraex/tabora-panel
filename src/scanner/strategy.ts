import { WORKER_FRONT_SEEDS, sampleFromRanges, isPoolAddress } from './candidates';
import { CLEAN_HOSTS, CLEAN_IPS } from './catalog';

export type ScanDepth = 'quick' | 'smart' | 'deep';
export type WaveId = 'memory' | 'catalog' | 'neighbors' | 'explore';

export interface ScanWave {
    id: WaveId;
    label: string;
    labelFa: string;
    addresses: string[];
}

export const WAVE_META: Record<WaveId, { label: string; labelFa: string }> = {
    memory: { label: 'Previous winners', labelFa: 'برنده‌های قبلی' },
    catalog: { label: 'Clean IPs', labelFa: 'آی‌پی تمیز' },
    neighbors: { label: 'Nearby /24', labelFa: 'همسایه‌های /۲۴' },
    explore: { label: 'Explore', labelFa: 'کشف محدوده' },
};

export function prefix24(ip: string): string {
    return ip.split('.').slice(0, 3).join('.');
}

/**
 * Other hosts in the same /24. Consecutive addresses usually land on the
 * same physical edge, so we jump across the CLEAN_HOSTS set instead of
 * scanning .10 then .11 then .12.
 */
export function neighborsOf(ip: string, count = 8): string[] {
    if (!isPoolAddress(ip)) return [];
    const parts = ip.split('.');
    const host = Number(parts[3]);
    const out: string[] = [];
    const seen = new Set<string>([ip]);
    for (const h of CLEAN_HOSTS) {
        if (h === host) continue;
        const next = `${parts[0]}.${parts[1]}.${parts[2]}.${h}`;
        if (seen.has(next) || !isPoolAddress(next)) continue;
        seen.add(next);
        out.push(next);
        if (out.length >= count) break;
    }
    return out;
}

/** Neighbours of the current winners, capped, never repeating the winners. */
export function expandAround(winners: string[], per = 8, cap = 24): string[] {
    const seen = new Set(winners.filter(isPoolAddress));
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
 * Spread catalogue picks across /16s so a scan is not 24 addresses in 104.16.
 */
export function pickCleanIps(count: number, exclude: Set<string> = new Set()): string[] {
    const want = Math.max(0, Math.min(CLEAN_IPS.length, Math.floor(count) || 0));
    const groups = new Map<string, string[]>();
    for (const ip of CLEAN_IPS) {
        if (exclude.has(ip) || !isPoolAddress(ip)) continue;
        const key = ip.split('.').slice(0, 2).join('.');
        const bucket = groups.get(key) ?? [];
        bucket.push(ip);
        groups.set(key, bucket);
    }
    const buckets = [...groups.values()];
    const out: string[] = [];
    let slot = 0;
    while (out.length < want) {
        let added = false;
        for (const bucket of buckets) {
            if (slot >= bucket.length) continue;
            out.push(bucket[slot]);
            added = true;
            if (out.length >= want) break;
        }
        if (!added) break;
        slot++;
    }
    return out;
}

function takeUnique(ips: string[], seen: Set<string>): string[] {
    const out: string[] = [];
    for (const ip of ips) {
        if (!isPoolAddress(ip) || seen.has(ip)) continue;
        seen.add(ip);
        out.push(ip);
    }
    return out;
}

/**
 * Multi-wave plan, CFScanner-style:
 *
 *   1. memory  — IPs that already worked for this operator
 *   2. catalog — baked Cloudflare clean IPs (Worker-front only)
 *   3. explore — stratified sample of the front ranges (smart/deep)
 *
 * Neighbours of the live winners are requested after wave 2 — they depend
 * on what actually answered from this network.
 */
export function planScan(opts: {
    previous?: string[];
    depth?: ScanDepth;
    ranges: string[];
}): ScanWave[] {
    const depth: ScanDepth = opts.depth === 'quick' || opts.depth === 'deep' ? opts.depth : 'smart';
    const seen = new Set<string>();
    const waves: ScanWave[] = [];

    const memory = takeUnique((opts.previous ?? []).slice(0, 8), seen);
    if (memory.length) {
        waves.push({ id: 'memory', ...WAVE_META.memory, addresses: memory });
    }

    const catalogSize = depth === 'quick' ? 16 : depth === 'deep' ? 32 : 24;
    const catalog = takeUnique(
        [...WORKER_FRONT_SEEDS, ...pickCleanIps(catalogSize, seen)],
        seen,
    );
    if (catalog.length) {
        waves.push({ id: 'catalog', ...WAVE_META.catalog, addresses: catalog });
    }

    if (depth !== 'quick') {
        const exploreSize = depth === 'deep' ? 24 : 16;
        const explore = takeUnique(sampleFromRanges(exploreSize, opts.ranges), seen);
        if (explore.length) {
            waves.push({ id: 'explore', ...WAVE_META.explore, addresses: explore });
        }
    }

    return waves;
}

export function flattenPlan(waves: ScanWave[]): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const wave of waves) {
        for (const ip of wave.addresses) {
            if (seen.has(ip)) continue;
            seen.add(ip);
            out.push(ip);
        }
    }
    return out;
}

export function parseDepth(value: unknown): ScanDepth {
    const raw = String(value ?? '').trim().toLowerCase();
    if (raw === 'quick' || raw === 'deep') return raw;
    return 'smart';
}

/**
 * Greedy unique-/24 picker. First pass skips a /24 already taken; second
 * pass fills. Order of `rows` is the ranking order.
 */
export function pickDiverse<T extends { address: string }>(rows: T[], keep: number): T[] {
    const cap = Math.max(1, Math.min(8, Math.floor(keep) || 1));
    const first: T[] = [];
    const used = new Set<string>();
    for (const row of rows) {
        if (first.length >= cap) break;
        const net = prefix24(row.address);
        if (used.has(net)) continue;
        used.add(net);
        first.push(row);
    }
    if (first.length >= cap) return first;
    for (const row of rows) {
        if (first.length >= cap) break;
        if (first.includes(row)) continue;
        first.push(row);
    }
    return first;
}
