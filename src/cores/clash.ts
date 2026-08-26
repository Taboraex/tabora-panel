import { P } from '@config/obfuscation';
import {
    BuildContext,
    enumerateEndpoints,
    isTlsPort,
    renderRemark,
    selectSniHost,
} from './shared';

interface ClashProxy {
    name: string;
    type: string;
    server: string;
    port: number;
    udp: boolean;
    [key: string]: unknown;
}

function buildProxy(
    ctx: BuildContext,
    protocol: string,
    address: string,
    port: number,
    name: string,
): ClashProxy {
    const { settings, hostname } = ctx;
    const tls = isTlsPort(port);
    const { sni, host } = selectSniHost(address, hostname);

    const base: ClashProxy = {
        name,
        type: protocol === P.TR ? P.TR : P.VL,
        server: address,
        port,
        udp: true,
        network: 'ws',
        'skip-cert-verify': false,
        'ws-opts': {
            path: protocol === P.TR ? '/tr' : '/vl',
            headers: { Host: host },
            'max-early-data': 2560,
            'early-data-header-name': 'Sec-WebSocket-Protocol',
        },
    };

    if (protocol === P.TR) {
        base.password = ctx.trojanPassword;
    } else {
        base.uuid = ctx.uuid;
        base.tls = tls;
        base.servername = sni;
        base['client-fingerprint'] = settings.fingerprint;
    }

    if (tls) {
        base.tls = true;
        base.sni = sni;
        base['client-fingerprint'] = settings.fingerprint;
        base.alpn = ['http/1.1'];
    }

    return base;
}

/**
 * Minimal YAML emitter — enough for Clash configs, no dependency needed.
 * Emits block style, returning an array of fully-indented lines.
 */
function yamlLines(value: unknown, indent: number): string[] {
    const pad = '  '.repeat(indent);

    if (Array.isArray(value)) {
        const out: string[] = [];
        for (const item of value) {
            if (item !== null && typeof item === 'object') {
                const inner = yamlLines(item, indent + 1);
                if (inner.length === 0) {
                    out.push(`${pad}- {}`);
                    continue;
                }
                // Hoist the first child line onto the "- " marker.
                out.push(`${pad}- ${inner[0].trimStart()}`);
                out.push(...inner.slice(1));
            } else {
                out.push(`${pad}- ${formatScalar(item)}`);
            }
        }
        return out;
    }

    if (value !== null && typeof value === 'object') {
        const out: string[] = [];
        for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
            if (val === undefined) continue;

            if (Array.isArray(val)) {
                if (val.length === 0) {
                    out.push(`${pad}${key}: []`);
                } else {
                    out.push(`${pad}${key}:`);
                    out.push(...yamlLines(val, indent + 1));
                }
            } else if (val !== null && typeof val === 'object') {
                const inner = yamlLines(val, indent + 1);
                if (inner.length === 0) {
                    out.push(`${pad}${key}: {}`);
                } else {
                    out.push(`${pad}${key}:`);
                    out.push(...inner);
                }
            } else {
                out.push(`${pad}${key}: ${formatScalar(val)}`);
            }
        }
        return out;
    }

    return [`${pad}${formatScalar(value)}`];
}

const toYaml = (value: unknown): string => yamlLines(value, 0).join('\n');

function formatScalar(value: unknown): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean' || typeof value === 'number') return String(value);
    const str = String(value);
    // Quote anything that could be misread as YAML syntax.
    if (str === '' || /[:#{}[\],&*?|<>=!%@`'"\n]/.test(str) || /^\s|\s$/.test(str)) {
        return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    }
    return str;
}

export function buildClashConfig(ctx: BuildContext): string {
    const { settings } = ctx;
    const proxies: ClashProxy[] = [];

    for (const { address, port, index } of enumerateEndpoints(ctx)) {
        for (const protocol of ctx.protocols) {
            const name = renderRemark(settings.nameTemplate, {
                index,
                prefix: settings.namePrefix,
                protocol: protocol === P.TR ? 'TR' : 'VL',
                port,
                address,
                flag: ctx.poolFlag,
                country: ctx.poolCountry,
            });
            proxies.push(buildProxy(ctx, protocol, address, port, name));
        }
    }

    const names = proxies.map((p) => p.name);

    const rules: string[] = [];
    if (settings.bypassLAN) {
        rules.push('GEOIP,LAN,DIRECT,no-resolve', 'GEOIP,PRIVATE,DIRECT,no-resolve');
    }
    if (settings.bypassIran) {
        rules.push('GEOSITE,category-ir,DIRECT', 'GEOIP,IR,DIRECT,no-resolve');
    }
    if (settings.blockAds) rules.push('GEOSITE,category-ads-all,REJECT');
    if (settings.blockPorn) rules.push('GEOSITE,category-porn,REJECT');
    if (settings.blockUDP443) rules.push('AND,((NETWORK,udp),(DST-PORT,443)),REJECT');
    for (const rule of settings.customBypassRules) rules.push(`DOMAIN-SUFFIX,${rule},DIRECT`);
    for (const rule of settings.customBlockRules) rules.push(`DOMAIN-SUFFIX,${rule},REJECT`);
    rules.push('MATCH,✅ Selector');

    const config = {
        'mixed-port': 7890,
        'allow-lan': false,
        mode: 'rule',
        'log-level': settings.logLevel === 'none' ? 'silent' : settings.logLevel,
        ipv6: settings.enableIPv6,
        'external-controller': '127.0.0.1:9090',
        dns: {
            enable: true,
            listen: '0.0.0.0:1053',
            ipv6: settings.enableIPv6,
            'enhanced-mode': 'fake-ip',
            'fake-ip-range': '198.18.0.1/16',
            'default-nameserver': [settings.localDNS],
            nameserver: [settings.remoteDNS],
        },
        proxies,
        'proxy-groups': [
            {
                name: '✅ Selector',
                type: 'select',
                proxies: ['♻️ Auto', ...names],
            },
            {
                name: '♻️ Auto',
                type: 'url-test',
                url: 'https://www.gstatic.com/generate_204',
                interval: 300,
                tolerance: 50,
                proxies: names,
            },
        ],
        rules,
    };

    return `# ${settings.namePrefix} — Clash / Mihomo\n# Generated ${new Date().toISOString()}\n\n${toYaml(config)}\n`;
}
