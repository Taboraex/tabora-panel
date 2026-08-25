import { connect } from 'cloudflare:sockets';
import {
    WS_READY_STATE_OPEN,
    WS_READY_STATE_CLOSING,
} from '@config/constants';
import { pickRandom, parseHostPort, isIPv4 } from '@common/utils';
import { safeError } from '@common/http';
import { Settings } from '#types/settings';

export interface SocketWrapper {
    value: Socket | null;
}

type Logger = (message: string, extra?: unknown) => void;

/* ------------------------------------------------------------------ NAT64 */

/**
 * Map an IPv4 literal into a NAT64 prefix so the Worker can reach hosts that
 * refuse direct connections from Cloudflare's egress range.
 */
export function ipv4ToNat64(ipv4: string, prefix: string): string | null {
    if (!isIPv4(ipv4)) return null;
    const parts = ipv4.split('.').map(Number);
    const hex = parts.map((n) => n.toString(16).padStart(2, '0'));
    const base = prefix.replace(/[[\]]/g, '').replace(/:+$/, '');
    return `[${base}:${hex[0]}${hex[1]}:${hex[2]}${hex[3]}]`;
}

async function resolveToIPv4(host: string): Promise<string | null> {
    if (isIPv4(host)) return host;
    try {
        const res = await fetch(`https://1.1.1.1/dns-query?name=${encodeURIComponent(host)}&type=A`, {
            headers: { Accept: 'application/dns-json' },
        });
        const data = (await res.json()) as { Answer?: Array<{ type: number; data: string }> };
        const record = data.Answer?.find((a) => a.type === 1);
        return record?.data ?? null;
    } catch {
        return null;
    }
}

/* ------------------------------------------------------------ TCP outbound */

/**
 * Open a TCP connection to the destination and pump bytes both ways.
 *
 * Strategy: try a direct dial first. If the remote sends nothing back — the
 * usual signature of a blocked egress — retry through a ProxyIP or a NAT64
 * mapped address, per the panel's configured mode.
 */
export async function handleTCPOutbound(
    remote: SocketWrapper,
    address: string,
    port: number,
    firstChunk: Uint8Array,
    webSocket: WebSocket,
    responseHeader: Uint8Array | null,
    settings: Settings,
    log: Logger,
): Promise<void> {
    async function connectAndWrite(host: string, targetPort: number): Promise<Socket> {
        const socket = connect({ hostname: host, port: targetPort });
        remote.value = socket;
        log(`connected → ${host}:${targetPort}`);
        const writer = socket.writable.getWriter();
        await writer.write(firstChunk);
        writer.releaseLock();
        return socket;
    }

    async function retry(): Promise<void> {
        let host = address;
        let targetPort = port;

        if (settings.proxyIpMode === 'proxyip' && settings.proxyIPs.length) {
            const candidate = pickRandom(settings.proxyIPs);
            const parsed = parseHostPort(candidate);
            host = parsed.host || address;
            targetPort = parsed.port || port;
            log(`direct dial failed, retrying via ProxyIP ${host}:${targetPort}`);
        } else if (settings.proxyIpMode === 'nat64' && settings.nat64Prefixes.length) {
            const ipv4 = await resolveToIPv4(address);
            const mapped = ipv4 ? ipv4ToNat64(ipv4, pickRandom(settings.nat64Prefixes)) : null;
            if (!mapped) {
                closeWebSocket(webSocket, 1011, 'NAT64 mapping failed');
                return;
            }
            host = mapped;
            log(`direct dial failed, retrying via NAT64 ${host}`);
        } else {
            closeWebSocket(webSocket, 1011, 'Connection failed');
            return;
        }

        try {
            const socket = await connectAndWrite(host, targetPort);
            socket.closed.catch(() => {}).finally(() => closeWebSocket(webSocket));
            await pipeRemoteToWebSocket(socket, webSocket, responseHeader, null, log);
        } catch (error) {
            log('retry failed', safeError(error));
            closeWebSocket(webSocket, 1011, 'Retry failed');
        }
    }

    try {
        const socket = await connectAndWrite(address, port);
        await pipeRemoteToWebSocket(socket, webSocket, responseHeader, retry, log);
    } catch (error) {
        log('initial dial failed', safeError(error));
        await retry();
    }
}

/** Stream the remote socket back to the client, prefixing the protocol header. */
async function pipeRemoteToWebSocket(
    socket: Socket,
    webSocket: WebSocket,
    responseHeader: Uint8Array | null,
    retry: (() => Promise<void>) | null,
    log: Logger,
): Promise<void> {
    let header = responseHeader;
    let sawData = false;

    try {
        await socket.readable.pipeTo(
            new WritableStream({
                async write(chunk: Uint8Array, controller) {
                    sawData = true;
                    if (webSocket.readyState !== WS_READY_STATE_OPEN) {
                        controller.error('client socket closed');
                        return;
                    }

                    if (header) {
                        // First frame carries the protocol response header.
                        const merged = new Uint8Array(header.byteLength + chunk.byteLength);
                        merged.set(header, 0);
                        merged.set(chunk, header.byteLength);
                        webSocket.send(merged);
                        header = null;
                    } else {
                        webSocket.send(chunk);
                    }
                },
                abort(reason) {
                    log('remote readable aborted', reason);
                },
            }),
        );
    } catch (error) {
        log('remote → ws pipe error', safeError(error));
        closeSocket(socket);
        closeWebSocket(webSocket);
    }

    if (!sawData && retry) {
        log('no data from remote, retrying');
        await retry();
    }
}

/* ------------------------------------------------------------ WS inbound */

/**
 * Wrap the inbound WebSocket in a ReadableStream, seeding it with any early
 * data smuggled through the Sec-WebSocket-Protocol header (0-RTT).
 */
export function makeWebSocketStream(
    webSocket: WebSocket,
    earlyDataHeader: string,
    log: Logger,
): ReadableStream<Uint8Array> {
    let cancelled = false;

    return new ReadableStream<Uint8Array>({
        start(controller) {
            webSocket.addEventListener('message', (event: MessageEvent) => {
                if (cancelled) return;
                controller.enqueue(new Uint8Array(event.data as ArrayBuffer));
            });

            webSocket.addEventListener('close', () => {
                closeWebSocket(webSocket);
                if (cancelled) return;
                controller.close();
            });

            webSocket.addEventListener('error', (err) => {
                log('websocket error');
                controller.error(err);
            });

            const { earlyData, error } = decodeEarlyData(earlyDataHeader);
            if (error) controller.error(error);
            else if (earlyData) controller.enqueue(earlyData);
        },

        cancel(reason) {
            if (cancelled) return;
            cancelled = true;
            log('readable stream cancelled', reason);
            closeWebSocket(webSocket);
        },
    });
}

function decodeEarlyData(header: string): { earlyData?: Uint8Array; error?: Error } {
    if (!header) return {};
    try {
        const normalized = header.replace(/-/g, '+').replace(/_/g, '/');
        const binary = atob(normalized);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return { earlyData: bytes };
    } catch (error) {
        return { error: error as Error };
    }
}

/* -------------------------------------------------------------- teardown */

export function closeWebSocket(socket: WebSocket, code?: number, reason?: string): void {
    try {
        if (
            socket.readyState === WS_READY_STATE_OPEN ||
            socket.readyState === WS_READY_STATE_CLOSING
        ) {
            if (code) socket.close(code, reason);
            else socket.close();
        }
    } catch {
        /* already closed */
    }
}

export function closeSocket(socket: Socket | null): void {
    try {
        socket?.close();
    } catch {
        /* already closed */
    }
}
