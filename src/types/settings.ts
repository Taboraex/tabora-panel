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

    // ops
    fallback: string;
    isPaused: boolean;
    logLevel: LogLevel;
    panelVersion: string;
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
