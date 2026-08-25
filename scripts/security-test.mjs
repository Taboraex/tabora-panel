/**
 * Security test.
 *
 * Verifies the hardening that protects a deployed panel: login throttling,
 * security headers, session handling, and that protected routes really are
 * protected. Run against a *deployed* worker — local dev has no persistent
 * store, so throttling is intentionally inactive there.
 *
 * Usage: node scripts/security-test.mjs <baseUrl> <securePath> <password>
 */
const [, , BASE, PATH, PASSWORD] = process.argv;

if (!BASE || !PATH || !PASSWORD) {
    console.error('Usage: node scripts/security-test.mjs <baseUrl> <securePath> <password>');
    process.exit(1);
}

const root = `${BASE.replace(/\/$/, '')}/${PATH}`;
let failed = 0;

const check = (label, ok, detail = '') => {
    if (ok) console.log(`  ok   ${label}${detail ? `  ${detail}` : ''}`);
    else { failed++; console.log(`  FAIL ${label}${detail ? `  ${detail}` : ''}`); }
};

const login = (password) =>
    fetch(`${root}/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
        redirect: 'manual',
    });

console.log(`\nSecurity test against ${root}\n`);

/* ── security headers ── */
const page = await fetch(`${root}/login`);
const csp = page.headers.get('content-security-policy') ?? '';

check('sends Content-Security-Policy', csp.length > 0);
check('CSP forbids framing', csp.includes("frame-ancestors 'none'"));
check('CSP locks base-uri', csp.includes("base-uri 'none'"));
check('sends X-Frame-Options: DENY', page.headers.get('x-frame-options') === 'DENY');
check('sends X-Content-Type-Options: nosniff',
    page.headers.get('x-content-type-options') === 'nosniff');
check('sends Referrer-Policy', (page.headers.get('referrer-policy') ?? '').length > 0);
check('sends HSTS', (page.headers.get('strict-transport-security') ?? '').includes('max-age='));

/* ── session cookie hardening ── */
const good = await login(PASSWORD);
const cookie = good.headers.get('set-cookie') ?? '';

check('valid password signs in', good.status === 200, `status ${good.status}`);
check('session cookie is HttpOnly', /HttpOnly/i.test(cookie));
check('session cookie is Secure', /Secure/i.test(cookie));
check('session cookie is SameSite=Strict', /SameSite=Strict/i.test(cookie));

/* ── protected routes reject anonymous callers ── */
for (const route of ['/api/settings', '/api/users', '/api/logs', '/api/scan']) {
    const res = await fetch(`${root}${route}`, { redirect: 'manual' });
    check(`${route} rejects anonymous access`, res.status === 401 || res.status === 405,
        `status ${res.status}`);
}

/* ── a forged session cookie is refused ── */
const forged = await fetch(`${root}/api/settings`, {
    headers: { cookie: 'tabora_session=forged.token.value' },
    redirect: 'manual',
});
check('forged session cookie is rejected', forged.status === 401, `status ${forged.status}`);

/* ── login throttling ── */
console.log('\n  probing login throttle (this takes a moment)…');
let blockedAt = 0;
for (let i = 1; i <= 12; i++) {
    const res = await login(`wrong-password-${i}`);
    if (res.status === 429) { blockedAt = i; break; }
}
check('repeated wrong passwords get throttled', blockedAt > 0,
    blockedAt ? `blocked after ${blockedAt} attempts` : 'never blocked in 12 tries');

if (blockedAt) {
    const res = await login('another-wrong-one');
    check('throttle sends Retry-After', (res.headers.get('retry-after') ?? '').length > 0);
    // The correct password must also be refused while locked out, otherwise
    // the limiter could be bypassed by simply guessing during the window.
    const stillBlocked = await login(PASSWORD);
    check('correct password is also blocked while locked out', stillBlocked.status === 429,
        `status ${stillBlocked.status}`);
}

console.log(failed ? `\n  ${failed} failed\n` : `\n  all security checks passed\n`);
process.exit(failed ? 1 : 0);
