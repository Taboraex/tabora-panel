#!/usr/bin/env node
/**
 * Unit tests for Worker-front IP filtering, clean-IP catalogue and scan waves.
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
const src = join(process.cwd(), 'src', 'scanner');
writeFileSync(entry, `
export { isWorkerFrontIp, WORKER_FRONT_SEEDS, sampleFromRanges, WORKER_FRONT_RANGES } from ${JSON.stringify(join(src, 'candidates'))};
export { candidatesFor, isPoolAddress, findCountry, POOL_COUNTRIES } from ${JSON.stringify(join(src, 'countries'))};
export { rankPool, pickPoolWinners, isPoolHealthy } from ${JSON.stringify(join(src, 'pool'))};
export { CLEAN_IPS, CLEAN_HOSTS } from ${JSON.stringify(join(src, 'catalog'))};
export { planScan, pickCleanIps, neighborsOf, expandAround, pickDiverse, flattenPlan } from ${JSON.stringify(join(src, 'strategy'))};
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

console.log('\nCountry catalogue');
check('Turkey still exists as a label', m.findCountry('TR')?.code === 'TR');
check('every country samples the same front ranges',
    m.POOL_COUNTRIES.every((c) => JSON.stringify(c.ranges) === JSON.stringify(m.WORKER_FRONT_RANGES)));
check('no country still carries 104.22/104.23',
    !m.POOL_COUNTRIES.some((c) => (c.ranges ?? []).some((r) => r.includes('104.22') || r.includes('104.23'))));

console.log('\nClean IP catalogue');
check('catalogue is non-trivial', m.CLEAN_IPS.length >= 80, `got ${m.CLEAN_IPS.length}`);
check('every catalogue IP is a Worker front', m.CLEAN_IPS.every((ip) => m.isWorkerFrontIp(ip)));
check('catalogue never includes colo interconnects',
    !m.CLEAN_IPS.some((ip) => ip.startsWith('104.22.') || ip.startsWith('104.23.') || ip.startsWith('172.70.')));
check('catalogue includes verified seeds',
    m.WORKER_FRONT_SEEDS.every((ip) => m.CLEAN_IPS.includes(ip)));
const picked = m.pickCleanIps(24);
const sixteens = new Set(picked.map((ip) => ip.split('.').slice(0, 2).join('.')));
check('picked clean IPs spread across several /16s', sixteens.size >= 4, [...sixteens].join(','));

console.log('\nWaves');
const quick = m.planScan({ previous: [], depth: 'quick', ranges: m.WORKER_FRONT_RANGES });
const smart = m.planScan({ previous: ['104.17.147.22'], depth: 'smart', ranges: m.WORKER_FRONT_RANGES });
check('quick scan has a catalog wave', quick.some((w) => w.id === 'catalog' && w.addresses.length > 0));
check('quick scan skips explore', !quick.some((w) => w.id === 'explore'));
check('smart scan starts with previous winners', smart[0]?.id === 'memory' && smart[0].addresses[0] === '104.17.147.22');
check('smart scan includes explore', smart.some((w) => w.id === 'explore'));
check('waves never emit 104.23',
    !m.flattenPlan(smart).some((ip) => ip.startsWith('104.23.')));

const near = m.neighborsOf('104.17.147.22', 6);
check('neighbours stay in the same /24', near.every((ip) => ip.startsWith('104.17.147.')));
check('neighbours are Worker fronts', near.every((ip) => m.isPoolAddress(ip)));
check('neighbours do not repeat the origin', !near.includes('104.17.147.22'));
const expanded = m.expandAround(['104.17.147.22', '104.16.10.10'], 4, 10);
check('expandAround stays under the cap', expanded.length <= 10);
check('expandAround does not re-list winners',
    !expanded.includes('104.17.147.22') && !expanded.includes('104.16.10.10'));

console.log('\nCandidates');
const tr = m.candidatesFor('TR', 16);
check('Turkey scan returns IPs', tr.length > 0, `got ${tr.length}`);
check('Turkey scan never emits 104.23', !tr.some((ip) => ip.startsWith('104.23.')));
check('Turkey scan leads with a known seed', m.WORKER_FRONT_SEEDS.includes(tr[0]));
check('even a small count still includes every verified seed',
    m.WORKER_FRONT_SEEDS.every((ip) => m.candidatesFor('TR', 8).includes(ip)));
check('sample host octets stay in 16–240',
    m.sampleFromRanges(40, m.WORKER_FRONT_RANGES).every((ip) => {
        const host = Number(ip.split('.')[3]);
        return host >= 16 && host <= 240;
    }));

console.log('\nRanking');
const ranked = m.rankPool([
    { address: '104.21.83.62', samples: [40, 41, 42] },
    { address: '104.16.10.10', samples: [90, 88, 95] },
    { address: '104.16.50.50', samples: [5, 5, 5] },
    { address: '104.23.181.10', samples: [1, 1, 1] },
    { address: '104.18.26.90', samples: [5, -1, -1] },
], 'TR', 2);
check('keep=2 pins two IPs', ranked.length === 2, `got ${ranked.length}`);
check('colo interconnects never rank', !ranked.some((r) => r.address.startsWith('104.23.')));
check('lossy seed is not pinned just because it had one fast sample',
    !ranked.some((r) => r.address === '104.18.26.90'));
check('verified seeds win over a faster random sample when enough seeds are healthy',
    ranked.every((r) => m.WORKER_FRONT_SEEDS.includes(r.address)));
check('fastest healthy seed is first', ranked[0]?.address === '104.21.83.62', ranked[0]?.address);

const lossyOnly = m.rankPool([
    { address: '104.16.50.50', samples: [5, -1, -1] },
    { address: '104.21.83.62', samples: [40, 41, 42] },
], 'TR', 3);
check('lossy random IPs do not fill keep',
    lossyOnly.length === 1 && lossyOnly[0].address === '104.21.83.62',
    lossyOnly.map((r) => r.address).join(','));

const diverse = m.pickDiverse([
    { address: '104.16.10.10' },
    { address: '104.16.10.22' },
    { address: '104.17.147.22' },
], 2);
check('diversity prefers a second /24 over a second host in the same /24',
    diverse[0].address === '104.16.10.10' && diverse[1].address === '104.17.147.22');

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
