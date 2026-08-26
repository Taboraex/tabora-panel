import { Settings, User } from '#types/settings';
import { P } from '@config/obfuscation';
import { getContext } from '@config/settings';
import { formatBytes, formatDate, isIPv4, parseList } from '@common/utils';
import { HTTPS_PORTS } from '@config/constants';

/** Everything a config builder needs, resolved once per subscription request. */
export interface BuildContext {
    settings: Settings;
    user: User | null;
    hostname: string;
    protocols: string[];
    ports: number[];
    addresses: string[];
    uuid: string;
    trojanPassword: string;
    maxConfigs: number;
    poolCountry: string;
    poolFlag: string;
    /**
     * Proxy IP Pool is active: emit exactly one config per pinned IPv4
     * (one TLS port, one protocol). No cartesian product, no url-test.
     */
    poolFixed: boolean;
}

export function resolveBuildContext(settings: Settings, user: User | null): BuildContext {
    const { hostname } = getContext();

    const protocols = parseList(user?.protocols || settings.protocols)
        .map((p) => p.toLowerCase())
        .filter((p) => p === P.VL || p === P.TR);

    const ports = user?.ports?.length ? user.ports : settings.ports;

    const pool = settings.ipPool;
    const poolIps = pool?.enabled && pool.entries?.length
        ? pool.entries.map((entry) => entry.address).filter(Boolean)
        : [];

    const poolCountry = pool?.enabled ? (pool.country || '') : '';

    // Fixed-IP mode: 3 healthy IPs must produce 3 configs, not
    // 3 × ports × protocols. One TLS port (443), one protocol (VLESS if on).
    if (poolIps.length && !user?.cleanIPs?.length) {
        const tlsPort = preferTlsPort(ports.length ? ports : [...HTTPS_PORTS]);
        const protocol = preferProtocol(protocols.length ? protocols : [P.VL]);
        return {
            settings,
            user,
            hostname,
            protocols: [protocol],
            ports: [tlsPort],
            addresses: poolIps,
            uuid: user?.uuid || settings.uuid,
            trojanPassword: settings.trojanPassword,
            maxConfigs: poolIps.length,
            poolCountry,
            poolFlag: flagFor(poolCountry),
            poolFixed: true,
        };
    }

    const frontEnds = user?.cleanIPs?.length ? user.cleanIPs : settings.cleanIPs;
    const addresses = [hostname, ...frontEnds].filter(
        (value, index, self) => value && self.indexOf(value) === index,
    );

    return {
        settings,
        user,
        hostname,
        protocols: protocols.length ? protocols : [P.VL],
        ports: ports.length ? ports : [...HTTPS_PORTS],
        addresses,
        uuid: user?.uuid || settings.uuid,
        trojanPassword: settings.trojanPassword,
        maxConfigs: user?.maxConfigs || settings.maxConfigs || 30,
        poolCountry,
        poolFlag: flagFor(poolCountry),
        poolFixed: false,
    };
}

export function preferTlsPort(ports: number[]): number {
    if (ports.includes(443)) return 443;
    const tls = ports.find((port) => HTTPS_PORTS.includes(port));
    return tls ?? 443;
}

export function preferProtocol(protocols: string[]): string {
    if (protocols.includes(P.VL)) return P.VL;
    if (protocols.includes(P.TR)) return P.TR;
    return P.VL;
}

export const isTlsPort = (port: number): boolean => HTTPS_PORTS.includes(port);

/** Clients verifying the cert against the IP (not the SNI) need this. */
export const frontNeedsInsecure = (address: string): boolean => isIPv4(address);

/** WebSocket path. `ed=2560` enables early data on clients that support it. */
export function wsPath(protocol: string, earlyData = true): string {
    const base = protocol === P.TR ? '/tr' : '/vl';
    return earlyData ? `${base}?ed=2560` : base;
}

/**
 * SNI and Host must point at the worker's own domain; the address field can be
 * any Cloudflare front-end (clean IP / domain) that routes to it.
 */
export function selectSniHost(address: string, workerHost: string) {
    const isWorkerDomain = address === workerHost;
    return {
        sni: isWorkerDomain ? workerHost : workerHost,
        host: workerHost,
        isFronted: !isWorkerDomain,
    };
}

const FLAGS: Record<string, string> = {
    US: '🇺🇸', DE: '🇩🇪', NL: '🇳🇱', FR: '🇫🇷', GB: '🇬🇧', UK: '🇬🇧',
    JP: '🇯🇵', SG: '🇸🇬', HK: '🇭🇰', TR: '🇹🇷', AE: '🇦🇪', IR: '🇮🇷',
    CA: '🇨🇦', AU: '🇦🇺', SE: '🇸🇪', FI: '🇫🇮', PL: '🇵🇱', RU: '🇷🇺',
    IT: '🇮🇹', ES: '🇪🇸', AT: '🇦🇹', CH: '🇨🇭', KR: '🇰🇷', IN: '🇮🇳',
    BR: '🇧🇷', AUTO: '⚡',
};

export const flagFor = (code: string): string => FLAGS[code?.toUpperCase()] ?? '🌐';

/**
 * Render a config label from the template, substituting the supported tags.
 * Unknown tags are stripped so a bad template can't produce broken names.
 */
export function renderRemark(
    template: string,
    values: {
        index: number;
        prefix: string;
        protocol: string;
        port: number;
        address: string;
        flag?: string;
        country?: string;
    },
): string {
    const map: Record<string, string> = {
        '{INDEX}': String(values.index),
        '{PREFIX}': values.prefix,
        '{PROTOCOL}': values.protocol.toUpperCase(),
        '{PORT}': String(values.port),
        '{ADDRESS}': values.address,
        '{IP}': values.address,
        '{FLAG}': values.flag ?? '🌐',
        '{COUNTRY}': values.country ?? '',
    };

    let out = template;
    for (const [tag, value] of Object.entries(map)) {
        out = out.replaceAll(tag, value);
    }

    return out.replace(/\{[A-Z]+\}/g, '').replace(/\s+/g, ' ').trim() || `Node-${values.index}`;
}

/**
 * Sing-box and Clash refuse a config whose outbound tags / proxy names collide.
 * The 0.7.1 default template dropped `{PROTOCOL}`, so VLESS and Trojan of the
 * same IP rendered identically and Hiddify failed with
 * `duplicate outbound/endpoint tag`.
 */
export function uniqueLabel(base: string, used: Set<string>, hint = ''): string {
    const root = (base || 'Node').replace(/\s+/g, ' ').trim() || 'Node';
    const claim = (name: string): string | null => {
        if (used.has(name)) return null;
        used.add(name);
        return name;
    };
    const first = claim(root);
    if (first) return first;
    if (hint) {
        const withHint = claim(`${root} · ${hint}`);
        if (withHint) return withHint;
    }
    for (let n = 2; n < 10_000; n++) {
        const next = claim(`${root} · ${n}`);
        if (next) return next;
    }
    return `${root} · ${used.size + 1}`;
}

/** Informational pseudo-nodes that surface quota/expiry inside the client UI. */
export function renderInfoLabels(
    settings: Settings,
    user: User | null,
    usedBytes: number,
): string[] {
    if (!user) return [];

    return settings.fakeConfigs
        .filter((entry) => entry.enabled)
        .map((entry) => {
            const quota = user.limitBytes ? formatBytes(user.limitBytes) : '∞';
            const usage = `${formatBytes(usedBytes)} / ${quota}`;
            const expiry = user.expiryMs ? formatDate(user.expiryMs) : '∞';
            return entry.name.replaceAll('{usage}', usage).replaceAll('{expiry}', expiry);
        });
}

/** Cartesian product of addresses × ports, capped at `maxConfigs`. */
export function* enumerateEndpoints(ctx: BuildContext) {
    let index = 1;
    outer: for (const address of ctx.addresses) {
        for (const port of ctx.ports) {
            // Non-worker front-ends only make sense over TLS ports.
            if (address !== ctx.hostname && !isTlsPort(port)) continue;
            if (index > ctx.maxConfigs) break outer;
            yield { address, port, index: index++ };
        }
    }
}
