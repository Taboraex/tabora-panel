import { isWorkerFrontIp } from './candidates';

export interface CommunityIpItem {
    ip: string;
    operator?: string;
    provider?: string;
}

export interface OperatorInfo {
    code: string;
    nameFa: string;
    nameEn: string;
    count: number;
}

export const KNOWN_OPERATORS: Record<string, { nameFa: string; nameEn: string }> = {
    MCI: { nameFa: 'همراه اول', nameEn: 'MCI (Hamrah Aval)' },
    MTN: { nameFa: 'ایرانسل', nameEn: 'Irancell' },
    RTL: { nameFa: 'رایتل', nameEn: 'Rightel' },
    SHT: { nameFa: 'شاتل', nameEn: 'Shatel' },
    MKH: { nameFa: 'مخابرات', nameEn: 'Mokhaberat' },
    MBT: { nameFa: 'مخابرات (مبین‌نت)', nameEn: 'Mobinnet' },
    AST: { nameFa: 'آسیاتک', nameEn: 'Asiatech' },
    PRS: { nameFa: 'پارس آنلاین', nameEn: 'ParsOnline' },
    ZTL: { nameFa: 'زیتل', nameEn: 'ZiTEL' },
    HWB: { nameFa: 'های‌وب', nameEn: 'HiWeb' },
    RSP: { nameFa: 'رسپینا', nameEn: 'Respina' },
    FNP: { nameFa: 'فن‌آوا', nameEn: 'Fanava' },
    ALL: { nameFa: 'همه اپراتورها', nameEn: 'All Operators' },
};

export const DEFAULT_REPO_URL =
    'https://raw.githubusercontent.com/vfarid/cf-clean-ips/main/list.json';

/**
 * Fetch Cloudflare Clean IPs from external community repositories (e.g. vfarid/cf-clean-ips).
 * Supports JSON structure with `ipv4` array or plain text files.
 */
export async function fetchCommunityIps(options: {
    url?: string;
    operator?: string;
    timeoutMs?: number;
} = {}): Promise<{
    ips: string[];
    items: CommunityIpItem[];
    operators: OperatorInfo[];
    total: number;
    provider: string;
}> {
    const url = (options.url || DEFAULT_REPO_URL).trim();
    const targetOperator = (options.operator || 'ALL').toUpperCase();
    const timeoutMs = options.timeoutMs ?? 10_000;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Tabora-Panel/0.16' },
        });

        clearTimeout(timer);

        if (!res.ok) {
            throw new Error(`Repository returned status ${res.status}`);
        }

        const text = await res.text();
        const items: CommunityIpItem[] = [];
        const seen = new Set<string>();
        const opCounts = new Map<string, number>();

        // Check if JSON response
        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
            try {
                const parsed = JSON.parse(text);
                const rawList: Array<any> = Array.isArray(parsed)
                    ? parsed
                    : Array.isArray(parsed.ipv4)
                        ? parsed.ipv4
                        : Array.isArray(parsed.ips)
                            ? parsed.ips
                            : [];

                for (const row of rawList) {
                    const rawIp = typeof row === 'string' ? row : row?.ip || row?.address;
                    if (!rawIp) continue;
                    const ip = String(rawIp).trim().replace(/:(\d{1,5})$/, '');

                    if (!isWorkerFrontIp(ip)) continue;

                    const op = (typeof row === 'object' && row?.operator
                        ? String(row.operator).toUpperCase()
                        : 'ALL').trim();

                    opCounts.set(op, (opCounts.get(op) ?? 0) + 1);

                    if (targetOperator !== 'ALL' && op !== targetOperator) continue;

                    if (!seen.has(ip)) {
                        seen.add(ip);
                        items.push({
                            ip,
                            operator: op,
                            provider: typeof row === 'object' ? row?.provider : undefined,
                        });
                    }
                }
            } catch {
                // Parse failed as JSON, fall back to line parsing
                parseTextLines(text, targetOperator, seen, items, opCounts);
            }
        } else {
            parseTextLines(text, targetOperator, seen, items, opCounts);
        }

        const ips = items.map((i) => i.ip);

        // Build operators list with counts
        const operators: OperatorInfo[] = [];
        for (const [code, count] of opCounts.entries()) {
            const known = KNOWN_OPERATORS[code] ?? { nameFa: code, nameEn: code };
            operators.push({
                code,
                nameFa: known.nameFa,
                nameEn: known.nameEn,
                count,
            });
        }
        operators.sort((a, b) => b.count - a.count);

        return {
            ips,
            items,
            operators,
            total: ips.length,
            provider: url.includes('vfarid') ? 'vfarid/cf-clean-ips' : 'Custom Repository',
        };
    } catch (error) {
        clearTimeout(timer);
        throw error;
    }
}

function parseTextLines(
    text: string,
    targetOperator: string,
    seen: Set<string>,
    items: CommunityIpItem[],
    opCounts: Map<string, number>,
) {
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
        const cleaned = line.trim();
        if (!cleaned || cleaned.startsWith('#') || cleaned.startsWith('//')) continue;
        const parts = cleaned.split(/[\s,]+/);
        const ip = parts[0]?.replace(/:(\d{1,5})$/, '').trim();
        if (!ip || !isWorkerFrontIp(ip)) continue;

        const op = parts[1] ? parts[1].toUpperCase() : 'ALL';
        opCounts.set(op, (opCounts.get(op) ?? 0) + 1);

        if (targetOperator !== 'ALL' && op !== targetOperator) continue;

        if (!seen.has(ip)) {
            seen.add(ip);
            items.push({ ip, operator: op });
        }
    }
}
