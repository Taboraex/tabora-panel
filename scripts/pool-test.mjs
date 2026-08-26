#!/usr/bin/env node
/**
 * Unit tests for Worker-front IP filtering and IPv4-cleanIP fixed configs.
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

const dir = mkdtempSync(join(tmpdir(), 'tabora-pool-'));
const entry = join(dir, 'entry.ts');
const scanner = join(process.cwd(), 'src', 'scanner');
const cores = join(process.cwd(), 'src', 'cores');
const config = join(process.cwd(), 'src', 'config');
writeFileSync(entry, `
export {
    isWorkerFrontIp, isPoolAddress, WORKER_FRONT_SEEDS, WORKER_FRONT_RANGES,
    CLOUDFLARE_RANGES, sampleFromRanges, sampleCloudflareIPs,
} from ${JSON.stringify(join(scanner, 'candidates'))};
export { resolveBuildContext } from ${JSON.stringify(join(cores, 'shared'))};
export { initContext } from ${JSON.stringify(join(config, 'settings'))};
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

console.log('\nWorker-front filter');
check('accepts verified seed 104.21.83.62', m.isWorkerFrontIp('104.21.83.62'));
check('accepts 172.67 seed not in the CIDR list', m.isWorkerFrontIp('172.67.100.100'));
check('rejects Turkey colo 104.23.181.10', m.isWorkerFrontIp('104.23.181.10') === false);
check('rejects 172.70.112.10', m.isWorkerFrontIp('172.70.112.10') === false);
check('rejects 8.19.8.10', m.isWorkerFrontIp('8.19.8.10') === false);
check('rejects 104.22.10.10', m.isWorkerFrontIp('104.22.10.10') === false);
check('isPoolAddress rejects colo interconnect', m.isPoolAddress('104.23.181.10') === false);
check('isPoolAddress accepts a front', m.isPoolAddress('104.16.10.10'));

console.log('\nCandidate sampling');
check('sampleCloudflareIPs default stays in Worker-front ranges',
    m.sampleCloudflareIPs(40).every((ip) => m.isWorkerFrontIp(ip)));
check('sample never emits 104.22 / 104.23 / 172.64',
    !m.sampleCloudflareIPs(80).some((ip) =>
        ip.startsWith('104.22.') || ip.startsWith('104.23.') || ip.startsWith('172.64.')));
check('sample host octets stay in 16–240',
    m.sampleFromRanges(40, m.WORKER_FRONT_RANGES).every((ip) => {
        const host = Number(ip.split('.')[3]);
        return host >= 16 && host <= 240;
    }));
check('CLOUDFLARE_RANGES still lists the official /13s (reference only)',
    m.CLOUDFLARE_RANGES.some((r) => r.startsWith('104.16.0.0/13'))
    && m.CLOUDFLARE_RANGES.some((r) => r.startsWith('172.64.0.0/13')));

console.log('\nIPv4 cleanIPs → one config per IP');
m.initContext(new Request('https://panel.workers.dev/secret/sub'));
const baseSettings = {
    cleanIPs: ['104.17.147.22', '104.16.10.10', '104.21.83.62'],
    ports: [443, 8443, 2053],
    protocols: 'vless,trojan',
    uuid: '11111111-2222-3333-4444-555555555555',
    trojanPassword: 'secretpass',
    maxConfigs: 30,
};
const fixed = m.resolveBuildContext(baseSettings, null);
check('all-IPv4 cleanIPs enable poolFixed', fixed.poolFixed === true);
check('N IPv4s → N addresses', fixed.addresses.length === 3);
check('maxConfigs equals the IP count', fixed.maxConfigs === 3);
check('fixed mode uses a single TLS port', fixed.ports.length === 1 && fixed.ports[0] === 443);
check('fixed mode uses a single protocol', fixed.protocols.length === 1 && fixed.protocols[0] === 'vless');
check('hostname is not injected into the address list', !fixed.addresses.includes('panel.workers.dev'));

const mixed = m.resolveBuildContext({
    ...baseSettings,
    cleanIPs: ['104.17.147.22', 'icook.hk'],
}, null);
check('mixed IPv4 + domain stays cartesian (not poolFixed)', mixed.poolFixed === false);
check('mixed list still includes the hostname fallback', mixed.addresses.includes('panel.workers.dev'));

const domains = m.resolveBuildContext({
    ...baseSettings,
    cleanIPs: ['icook.hk', 'japan.com'],
}, null);
check('domain-only cleanIPs stay cartesian', domains.poolFixed === false);

const empty = m.resolveBuildContext({ ...baseSettings, cleanIPs: [] }, null);
check('empty cleanIPs falls back to the worker hostname',
    empty.poolFixed === false && empty.addresses.includes('panel.workers.dev'));

const userOverride = m.resolveBuildContext(
    { ...baseSettings, cleanIPs: ['icook.hk'] },
    { cleanIPs: ['104.16.10.10', '104.21.83.62'], uuid: baseSettings.uuid },
);
check('per-user IPv4 cleanIPs also lock to poolFixed',
    userOverride.poolFixed === true && userOverride.addresses.length === 2);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
