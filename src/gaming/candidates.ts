import { GAMING_RANGES, GAMING_PORTS } from '@config/constants';

/**
 * Candidate IPv4 literals for gaming profiles.
 *
 * A gaming profile must pin a literal address. The existing clean-IP list is
 * mostly domains (icook.hk, japan.com ...) and a domain is exactly what we
 * cannot use here: it re-resolves on every reconnect and can land on a
 * different edge each time, so the ping moves between sessions. Sampling the
 * published ranges gives us addresses that stay put.
 */

function parseCidr(cidr: string): { base: number; size: number } | null {
    const [ip, bitsRaw] = cidr.split('/');
    const bits = Number(bitsRaw);
    const octets = ip.split('.').map(Number);
    if (octets.length !== 4 || octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) {
        return null;
    }
    if (!Number.isInteger(bits) || bits < 8 || bits > 32) return null;

    const base = ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
    return { base, size: 2 ** (32 - bits) };
}

const toIp = (n: number): string =>
    [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');

/**
 * Draw `count` addresses spread evenly across the gaming ranges.
 *
 * Spread matters: consecutive addresses in a /13 usually terminate on the same
 * physical edge, so sampling them would measure one route several times and
 * hide better ones. Striding across the ranges samples distinct edges.
 */
export function sampleGamingIPs(count: number, ranges = GAMING_RANGES): string[] {
    const parsed = ranges.map(parseCidr).filter((r): r is { base: number; size: number } => !!r);
    if (!parsed.length) return [];

    const out = new Set<string>();
    const maxAttempts = count * 8;

    for (let i = 0; i < maxAttempts && out.size < count; i++) {
        const range = parsed[i % parsed.length];
        const offset = 1 + Math.floor(Math.random() * Math.max(1, range.size - 2));
        out.add(toIp((range.base + offset) >>> 0));
    }

    return [...out];
}

export const gamingPorts = (): number[] => [...GAMING_PORTS];

/** Validate that a pinned address really is an IPv4 literal, not a hostname. */
export const isIPv4Literal = (value: string): boolean =>
    /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(value) &&
    value.split('.').every((o) => Number(o) >= 0 && Number(o) <= 255);
