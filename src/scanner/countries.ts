import { CLOUDFLARE_RANGES, sampleFromRanges } from './candidates';

/**
 * Country catalogue for the Proxy IP Pool.
 *
 * Cloudflare anycast means the same prefix can answer from more than one
 * colo. These ranges are the ones geolocation databases and looking-glasses
 * consistently attribute to a given country / PoP — so when the operator
 * says "only test Turkey", we only probe IPs that actually belong to
 * Istanbul (and a handful of other TR prefixes), not a random /13.
 *
 * AUTO unions every country range with the published anycast set.
 */

export interface PoolCountry {
    code: string;
    name: string;
    nameFa: string;
    flag: string;
    /** Primary Cloudflare colo that serves this country. */
    colo: string;
    region: 'eu' | 'me' | 'asia' | 'americas' | 'auto';
    /** Highlighted in the picker — the routes Iranian networks usually want. */
    featured?: boolean;
    ranges: string[];
}

export const POOL_COUNTRIES: PoolCountry[] = [
    {
        code: 'AUTO',
        name: 'Best for me',
        nameFa: 'بهترین برای من',
        flag: '⚡',
        colo: '*',
        region: 'auto',
        featured: true,
        ranges: [],
    },
    {
        code: 'TR',
        name: 'Turkey',
        nameFa: 'ترکیه',
        flag: '🇹🇷',
        colo: 'IST',
        region: 'me',
        featured: true,
        ranges: [
            '104.23.180.0/22',
            '104.23.184.0/21',
            '172.70.112.0/22',
            '172.69.182.0/24',
            '172.69.199.0/24',
            '91.206.71.0/24',
        ],
    },
    {
        code: 'DE',
        name: 'Germany',
        nameFa: 'آلمان',
        flag: '🇩🇪',
        colo: 'FRA',
        region: 'eu',
        featured: true,
        ranges: [
            '172.71.160.0/23',
            '89.106.90.0/24',
            '162.158.48.0/21',
            '162.158.56.0/21',
            '141.101.80.0/22',
        ],
    },
    {
        code: 'NL',
        name: 'Netherlands',
        nameFa: 'هلند',
        flag: '🇳🇱',
        colo: 'AMS',
        region: 'eu',
        featured: true,
        ranges: [
            '141.101.76.0/23',
            '172.71.94.0/23',
            '8.19.8.0/24',
            '8.21.8.0/24',
            '89.249.200.0/24',
            '162.158.88.0/21',
        ],
    },
    {
        code: 'AE',
        name: 'United Arab Emirates',
        nameFa: 'امارات',
        flag: '🇦🇪',
        colo: 'DXB',
        region: 'me',
        featured: true,
        ranges: [
            '5.252.81.0/24',
            '162.158.36.0/22',
            '162.158.40.0/22',
        ],
    },
    {
        code: 'GB',
        name: 'United Kingdom',
        nameFa: 'انگلستان',
        flag: '🇬🇧',
        colo: 'LHR',
        region: 'eu',
        featured: true,
        ranges: [
            '172.70.88.0/22',
            '162.158.32.0/21',
            '141.101.64.0/22',
        ],
    },
    {
        code: 'FR',
        name: 'France',
        nameFa: 'فرانسه',
        flag: '🇫🇷',
        colo: 'CDG',
        region: 'eu',
        featured: true,
        ranges: [
            '141.101.66.0/23',
            '172.70.108.0/22',
            '162.158.24.0/21',
        ],
    },
    {
        code: 'US',
        name: 'United States',
        nameFa: 'آمریکا',
        flag: '🇺🇸',
        colo: 'SJC',
        region: 'americas',
        featured: true,
        ranges: [
            '104.16.0.0/16',
            '104.17.0.0/16',
            '162.159.128.0/17',
            '172.64.0.0/16',
        ],
    },
    {
        code: 'SE',
        name: 'Sweden',
        nameFa: 'سوئد',
        flag: '🇸🇪',
        colo: 'ARN',
        region: 'eu',
        ranges: ['162.158.104.0/21', '141.101.84.0/22'],
    },
    {
        code: 'FI',
        name: 'Finland',
        nameFa: 'فنلاند',
        flag: '🇫🇮',
        colo: 'HEL',
        region: 'eu',
        ranges: ['162.158.112.0/21'],
    },
    {
        code: 'PL',
        name: 'Poland',
        nameFa: 'لهستان',
        flag: '🇵🇱',
        colo: 'WAW',
        region: 'eu',
        ranges: ['162.158.120.0/21', '172.68.96.0/22'],
    },
    {
        code: 'IT',
        name: 'Italy',
        nameFa: 'ایتالیا',
        flag: '🇮🇹',
        colo: 'MXP',
        region: 'eu',
        ranges: ['162.158.128.0/21', '172.69.220.0/22'],
    },
    {
        code: 'ES',
        name: 'Spain',
        nameFa: 'اسپانیا',
        flag: '🇪🇸',
        colo: 'MAD',
        region: 'eu',
        ranges: ['104.22.8.0/21', '162.158.144.0/21'],
    },
    {
        code: 'AT',
        name: 'Austria',
        nameFa: 'اتریش',
        flag: '🇦🇹',
        colo: 'VIE',
        region: 'eu',
        ranges: ['162.158.136.0/21'],
    },
    {
        code: 'CH',
        name: 'Switzerland',
        nameFa: 'سوئیس',
        flag: '🇨🇭',
        colo: 'ZRH',
        region: 'eu',
        ranges: ['162.158.152.0/21'],
    },
    {
        code: 'JP',
        name: 'Japan',
        nameFa: 'ژاپن',
        flag: '🇯🇵',
        colo: 'NRT',
        region: 'asia',
        ranges: ['162.158.192.0/21', '172.69.0.0/20'],
    },
    {
        code: 'SG',
        name: 'Singapore',
        nameFa: 'سنگاپور',
        flag: '🇸🇬',
        colo: 'SIN',
        region: 'asia',
        ranges: ['162.158.200.0/21', '203.168.192.0/20'],
    },
    {
        code: 'HK',
        name: 'Hong Kong',
        nameFa: 'هنگ‌کنگ',
        flag: '🇭🇰',
        colo: 'HKG',
        region: 'asia',
        ranges: ['162.158.208.0/21', '172.70.200.0/20'],
    },
    {
        code: 'KR',
        name: 'South Korea',
        nameFa: 'کره جنوبی',
        flag: '🇰🇷',
        colo: 'ICN',
        region: 'asia',
        ranges: ['141.101.82.0/23', '162.158.216.0/21'],
    },
    {
        code: 'IN',
        name: 'India',
        nameFa: 'هند',
        flag: '🇮🇳',
        colo: 'BOM',
        region: 'asia',
        ranges: ['162.158.168.0/21', '172.68.80.0/22'],
    },
    {
        code: 'CA',
        name: 'Canada',
        nameFa: 'کانادا',
        flag: '🇨🇦',
        colo: 'YYZ',
        region: 'americas',
        ranges: ['162.158.80.0/21', '172.69.32.0/20'],
    },
    {
        code: 'AU',
        name: 'Australia',
        nameFa: 'استرالیا',
        flag: '🇦🇺',
        colo: 'SYD',
        region: 'asia',
        ranges: ['162.158.176.0/21', '172.69.64.0/20'],
    },
    {
        code: 'BR',
        name: 'Brazil',
        nameFa: 'برزیل',
        flag: '🇧🇷',
        colo: 'GRU',
        region: 'americas',
        ranges: ['162.158.184.0/21', '172.69.96.0/20'],
    },
];

export const POOL_COUNTRY_MAP: Record<string, PoolCountry> = Object.fromEntries(
    POOL_COUNTRIES.map((c) => [c.code, c]),
);

export function findCountry(code: string): PoolCountry | undefined {
    return POOL_COUNTRY_MAP[String(code || '').trim().toUpperCase()];
}

/** Every geo-tagged prefix plus the published anycast set — used by AUTO. */
export function allPoolRanges(): string[] {
    const set = new Set<string>(CLOUDFLARE_RANGES);
    for (const country of POOL_COUNTRIES) {
        for (const range of country.ranges) set.add(range);
    }
    return [...set];
}

export function rangesFor(code: string): string[] {
    const country = findCountry(code);
    if (!country || country.code === 'AUTO') return allPoolRanges();
    return country.ranges.length ? country.ranges : allPoolRanges();
}

/**
 * Public view of a country — no CIDR list (the picker does not need it,
 * and shipping every prefix to the browser on every panel load is waste).
 */
export function publicCountries(): Array<Omit<PoolCountry, 'ranges'>> {
    return POOL_COUNTRIES.map(({ ranges: _ranges, ...rest }) => rest);
}

const IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)$/;

export const isPoolAddress = (value: string): boolean => IPV4.test(value);

/**
 * Build the candidate list for one scan round.
 *
 * Previous winners for the same country are prepended so a good IP is not
 * thrown away the next time the operator rescans.
 */
export function candidatesFor(
    code: string,
    count: number,
    previous: string[] = [],
): string[] {
    const want = Math.max(1, Math.min(48, Math.floor(count)));
    const kept = previous.filter(isPoolAddress).slice(0, 8);
    const fresh = sampleFromRanges(want, rangesFor(code));
    const out: string[] = [];
    const seen = new Set<string>();
    for (const ip of [...kept, ...fresh]) {
        if (seen.has(ip)) continue;
        seen.add(ip);
        out.push(ip);
        if (out.length >= want) break;
    }
    return out;
}
