import { Settings } from '#types/settings';
import { P } from './obfuscation';
import {
    DEFAULT_CLEAN_IPS,
    DEFAULT_NAT64_PREFIXES,
    DEFAULT_PROXY_IPS,
    HTTPS_PORTS,
} from './constants';

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
    proxyIPs: [...DEFAULT_PROXY_IPS],
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

    // gaming — off until the operator pins a profile
    gaming: {
        enabled: false,
        profiles: [],
        lockToProfile: true,
        bypassRelay: true,
        splitTunnel: false,
    },

    // Proxy IP Pool — empty until the operator scans a country
    ipPool: {
        enabled: false,
        country: '',
        lockToPool: true,
        keep: 3,
        entries: [],
        scannedAt: 0,
    },

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
