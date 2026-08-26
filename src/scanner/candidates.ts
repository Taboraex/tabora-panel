import { HTTPS_PORTS } from '@config/constants';

/**
 * Candidate sources for the clean-IP scanner.
 *
 * Cloudflare publishes its edge ranges, but scanning a /13 from a Worker is
 * not viable — each probe costs a subrequest and we have a CPU budget. Instead
 * we sample a bounded number of addresses from the ranges that are known to
 * carry consumer traffic, plus a curated set of domains that already resolve
 * to well-connected edges.
 */

/**
 * Prefixes that actually front a Worker.
 *
 * Cloudflare's published list is a /13-/18 superset. Inside it sit colo
 * interconnects and unused /22s that accept no HTTP — 104.22–104.23 and
 * most of 172.68–172.71 time out, which is why the first country pool
 * produced configs that never pinged. These narrower blocks were probed
 * with SNI=*.workers.dev and return a real Worker response (530 = "no
 * such worker", which still means the edge routed the hostname).
 */
export const WORKER_FRONT_RANGES = [
    '104.16.0.0/14',  // 104.16–104.19
    '104.20.0.0/15',  // 104.20–104.21
    '104.24.0.0/14',  // 104.24–104.27
    '162.159.0.0/16',
    '188.114.96.0/20',
];

/** Known-good addresses, included in every scan so a country is never all-dead. */
export const WORKER_FRONT_SEEDS = [
    '104.16.10.10',
    '104.17.147.22',
    '104.18.26.90',
    '104.19.3.80',
    '104.21.83.62',
    '104.24.0.10',
    '104.25.1.1',
    '162.159.36.1',
    '162.159.46.1',
    '188.114.97.3',
    '188.114.98.224',
    '172.67.100.100',
    '172.67.135.76',
    '172.67.200.200',
];

/** IPv4 ranges Cloudflare publishes for its edge network. */
export const CLOUDFLARE_RANGES = [
    '104.16.0.0/13',
    '104.24.0.0/14',
    '172.64.0.0/13',
    '162.159.0.0/16',
    '188.114.96.0/20',
    '198.41.128.0/17',
    '190.93.240.0/20',
    '141.101.64.0/18',
    '108.162.192.0/18',
];

/**
 * Domains that front Cloudflare edges and are commonly reachable where direct
 * IPs are throttled.
 *
 * These are scanned from the *browser*, not from the Worker — see the note on
 * RELAY_CANDIDATES below for why, and because "clean" only ever means "clean
 * from the operator's own network".
 */
export const CANDIDATE_DOMAINS = [
    'icook.hk',
    'japan.com',
    'malaysia.com',
    'singapore.com',
    'russia.com',
    'time.is',
    'cf.090227.xyz',
    'shopify.com',
    'discord.com',
    'ip.sb',
];

/**
 * Relay (ProxyIP) candidates, probed from the Worker.
 *
 * A Worker may not open a socket to Cloudflare's own network, so it cannot
 * usefully scan the ranges above — every probe fails identically regardless of
 * whether the edge is healthy. Relays are third-party hosts outside that
 * network, so socket probing them from the Worker is both permitted and
 * meaningful: it measures the hop the tunnel will actually take.
 */
export const RELAY_CANDIDATES = [
    'proxyip.cmliussss.net:443',
    'proxyip.fxxk.dedyn.io:443',
    'proxyip.aliyun.fxxk.dedyn.io:443',
    'proxyip.oracle.fxxk.dedyn.io:443',
    'proxyip.digitalocean.fxxk.dedyn.io:443',
    'proxyip.multi.fxxk.dedyn.io:443',
];

/** Ports worth probing. TLS ports first — those are what configs use. */
export const SCAN_PORTS = HTTPS_PORTS;

export function ipToInt(ip: string): number | null {
    const octets = ip.split('.').map(Number);
    if (octets.length !== 4 || octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) {
        return null;
    }
    return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

/** True when this IPv4 is one we will actually put in a config. */
export function isWorkerFrontIp(ip: string): boolean {
    if (WORKER_FRONT_SEEDS.includes(ip)) return true;
    const n = ipToInt(ip);
    if (n === null) return false;
    for (const cidr of WORKER_FRONT_RANGES) {
        const range = parseCidr(cidr);
        if (!range) continue;
        const mask = range.size >= 2 ** 32 ? 0 : (~(range.size - 1)) >>> 0;
        if ((n & mask) === (range.base & mask)) return true;
    }
    return false;
}

/** Parse "a.b.c.d/nn" into its numeric base and host count. */
export function parseCidr(cidr: string): { base: number; size: number } | null {
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
 * Draw `count` random addresses spread across the published ranges.
 * Network and broadcast addresses are skipped.
 */
export function sampleCloudflareIPs(count: number, ranges = CLOUDFLARE_RANGES): string[] {
    return sampleFromRanges(count, ranges);
}

/**
 * Draw `count` addresses spread across the given CIDRs.
 *
 * Consecutive addresses in a /22 usually terminate on the same physical
 * edge, so we stride rather than pick a cluster — otherwise a "36 IP scan"
 * would measure one route 36 times.
 */
export function sampleFromRanges(count: number, ranges: string[]): string[] {
    const parsed = ranges.map(parseCidr).filter((r): r is { base: number; size: number } => !!r);
    if (!parsed.length || count <= 0) return [];

    const out = new Set<string>();
    const maxAttempts = count * 10;

    for (let i = 0; i < maxAttempts && out.size < count; i++) {
        const range = parsed[i % parsed.length];
        // Stride through the range so successive picks land on different /24s.
        const stride = Math.max(1, Math.floor(range.size / Math.max(count, 2)));
        const slot = Math.floor(i / parsed.length);
        const jitter = Math.floor(Math.random() * Math.min(stride, 17));
        const offset = 1 + ((slot * stride + jitter) % Math.max(1, range.size - 2));
        // .0 / .1 / .255 inside a /24 are often unrouted even when the
        // prefix is official. Park the host octet in 16–240.
        let n = (range.base + offset) >>> 0;
        const host = n & 255;
        if (host < 16 || host > 240) {
            n = (n & ~255) | (16 + ((i * 13) % 224));
        }
        out.add(toIp(n));
    }

    return [...out];
}
