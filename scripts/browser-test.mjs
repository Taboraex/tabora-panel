/**
 * Browser regression test.
 *
 * Drives a real Chromium against a running panel. The jsdom suite in
 * ui-test.mjs covers markup and wiring; this covers the things only a real
 * engine shows — computed styles, RTL text direction, canvas rendering and
 * modal stacking.
 *
 * Every assertion here corresponds to a bug that shipped: dynamic content
 * staying English after a language switch, UUIDs truncating from the wrong
 * end in RTL, and the QR button navigating away from the current tab.
 *
 * Usage: node scripts/browser-test.mjs [baseUrl] [securePath] [password]
 */
import { chromium } from 'playwright';

const ORIGIN = process.argv[2] || 'http://127.0.0.1:8791';
const PATH = process.argv[3] || 'localpath';
const PASSWORD = process.argv[4] || 'LocalTest123';
const B = `${ORIGIN}/${PATH}`;

let failed = 0;
const check = (label, ok, detail = '') => {
    if (ok) console.log(`  ok   ${label}${detail ? `  ${detail}` : ''}`);
    else { failed++; console.log(`  FAIL ${label}${detail ? `  ${detail}` : ''}`); }
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

console.log(`\nBrowser test against ${B}\n`);

await page.goto(`${B}/login`, { waitUntil: 'networkidle' });
await page.fill('#password', PASSWORD);
await page.click('#submit');
await page.waitForTimeout(2800);

check('signed in and panel rendered', await page.evaluate(() => !!document.querySelector('.tabs, nav, .tab')));

/* ── traffic chart ── */
check('chart renders as inline SVG',
    await page.evaluate(() => !!document.querySelector('#chartBox svg.chart')));
check('chart draws area and line',
    await page.evaluate(() => document.querySelectorAll('#chartBox path').length >= 2));
await page.click('[data-range="7"]');
await page.waitForTimeout(1000);
check('chart range switch works',
    await page.evaluate(() => !!document.querySelector('#chartBox svg.chart')));

/* ── QR opens in place ── */
await page.click('[data-tab="users"]');
await page.waitForTimeout(1200);
const hasUsers = await page.evaluate(() => !!document.querySelector('#userList [data-qr]'));

if (hasUsers) {
    await page.click('#userList [data-qr]');
    await page.waitForTimeout(800);
    check('QR opens a modal', await page.evaluate(() => !document.querySelector('#qrModal').hidden));
    check('QR does not navigate away from Users',
        await page.evaluate(() => document.querySelector('.panel.active').dataset.panel === 'users'));
    check('QR canvas has been drawn',
        await page.evaluate(() => {
            const c = document.querySelector('#qrModalCanvas');
            return !!c && c.width > 0 && c.height > 0;
        }));

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    check('Escape closes the QR modal',
        await page.evaluate(() => document.querySelector('#qrModal').hidden));
    check('rows are clickable once the modal closes',
        await page.evaluate(() => !!document.querySelector('#userList [data-edit]')));
} else {
    console.log('  skip  QR checks — no users on this panel');
}

/* ── Persian / RTL ── */
await page.click('#langBtn');
await page.waitForTimeout(1200);

check('document switches to RTL',
    await page.evaluate(() => document.documentElement.dir === 'rtl'));

if (hasUsers) {
    const listText = await page.$eval('#userList', (el) => el.textContent);
    check('row buttons are translated', !listText.includes('Delete') && listText.includes('حذف'));
    check('status badges are translated', !listText.includes('ACTIVE'));
}

check('search placeholder is translated',
    await page.$eval('#userSearch', (el) => el.placeholder.includes('جستجو')));

await page.click('[data-tab="settings"]');
await page.waitForTimeout(900);
check('identifier fields stay LTR in RTL mode',
    await page.$eval('#fUuid', (el) => getComputedStyle(el).direction) === 'ltr');

check('no uncaught page errors', errors.length === 0, errors.join(' | '));

console.log(failed ? `\n  ${failed} failed\n` : `\n  ${'all browser checks passed'}\n`);
await browser.close();
process.exit(failed ? 1 : 0);
