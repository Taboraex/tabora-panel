#!/usr/bin/env node
/**
 * Subscription-page regression, in a real browser.
 *
 * The page's whole job is handing a working link to a client app, so the
 * checks here are about the *content* of what each button produces, not just
 * that a button exists. Two bugs this file exists to catch:
 *
 *   - renderTemplate escapes for HTML, so `&` arrives as `&amp;`; a link like
 *     ?gaming=1&format=clash is then broken in every app that receives it.
 *   - `.pill` sets display:inline-block, which outranks the UA [hidden] rule,
 *     so the gaming badge rendered on non-gaming pages.
 *
 * Usage: node scripts/subpage-test.mjs [baseUrl] [securePath] [password]
 */

import { chromium } from 'playwright';

const [, , BASE = 'http://127.0.0.1:8791', SECURE = 'localpath', PASSWORD = 'LocalTest123'] =
    process.argv;

const ROOT = `${BASE}/${SECURE}`;
let passed = 0;
let failed = 0;

const check = (name, cond, detail = '') => {
    if (cond) { passed++; console.log(`  \x1b[32mok  \x1b[0m ${name}`); }
    else { failed++; console.log(`  \x1b[31mFAIL\x1b[0m ${name}${detail ? `  ${detail}` : ''}`); }
};

console.log(`\nSubscription page test against ${ROOT}\n`);

const browser = await chromium.launch();
const ctx = await browser.newContext({
    permissions: ['clipboard-read', 'clipboard-write'],
    viewport: { width: 520, height: 1400 },
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

// Pin a profile so the gaming variant has something to serve.
const api = await ctx.request.post(`${ROOT}/login`, { data: { password: PASSWORD } });
if (api.ok()) {
    await ctx.request.post(`${ROOT}/api/gaming/pin`, {
        data: {
            name: 'RegressionEdge', address: '104.16.5.9', port: 443, protocol: 'vless',
            medianMs: 88, jitterMs: 3, lossPct: 0, grade: 'S',
        },
    });
}

/* ── plain page ─────────────────────────────────────────────────────────── */

await page.goto(`${ROOT}/sub`, { waitUntil: 'networkidle' });

check('page renders the hexagon mark, not a shield',
    (await page.locator('.logo polygon').count()) >= 2);
check('four app tiles are offered',
    (await page.locator('.app[data-app]').count()) === 4);

for (const app of ['hiddify', 'v2rayng', 'v2box', 'happ']) {
    check(`tile present: ${app}`, (await page.locator(`[data-app="${app}"]`).count()) === 1);
}

check('gaming badge hidden on a normal subscription',
    !(await page.locator('#modePill').isVisible()),
    'the .pill display rule must not outrank [hidden]');

/* ── deep links ─────────────────────────────────────────────────────────── */

const deepLinks = await page.evaluate(() => {
    const base = window.TABORA_SUB.sub.replace(/&amp;/g, '&');
    const name = window.TABORA_SUB.name;
    const withFormat = (f) => `${base}${base.includes('?') ? '&' : '?'}format=${f}`;
    return {
        hiddify: `hiddify://install-sub?url=${encodeURIComponent(withFormat('singbox'))}&name=${encodeURIComponent(name)}`,
        v2rayng: `v2rayng://install-sub?url=${encodeURIComponent(withFormat('base64'))}&name=${encodeURIComponent(name)}`,
        v2box: `v2box://install-sub?url=${encodeURIComponent(withFormat('base64'))}&name=${encodeURIComponent(name)}`,
        happ: `happ://add/${withFormat('base64')}`,
    };
});

check('hiddify uses install-sub with an encoded url',
    deepLinks.hiddify.startsWith('hiddify://install-sub?url=http'));
check('v2rayng uses its own scheme', deepLinks.v2rayng.startsWith('v2rayng://install-sub?url='));
check('v2box uses its own scheme', deepLinks.v2box.startsWith('v2box://install-sub?url='));
check('happ takes the url as a path segment, not a query param',
    deepLinks.happ.startsWith('happ://add/http') && !deepLinks.happ.includes('?url='));

// Every deep link must pin a format. Importers fetch with a generic
// WebView/Dart UA and Accept: text/html, which the worker cannot distinguish
// from a browser — without ?format= they were served the HTML status page and
// failed with "unable to determine config format".
check('hiddify deep link requests sing-box', deepLinks.hiddify.includes('format%3Dsingbox'),
    deepLinks.hiddify);
check('v2rayng deep link requests base64', deepLinks.v2rayng.includes('format%3Dbase64'));
check('v2box deep link requests base64', deepLinks.v2box.includes('format%3Dbase64'));
check('happ deep link requests base64', deepLinks.happ.includes('format=base64'));

/* ── the importer must never receive HTML ───────────────────────────────── */

const WEBVIEW =
    'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36';

for (const [format, starts] of [['singbox', '{'], ['base64', 'dmxlc3M'], ['clash', '#']]) {
    const res = await ctx.request.get(`${ROOT}/sub?format=${format}`, {
        headers: { 'User-Agent': WEBVIEW, Accept: 'text/html' },
    });
    const body = (await res.text()).slice(0, 40);
    check(`explicit format=${format} beats browser sniffing`, body.startsWith(starts),
        `got ${body.slice(0, 28)}`);
}

const humanPage = await ctx.request.get(`${ROOT}/sub`, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        Accept: 'text/html',
    },
});
check('a real browser with no format still gets the page',
    (await humanPage.text()).trimStart().startsWith('<!DOCTYPE html'));

/* ── copy actions ───────────────────────────────────────────────────────── */

const readClipboard = () => page.evaluate(() => navigator.clipboard.readText());

const copied = {};
for (const key of ['sub', 'clash', 'singbox', 'vless', 'all']) {
    await page.click(`[data-copy-key="${key}"]`);
    await page.waitForTimeout(700);
    copied[key] = (await readClipboard()).trim();
}

check('copy sub yields the subscription url', copied.sub.startsWith('http'));
check('copy clash yields a clash link', copied.clash.includes('format=clash'));
check('copy singbox yields a singbox link', copied.singbox.includes('format=singbox'));
check('copy VLESS yields a single vless URI', copied.vless.startsWith('vless://'));
check('copy all yields at least one config', copied.all.includes('://'));

// The escaping regression: these must be real ampersands.
for (const key of ['clash', 'singbox']) {
    check(`${key} link has no HTML entities`, !copied[key].includes('&amp;'),
        `got ${copied[key]}`);
}

/* ── QR ─────────────────────────────────────────────────────────────────── */

const qrPainted = () => page.evaluate(() => {
    const c = document.getElementById('qr');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let dark = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] < 128) dark++;
    return dark;
});

check('QR is drawn for the subscription', (await qrPainted()) > 500);
await page.click('[data-qr="vless"]');
await page.waitForTimeout(800);
check('QR redraws for the VLESS config', (await qrPainted()) > 500);

/* ── i18n / RTL ─────────────────────────────────────────────────────────── */

await page.click('#langBtn');
await page.waitForTimeout(400);
check('switches to RTL', (await page.evaluate(() => document.documentElement.dir)) === 'rtl');
check('copy labels are translated',
    (await page.locator('[data-copy-key="sub"] .cbtn-t').textContent()).includes('ساب'));
check('app names stay latin in RTL',
    (await page.locator('[data-app="v2rayng"] .app-name').textContent()).trim() === 'v2rayNG');

await page.click('#langBtn');
await page.waitForTimeout(300);
check('switches back to LTR', (await page.evaluate(() => document.documentElement.dir)) === 'ltr');

/* ── gaming variant ─────────────────────────────────────────────────────── */

await page.goto(`${ROOT}/sub?gaming=1`, { waitUntil: 'networkidle' });
check('gaming badge shows on the gaming subscription',
    await page.locator('#modePill').isVisible());

const gamingLinks = await page.evaluate(() => ({
    sub: window.TABORA_SUB.sub,
    clash: window.TABORA_SUB.clash,
    gaming: window.TABORA_SUB.gaming,
}));
check('gaming flag reaches the page', gamingLinks.gaming === true);
check('gaming flag is preserved in the sub link', gamingLinks.sub.includes('gaming=1'));
check('gaming flag is preserved alongside a format',
    gamingLinks.clash.includes('gaming=1') && gamingLinks.clash.includes('format=clash'));

await page.click('[data-copy-key="vless"]');
await page.waitForTimeout(900);
const pinnedUri = (await readClipboard()).trim();
check('gaming VLESS copy returns the pinned literal IP',
    pinnedUri.includes('104.16.5.9:443'), `got ${pinnedUri.slice(0, 60)}`);

check('no uncaught page errors', errors.length === 0, errors.join(' | '));

await browser.close();

console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
