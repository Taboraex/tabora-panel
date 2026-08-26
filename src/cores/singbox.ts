import { P } from '@config/obfuscation';
import {
    BuildContext,
    enumerateEndpoints,
    isTlsPort,
    renderRemark,
    selectSniHost,
} from './shared';

interface SbOutbound {
    type: string;
    tag: string;
    [key: string]: unknown;
}

function buildOutbound(
    ctx: BuildContext,
    protocol: string,
    address: string,
    port: number,
    tag: string,
): SbOutbound {
    const { settings, hostname } = ctx;
    const tls = isTlsPort(port);
    const { sni, host } = selectSniHost(address, hostname);

    const outbound: SbOutbound = {
        type: protocol === P.TR ? P.TR : P.VL,
        tag,
        server: address,
        server_port: port,
        transport: {
            type: 'ws',
            path: protocol === P.TR ? '/tr' : '/vl',
            headers: { Host: host },
            max_early_data: 2560,
            early_data_header_name: 'Sec-WebSocket-Protocol',
        },
    };

    if (protocol === P.TR) {
        outbound.password = ctx.trojanPassword;
    } else {
        outbound.uuid = ctx.uuid;
        outbound.flow = '';
    }

    if (tls) {
        outbound.tls = {
            enabled: true,
            server_name: sni,
            insecure: false,
            alpn: ['http/1.1'],
            utls: { enabled: true, fingerprint: settings.fingerprint },
            ...(settings.enableECH && settings.echServerName
                ? { ech: { enabled: true, config: [] } }
                : {}),
        };
    }

    return outbound;
}

export function buildSingboxConfig(ctx: BuildContext): string {
    const { settings } = ctx;
    const outbounds: SbOutbound[] = [];

    for (const { address, port, index } of enumerateEndpoints(ctx)) {
        for (const protocol of ctx.protocols) {
            const tag = renderRemark(settings.nameTemplate, {
                index,
                prefix: settings.namePrefix,
                protocol: protocol === P.TR ? 'TR' : 'VL',
                port,
                address,
                flag: ctx.poolFlag,
                country: ctx.poolCountry,
            });
            outbounds.push(buildOutbound(ctx, protocol, address, port, tag));
        }
    }

    const tags = outbounds.map((o) => o.tag);

    const ruleSets = [];
    const rules: Array<Record<string, unknown>> = [
        { action: 'sniff' },
        { protocol: 'dns', action: 'hijack-dns' },
        { ip_is_private: true, outbound: 'direct' },
    ];

    if (settings.bypassIran) {
        ruleSets.push({
            type: 'remote',
            tag: 'geosite-ir',
            format: 'binary',
            url: 'https://raw.githubusercontent.com/Chocolate4U/Iran-sing-box-rules/rule-set/geosite-ir.srs',
            download_detour: 'direct',
        });
        rules.push({ rule_set: ['geosite-ir'], outbound: 'direct' });
    }

    if (settings.blockAds) {
        ruleSets.push({
            type: 'remote',
            tag: 'geosite-ads',
            format: 'binary',
            url: 'https://raw.githubusercontent.com/Chocolate4U/Iran-sing-box-rules/rule-set/geosite-category-ads-all.srs',
            download_detour: 'direct',
        });
        rules.push({ rule_set: ['geosite-ads'], action: 'reject' });
    }

    if (settings.blockUDP443) {
        rules.push({ network: 'udp', port: 443, action: 'reject' });
    }

    if (settings.customBypassRules.length) {
        rules.push({ domain_suffix: settings.customBypassRules, outbound: 'direct' });
    }

    if (settings.customBlockRules.length) {
        rules.push({ domain_suffix: settings.customBlockRules, action: 'reject' });
    }

    const config = {
        log: { level: settings.logLevel === 'none' ? 'panic' : settings.logLevel, timestamp: true },
        dns: {
            servers: [
                { tag: 'remote-dns', type: 'https', server: new URL(settings.remoteDNS).hostname, detour: '✅ Selector' },
                { tag: 'local-dns', type: 'udp', server: settings.localDNS, detour: 'direct' },
            ],
            rules: [
                { rule_set: settings.bypassIran ? ['geosite-ir'] : [], server: 'local-dns' },
            ].filter((r) => (r.rule_set as string[]).length > 0),
            final: 'remote-dns',
            strategy: settings.enableIPv6 ? 'prefer_ipv4' : 'ipv4_only',
            independent_cache: true,
        },
        inbounds: [
            {
                type: 'mixed',
                tag: 'mixed-in',
                listen: '127.0.0.1',
                listen_port: 2080,
            },
            {
                type: 'tun',
                tag: 'tun-in',
                address: settings.enableIPv6
                    ? ['172.19.0.1/28', 'fdfe:dcba:9876::1/126']
                    : ['172.19.0.1/28'],
                mtu: 9000,
                auto_route: true,
                strict_route: true,
                stack: 'mixed',
            },
        ],
        outbounds: [
            {
                type: 'selector',
                tag: '✅ Selector',
                outbounds: ['♻️ Auto', ...tags],
                default: '♻️ Auto',
            },
            {
                type: 'urltest',
                tag: '♻️ Auto',
                outbounds: tags,
                url: 'https://www.gstatic.com/generate_204',
                interval: '5m',
                tolerance: 50,
            },
            ...outbounds,
            { type: 'direct', tag: 'direct' },
        ],
        route: {
            rules,
            rule_set: ruleSets,
            auto_detect_interface: true,
            final: '✅ Selector',
        },
        experimental: {
            cache_file: { enabled: true, store_fakeip: true },
            clash_api: { external_controller: '127.0.0.1:9090' },
        },
    };

    // Drop undefined keys introduced above.
    return JSON.stringify(config, (_k, v) => (v === undefined ? undefined : v), 2);
}
