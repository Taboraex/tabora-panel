import {
    WORKER_FRONT_RANGES, WORKER_FRONT_SEEDS, sampleFromRanges, isWorkerFrontIp,
} from './candidates';

/**
 * Country catalogue for the Proxy IP Pool.
 *
 * Cloudflare anycast is one network. A "Turkey IP" in a geolocation database
 * is often a colo interconnect that does not front Workers at all — those
 * were the 104.23 / 172.70 addresses that scanned "fine" from the browser
 * (TCP opened) and then produced configs that never pinged.
 *
 * Every country therefore samples the same *working* HTTP anycast blocks.
 * From the operator's network the fastest ones *are* the route to that
 * region (Istanbul from Iran, FRA from Europe). The country code is the
 * label stamped on the config.
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

const FRONT = [...WORKER_FRONT_RANGES];

export const POOL_COUNTRIES: PoolCountry[] = [
    {
        code: 'AUTO',
        name: 'Best for me',
        nameFa: 'بهترین برای من',
        flag: '⚡',
        colo: '*',
        region: 'auto',
        featured: true,
        ranges: FRONT,
    },
    {
        code: 'TR', name: 'Turkey', nameFa: 'ترکیه', flag: '🇹🇷',
        colo: 'IST', region: 'me', featured: true, ranges: FRONT,
    },
    {
        code: 'DE', name: 'Germany', nameFa: 'آلمان', flag: '🇩🇪',
        colo: 'FRA', region: 'eu', featured: true, ranges: FRONT,
    },
    {
        code: 'NL', name: 'Netherlands', nameFa: 'هلند', flag: '🇳🇱',
        colo: 'AMS', region: 'eu', featured: true, ranges: FRONT,
    },
    {
        code: 'AE', name: 'United Arab Emirates', nameFa: 'امارات', flag: '🇦🇪',
        colo: 'DXB', region: 'me', featured: true, ranges: FRONT,
    },
    {
        code: 'GB', name: 'United Kingdom', nameFa: 'انگلستان', flag: '🇬🇧',
        colo: 'LHR', region: 'eu', featured: true, ranges: FRONT,
    },
    {
        code: 'FR', name: 'France', nameFa: 'فرانسه', flag: '🇫🇷',
        colo: 'CDG', region: 'eu', featured: true, ranges: FRONT,
    },
    {
        code: 'US', name: 'United States', nameFa: 'آمریکا', flag: '🇺🇸',
        colo: 'SJC', region: 'americas', featured: true, ranges: FRONT,
    },
    {
        code: 'SE', name: 'Sweden', nameFa: 'سوئد', flag: '🇸🇪',
        colo: 'ARN', region: 'eu', ranges: FRONT,
    },
    {
        code: 'FI', name: 'Finland', nameFa: 'فنلاند', flag: '🇫🇮',
        colo: 'HEL', region: 'eu', ranges: FRONT,
    },
    {
        code: 'PL', name: 'Poland', nameFa: 'لهستان', flag: '🇵🇱',
        colo: 'WAW', region: 'eu', ranges: FRONT,
    },
    {
        code: 'IT', name: 'Italy', nameFa: 'ایتالیا', flag: '🇮🇹',
        colo: 'MXP', region: 'eu', ranges: FRONT,
    },
    {
        code: 'ES', name: 'Spain', nameFa: 'اسپانیا', flag: '🇪🇸',
        colo: 'MAD', region: 'eu', ranges: FRONT,
    },
    {
        code: 'AT', name: 'Austria', nameFa: 'اتریش', flag: '🇦🇹',
        colo: 'VIE', region: 'eu', ranges: FRONT,
    },
    {
        code: 'CH', name: 'Switzerland', nameFa: 'سوئیس', flag: '🇨🇭',
        colo: 'ZRH', region: 'eu', ranges: FRONT,
    },
    {
        code: 'JP', name: 'Japan', nameFa: 'ژاپن', flag: '🇯🇵',
        colo: 'NRT', region: 'asia', ranges: FRONT,
    },
    {
        code: 'SG', name: 'Singapore', nameFa: 'سنگاپور', flag: '🇸🇬',
        colo: 'SIN', region: 'asia', ranges: FRONT,
    },
    {
        code: 'HK', name: 'Hong Kong', nameFa: 'هنگ‌کنگ', flag: '🇭🇰',
        colo: 'HKG', region: 'asia', ranges: FRONT,
    },
    {
        code: 'KR', name: 'South Korea', nameFa: 'کره جنوبی', flag: '🇰🇷',
        colo: 'ICN', region: 'asia', ranges: FRONT,
    },
    {
        code: 'IN', name: 'India', nameFa: 'هند', flag: '🇮🇳',
        colo: 'BOM', region: 'asia', ranges: FRONT,
    },
    {
        code: 'CA', name: 'Canada', nameFa: 'کانادا', flag: '🇨🇦',
        colo: 'YYZ', region: 'americas', ranges: FRONT,
    },
    {
        code: 'AU', name: 'Australia', nameFa: 'استرالیا', flag: '🇦🇺',
        colo: 'SYD', region: 'asia', ranges: FRONT,
    },
    {
        code: 'BR', name: 'Brazil', nameFa: 'برزیل', flag: '🇧🇷',
        colo: 'GRU', region: 'americas', ranges: FRONT,
    },
];

export const POOL_COUNTRY_MAP: Record<string, PoolCountry> = Object.fromEntries(
    POOL_COUNTRIES.map((c) => [c.code, c]),
);

export function findCountry(code: string): PoolCountry | undefined {
    return POOL_COUNTRY_MAP[String(code || '').trim().toUpperCase()];
}

export function rangesFor(code: string): string[] {
    const country = findCountry(code);
    return country?.ranges.length ? country.ranges : [...WORKER_FRONT_RANGES];
}

/**
 * Public view of a country — no CIDR list (the picker does not need it,
 * and shipping every prefix to the browser on every panel load is waste).
 */
export function publicCountries(): Array<Omit<PoolCountry, 'ranges'>> {
    return POOL_COUNTRIES.map(({ ranges: _ranges, ...rest }) => rest);
}

const IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)$/;

export const isPoolAddress = (value: string): boolean => IPV4.test(value) && isWorkerFrontIp(value);

/**
 * Build the candidate list for one scan round.
 *
 * Seeds that are known to front a Worker go first, then a fresh sample
 * from the working anycast blocks, then any previous winners that still
 * qualify. Dead colo IPs from the first pool never re-enter the list.
 */
export function candidatesFor(
    code: string,
    count: number,
    previous: string[] = [],
): string[] {
    // Never drop verified seeds to meet a small `count` — those are the
    // IPs known to front a Worker. Extra samples fill the rest of the budget.
    const want = Math.max(
        WORKER_FRONT_SEEDS.length,
        Math.min(48, Math.floor(count) || 32),
    );
    const kept = previous.filter(isPoolAddress).slice(0, 8);
    const extra = Math.max(8, want - WORKER_FRONT_SEEDS.length);
    const fresh = extra > 0 ? sampleFromRanges(extra, rangesFor(code)) : [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const ip of [...WORKER_FRONT_SEEDS, ...kept, ...fresh]) {
        if (!isPoolAddress(ip) || seen.has(ip)) continue;
        seen.add(ip);
        out.push(ip);
        if (out.length >= want) break;
    }
    return out;
}
