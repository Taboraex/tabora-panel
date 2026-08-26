#!/usr/bin/env node
/**
 * Unit tests for the Telegram bot API key check.
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

const dir = mkdtempSync(join(tmpdir(), 'tabora-bot-'));
const entry = join(dir, 'entry.ts');
writeFileSync(entry, `
export { timingEqual } from ${JSON.stringify(join(process.cwd(), 'src/handlers/bot.ts'))};
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

console.log('\nBot key comparison');
check('equal keys match', m.timingEqual('abc123', 'abc123'));
check('different keys fail', m.timingEqual('abc123', 'abc124') === false);
check('length mismatch fails', m.timingEqual('abc', 'abcd') === false);
check('empty never matches empty', m.timingEqual('', '') === false);
check('empty never matches a key', m.timingEqual('', 'secret') === false);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
