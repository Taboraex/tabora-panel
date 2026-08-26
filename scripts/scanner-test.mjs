/**
 * Scanner test.
 *
 * Exercises the scan API against a deployed panel and verifies that applying
 * results actually changes the settings the config generator reads from.
 *
 * Usage: node scripts/scanner-test.mjs <baseUrl> <securePath> <password>
 */
const [, , BASE, PATH, PASSWORD] = process.argv;

if (!BASE || !PATH || !PASSWORD) {
    console.error('Usage: node scripts/scanner-test.mjs <baseUrl> <securePath> <password>');
    process.exit(1);
}

const root = `${BASE.replace(/\/$/, '')}/${PATH}`;
let cookie = '';
let failed = 0;

const check = (label, condition, detail = '') => {
    if (condition) {
        console.log(`  ok   ${label}${detail ? `  ${detail}` : ''}`);
    } else {
        failed++;
        console.log(`  FAIL ${label}${detail ? `  ${detail}` : ''}`);
    }
};

async function api(path, init = {}) {
    const res = await fetch(`${root}${path}`, {
        ...init,
        headers: { 'content-type': 'application/json', cookie, ...(init.headers ?? {}) },
        redirect: 'manual',
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    const text = await res.text();
    try { return { status: res.status, body: JSON.parse(text) }; }
    catch { return { status: res.status, body: text }; }
}

console.log(`\nScanner test against ${root}\n`);

await api('/login', { method: 'POST', body: JSON.stringify({ password: PASSWORD }) });

/* ── relay scan ── */
const relay = await api('/api/scan', {
    method: 'POST',
    body: JSON.stringify({ source: 'relay', mode: 'tcp', timeoutMs: 5000, concurrency: 6 }),
});
const r = relay.body?.body ?? {};
check('relay scan returns results', Array.isArray(r.results) && r.results.length > 0,
    `${r.results?.length ?? 0} probed`);
check('relay scan finds healthy relays', (r.healthy ?? 0) > 0,
    `${r.healthy}/${r.scanned} healthy, median ${r.medianLatency}ms`);
check('healthy relays report a real latency',
    (r.results ?? []).filter((x) => x.ok).every((x) => x.latency > 0));
check('results are sorted fastest-first',
    (r.results ?? []).filter((x) => x.ok).every((x, i, a) => i === 0 || a[i - 1].latency <= x.latency));

/* ── Cloudflare edges must be refused, not silently empty ── */
const edge = await api('/api/scan', {
    method: 'POST',
    body: JSON.stringify({ source: 'sample', mode: 'tcp' }),
});
check('worker refuses to scan Cloudflare edges', edge.status === 400,
    `status ${edge.status}`);

/* ── country-pool routes are gone ── */
check('country pool meta is gone', (await api('/api/scan/pool')).status === 404);
check('country pool candidates are gone',
    (await api('/api/scan/pool/candidates?country=TR')).status === 404);

/* ── browser candidate list ── */
const cand = await api('/api/scan/candidates');
const c = cand.body?.body ?? {};
check('candidates endpoint returns domains', Array.isArray(c.domains) && c.domains.length > 0,
    `${c.domains?.length ?? 0} domains`);
check('candidates endpoint returns sampled IPs', Array.isArray(c.sample) && c.sample.length > 0,
    `${c.sample?.length ?? 0} IPs`);
check('sampled IPs are well-formed',
    (c.sample ?? []).every((ip) => /^(\d{1,3}\.){3}\d{1,3}$/.test(ip)));
check('sampled IPs stay off colo interconnects',
    !(c.sample ?? []).some((ip) =>
        ip.startsWith('104.22.') || ip.startsWith('104.23.') || ip.startsWith('172.64.')));
check('sampled IPs include at least one verified seed',
    (c.sample ?? []).some((ip) => ip === '104.21.83.62' || ip === '104.16.10.10'));
check('candidates return a multi-wave plan', Array.isArray(c.waves) && c.waves.length >= 2,
    `${c.waves?.length ?? 0} waves`);
check('every wave address is a Worker-front IPv4',
    (c.waves ?? []).every((w) => (w.addresses ?? []).every((ip) => /^(\d{1,3}\.){3}\d{1,3}$/.test(ip))));
check('probesPerIp is set', (c.probesPerIp ?? 0) >= 3);

const expanded = await api('/api/scan/expand?around=104.21.83.62,104.16.10.10&count=12');
const ex = expanded.body?.body ?? {};
check('expand returns neighbour IPs', Array.isArray(ex.addresses) && ex.addresses.length > 0,
    `${ex.addresses?.length ?? 0} neighbours`);
check('neighbours stay off colo interconnects',
    !(ex.addresses ?? []).some((ip) => ip.startsWith('104.22.') || ip.startsWith('104.23.')));

const ranked = await api('/api/scan/rank', {
    method: 'POST',
    body: JSON.stringify({
        keep: 8,
        measurements: [
            { address: '104.16.10.10', samples: [40, 42, 41, 43, 40] },
            { address: '104.17.147.22', samples: [90, 92, 88, 91, 89] },
            { address: '104.18.26.90', samples: [30, -1, 32, -1, 31] },
            { address: '104.23.181.10', samples: [10, 11, 12, 10, 11] },
        ],
    }),
});
const rk = ranked.body?.body ?? {};
check('rank returns healthy rows', (rk.healthy ?? 0) >= 2, `${rk.healthy} healthy`);
check('rank drops colo interconnects',
    !(rk.ranked ?? []).some((r) => String(r.address).startsWith('104.23.')));
check('rank drops lossy IPs',
    !(rk.ranked ?? []).some((r) => r.address === '104.18.26.90'));

/* ── apply changes what configs are built from ── */
const applied = await api('/api/scan', {
    method: 'POST',
    body: JSON.stringify({ source: 'relay', mode: 'tcp', timeoutMs: 5000, apply: true, keep: 2 }),
});
check('apply reports success', applied.body?.body?.applied === true);

const settings = await api('/api/settings');
const proxyIPs = settings.body?.body?.settings?.proxyIPs ?? {};
const proxyList = settings.body?.body?.settings?.proxyIPs ?? [];
check('applied relays are persisted to settings', proxyList.length > 0 && proxyList.length <= 2,
    JSON.stringify(proxyList));

/* ── IPv4 clean IPs become one config each ── */
const coloApply = await api('/api/scan/apply', {
    method: 'POST',
    body: JSON.stringify({ addresses: ['104.23.181.10', '172.70.112.10'] }),
});
check('colo interconnect IPs are rejected by clean-IP apply', coloApply.status === 400,
    `status ${coloApply.status}`);

const appliedFronts = await api('/api/scan/apply', {
    method: 'POST',
    body: JSON.stringify({ addresses: ['104.21.83.62', '104.16.10.10'] }),
});
check('Worker-front IPv4s are accepted', appliedFronts.body?.body?.applied === true);

const lockedSub = await fetch(`${root}/sub?format=plain`);
const lockedText = await lockedSub.text();
check('fixed IPv4 appears in generated configs', lockedText.includes('104.21.83.62'));
check('fixed IPv4 is the server address', /@104\.21\.83\.62:/.test(lockedText));
check('fixed IPv4 URI allows insecure', /allowInsecure=1/.test(lockedText));
const uriLines = lockedText.split('\n').filter((l) => l.includes('://'));
check('IPv4 cleanIPs emit one config per IP (not ports×protocols)',
    uriLines.length === 2, `got ${uriLines.length}`);
check('fixed configs stay on port 443',
    uriLines.every((l) => /:443[/?]/.test(l)));

/* ── domain clean IPs still reach generated configs ── */
const marker = 'scanner-test.example';
await api('/api/scan/apply', { method: 'POST', body: JSON.stringify({ addresses: [marker] }) });
const sub = await fetch(`${root}/sub`, { headers: { cookie } });
const subText = await sub.text();
const decoded = /^[A-Za-z0-9+/=\s]+$/.test(subText.trim())
    ? Buffer.from(subText, 'base64').toString()
    : subText;
check('scanned clean domain appears in generated configs', decoded.includes(marker));

console.log(failed ? `\n  ${failed} failed\n` : `\n  all scanner checks passed\n`);
process.exit(failed ? 1 : 0);
