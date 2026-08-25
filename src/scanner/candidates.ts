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

/** Parse "a.b.c.d/nn" into its numeric base and host count. */
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
 * Draw `count` random addresses spread across the published ranges.
 * Network and broadcast addresses are skipped.
 */
export function sampleCloudflareIPs(count: number, ranges = CLOUDFLARE_RANGES): string[] {
    const parsed = ranges.map(parseCidr).filter((r): r is { base: number; size: number } => !!r);
    if (!parsed.length) return [];

    const out = new Set<string>();
    // Bounded attempts so a pathological input cannot spin.
    const maxAttempts = count * 8;

    for (let i = 0; i < maxAttempts && out.size < count; i++) {
        const range = parsed[i % parsed.length];
        const offset = 1 + Math.floor(Math.random() * Math.max(1, range.size - 2));
        out.add(toIp((range.base + offset) >>> 0));
    }

    return [...out];
}
