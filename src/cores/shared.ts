import { Settings, User } from '#types/settings';
import { P } from '@config/obfuscation';
import { getContext } from '@config/settings';
import { formatBytes, formatDate, parseList } from '@common/utils';
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
}

export function resolveBuildContext(settings: Settings, user: User | null): BuildContext {
    const { hostname } = getContext();

    const protocols = parseList(user?.protocols || settings.protocols)
        .map((p) => p.toLowerCase())
        .filter((p) => p === P.VL || p === P.TR);

    const ports = user?.ports?.length ? user.ports : settings.ports;
    const cleanIPs = user?.cleanIPs?.length ? user.cleanIPs : settings.cleanIPs;

    // The worker hostname always works; clean IPs/domains are extra front-ends.
    const addresses = [hostname, ...cleanIPs].filter(
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
    };
}

export const isTlsPort = (port: number): boolean => HTTPS_PORTS.includes(port);

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
