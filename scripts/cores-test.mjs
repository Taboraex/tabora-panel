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
export { uniqueLabel, renderRemark } from ${JSON.stringify(join(src, 'shared'))};
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

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
