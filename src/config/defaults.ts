import { Settings } from '#types/settings';
import { P } from './obfuscation';
import { DEFAULT_CLEAN_IPS, DEFAULT_NAT64_PREFIXES, HTTPS_PORTS } from './constants';

export const DEFAULT_SETTINGS: Settings = {
    // identity — populated from env/derived values on first boot
    uuid: '',
    trojanPassword: '',
    securePath: 'tabora',

    // protocol
    protocols: `${P.VL},${P.TR}`,
    ports: [...HTTPS_PORTS],
    fingerprint: 'chrome',
    enableTFO: false,
    enableECH: false,
    echServerName: 'cloudflare-ech.com',

    // network
    remoteDNS: 'https://8.8.8.8/dns-query',
    localDNS: '8.8.8.8',
    enableIPv6: false,
    proxyIpMode: 'proxyip',
    proxyIPs: [],
    nat64Prefixes: [...DEFAULT_NAT64_PREFIXES],
    cleanIPs: [...DEFAULT_CLEAN_IPS],
    customDomain: '',

    // subscription
    nameTemplate: '{FLAG} {PREFIX}-{INDEX} · {PROTOCOL}:{PORT}',
    namePrefix: 'Tabora',
    maxConfigs: 30,
    fakeConfigs: [
        { name: '📊 {usage}', enabled: true },
        { name: '📅 {expiry}', enabled: true },
    ],
    subUserAgent: '',

    // routing
    bypassIran: true,
    bypassLAN: true,
    blockAds: false,
    blockPorn: false,
    blockUDP443: false,
    customBypassRules: [],
    customBlockRules: [],

    // ops
    fallback: 'https://www.wikipedia.org',
    isPaused: false,
    logLevel: 'warning',
    panelVersion: '0.0.0',
};

/** Fields a user record may override per-subscriber. */
export const USER_OVERRIDABLE = [
    'protocols',
    'ports',
    'cleanIPs',
    'panelUrl',
    'maxConfigs',
] as const;
