/**
 * End-to-end proxy test.
 *
 * Speaks real VLESS and Trojan over WebSocket against a deployed panel and
 * pulls a live HTTP page through the tunnel. A 101 handshake alone proves
 * nothing — this verifies bytes actually reach the internet and come back.
 *
 * Stage 2 additionally runs a full HTTPS session over the tunnel and checks
 * the exit IP. That matters because a plain single-shot HTTP fetch can pass
 * while the relay is still broken for anything needing more than one
 * client-to-server write — TLS needs several, so it catches that class of bug.
 *
 * Usage: node scripts/proxy-test.mjs <host> <uuid> <trojanPassword>
 */
import { WebSocket } from 'ws';
import { createHash } from 'node:crypto';
import tls from 'node:tls';
import { Duplex } from 'node:stream';

const [, , HOST, UUID, TROJAN_PASSWORD] = process.argv;

if (!HOST || !UUID) {
    console.error('Usage: node scripts/proxy-test.mjs <host> <uuid> [trojanPassword]');
    process.exit(1);
}

const TARGET_HOST = 'example.com';
const TARGET_PORT = 80;
const TIMEOUT_MS = 20_000;

/* ─────────────────────────────────────────────────────────── encoding ── */

function uuidToBytes(uuid) {
    const hex = uuid.replace(/-/g, '');
    const out = new Uint8Array(16);
    for (let i = 0; i < 16; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
    return out;
}

/** VLESS request header for a TCP CONNECT to host:port. */
function buildVlessHeader(uuid, host, port) {
    const hostBytes = Buffer.from(host, 'utf8');
    const buf = Buffer.alloc(18 + 1 + 2 + 1 + 1 + hostBytes.length);
    let o = 0;
    buf[o++] = 0;                                  // version
    Buffer.from(uuidToBytes(uuid)).copy(buf, o); o += 16;
    buf[o++] = 0;                                  // addon length
    buf[o++] = 1;                                  // command: TCP
    buf.writeUInt16BE(port, o); o += 2;
    buf[o++] = 2;                                  // address type: domain
    buf[o++] = hostBytes.length;
    hostBytes.copy(buf, o);
    return buf;
}

/** Trojan request header: hex(SHA-224(password)) CRLF CMD ATYP ADDR PORT CRLF */
function buildTrojanHeader(password, host, port) {
    const hash = createHash('sha224').update(password).digest('hex');
    const hostBytes = Buffer.from(host, 'utf8');
    const buf = Buffer.alloc(56 + 2 + 1 + 1 + 1 + hostBytes.length + 2 + 2);
    let o = 0;
    buf.write(hash, o, 'ascii'); o += 56;
    buf[o++] = 0x0d; buf[o++] = 0x0a;
    buf[o++] = 1;                                  // CONNECT
    buf[o++] = 3;                                  // domain
    buf[o++] = hostBytes.length;
    hostBytes.copy(buf, o); o += hostBytes.length;
    buf.writeUInt16BE(port, o); o += 2;
    buf[o++] = 0x0d; buf[o++] = 0x0a;
    return buf;
}

const httpRequest = (host) =>
    Buffer.from(
        `GET / HTTP/1.1\r\nHost: ${host}\r\nUser-Agent: tabora-proxy-test\r\nConnection: close\r\n\r\n`,
        'utf8',
    );

/* ─────────────────────────────────────────────────────────────── test ── */

function runProxy({ protocol, host, path, header, skipResponseBytes }) {
    return new Promise((resolve) => {
        const url = (process.env.WS_SCHEME || "wss") + `://${host}${path}`;
        const ws = new WebSocket(url, { handshakeTimeout: 10_000 });
        const chunks = [];
        const started = Date.now();
        let settled = false;

        const finish = (result) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            try { ws.close(); } catch { /* already closed */ }
            resolve({ protocol, ms: Date.now() - started, ...result });
        };

        const timer = setTimeout(() => finish({ ok: false, error: 'timed out' }), TIMEOUT_MS);

        ws.on('open', () => {
            // Header and first payload go in one frame, as real clients do.
            ws.send(Buffer.concat([header, httpRequest(TARGET_HOST)]));
        });

        ws.on('message', (data) => {
            chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data));
            let body = Buffer.concat(chunks);

            // VLESS prefixes the stream with a 2-byte response header.
            if (skipResponseBytes && body.length > skipResponseBytes) {
                body = body.subarray(skipResponseBytes);
            }

            const text = body.toString('latin1');
            if (text.includes('\r\n\r\n') || text.length > 400) {
                const statusLine = text.split('\r\n')[0];
                finish({
                    ok: /^HTTP\/1\.[01] \d{3}/.test(statusLine),
                    status: statusLine.trim(),
                    bytes: body.length,
                    sawHtml: /<html|<!doctype/i.test(text),
                });
            }
        });

        ws.on('error', (err) => finish({ ok: false, error: err.message }));
        ws.on('close', () => finish({ ok: false, error: 'closed before a reply' }));
    });
}

/* ─────────────────────────────────────────────────────────────── main ── */

console.log(`\nProxy test against ${HOST}`);
console.log(`Fetching http://${TARGET_HOST}/ through the tunnel\n`);

const results = [];

results.push(
    await runProxy({
        protocol: 'VLESS',
        host: HOST,
        path: '/vl',
        header: buildVlessHeader(UUID, TARGET_HOST, TARGET_PORT),
        skipResponseBytes: 2,
    }),
);

if (TROJAN_PASSWORD) {
    results.push(
        await runProxy({
            protocol: 'Trojan',
            host: HOST,
            path: '/tr',
            header: buildTrojanHeader(TROJAN_PASSWORD, TARGET_HOST, TARGET_PORT),
            skipResponseBytes: 0,
        }),
    );
}

let failed = 0;
for (const r of results) {
    if (r.ok) {
        console.log(`  ok   ${r.protocol.padEnd(7)} ${r.status}  ${r.bytes} bytes  ${r.ms}ms  html=${r.sawHtml}`);
    } else {
        failed++;
        console.log(`  FAIL ${r.protocol.padEnd(7)} ${r.error ?? 'no valid response'}  ${r.ms}ms`);
    }
}

console.log(`\n  ${results.length - failed}/${results.length} protocols carried real traffic`);

/* ───────────────────────────────────────────────── stage 2: HTTPS + exit IP ── */

/**
 * Run a real TLS session through the tunnel and report the exit IP.
 *
 * Wraps the WebSocket in a Duplex so Node's TLS stack can drive it, validates
 * the certificate chain, then fetches icanhazip.com to learn which address the
 * traffic actually leaves from.
 */
function runHttps({ host, uuid, target = 'icanhazip.com' }) {
    return new Promise((resolve) => {
        const scheme = process.env.WS_SCHEME || 'wss';
        const ws = new WebSocket(`${scheme}://${host}/vl`, { handshakeTimeout: 10_000 });
        const started = Date.now();

        let firstFrame = true;
        let sentHeader = false;
        let settled = false;
        let buf = '';

        const finish = (r) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            try { ws.close(); } catch { /* already closing */ }
            resolve({ protocol: 'HTTPS', ms: Date.now() - started, ...r });
        };

        const timer = setTimeout(() => finish({ ok: false, error: 'timed out' }), TIMEOUT_MS);

        const duplex = new Duplex({
            read() {},
            write(chunk, _enc, cb) {
                // The VLESS header rides along with the ClientHello.
                if (!sentHeader) {
                    ws.send(Buffer.concat([buildVlessHeader(uuid, target, 443), chunk]));
                    sentHeader = true;
                } else {
                    ws.send(chunk);
                }
                cb();
            },
        });

        ws.on('message', (data) => {
            let b = Buffer.from(data);
            if (firstFrame) { b = b.subarray(2); firstFrame = false; }
            if (b.length) duplex.push(b);
        });
        ws.on('error', (err) => finish({ ok: false, error: err.message }));
        ws.on('close', () => duplex.push(null));

        ws.on('open', () => {
            const sock = tls.connect(
                { socket: duplex, servername: target, rejectUnauthorized: true },
                () => {
                    sock.write(
                        `GET / HTTP/1.1\r\nHost: ${target}\r\nConnection: close\r\n\r\n`,
                    );
                },
            );

            sock.on('data', (d) => {
                buf += d.toString('latin1');
                const body = buf.split('\r\n\r\n').slice(1).join('').trim();
                if (body.length >= 7) {
                    finish({
                        ok: /^HTTP\/1\.[01] 200/.test(buf),
                        status: buf.split('\r\n')[0],
                        authorized: sock.authorized,
                        cipher: sock.getCipher()?.name,
                        exitIp: body.slice(0, 45),
                    });
                }
            });
            sock.on('error', (e) => finish({ ok: false, error: `tls: ${e.message}` }));
        });
    });
}

console.log(`\nRunning HTTPS through the tunnel (TLS + exit-IP check)\n`);

const https = await runHttps({ host: HOST, uuid: UUID });

if (https.ok) {
    console.log(`  ok   HTTPS   ${https.status}  cert-valid=${https.authorized}  ${https.cipher}`);
    console.log(`       exit IP ${https.exitIp}  ${https.ms}ms`);
} else {
    failed++;
    console.log(`  FAIL HTTPS   ${https.error ?? 'no valid response'}  ${https.ms}ms`);
}

console.log(
    failed
        ? `\n  ${failed} check(s) failed\n`
        : `\n  all checks passed — tunnel carries real encrypted traffic\n`,
);

process.exit(failed ? 1 : 0);
