#!/usr/bin/env node
/**
 * Unit tests for the gaming scoring and config builders.
 *
 * The scoring rules are the whole value of the feature — if ranking picks a
 * jittery edge, the pinned profile is worse than no feature at all. These run
 * the real modules through esbuild rather than reimplementing them.
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

const dir = mkdtempSync(join(tmpdir(), 'tabora-gaming-'));
const entry = join(dir, 'entry.ts');

const src = join(process.cwd(), 'src', 'gaming');
writeFileSync(entry, `
export * from ${JSON.stringify(join(src, 'scoring'))};
export * from ${JSON.stringify(join(src, 'candidates'))};
export { buildGamingClash, buildGamingSingbox, buildGamingUri } from ${JSON.stringify(join(src, 'builder'))};
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

console.log('\nScoring');

// Median / jitter fundamentals
check('median of odd set', m.median([10, 30, 20]) === 20);
check('median of even set', m.median([10, 20, 30, 40]) === 25);
check('median of empty is -1', m.median([]) === -1);
check('jitter of flat set is 0', m.jitter([50, 50, 50, 50]) === 0);
check('jitter grows with spread', m.jitter([10, 200, 15, 190]) > 50);

// A single outlier must not condemn a good edge — this is why MAD is used.
const steady = m.jitter([80, 82, 81, 79, 2000]);
check('single outlier barely moves MAD', steady < 20, `got ${steady}`);

console.log('\nRanking priorities');

const stable = m.summarise('1.1.1.1', 443, [90, 92, 88, 91, 89].map((ms) => ({ ms })));
const jumpy = m.summarise('2.2.2.2', 443, [40, 200, 35, 190, 45].map((ms) => ({ ms })));
check('stable 90ms beats jumpy 40-200ms', stable.score < jumpy.score,
    `stable=${stable.score} jumpy=${jumpy.score}`);

const lossy = m.summarise('3.3.3.3', 443, [30, -1, 32, -1, 31].map((ms) => ({ ms })));
check('40% loss outranked by clean 90ms', stable.score < lossy.score,
    `stable=${stable.score} lossy=${lossy.score}`);
check('loss rate computed', Math.abs(lossy.lossRate - 0.4) < 0.001, `got ${lossy.lossRate}`);

const dead = m.summarise('4.4.4.4', 443, [-1, -1, -1].map((ms) => ({ ms })));
check('all-failed endpoint marked not ok', dead.ok === false);
check('all-failed sorts last', m.rank([dead, stable, jumpy])[0].address === '1.1.1.1');
check('dead endpoint reports -1 median', dead.medianMs === -1);

console.log('\nGrades');
check('fast+steady earns S', m.gradeOf(m.scoreOf(40, 3, 0)) === 'S');
check('jittery cannot earn S', m.gradeOf(m.scoreOf(40, 90, 0)) !== 'S');
check('lossy route grades poorly', ['C', 'D'].includes(m.gradeOf(m.scoreOf(60, 10, 0.3))));

console.log('\nCandidates');
const ips = m.sampleGamingIPs(20);
check('samples requested count', ips.length === 20, `got ${ips.length}`);
check('all samples are IPv4 literals', ips.every(m.isIPv4Literal));
check('samples are unique', new Set(ips).size === ips.length);
check('rejects hostname as literal', m.isIPv4Literal('icook.hk') === false);
check('rejects out-of-range octet', m.isIPv4Literal('999.1.1.1') === false);
check('accepts valid literal', m.isIPv4Literal('104.16.5.9') === true);

console.log('\nConfig builders');

const profile = {
    id: 'p1', name: 'Test', address: '104.16.5.9', port: 443, protocol: 'vless',
    medianMs: 88, jitterMs: 4, lossPct: 0, grade: 'S', pinnedAt: Date.now(),
};

const baseSettings = {
    fingerprint: 'chrome', namePrefix: 'Tabora', logLevel: 'warning',
    enableIPv6: false, localDNS: '8.8.8.8', remoteDNS: 'https://8.8.8.8/dns-query',
    bypassIran: true, bypassLAN: true, blockUDP443: false,
    gaming: { enabled: true, profiles: [profile], lockToProfile: true, bypassRelay: true, splitTunnel: false },
};

const ctx = {
    settings: baseSettings, user: null, hostname: 'panel.workers.dev',
    protocols: ['vless'], ports: [443], addresses: ['panel.workers.dev'],
    uuid: '11111111-2222-3333-4444-555555555555',
    trojanPassword: 'secretpass', maxConfigs: 30,
};

const clash = m.buildGamingClash(ctx, [profile]);
check('clash pins the literal IP', clash.includes('server: 104.16.5.9'));
check('clash skips cert verify for IP fronts', clash.includes('skip-cert-verify: true'));
check('clash emits no url-test when locked', !clash.includes('type: url-test'),
    'a url-test group would let the client switch mid-match');
check('clash disables multiplexing', clash.includes('smux'));
check('clash sets Host to worker domain', clash.includes('panel.workers.dev'));
check('clash header explains the lock', clash.includes('cannot switch mid-match'));

const unlockedCtx = {
    ...ctx,
    settings: { ...baseSettings, gaming: { ...baseSettings.gaming, lockToProfile: false } },
};
check('unlocked config does emit url-test',
    m.buildGamingClash(unlockedCtx, [profile]).includes('type: url-test'));

const sb = JSON.parse(m.buildGamingSingbox(ctx, [profile]));
const outbounds = sb.outbounds.filter((o) => o.type === 'vless');
check('sing-box emits exactly one proxy outbound', outbounds.length === 1, `got ${outbounds.length}`);
check('sing-box pins the literal IP', outbounds[0].server === '104.16.5.9');
check('sing-box marks IP fronts insecure', outbounds[0].tls.insecure === true);
check('sing-box disables multiplex', outbounds[0].multiplex.enabled === false);
check('sing-box has no urltest when locked',
    !sb.outbounds.some((o) => o.type === 'urltest'));

const splitCtx = {
    ...ctx,
    settings: { ...baseSettings, gaming: { ...baseSettings.gaming, splitTunnel: true } },
};
const split = JSON.parse(m.buildGamingSingbox(splitCtx, [profile]));
check('split tunnel makes direct the default', split.route.final === 'direct');

const uri = m.buildGamingUri(ctx, profile);
check('uri targets the literal IP', uri.includes('104.16.5.9:443'));
check('uri carries the worker host', uri.includes('host=panel.workers.dev'));
check('uri is tls on 443', uri.includes('security=tls'));
check('uri allows insecure on IP fronts', uri.includes('allowInsecure=1'));

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
