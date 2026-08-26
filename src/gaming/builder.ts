import { GamingProfile, Settings } from '#types/settings';
import { P } from '@config/obfuscation';
import { BuildContext, frontNeedsInsecure, isTlsPort, selectSniHost, wsPath } from '@cores/shared';
import { base64Encode } from '@common/utils';

/**
 * Config builders for gaming profiles.
 *
 * The difference from the normal builders is not cosmetic. Those enumerate
 * every address x port pair and hand the client a url-test group so it can
 * pick and re-pick. Here we emit exactly one outbound and no group at all:
 *
 *   - one literal IPv4, so no DNS lookup happens at connect time and the route
 *     is identical every session;
 *   - one port, one protocol, so there is nothing to fail over to;
 *   - no url-test, so the client cannot migrate in the middle of a match.
 *
 * That is the whole point of the feature: predictable ping beats fast ping.
 */

const remarkFor = (profile: GamingProfile): string =>
    `🎮 ${profile.name} · ${profile.grade}${profile.medianMs >= 0 ? ` · ${profile.medianMs}ms` : ''}`;

/** Share URI for a pinned profile. */
export function buildGamingUri(ctx: BuildContext, profile: GamingProfile): string {
    const { settings, hostname } = ctx;
    const tls = isTlsPort(profile.port);
    const { sni, host } = selectSniHost(profile.address, hostname);
    const protocol = profile.protocol === P.TR ? P.TR : P.VL;

    const credential = protocol === P.TR ? ctx.trojanPassword : ctx.uuid;
    const url = new URL(`${protocol}://placeholder`);
    url.username = encodeURIComponent(credential);
    url.hostname = profile.address;
    url.port = String(profile.port);

    const params = url.searchParams;
    if (protocol === P.VL) params.set('encryption', 'none');
    params.set('type', 'ws');
    params.set('host', host);
    params.set('path', wsPath(protocol));
    params.set('security', tls ? 'tls' : 'none');

    if (tls) {
        params.set('sni', sni);
        params.set('fp', settings.fingerprint);
        params.set('alpn', 'http/1.1');
        if (frontNeedsInsecure(profile.address)) params.set('allowInsecure', '1');
    }

    url.hash = encodeURIComponent(remarkFor(profile));
    return url.href.replace('placeholder', profile.address);
}

export function buildGamingUriList(ctx: BuildContext, profiles: GamingProfile[]): string {
    return profiles.map((p) => buildGamingUri(ctx, p)).join('\n');
}

export function buildGamingBase64(ctx: BuildContext, profiles: GamingProfile[]): string {
    return base64Encode(buildGamingUriList(ctx, profiles));
}

/* ─────────────────────────────── Clash ─────────────────────────────── */

function clashProxy(ctx: BuildContext, profile: GamingProfile): Record<string, unknown> {
    const { settings, hostname } = ctx;
    const tls = isTlsPort(profile.port);
    const { sni, host } = selectSniHost(profile.address, hostname);
    const protocol = profile.protocol === P.TR ? P.TR : P.VL;

    const proxy: Record<string, unknown> = {
        name: remarkFor(profile),
        type: protocol,
        server: profile.address,
        port: profile.port,
        udp: true,
        network: 'ws',
        'skip-cert-verify': frontNeedsInsecure(profile.address),
        // Multiplexing batches streams onto one connection, which adds
        // head-of-line blocking: one stalled stream delays the others. That is
        // invisible while browsing and shows up as a spike in a match.
        smux: { enabled: false },
        'ws-opts': {
            path: protocol === P.TR ? '/tr' : '/vl',
            headers: { Host: host },
            'max-early-data': 2560,
            'early-data-header-name': 'Sec-WebSocket-Protocol',
        },
    };

    if (protocol === P.TR) {
        proxy.password = ctx.trojanPassword;
    } else {
        proxy.uuid = ctx.uuid;
    }

    if (tls) {
        proxy.tls = true;
        proxy.sni = sni;
        proxy.servername = sni;
        proxy['client-fingerprint'] = settings.fingerprint;
        proxy.alpn = ['http/1.1'];
    }

    return proxy;
}

function yamlLines(value: unknown, indent: number): string[] {
    const pad = '  '.repeat(indent);

    if (Array.isArray(value)) {
        const out: string[] = [];
        for (const item of value) {
            if (item !== null && typeof item === 'object') {
                const inner = yamlLines(item, indent + 1);
                if (!inner.length) { out.push(`${pad}- {}`); continue; }
                out.push(`${pad}- ${inner[0].trimStart()}`);
                out.push(...inner.slice(1));
            } else {
                out.push(`${pad}- ${scalar(item)}`);
            }
        }
        return out;
    }

    if (value !== null && typeof value === 'object') {
        const out: string[] = [];
        for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
            if (val === undefined) continue;
            if (Array.isArray(val)) {
                if (!val.length) out.push(`${pad}${key}: []`);
                else { out.push(`${pad}${key}:`); out.push(...yamlLines(val, indent + 1)); }
            } else if (val !== null && typeof val === 'object') {
                const inner = yamlLines(val, indent + 1);
                if (!inner.length) out.push(`${pad}${key}: {}`);
                else { out.push(`${pad}${key}:`); out.push(...inner); }
            } else {
                out.push(`${pad}${key}: ${scalar(val)}`);
            }
        }
        return out;
    }

    return [`${pad}${scalar(value)}`];
}

function scalar(value: unknown): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean' || typeof value === 'number') return String(value);
    const str = String(value);
    if (str === '' || /[:#{}[\],&*?|<>=!%@`'"\n]/.test(str) || /^\s|\s$/.test(str)) {
        return `"${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    }
    return str;
}

export function buildGamingClash(ctx: BuildContext, profiles: GamingProfile[]): string {
    const { settings } = ctx;
    const gaming = settings.gaming;
    const proxies = profiles.map((p) => clashProxy(ctx, p));
    const names = proxies.map((p) => p.name as string);

    const rules: string[] = [];
    if (settings.bypassLAN) {
        rules.push('GEOIP,LAN,DIRECT,no-resolve', 'GEOIP,PRIVATE,DIRECT,no-resolve');
    }
    if (settings.bypassIran) {
        rules.push('GEOSITE,category-ir,DIRECT', 'GEOIP,IR,DIRECT,no-resolve');
    }

    // Split tunnel sends everything except game traffic straight out, so the
    // tunnel carries only what benefits from it and nothing competes with the
    // game for the same connection.
    const target = names[0] ?? 'DIRECT';
    if (gaming.splitTunnel) {
        rules.push(
            'GEOSITE,category-games,' + target,
            'PROCESS-NAME,steam.exe,' + target,
            'PROCESS-NAME,Steam.exe,' + target,
            'MATCH,DIRECT',
        );
    } else {
        rules.push(`MATCH,${target}`);
    }

    // No url-test group when locked: a proxy-group that re-probes on a timer is
    // exactly the mid-match switch this feature exists to prevent.
    const groups = gaming.lockToProfile
        ? [{ name: '🎮 Gaming', type: 'select', proxies: names }]
        : [
            { name: '🎮 Gaming', type: 'select', proxies: ['♻️ Auto', ...names] },
            {
                name: '♻️ Auto', type: 'url-test',
                url: 'https://www.gstatic.com/generate_204',
                interval: 300, tolerance: 50, proxies: names,
            },
        ];

    const config = {
        'mixed-port': 7890,
        'allow-lan': false,
        mode: 'rule',
        'log-level': settings.logLevel === 'none' ? 'silent' : settings.logLevel,
        ipv6: settings.enableIPv6,
        dns: {
            enable: true,
            listen: '0.0.0.0:1053',
            ipv6: settings.enableIPv6,
            // fake-ip answers instantly from cache instead of waiting on a
            // real lookup, which removes a DNS round trip from connect time.
            'enhanced-mode': 'fake-ip',
            'fake-ip-range': '198.18.0.1/16',
            'default-nameserver': [settings.localDNS],
            nameserver: [settings.remoteDNS],
        },
        proxies,
        'proxy-groups': groups,
        rules,
    };

    const header = [
        `# ${settings.namePrefix} — Gaming profile (Clash / Mihomo)`,
        `# Pinned endpoint${profiles.length > 1 ? 's' : ''}: ${profiles.map((p) => `${p.address}:${p.port}`).join(', ')}`,
        gaming.lockToProfile
            ? '# Locked: no url-test group, so the client cannot switch mid-match.'
            : '# Unlocked: auto-select is enabled and may switch during play.',
        `# Generated ${new Date().toISOString()}`,
    ].join('\n');

    return `${header}\n\n${yamlLines(config, 0).join('\n')}\n`;
}

/* ────────────────────────────── sing-box ───────────────────────────── */

export function buildGamingSingbox(ctx: BuildContext, profiles: GamingProfile[]): string {
    const { settings } = ctx;
    const gaming = settings.gaming;

    const outbounds = profiles.map((profile) => {
        const tls = isTlsPort(profile.port);
        const { sni, host } = selectSniHost(profile.address, ctx.hostname);
        const protocol = profile.protocol === P.TR ? P.TR : P.VL;

        const out: Record<string, unknown> = {
            type: protocol,
            tag: remarkFor(profile),
            server: profile.address,
            server_port: profile.port,
            // Explicitly off: multiplexing trades latency for connection reuse.
            multiplex: { enabled: false },
            transport: {
                type: 'ws',
                path: protocol === P.TR ? '/tr' : '/vl',
                headers: { Host: host },
                max_early_data: 2560,
                early_data_header_name: 'Sec-WebSocket-Protocol',
            },
        };

        if (protocol === P.TR) out.password = ctx.trojanPassword;
        else { out.uuid = ctx.uuid; out.flow = ''; }

        if (tls) {
            out.tls = {
                enabled: true,
                server_name: sni,
                insecure: frontNeedsInsecure(profile.address),
                alpn: ['http/1.1'],
                utls: { enabled: true, fingerprint: settings.fingerprint },
            };
        }

        return out;
    });

    const tags = outbounds.map((o) => o.tag as string);
    const primary = tags[0] ?? 'direct';

    const rules: Array<Record<string, unknown>> = [
        { action: 'sniff' },
        { protocol: 'dns', action: 'hijack-dns' },
        { ip_is_private: true, outbound: 'direct' },
    ];
    if (settings.blockUDP443) rules.push({ network: 'udp', port: 443, action: 'reject' });

    const selector = gaming.lockToProfile
        ? [{ type: 'selector', tag: '🎮 Gaming', outbounds: tags, default: primary }]
        : [
            { type: 'selector', tag: '🎮 Gaming', outbounds: ['♻️ Auto', ...tags], default: '♻️ Auto' },
            {
                type: 'urltest', tag: '♻️ Auto', outbounds: tags,
                url: 'https://www.gstatic.com/generate_204', interval: '5m', tolerance: 50,
            },
        ];

    const config = {
        log: { level: settings.logLevel === 'none' ? 'panic' : settings.logLevel, timestamp: true },
        dns: {
            servers: [
                { tag: 'remote-dns', type: 'https', server: new URL(settings.remoteDNS).hostname, detour: '🎮 Gaming' },
                { tag: 'local-dns', type: 'udp', server: settings.localDNS, detour: 'direct' },
            ],
            final: 'remote-dns',
            strategy: settings.enableIPv6 ? 'prefer_ipv4' : 'ipv4_only',
            independent_cache: true,
        },
        inbounds: [
            { type: 'mixed', tag: 'mixed-in', listen: '127.0.0.1', listen_port: 2080 },
            {
                type: 'tun', tag: 'tun-in',
                address: settings.enableIPv6 ? ['172.19.0.1/28', 'fdfe:dcba:9876::1/126'] : ['172.19.0.1/28'],
                mtu: 9000, auto_route: true, strict_route: true, stack: 'mixed',
            },
        ],
        outbounds: [...selector, ...outbounds, { type: 'direct', tag: 'direct' }],
        route: {
            rules,
            auto_detect_interface: true,
            final: gaming.splitTunnel ? 'direct' : '🎮 Gaming',
        },
        experimental: {
            cache_file: { enabled: true, store_fakeip: true },
        },
    };

    return JSON.stringify(config, null, 2);
}
