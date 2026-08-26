#!/usr/bin/env node
/**
 * Unit tests for the clean-IP wave planner and ranking.
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

const dir = mkdtempSync(join(tmpdir(), 'tabora-scan-'));
const entry = join(dir, 'entry.ts');
const scanner = join(process.cwd(), 'src', 'scanner');

writeFileSync(entry, `
export {
    isWorkerFrontIp, WORKER_FRONT_SEEDS,
} from ${JSON.stringify(join(scanner, 'candidates'))};
export {
    CLEAN_IPS, parseDepth, planScan, flattenPlan, pickCleanIps,
    neighborsOf, expandAround, pickDiverse, clampKeep,
} from ${JSON.stringify(join(scanner, 'strategy'))};
export { COMMUNITY_FRONTS } from ${JSON.stringify(join(scanner, 'community'))};
export { rankClean } from ${JSON.stringify(join(scanner, 'rank'))};
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

console.log('\nCatalogue');
check('CLEAN_IPS is a large Worker-front set', m.CLEAN_IPS.length >= 200, `${m.CLEAN_IPS.length}`);
check('every catalogue IP is a Worker front', m.CLEAN_IPS.every((ip) => m.isWorkerFrontIp(ip)));
check('catalogue never includes colo interconnects',
    !m.CLEAN_IPS.some((ip) =>
        ip.startsWith('104.22.') || ip.startsWith('104.23.') || ip.startsWith('172.64.') || ip.startsWith('8.')));
check('catalogue includes verified seeds',
    m.WORKER_FRONT_SEEDS.every((ip) => m.CLEAN_IPS.includes(ip) || m.isWorkerFrontIp(ip)));
check('community fronts are Worker-front only',
    m.COMMUNITY_FRONTS.length >= 100 && m.COMMUNITY_FRONTS.every((ip) => m.isWorkerFrontIp(ip)),
    `${m.COMMUNITY_FRONTS.length}`);
check('community fronts land in the catalogue',
    m.COMMUNITY_FRONTS.every((ip) => m.CLEAN_IPS.includes(ip)));

console.log('\nPlanner');
check('unknown depth falls back to smart', m.parseDepth('banana') === 'smart');
check('quick / deep are accepted', m.parseDepth('quick') === 'quick' && m.parseDepth('deep') === 'deep');

const smart = m.planScan({ depth: 'smart' });
const ids = smart.map((w) => w.id);
check('smart plan starts with seeds', ids[0] === 'seeds');
check('smart plan has a catalogue wave', ids.includes('catalog'));
check('smart plan has an explore wave', ids.includes('explore'));
check('smart plan has no neighbors (filled after winners)', !ids.includes('neighbors'));
check('every planned address is a Worker front',
    m.flattenPlan(smart).every((ip) => m.isWorkerFrontIp(ip)));

const previous = ['104.21.83.62', '104.16.10.10', 'icook.hk', '104.23.181.10'];
const withMem = m.planScan({ previous, depth: 'quick' });
check('previous Worker-front IPs become the memory wave', withMem[0].id === 'memory');
check('memory wave drops colo and hostnames',
    withMem[0].addresses.includes('104.21.83.62')
    && !withMem[0].addresses.includes('104.23.181.10')
    && !withMem[0].addresses.includes('icook.hk'));
check('quick plan has no explore wave', !withMem.some((w) => w.id === 'explore'));

const deep = m.planScan({ depth: 'deep' });
check('deep catalogue is larger than smart',
    deep.find((w) => w.id === 'catalog').addresses.length
        > smart.find((w) => w.id === 'catalog').addresses.length);
check('plan addresses are unique',
    m.flattenPlan(deep).length === new Set(m.flattenPlan(deep)).size);

const fat = m.planScan({ depth: 'smart', keep: 15 });
const slim = m.planScan({ depth: 'smart', keep: 8 });
check('larger keep grows the catalogue',
    fat.find((w) => w.id === 'catalog').addresses.length
        > slim.find((w) => w.id === 'catalog').addresses.length);
check('clampKeep caps at 30', m.clampKeep(99) === 30 && m.clampKeep(0) === 1);

const picked = m.pickCleanIps(24);
const sixteens = new Set(picked.map((ip) => ip.split('.').slice(0, 2).join('.')));
check('catalogue picks spread across /16s', sixteens.size >= 4, `${sixteens.size} /16s`);

console.log('\nNeighbours');
const near = m.neighborsOf('104.16.10.10', 8);
check('neighbours stay in the same /24', near.every((ip) => ip.startsWith('104.16.10.')));
check('neighbours exclude the origin', !near.includes('104.16.10.10'));
check('neighbours of a 172.67 seed are empty (not a front range)',
    m.neighborsOf('172.67.100.100', 8).length === 0);
const expanded = m.expandAround(['104.21.83.62', '104.16.10.10'], 6, 16);
check('expandAround returns Worker fronts only', expanded.every((ip) => m.isWorkerFrontIp(ip)));
check('expandAround does not repeat the winners',
    !expanded.includes('104.21.83.62') && !expanded.includes('104.16.10.10'));

console.log('\nDiversity');
const mixedNets = [
    { address: '104.16.10.10' },
    { address: '104.16.10.22' },
    { address: '104.17.147.22' },
    { address: '162.159.36.1' },
];
const diverse = m.pickDiverse(mixedNets, 3);
check('pickDiverse prefers a second /24 over a second host',
    diverse.map((r) => r.address).join(',') === '104.16.10.10,104.17.147.22,162.159.36.1');
const same16 = [
    { address: '104.16.10.10' },
    { address: '104.16.80.22' },
    { address: '104.17.147.22' },
];
check('pickDiverse prefers a second /16 over a second /24 in the same /16',
    m.pickDiverse(same16, 2).map((r) => r.address).join(',') === '104.16.10.10,104.17.147.22');

console.log('\nRanking');
const samples = (ok, miss = 0) => [...ok, ...Array(miss).fill(-1)];
const ranked = m.rankClean([
    { address: '104.16.10.10', samples: samples([40, 42, 41, 43, 40]) },
    { address: '104.16.10.22', samples: samples([41, 40, 42, 41, 40]) },
    { address: '104.17.147.22', samples: samples([90, 92, 88, 91, 89]) },
    { address: '104.18.26.90', samples: samples([30, 32], 3) }, // 60% loss
    { address: '104.23.181.10', samples: samples([10, 11, 12, 10, 11]) }, // colo
    { address: 'icook.hk', samples: samples([20, 21, 19, 20, 22]) },
], 8);
check('colo interconnect never ranks', !ranked.some((r) => r.address.startsWith('104.23.')));
check('hostname never ranks', !ranked.some((r) => r.address === 'icook.hk'));
check('lossy IP is not padded into keep', !ranked.some((r) => r.address === '104.18.26.90'));
check('a second /24 is taken before a second host in the same /24',
    ranked[0].address.split('.').slice(0, 3).join('.')
        !== ranked[1].address.split('.').slice(0, 3).join('.'));
check('best is a 104.16.10 host', ranked[0].address.startsWith('104.16.10.'), ranked[0]?.address);
check('keep is not padded past healthy rows', ranked.length === 3, `${ranked.length}`);

const padded = m.rankClean([
    { address: '104.21.83.62', samples: samples([50, 51, 49, 50, 52]) },
], 8);
check('keep is never filled with invented IPs', padded.length === 1);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
