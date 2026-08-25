/** Cloudflare-supported inbound ports. */
export const HTTP_PORTS = [80, 8080, 2052, 2082, 2086, 2095, 8880];
export const HTTPS_PORTS = [443, 8443, 2053, 2083, 2087, 2096];
export const ALL_PORTS = [...HTTPS_PORTS, ...HTTP_PORTS];

/** WebSocket <-> TCP relay tuning (values informed by edgetunnel's profiling). */
export const WS_EARLY_DATA_MAX_BYTES = 8 * 1024;
export const UPSTREAM_COALESCE_BYTES = 20 * 1024;
export const UPSTREAM_QUEUE_MAX_BYTES = 16 * 1024 * 1024;
export const UPSTREAM_QUEUE_MAX_ITEMS = 4096;
export const DOWNSTREAM_GRAIN_BYTES = 32 * 1024;

export const WS_READY_STATE_OPEN = 1;
export const WS_READY_STATE_CLOSING = 2;

/** In-isolate cache TTLs (ms). Cuts repeated D1 reads on hot paths. */
export const CACHE_TTL_SETTINGS = 10_000;
export const CACHE_TTL_USAGE = 10_000;
export const CACHE_TTL_USERS = 10_000;

/** Session lifetime for the panel JWT. */
export const SESSION_TTL = '24h';
export const SESSION_TTL_SECONDS = 24 * 60 * 60;

/** Cloudflare free-plan daily request ceiling. */
export const DAILY_REQUEST_LIMIT = 100_000;

/** Rough bytes-per-request estimate used to convert request counts to traffic. */
export const BYTES_PER_REQUEST = Math.floor(1_073_741_824 / 6000); // ~179 KB

/** Default NAT64 prefixes for IPv4 -> IPv6 mapping. */
export const DEFAULT_NAT64_PREFIXES = [
    '[2a02:898:146:64::]',
    '[2602:fc59:b0:64::]',
    '[2602:fc59:11:64::]',
];

export const DEFAULT_CLEAN_IPS = [
    'icook.hk',
    'japan.com',
    'malaysia.com',
    'russia.com',
    'singapore.com',
];

/**
 * Default relay hosts used when a direct dial returns nothing.
 *
 * Cloudflare does not let a Worker open a TCP socket back into its own
 * network, and a large share of the web sits behind Cloudflare. Without a
 * relay the tunnel completes its handshake and then stalls with no data —
 * which looks exactly like a broken config. Shipping working defaults means a
 * freshly installed panel carries traffic straight away; operators can replace
 * them in the panel or scan for their own.
 */
export const DEFAULT_PROXY_IPS = [
    'proxyip.cmliussss.net:443',
    'proxyip.fxxk.dedyn.io:443',
];

export const GB = 1024 ** 3;
export const MB = 1024 ** 2;
