import { isWorkerFrontIp, WORKER_FRONT_SEEDS } from './candidates';

/**
 * Cloudflare "clean IPs" for Worker configs.
 *
 * Iranian panels mean a Cloudflare IPv4 that the operator's ISP has not
 * throttled, used as the `address` field while SNI/Host stay on the worker.
 * Public dumps (IRCF, CFScanner ipv4.list) mix colo interconnects, WARP
 * endpoints and unused /22s — those TCP-open and then produce dead configs.
 *
 * This catalogue is the intersection of that tradition and the prefixes that
 * actually front a Worker (see `WORKER_FRONT_RANGES`). Host octets skip
 * .0/.1/.255, which are often unrouted even inside an announced /24.
 */

/** Hosts that HTTP anycast tends to answer on. */
export const CLEAN_HOSTS = [10, 16, 22, 36, 62, 80, 100, 147, 200] as const;

/** /24s inside Worker-front space, spread so one throttled prefix cannot dominate. */
const CLEAN_SLASH24: string[] = [
    ...slash24('104.16', [0, 10, 32, 64, 100, 128, 160, 192]),
    ...slash24('104.17', [0, 22, 47, 83, 100, 147, 200]),
    ...slash24('104.18', [0, 16, 26, 50, 90, 128, 180]),
    ...slash24('104.19', [3, 16, 32, 80, 128, 200]),
    ...slash24('104.20', [0, 32, 64, 100, 160]),
    ...slash24('104.21', [16, 32, 64, 83, 128]),
    ...slash24('104.24', [0, 32, 64, 100, 160]),
    ...slash24('104.25', [1, 32, 64, 128]),
    ...slash24('104.26', [10, 64, 128]),
    ...slash24('104.27', [10, 64, 128]),
    ...slash24('162.159', [1, 36, 43, 46, 64, 135, 192, 224]),
    ...slash24('188.114', [96, 97, 98, 99, 102, 106, 110]),
];

function slash24(prefix: string, thirds: number[]): string[] {
    return thirds.map((third) => `${prefix}.${third}`);
}

function buildCatalog(): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    const add = (ip: string) => {
        if (seen.has(ip) || !isWorkerFrontIp(ip)) return;
        seen.add(ip);
        out.push(ip);
    };

    for (const ip of WORKER_FRONT_SEEDS) add(ip);
    for (const net of CLEAN_SLASH24) {
        for (const host of CLEAN_HOSTS) add(`${net}.${host}`);
    }
    return out;
}

/** Deduped, Worker-front-only clean IPs. Seeds lead the list. */
export const CLEAN_IPS: string[] = buildCatalog();
