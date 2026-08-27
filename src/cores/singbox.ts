import { P } from '@config/obfuscation';
import {
    BuildContext,
    listConfigs,
    isTlsPort,
    frontNeedsInsecure,
    renderRemark,
    uniqueLabel,
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
        // Hiddify already multiplexes; a second mux layer on every outbound
        // is a common force-close. Keep it off.
        multiplex: { enabled: false },
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
            insecure: frontNeedsInsecure(address),
            alpn: ['http/1.1'],
            utls: { enabled: true, fingerprint: settings.fingerprint },
        };
    }

    return outbound;
}

/**
 * Outbound-only sing-box JSON.
 *
 * Hiddify (and Hiddify Next) already own TUN, mixed inbound, clash_api and
 * geosite downloads. Shipping a second TUN + `action: sniff` (1.11-only) +
 * GitHub rule-sets is what made the app force-close after a 16-IP scan.
 */
export function buildSingboxConfig(ctx: BuildContext): string {
    const { settings } = ctx;
    const proxies: SbOutbound[] = [];
    const used = new Set(['✅ Selector', '♻️ Auto', 'direct', 'dns-remote', 'dns-direct']);

    for (const slot of listConfigs(ctx)) {
        const proto = slot.protocol === P.TR ? 'TR' : 'VL';
        const tag = uniqueLabel(renderRemark(settings.nameTemplate, {
            index: slot.index,
            prefix: settings.namePrefix,
            protocol: proto,
            port: slot.port,
            address: slot.address,
            flag: ctx.poolFlag,
            country: ctx.poolCountry,
        }), used, proto);
        proxies.push(buildOutbound(ctx, slot.protocol, slot.address, slot.port, tag));
    }

    const tags = proxies.map((o) => o.tag);
    const remoteDns = settings.remoteDNS || 'https://8.8.8.8/dns-query';
    const localDns = settings.localDNS || '1.1.1.1';

    const config = {
        log: { level: settings.logLevel === 'none' ? 'panic' : settings.logLevel, timestamp: true },
        dns: {
            servers: [
                { tag: 'dns-remote', address: remoteDns, detour: '✅ Selector' },
                { tag: 'dns-direct', address: localDns, detour: 'direct' },
            ],
            final: 'dns-remote',
            strategy: settings.enableIPv6 ? 'prefer_ipv4' : 'ipv4_only',
            independent_cache: true,
        },
        outbounds: [
            ...(ctx.poolFixed
                ? [{
                    type: 'selector',
                    tag: '✅ Selector',
                    outbounds: tags,
                    default: tags[0],
                }]
                : [
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
                ]),
            ...proxies,
            { type: 'direct', tag: 'direct' },
        ],
        route: {
            rules: [
                { ip_is_private: true, outbound: 'direct' },
            ],
            auto_detect_interface: true,
            final: '✅ Selector',
        },
    };

    return JSON.stringify(config, null, 2);
}
