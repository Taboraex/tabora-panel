#!/usr/bin/env node
/**
 * Unit tests for Worker-front IP filtering and country-pool sampling.
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

console.log('\nCandidates');
const tr = m.candidatesFor('TR', 16);
check('Turkey scan returns IPs', tr.length > 0, `got ${tr.length}`);
check('Turkey scan never emits 104.23', !tr.some((ip) => ip.startsWith('104.23.')));
check('Turkey scan leads with a known seed', m.WORKER_FRONT_SEEDS.includes(tr[0]));
check('sample host octets stay in 16–240',
    m.sampleFromRanges(40, m.WORKER_FRONT_RANGES).every((ip) => {
        const host = Number(ip.split('.')[3]);
        return host >= 16 && host <= 240;
    }));

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
