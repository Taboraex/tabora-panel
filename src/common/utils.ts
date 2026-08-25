import { BYTES_PER_REQUEST, GB } from '@config/constants';

/* ---------------------------------------------------------------- encoding */

export function base64Encode(str: string): string {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
}

export function base64Decode(b64: string): string {
    return new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
}

export async function gunzipBase64(b64: string): Promise<string> {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).text();
}

/* ------------------------------------------------------------------ crypto */

export function randomHex(bytes: number): string {
    const buf = new Uint8Array(bytes);
    crypto.getRandomValues(buf);
    return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomUUID(): string {
    return crypto.randomUUID();
}

export async function sha256Hex(input: string): Promise<string> {
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Derive a stable UUIDv4-shaped identifier from an arbitrary secret, so a panel
 * works without the operator having to pick a UUID by hand.
 */
export async function deriveUUID(seed: string): Promise<string> {
    const hash = await sha256Hex(seed);
    return [
        hash.slice(0, 8),
        hash.slice(8, 12),
        '4' + hash.slice(13, 16),
        ((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16) + hash.slice(17, 20),
        hash.slice(20, 32),
    ].join('-');
}

export function isValidUUID(uuid: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}

/* -------------------------------------------------------------- validation */

export const isIPv4 = (v: string): boolean =>
    /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)$/.test(v);

export const isIPv6 = (v: string): boolean =>
    /^\[?(?:[a-fA-F0-9]{0,4}:){2,7}[a-fA-F0-9]{0,4}\]?$/.test(v);

export const isDomain = (v: string): boolean =>
    /^(?:[a-zA-Z0-9_](?:[a-zA-Z0-9-_]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(v);

export function isValidUrl(v: string): boolean {
    try {
        new URL(v);
        return true;
    } catch {
        return false;
    }
}

/** Split a "host:port" / "[v6]:port" pair. Port is 0 when absent. */
export function parseHostPort(input: string): { host: string; port: number } {
    const match = input.match(/^(?<host>\[.*?\]|[^:]+)(?::(?<port>\d+))?$/);
    if (!match?.groups?.host) return { host: input, port: 0 };
    return { host: match.groups.host, port: Number(match.groups.port ?? 0) };
}

/* ------------------------------------------------------------- collections */

/** Parse a comma/newline separated textarea into a clean array. */
export function parseList(input: string | string[] | undefined | null): string[] {
    if (!input) return [];
    const raw = Array.isArray(input) ? input.join('\n') : input;
    return raw
        .split(/[,\n\r]+/)
        .map((s) => s.trim())
        .filter(Boolean);
}

export function parsePorts(input: string | number[] | undefined | null): number[] {
    if (!input) return [];
    const raw = Array.isArray(input) ? input : parseList(input).map(Number);
    return [...new Set(raw.map(Number).filter((n) => Number.isInteger(n) && n > 0 && n < 65536))];
}

export const pickRandom = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function shuffle<T>(arr: T[]): T[] {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

/* ------------------------------------------------------------- formatting */

export function formatBytes(bytes: number, decimals = 2): string {
    if (!bytes || bytes < 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** i).toFixed(decimals)} ${units[i]}`;
}

export const gbToBytes = (gb: number): number => Math.floor(gb * GB);
export const bytesToGb = (bytes: number): number => bytes / GB;
export const requestsToBytes = (reqs: number): number => Math.floor(reqs * BYTES_PER_REQUEST);

export const todayKey = (): string => new Date().toISOString().slice(0, 10);

export function formatDate(ms: number): string {
    if (!ms) return '—';
    return new Date(ms).toISOString().slice(0, 10);
}

export function daysFromNow(days: number): number {
    return Date.now() + days * 24 * 60 * 60 * 1000;
}

/* ------------------------------------------------------------- prototypes */

if (!Array.prototype.concatIf) {
    Object.defineProperty(Array.prototype, 'concatIf', {
        value: function <T>(this: T[], condition: boolean, ...items: T[]): T[] {
            return condition ? this.concat(items) : [...this];
        },
        enumerable: false,
    });
}
