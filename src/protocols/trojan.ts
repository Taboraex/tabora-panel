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
 * Trojan request layout:
 *
 *   [56]  hex(SHA-224(password))
 *   [2]   CRLF
 *   [1]   command (1 = CONNECT, 3 = UDP ASSOCIATE)
 *   [1]   address type (1 = IPv4, 3 = domain, 4 = IPv6)
 *   [..]  address
 *   [2]   port (big endian)
 *   [2]   CRLF
 *   [..]  payload
 */

/* SHA-224 — not provided by WebCrypto, so implemented here. */
const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export function sha224Hex(message: string): string {
    const H = new Uint32Array([
        0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939,
        0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4,
    ]);

    const msg = new TextEncoder().encode(message);
    const bitLength = msg.length * 8;
    const paddedLength = (((msg.length + 8) >> 6) + 1) << 6;
    const buffer = new Uint8Array(paddedLength);
    buffer.set(msg);
    buffer[msg.length] = 0x80;

    const view = new DataView(buffer.buffer);
    view.setUint32(paddedLength - 4, bitLength >>> 0, false);
    view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);

    const w = new Uint32Array(64);
    const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

    for (let offset = 0; offset < paddedLength; offset += 64) {
        for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false);
        for (let i = 16; i < 64; i++) {
            const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
            const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
            w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
        }

        let [a, b, c, d, e, f, g, h] = H;

        for (let i = 0; i < 64; i++) {
            const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
            const ch = (e & f) ^ (~e & g);
            const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
            const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const temp2 = (S0 + maj) >>> 0;

            h = g; g = f; f = e;
            e = (d + temp1) >>> 0;
            d = c; c = b; b = a;
            a = (temp1 + temp2) >>> 0;
        }

        H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0;
        H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
        H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0;
        H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }

    // SHA-224 truncates to the first 7 words.
    return Array.from(H.slice(0, 7), (word) => word.toString(16).padStart(8, '0')).join('');
}

interface ParsedTrojan {
    hasError: boolean;
    message?: string;
    addressRemote?: string;
    portRemote?: number;
    rawDataIndex?: number;
}

function parseHeader(buffer: Uint8Array, passwordHashes: Set<string>): ParsedTrojan {
    if (buffer.byteLength < 60) {
        return { hasError: true, message: 'header too short' };
    }

    const hash = new TextDecoder().decode(buffer.slice(0, 56));
    if (!passwordHashes.has(hash)) {
        return { hasError: true, message: 'unknown credential' };
    }

    if (buffer[56] !== 0x0d || buffer[57] !== 0x0a) {
        return { hasError: true, message: 'malformed header' };
    }

    const command = buffer[58];
    if (command !== 1) {
        return { hasError: true, message: 'only CONNECT is supported' };
    }

    let index = 59;
    const addressType = buffer[index];
    index += 1;

    let addressRemote = '';

    switch (addressType) {
        case 1: // IPv4
            addressRemote = Array.from(buffer.slice(index, index + 4)).join('.');
            index += 4;
            break;

        case 3: { // domain
            const length = buffer[index];
            index += 1;
            addressRemote = new TextDecoder().decode(buffer.slice(index, index + length));
            index += length;
            break;
        }

        case 4: { // IPv6
            const view = new DataView(buffer.buffer, buffer.byteOffset + index, 16);
            const groups: string[] = [];
            for (let i = 0; i < 8; i++) groups.push(view.getUint16(i * 2).toString(16));
            addressRemote = `[${groups.join(':')}]`;
            index += 16;
            break;
        }

        default:
            return { hasError: true, message: `invalid address type ${addressType}` };
    }

    const portRemote = (buffer[index] << 8) | buffer[index + 1];
    index += 2;

    // Skip trailing CRLF.
    if (buffer[index] === 0x0d && buffer[index + 1] === 0x0a) index += 2;

    return { hasError: false, addressRemote, portRemote, rawDataIndex: index };
}

export async function handleTrojan(
    request: Request,
    settings: Settings,
    passwordHashes: Set<string>,
): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    server.binaryType = 'arraybuffer';

    let address = '';
    let port = 0;
    const log = (message: string, extra?: unknown) => {
        if (settings.logLevel === 'none') return;
        console.log(`[tr ${address}:${port}] ${message}`, extra ?? '');
    };

    const earlyData = request.headers.get('sec-websocket-protocol') ?? '';
    const readable = makeWebSocketStream(server, earlyData, log);
    const remote: SocketWrapper = { value: null };

    readable
        .pipeTo(
            new WritableStream<Uint8Array>({
                async write(chunk) {
                    if (remote.value) {
                        const writer = remote.value.writable.getWriter();
                        await writer.write(chunk);
                        writer.releaseLock();
                        return;
                    }

                    const parsed = parseHeader(chunk, passwordHashes);
                    if (parsed.hasError) throw new Error(parsed.message);

                    address = parsed.addressRemote!;
                    port = parsed.portRemote!;
                    const payload = chunk.slice(parsed.rawDataIndex!);

                    // Trojan has no response header — stream bytes verbatim.
                    await handleTCPOutbound(
                        remote, address, port, payload, server, null, settings, log,
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
