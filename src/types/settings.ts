export type Fingerprint =
    | 'chrome' | 'firefox' | 'safari' | 'ios' | 'android'
    | 'edge' | 'random' | 'randomized';

export type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'none';

export type ProxyIpMode = 'proxyip' | 'nat64' | 'off';

export type CoreName = 'xray' | 'sing-box' | 'clash' | 'v2rayn';

/** Persisted panel settings. Stored as one JSON row in D1. */
export interface Settings {
    // identity
    uuid: string;
    trojanPassword: string;
    securePath: string;

    // protocol
    protocols: string;              // comma separated: "vless,trojan"
    ports: number[];
    fingerprint: Fingerprint;
    enableTFO: boolean;
    enableECH: boolean;
    echServerName: string;

    // network
    remoteDNS: string;
    localDNS: string;
    enableIPv6: boolean;
    proxyIpMode: ProxyIpMode;
    proxyIPs: string[];
    nat64Prefixes: string[];
    cleanIPs: string[];
    customDomain: string;

    // subscription
    nameTemplate: string;           // e.g. "{FLAG} {NAME} · {PROTOCOL}-{PORT}"
    namePrefix: string;
    maxConfigs: number;
    fakeConfigs: FakeConfig[];
    subUserAgent: string;

    // routing
    bypassIran: boolean;
    bypassLAN: boolean;
    blockAds: boolean;
    blockPorn: boolean;
    blockUDP443: boolean;
    customBypassRules: string[];
    customBlockRules: string[];

    // gaming
    gaming: GamingSettings;

    /**
     * Proxy IP Pool — fixed Cloudflare IPv4s chosen by country.
     *
     * When enabled, generated configs use these literals as the address
     * field so every subscriber lands on the same, measured edge instead
     * of a hostname that re-resolves.
     */
    ipPool: IpPoolSettings;

    // ops
    fallback: string;
    isPaused: boolean;
    logLevel: LogLevel;
    panelVersion: string;
}

/**
 * A gaming profile pins one exact endpoint.
 *
 * Normal configs enumerate addresses x ports and let the client url-test
 * between them. That is right for browsing and wrong for gaming: the client
 * re-probes on a timer and can migrate mid-match, and domain front-ends
 * re-resolve to a different edge on every reconnect, so the ping moves around.
 * A profile freezes one IPv4 literal, one port and one protocol so every
 * session takes the identical route.
 */
export interface GamingProfile {
    id: string;
    name: string;
    /** IPv4 literal. Never a domain — a domain re-resolves and defeats the point. */
    address: string;
    port: number;
    protocol: string;              // 'vless' | 'trojan'
    /** Measurements from the last pin, kept so the UI can show why it was chosen. */
    medianMs: number;
    jitterMs: number;
    lossPct: number;
    grade: string;                 // S | A | B | C | D
    pinnedAt: number;
}

export interface GamingSettings {
    enabled: boolean;
    profiles: GamingProfile[];
    /** Strip the url-test/selector wrapper so the client cannot drift. */
    lockToProfile: boolean;
    /** Send game traffic straight out instead of through a relay hop. */
    bypassRelay: boolean;
    /** Route only game traffic through the tunnel; everything else direct. */
    splitTunnel: boolean;
}

/** One measured Cloudflare edge pinned into the Proxy IP Pool. */
export interface IpPoolEntry {
    address: string;
    latency: number;
    jitter: number;
    lossPct: number;
    grade: string;
    colo: string;
    country: string;
    scannedAt: number;
}

export interface IpPoolSettings {
    enabled: boolean;
    /** ISO country code, or AUTO. */
    country: string;
    /** When true, configs list only these IPs — no worker hostname fallback. */
    lockToPool: boolean;
    /** How many winners to keep after a scan. */
    keep: number;
    entries: IpPoolEntry[];
    scannedAt: number;
}

export interface FakeConfig {
    name: string;      // supports {usage} and {expiry} placeholders
    enabled: boolean;
}

/** A subscriber. Stored one row per user in D1. */
export interface User {
    id: string;
    name: string;
    uuid: string;
    notes: string;
    limitBytes: number;         // 0 = unlimited
    dailyLimitBytes: number;    // 0 = unlimited
    expiryMs: number;           // 0 = never
    isPaused: boolean;
    disabledReason: string;
    createdAt: number;
    // per-user overrides (empty = inherit global)
    protocols: string;
    ports: number[];
    cleanIPs: string[];
    panelUrl: string;
    maxConfigs: number;
}

export type UserStatus =
    | 'active' | 'paused' | 'expired'
    | 'quota-exceeded' | 'daily-limit' | 'auto-disabled';

export interface UserUsage {
    totalBytes: number;
    totalReqs: number;
    dailyBytes: number;
    dailyReqs: number;
    day: string;
}

export interface EnrichedUser extends User {
    usage: UserUsage;
    status: UserStatus;
}

export interface ApiKey {
    id: string;
    name: string;
    createdAt: number;
    lastUsed: number;
}

export interface LogEntry {
    id?: number;
    ts: number;
    type: string;
    detail: string;
}

/** Per-request derived context, rebuilt on every fetch. */
export interface RequestContext {
    origin: string;
    hostname: string;
    pathname: string;
    searchParams: URLSearchParams;
    client: string;
    userAgent: string;
    clientIp: string;
    colo: string;
    httpPorts: number[];
    httpsPorts: number[];
}
