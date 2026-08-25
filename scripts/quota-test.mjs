/*
 * The bug: opening a panel returned
 *   {"success":false,"status":500,"message":"KV put() limit exceeded for the day."}
 *
 * loadSettings persisted a copy on first read, and that write was not guarded,
 * so once KV's daily write quota was gone the page could not render at all.
 * Assert the two guards that make a read path survive a dead store.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
    if (cond) { console.log(`  \x1b[32mok  \x1b[0m ${name}`); pass++; }
    else { console.log(`  \x1b[31mFAIL\x1b[0m ${name}${detail ? ' — ' + detail : ''}`); fail++; }
};

console.log('\nStorage quota resilience');

const db = readFileSync(join(process.cwd(), 'src', 'storage', 'db.ts'), 'utf8');

// Isolate the KV branch of put(): it must not be able to throw.
const putBody = db.slice(db.indexOf('async put('), db.indexOf('async putJSON('));
const kvBranch = putBody.slice(putBody.indexOf('if (this.env.KV)'));
check('put() guards the KV write', /try\s*{/.test(kvBranch) && /catch/.test(kvBranch));

const delBody = db.slice(db.indexOf('async delete('), db.indexOf('raw SQL'));
const kvDel = delBody.slice(delBody.indexOf('if (this.env.KV)'));
check('delete() guards the KV write', /try\s*{/.test(kvDel) && /catch/.test(kvDel));

const settings = readFileSync(join(process.cwd(), 'src', 'config', 'settings.ts'), 'utf8');
const persist = settings.slice(
    settings.indexOf('Persist the first materialised copy'),
    settings.indexOf('return settings;'),
);
check('loading settings does not fail when the store rejects a write',
    /try\s*{/.test(persist) && /catch/.test(persist));

// D1 is what gives the panel real write headroom; the fallback must remain.
check('D1 is preferred when bound', /if \(this\.env\.DB\)/.test(putBody));
check('KV remains the fallback', /if \(this\.env\.KV\)/.test(putBody));

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
