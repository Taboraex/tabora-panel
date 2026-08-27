import { Settings, User } from '#types/settings';
import { P } from '@config/obfuscation';
import { getContext } from '@config/settings';
import { formatBytes, formatDate, isIPv4, parseList } from '@common/utils';
import { HTTPS_PORTS } from '@config/constants';
import { isWorkerFrontIp } from '@scanner/candidates';

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
     * Operator pinned IPv4 fronts (clean-IP scan). Emit exactly one config
     * per address (one TLS port, one protocol). No cartesian product, no url-test.
     */
    poolFixed: boolean;
}

export function resolveBuildContext(settings: Settings, user: User | null): BuildContext {
    const { hostname } = getContext();

    const protocols = parseList(user?.protocols || settings.protocols)
        .map((p) => p.toLowerCase())
        .filter((p) => p === P.VL || p === P.TR);

    const ports = user?.ports?.length ? user.ports : settings.ports;

    const frontEnds = (user?.cleanIPs?.length ? user.cleanIPs : settings.cleanIPs)
        .filter(Boolean);
    // Any pinned IPv4 wins exclusively. Leftover catalogue domains
    // (icook.hk, …) used to fail the "every entry is IPv4" gate and fall
    // through to addresses × ports × protocols — 16 IPs became dozens of
    // configs and Hiddify died. One IP → one config, always.
    const workerFronts = resolveFixedFronts(frontEnds);

    if (workerFronts.length) {
        const tlsPort = preferTlsPort(ports.length ? ports : [...HTTPS_PORTS]);
        const protocol = preferProtocol(protocols.length ? protocols : [P.VL]);
        return {
            settings,
            user,
            hostname,
            protocols: [protocol],
            ports: [tlsPort],
            addresses: workerFronts,
            uuid: user?.uuid || settings.uuid,
            trojanPassword: settings.trojanPassword,
            maxConfigs: workerFronts.length,
            poolCountry: '',
            poolFlag: '',
            poolFixed: true,
        };
    }

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
        poolCountry: '',
        poolFlag: '',
        poolFixed: false,
    };
}

/** Strip a trailing :port so "104.16.1.1:443" still counts as a pinned IPv4. */
export function pinnedIpv4(raw: string): string | null {
    const host = String(raw ?? '').trim().replace(/:(\d{1,5})$/, '');
    return isIPv4(host) ? host : null;
}

/**
 * IPv4s that each become exactly one config.
 *
 * Worker-front addresses win when mixed with colo leftovers. If the operator
 * pinned only IPv4s (even ones the catalogue does not know), still lock 1:1
 * rather than exploding into ports × protocols.
 */
export function resolveFixedFronts(frontEnds: Iterable<string> | null | undefined): string[] {
    const seen = new Set<string>();
    const fronts: string[] = [];
    const anyIpv4: string[] = [];
    for (const raw of frontEnds ?? []) {
        const ip = pinnedIpv4(String(raw ?? ''));
        if (!ip || seen.has(ip)) continue;
        seen.add(ip);
        anyIpv4.push(ip);
        if (isWorkerFrontIp(ip)) fronts.push(ip);
    }
    return fronts.length ? fronts : anyIpv4;
}

/** One slot in the subscription — the only thing builders iterate. */
export interface ConfigSlot {
    address: string;
    port: number;
    protocol: string;
    index: number;
}

/**
 * Final list of configs. `maxConfigs` caps this list, not address×port pairs
 * that later get multiplied by protocol (that is how 16 IPs became 60 rows).
 */
export function listConfigs(ctx: BuildContext): ConfigSlot[] {
    const protocols = ctx.poolFixed
        ? [ctx.protocols[0] ?? P.VL]
        : (ctx.protocols.length ? ctx.protocols : [P.VL]);
    const ports = ctx.poolFixed
        ? [ctx.ports[0] ?? 443]
        : (ctx.ports.length ? ctx.ports : [443]);

    const slots: ConfigSlot[] = [];
    outer: for (const address of ctx.addresses) {
        for (const port of ports) {
            if (!ctx.poolFixed && address !== ctx.hostname && !isTlsPort(port)) continue;
            for (const protocol of protocols) {
                if (slots.length >= ctx.maxConfigs) break outer;
                slots.push({ address, port, protocol, index: slots.length + 1 });
            }
        }
    }
    return slots;
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

/** @deprecated use listConfigs — kept so older imports still typecheck. */
export function* enumerateEndpoints(ctx: BuildContext) {
    for (const slot of listConfigs(ctx)) {
        yield { address: slot.address, port: slot.port, index: slot.index };
    }
}
