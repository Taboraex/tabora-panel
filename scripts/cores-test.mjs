#!/usr/bin/env node
/**
 * Config-builder tests. Hiddify parses the sing-box JSON and refuses a
 * duplicate outbound tag — that is the failure this file exists to catch.
 */
import { build } from 'esbuild';
import { writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

let passed = 0;
let failed = 0;
const check = (name, cond, detail = '') => {
    if (cond) { passed++; console.log(`  \x1b[32m✔\x1b[0m ${name}`); }
    else { failed++; console.log(`  \x1b[31m✘\x1b[0m ${name}${detail ? ` — ${detail}` : ''}`); }
};

const dir = mkdtempSync(join(tmpdir(), 'tabora-cores-'));
const entry = join(dir, 'entry.ts');
const src = join(process.cwd(), 'src', 'cores');
writeFileSync(entry, `
export { uniqueLabel, renderRemark, preferTlsPort, preferProtocol, resolveFixedFronts } from ${JSON.stringify(join(src, 'shared'))};
export { buildSingboxConfig } from ${JSON.stringify(join(src, 'singbox'))};
export { buildClashConfig } from ${JSON.stringify(join(src, 'clash'))};
export { buildUriList } from ${JSON.stringify(join(src, 'uri'))};
`);

const out = join(dir, 'bundle.mjs');
await build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    outfile: out,
    absWorkingDir: process.cwd(),
    tsconfig: 'tsconfig.json',
    define: { VERSION: '"test"' },
    logLevel: 'silent',
});

const m = await import(out);

console.log('\nuniqueLabel');
{
    const used = new Set();
    const a = m.uniqueLabel('⚡ AUTO Tabora-1 · 104.17.147.22', used, 'VL');
    const b = m.uniqueLabel('⚡ AUTO Tabora-1 · 104.17.147.22', used, 'TR');
    check('first claim keeps the base name', a === '⚡ AUTO Tabora-1 · 104.17.147.22');
    check('second claim appends the protocol hint', b === '⚡ AUTO Tabora-1 · 104.17.147.22 · TR');
    check('the two labels differ', a !== b);
    const c = m.uniqueLabel('⚡ AUTO Tabora-1 · 104.17.147.22', used, 'TR');
    check('third claim keeps incrementing', c === '⚡ AUTO Tabora-1 · 104.17.147.22 · 2');
}

console.log('\nsing-box / Clash (the 0.7.1 Hiddify crash)');

const collidingTemplate = '{FLAG} {COUNTRY} {PREFIX}-{INDEX} · {ADDRESS}';
const settings = {
    fingerprint: 'chrome', namePrefix: 'Tabora', logLevel: 'warning',
    enableIPv6: false, localDNS: '8.8.8.8', remoteDNS: 'https://8.8.8.8/dns-query',
    bypassIran: false, bypassLAN: false, blockAds: false, blockPorn: false,
    blockUDP443: false, customBypassRules: [], customBlockRules: [],
    enableECH: false, echServerName: '',
    nameTemplate: collidingTemplate,
};

const ctx = {
    settings, user: null, hostname: 'panel.workers.dev',
    protocols: ['vless', 'trojan'], ports: [443],
    addresses: ['104.17.147.22'],
    uuid: '11111111-2222-3333-4444-555555555555',
    trojanPassword: 'secretpass', maxConfigs: 30,
    poolCountry: 'AUTO', poolFlag: '⚡',
    poolFixed: false,
};

const sb = JSON.parse(m.buildSingboxConfig(ctx));
const proxyOut = sb.outbounds.filter((o) => o.server);
const tags = sb.outbounds.map((o) => o.tag);
check('sing-box emits one outbound per protocol', proxyOut.length === 2, `got ${proxyOut.length}`);
check('sing-box outbound tags are unique', new Set(tags).size === tags.length, tags.join(' | '));
check('selector references only existing tags',
    sb.outbounds.find((o) => o.type === 'selector').outbounds.every((t) => tags.includes(t)));

const clash = m.buildClashConfig(ctx);
const names = [...clash.matchAll(/^- name: (.+)$/gm)].map((x) => x[1].replace(/^"|"$/g, ''));
check('clash proxy names are unique', new Set(names).size === names.length, names.join(' | '));

const uris = m.buildUriList(ctx);
const hashes = uris.map((u) => decodeURIComponent((u.split('#')[1] || '')));
check('uri remarks are unique', new Set(hashes).size === hashes.length, hashes.join(' | '));

console.log('\nnew default template already unique');
const uniqueCtx = {
    ...ctx,
    settings: { ...settings, nameTemplate: '{FLAG} {COUNTRY} {PREFIX}-{INDEX} · {PROTOCOL} · {ADDRESS}' },
};
const sb2 = JSON.parse(m.buildSingboxConfig(uniqueCtx));
const tags2 = sb2.outbounds.filter((o) => o.server).map((o) => o.tag);
check('VL and TR both present in remarks', tags2.some((t) => t.includes('VL')) && tags2.some((t) => t.includes('TR')));
check('still unique with protocol in the template', new Set(tags2).size === tags2.length);

console.log('\nfixed pool: N IPs → N configs');
check('preferTlsPort picks 443 when present', m.preferTlsPort([8443, 443, 2053]) === 443);
check('preferTlsPort falls back to first TLS', m.preferTlsPort([8443, 2053]) === 8443);
check('preferProtocol prefers VLESS', m.preferProtocol(['trojan', 'vless']) === 'vless');

const poolCtx = {
    ...ctx,
    poolFixed: true,
    protocols: ['vless'],
    ports: [443],
    addresses: ['104.17.147.22', '104.16.10.10', '104.21.83.62'],
    maxConfigs: 3,
    poolCountry: 'TR',
    poolFlag: '🇹🇷',
};

const sbPool = JSON.parse(m.buildSingboxConfig(poolCtx));
const poolProxies = sbPool.outbounds.filter((o) => o.server);
check('sing-box emits exactly 3 proxy outbounds for 3 IPs', poolProxies.length === 3, `got ${poolProxies.length}`);
check('each pool IP appears once',
    ['104.17.147.22', '104.16.10.10', '104.21.83.62'].every((ip) => poolProxies.filter((o) => o.server === ip).length === 1));
check('pool configs skip urltest so the client cannot hop IPs',
    !sbPool.outbounds.some((o) => o.type === 'urltest'));
check('selector default is the first pinned IP tag',
    sbPool.outbounds.find((o) => o.type === 'selector')?.default === poolProxies[0].tag);

const clashPool = m.buildClashConfig(poolCtx);
const clashServers = [...clashPool.matchAll(/^\s+server: (\S+)/gm)].map((x) => x[1]);
check('clash emits exactly 3 proxies for 3 IPs', clashServers.length === 3, `got ${clashServers.length}`);
check('clash pool config has no url-test group', !/type: url-test/.test(clashPool));

const uriPool = m.buildUriList(poolCtx);
check('URI list is one line per IP', uriPool.length === 3, `got ${uriPool.length}`);
check('URI list does not also emit Trojan for the same IPs',
    uriPool.every((u) => u.startsWith('vless://')));

const cartesian = {
    ...poolCtx,
    poolFixed: false,
    protocols: ['vless', 'trojan'],
    ports: [443, 8443],
    maxConfigs: 30,
};
check('without poolFixed the cartesian product still runs',
    m.buildUriList(cartesian).length === 12);

const fifteen = Array.from({ length: 15 }, (_, i) => `104.16.${i}.10`);
const ctx15 = { ...poolCtx, addresses: fifteen, maxConfigs: 15 };
check('15 IPs emit 15 URIs', m.buildUriList(ctx15).length === 15, `${m.buildUriList(ctx15).length}`);
check('15 IPs emit 15 sing-box proxies',
    JSON.parse(m.buildSingboxConfig(ctx15)).outbounds.filter((o) => o.server).length === 15);
check('15 worker fronts ignore leftover domains',
    m.resolveFixedFronts([...fifteen, 'icook.hk', 'japan.com']).length === 15);
check('colo interconnects never become fixed fronts',
    m.resolveFixedFronts(['104.23.181.10', '104.16.10.10']).join(',') === '104.16.10.10');

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
