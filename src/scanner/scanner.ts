import { connect } from 'cloudflare:sockets';
import { safeError } from '@common/http';

/**
 * Clean-IP scanner.
 *
 * Probes candidate Cloudflare edge addresses and reports which ones actually
 * accept connections and how quickly. Results feed the panel's clean-IP list,
 * so generated configs point at edges that work from the operator's network
 * rather than a hardcoded guess.
 *
 * Two probe depths:
 *   - `tcp`  opens a socket and measures time to connect. Cheap, ~1 subrequest.
 *   - `tls`  additionally completes a TLS handshake and sends an HTTP request,
 *            confirming the edge really serves traffic and is not a black hole.
 */

export type ProbeMode = 'tcp' | 'tls';

export interface ProbeResult {
    address: string;
    port: number;
    ok: boolean;
    /** Round-trip in milliseconds. -1 when the probe failed. */
    latency: number;
    /** Populated on failure so the panel can explain what went wrong. */
    error?: string;
    /** Cloudflare colo that answered, when it could be determined. */
    colo?: string;
}

export interface ScanTarget {
    host: string;
    port: number;
}

export interface ScanOptions {
    targets: ScanTarget[];
    mode: ProbeMode;
    /** Wall-clock budget for the whole batch. Leftover targets are marked skipped. */
    budgetMs?: number;
    /** How many probes run at once. Kept small to stay inside CPU limits. */
    concurrency: number;
    /** Per-probe ceiling in milliseconds. */
    timeoutMs: number;
}

const DEFAULT_TIMEOUT = 3000;

/** Race a promise against a timer so one slow edge cannot stall the batch. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
        ),
    ]);
}

/** Open a TCP socket and measure how long the connection takes. */
async function probeTcp(address: string, port: number, timeoutMs: number): Promise<ProbeResult> {
    const started = Date.now();
    let socket: Socket | undefined;

    try {
        socket = connect({ hostname: address, port });
        // `opened` resolves once the transport is established.
        await withTimeout(socket.opened, timeoutMs, 'connect');
        const latency = Date.now() - started;
        return { address, port, ok: true, latency };
    } catch (error) {
        return { address, port, ok: false, latency: -1, error: safeError(error) };
    } finally {
        try { await socket?.close(); } catch { /* already gone */ }
    }
}

/**
 * Full probe: TLS handshake plus a minimal HTTP request.
 *
 * A plain TCP connect can succeed against an edge that then refuses to serve
 * anything. Sending a real request and reading a reply is the only way to know
 * the address is genuinely usable.
 */
async function probeTls(address: string, port: number, timeoutMs: number): Promise<ProbeResult> {
    const started = Date.now();
    let socket: Socket | undefined;

    try {
        socket = connect({ hostname: address, port }, { secureTransport: 'on', allowHalfOpen: false });
        await withTimeout(socket.opened, timeoutMs, 'tls handshake');

        const writer = socket.writable.getWriter();
        await writer.write(
            new TextEncoder().encode(
                // cdn-cgi/trace is served by every Cloudflare edge and names the colo.
                `GET /cdn-cgi/trace HTTP/1.1\r\nHost: ${address}\r\n` +
                `User-Agent: tabora-scanner\r\nConnection: close\r\n\r\n`,
            ),
        );
        writer.releaseLock();

        const reader = socket.readable.getReader();
        const { value } = await withTimeout(reader.read(), timeoutMs, 'read');
        reader.releaseLock();

        const latency = Date.now() - started;
        const text = new TextDecoder().decode(value ?? new Uint8Array());
        const served = /^HTTP\/1\.[01] \d{3}/.test(text);
        const colo = text.match(/colo=([A-Z]{3})/)?.[1];

        return served
            ? { address, port, ok: true, latency, colo }
            : { address, port, ok: false, latency: -1, error: 'no HTTP response' };
    } catch (error) {
        return { address, port, ok: false, latency: -1, error: safeError(error) };
    } finally {
        try { await socket?.close(); } catch { /* already gone */ }
    }
}

/** Run probes with bounded concurrency and return every result. */
export async function scan(options: ScanOptions): Promise<ProbeResult[]> {
    const { targets, mode, concurrency, timeoutMs = DEFAULT_TIMEOUT } = options;

    const probe = mode === 'tls' ? probeTls : probeTcp;
    const queue = [...targets];
    const results: ProbeResult[] = [];

    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
        for (;;) {
            const target = queue.shift();
            if (!target) return;
            results.push(await probe(target.host, target.port, timeoutMs));
        }
    });

    await Promise.all(workers);

    // Fastest working addresses first; failures last.
    return results.sort((a, b) => {
        if (a.ok !== b.ok) return a.ok ? -1 : 1;
        return a.latency - b.latency;
    });
}

/** Keep only healthy results, best first, capped at `limit`. */
export function pickBest(results: ProbeResult[], limit: number): ProbeResult[] {
    return results.filter((r) => r.ok).slice(0, limit);
}
