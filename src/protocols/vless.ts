import { Settings } from '#types/settings';
import {
    SocketWrapper,
    handleTCPOutbound,
    makeWebSocketStream,
    closeSocket,
    closeWebSocket,
} from './stream';
import { safeError } from '@common/http';

/**
 * VLESS request header layout:
 *
 *   [0]      version
 *   [1..17]  uuid (16 bytes)
 *   [17]     addon length (N)
 *   [18+N]   command (1 = TCP, 2 = UDP)
 *   [.. ]    port (2 bytes, big endian)
 *   [.. ]    address type (1 = IPv4, 2 = domain, 3 = IPv6)
 *   [.. ]    address
 *   [.. ]    payload
 */

interface ParsedHeader {
    hasError: boolean;
    message?: string;
    version?: Uint8Array;
    addressRemote?: string;
    portRemote?: number;
    rawDataIndex?: number;
    isUDP?: boolean;
}

const HEX_BYTES = Array.from({ length: 256 }, (_, i) => (i + 256).toString(16).slice(1));

function bytesToUUID(bytes: Uint8Array, offset = 0): string {
    const h = HEX_BYTES;
    return (
        h[bytes[offset]] + h[bytes[offset + 1]] + h[bytes[offset + 2]] + h[bytes[offset + 3]] + '-' +
        h[bytes[offset + 4]] + h[bytes[offset + 5]] + '-' +
        h[bytes[offset + 6]] + h[bytes[offset + 7]] + '-' +
        h[bytes[offset + 8]] + h[bytes[offset + 9]] + '-' +
        h[bytes[offset + 10]] + h[bytes[offset + 11]] + h[bytes[offset + 12]] +
        h[bytes[offset + 13]] + h[bytes[offset + 14]] + h[bytes[offset + 15]]
    ).toLowerCase();
}

function parseHeader(buffer: Uint8Array, expectedUUIDs: Set<string>): ParsedHeader {
    if (buffer.byteLength < 24) {
        return { hasError: true, message: 'header too short' };
    }

    const version = buffer.slice(0, 1);
    const uuid = bytesToUUID(buffer, 1);
    if (!expectedUUIDs.has(uuid)) {
        return { hasError: true, message: 'unknown credential' };
    }

    const addonLength = buffer[17];
    const commandIndex = 18 + addonLength;
    const command = buffer[commandIndex];

    // 1 = TCP, 2 = UDP (we only allow UDP for DNS), 3 = MUX (unsupported)
    if (command !== 1 && command !== 2) {
        return { hasError: true, message: `unsupported command ${command}` };
    }
    const isUDP = command === 2;

    let index = commandIndex + 1;
    const portRemote = (buffer[index] << 8) | buffer[index + 1];
    index += 2;

    const addressType = buffer[index];
    index += 1;

    let addressRemote = '';
    let addressLength = 0;

    switch (addressType) {
        case 1: // IPv4
            addressLength = 4;
            addressRemote = Array.from(buffer.slice(index, index + 4)).join('.');
            break;

        case 2: // domain
            addressLength = buffer[index];
            index += 1;
            addressRemote = new TextDecoder().decode(buffer.slice(index, index + addressLength));
            break;

        case 3: { // IPv6
            addressLength = 16;
            const view = new DataView(buffer.buffer, buffer.byteOffset + index, 16);
            const groups: string[] = [];
            for (let i = 0; i < 8; i++) groups.push(view.getUint16(i * 2).toString(16));
            addressRemote = `[${groups.join(':')}]`;
            break;
        }

        default:
            return { hasError: true, message: `invalid address type ${addressType}` };
    }

    if (!addressRemote) {
        return { hasError: true, message: 'empty destination address' };
    }

    return {
        hasError: false,
        version,
        addressRemote,
        portRemote,
        rawDataIndex: index + addressLength,
        isUDP,
    };
}

export async function handleVless(
    request: Request,
    settings: Settings,
    uuids: Set<string>,
): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    server.binaryType = 'arraybuffer';

    let address = '';
    let port = 0;
    const log = (message: string, extra?: unknown) => {
        if (settings.logLevel === 'none') return;
        console.log(`[vl ${address}:${port}] ${message}`, extra ?? '');
    };

    const earlyData = request.headers.get('sec-websocket-protocol') ?? '';
    const readable = makeWebSocketStream(server, earlyData, log);

    const remote: SocketWrapper = { value: null };
    let udpWriter: ((chunk: Uint8Array) => Promise<void>) | null = null;
    let isDns = false;

    readable
        .pipeTo(
            new WritableStream<Uint8Array>({
                async write(chunk) {
                    if (isDns && udpWriter) return udpWriter(chunk);

                    if (remote.value) {
                        const writer = remote.value.writable.getWriter();
                        await writer.write(chunk);
                        writer.releaseLock();
                        return;
                    }

                    const parsed = parseHeader(chunk, uuids);
                    if (parsed.hasError) throw new Error(parsed.message);

                    address = parsed.addressRemote!;
                    port = parsed.portRemote!;

                    const responseHeader = new Uint8Array([parsed.version![0], 0]);
                    const payload = chunk.slice(parsed.rawDataIndex!);

                    if (parsed.isUDP) {
                        // Workers cannot open real UDP sockets; only DNS is
                        // supported, tunnelled over DoH.
                        if (port !== 53) throw new Error('UDP is only supported for DNS');
                        isDns = true;
                        udpWriter = await createDnsWriter(server, responseHeader, settings, log);
                        await udpWriter(payload);
                        return;
                    }

                    await handleTCPOutbound(
                        remote, address, port, payload, server, responseHeader, settings, log,
                    );
                },

                close() {
                    closeSocket(remote.value);
                },

                abort(reason) {
                    log('inbound stream aborted', reason);
                    closeSocket(remote.value);
                },
            }),
        )
        .catch((error) => {
            log('pipe failed', safeError(error));
            closeSocket(remote.value);
            closeWebSocket(server);
        });

    return new Response(null, { status: 101, webSocket: client });
}

/**
 * DNS-over-WebSocket bridge: each UDP datagram is length-prefixed, so we buffer
 * and forward every query to the configured DoH resolver.
 */
async function createDnsWriter(
    webSocket: WebSocket,
    responseHeader: Uint8Array,
    settings: Settings,
    log: (m: string, e?: unknown) => void,
): Promise<(chunk: Uint8Array) => Promise<void>> {
    let headerSent = false;

    return async (chunk: Uint8Array) => {
        let index = 0;
        while (index < chunk.byteLength) {
            const length = (chunk[index] << 8) | chunk[index + 1];
            const query = chunk.slice(index + 2, index + 2 + length);
            index += 2 + length;

            try {
                const response = await fetch(settings.remoteDNS, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/dns-message' },
                    body: query,
                });
                const answer = new Uint8Array(await response.arrayBuffer());
                const size = new Uint8Array([answer.byteLength >> 8, answer.byteLength & 0xff]);

                const parts = headerSent
                    ? [size, answer]
                    : [responseHeader, size, answer];
                headerSent = true;

                const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
                const merged = new Uint8Array(total);
                let offset = 0;
                for (const part of parts) {
                    merged.set(part, offset);
                    offset += part.byteLength;
                }
                webSocket.send(merged);
            } catch (error) {
                log('DoH query failed', safeError(error));
            }
        }
    };
}
