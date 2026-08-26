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

/* ── browser candidate list ── */
const cand = await api('/api/scan/candidates');
const c = cand.body?.body ?? {};
check('candidates endpoint returns domains', Array.isArray(c.domains) && c.domains.length > 0,
    `${c.domains?.length ?? 0} domains`);
check('candidates endpoint returns sampled IPs', Array.isArray(c.sample) && c.sample.length > 0,
    `${c.sample?.length ?? 0} IPs`);
check('sampled IPs are well-formed',
    (c.sample ?? []).every((ip) => /^(\d{1,3}\.){3}\d{1,3}$/.test(ip)));

/* ── apply changes what configs are built from ── */
const applied = await api('/api/scan', {
    method: 'POST',
    body: JSON.stringify({ source: 'relay', mode: 'tcp', timeoutMs: 5000, apply: true, keep: 2 }),
});
check('apply reports success', applied.body?.body?.applied === true);

const settings = await api('/api/settings');
const proxyIPs = settings.body?.body?.settings?.proxyIPs ?? [];
check('applied relays are persisted to settings', proxyIPs.length > 0 && proxyIPs.length <= 2,
    JSON.stringify(proxyIPs));

/* ── proxy IP pool catalogue ── */
const poolMeta = await api('/api/scan/pool');
const pm = poolMeta.body?.body ?? {};
check('pool meta lists countries', Array.isArray(pm.countries) && pm.countries.length >= 8,
    `${pm.countries?.length ?? 0} countries`);
check('pool meta includes Turkey', (pm.countries ?? []).some((c) => c.code === 'TR'));
check('pool countries do not leak CIDR ranges',
    (pm.countries ?? []).every((c) => c.ranges === undefined));

const trCand = await api('/api/scan/pool/candidates?country=TR&count=16');
const tc = trCand.body?.body ?? {};
check('Turkey candidates return IPv4s', Array.isArray(tc.addresses) && tc.addresses.length > 0,
    `${tc.addresses?.length ?? 0} IPs`);
check('Turkey candidates are well-formed IPv4',
    (tc.addresses ?? []).every((ip) => /^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip)));
check('unknown country is rejected',
    (await api('/api/scan/pool/candidates?country=ZZ')).status === 400);

const rejectedPool = await api('/api/scan/pool/apply', {
    method: 'POST',
    body: JSON.stringify({
        country: 'TR',
        keep: 2,
        lockToPool: true,
        measurements: [
            { address: '104.23.181.10', samples: [10, 12, 11] },
            { address: '172.70.112.10', samples: [8, 9, 7] },
        ],
    }),
});
check('colo interconnect IPs are rejected', rejectedPool.status === 400,
    `status ${rejectedPool.status}`);

const appliedPool = await api('/api/scan/pool/apply', {
    method: 'POST',
    body: JSON.stringify({
        country: 'TR',
        keep: 2,
        lockToPool: true,
        measurements: [
            { address: '104.21.83.62', samples: [42, 45, 40] },
            { address: '104.16.10.10', samples: [90, 88, 95] },
            { address: '104.23.181.10', samples: [5, 5, 5] },
        ],
    }),
});
const ap = appliedPool.body?.body ?? {};
check('pool apply pins the fastest Worker-front IP first', ap.best?.address === '104.21.83.62',
    ap.best?.address ?? 'none');
check('pool apply keeps the requested number of healthy IPs',
    Array.isArray(ap.entries) && ap.entries.length === 2,
    `${ap.entries?.length ?? 0}`);
check('pool apply drops colo interconnects even if they look fast',
    !(ap.entries ?? []).some((e) => e.address.startsWith('104.23.')));
check('pool apply marks the pool enabled', ap.pool?.enabled === true && ap.pool?.country === 'TR');

const lockedSub = await fetch(`${root}/sub?format=plain`);
const lockedText = await lockedSub.text();
check('locked pool IP appears in generated configs', lockedText.includes('104.21.83.62'));
check('locked pool uses the pinned IP as the server address',
    /@104\.21\.83\.62:/.test(lockedText));
check('locked pool URI allows insecure on IP fronts',
    /allowInsecure=1/.test(lockedText));
check('locked pool remark names the country',
    /TR/.test(lockedText));

await api('/api/scan/pool/clear', { method: 'POST' });
const cleared = await api('/api/scan/pool');
check('pool clear empties the pinned list',
    (cleared.body?.body?.pool?.entries ?? ['x']).length === 0);

/* ── clean IPs reach the generated configs ── */
const marker = 'scanner-test.example';
await api('/api/scan/apply', { method: 'POST', body: JSON.stringify({ addresses: [marker] }) });
const sub = await fetch(`${root}/sub`, { headers: { cookie } });
const subText = await sub.text();
const decoded = /^[A-Za-z0-9+/=\s]+$/.test(subText.trim())
    ? Buffer.from(subText, 'base64').toString()
    : subText;
check('scanned clean IP appears in generated configs', decoded.includes(marker));

console.log(failed ? `\n  ${failed} failed\n` : `\n  all scanner checks passed\n`);
process.exit(failed ? 1 : 0);
