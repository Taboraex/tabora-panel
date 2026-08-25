/**
 * Browser-level UI test.
 *
 * Loads the login and panel pages in a real DOM and drives them the way a
 * person does — type a password, click Sign in — rather than calling the API
 * directly. This catches the class of bug where the HTTP layer is perfectly
 * healthy but the page's JavaScript never runs, so every button is inert.
 *
 * Usage: node scripts/ui-test.mjs <baseUrl> <securePath> <password>
 */
import { JSDOM, VirtualConsole } from 'jsdom';

const [, , BASE = 'http://127.0.0.1:8787', SECURE = 'tabora', PASSWORD = 'ci-test-password'] =
    process.argv;

const PATH = `/${SECURE}`;
const pass = [];
const fail = [];
const check = (name, ok) => (ok ? pass : fail).push(name);

/** Build a DOM that talks to the live worker and records what the page does. */
function makeDom(html, url, cookieJar) {
    const notes = [];
    const virtualConsole = new VirtualConsole();
    let navigatedTo = null;

    virtualConsole.on('jsdomError', (error) => {
        // jsdom refuses real navigation; treat that as "the page tried to go".
        if (/navigation/i.test(error.message)) navigatedTo = 'ATTEMPTED';
        else notes.push(error.message.split('\n')[0]);
    });

    const dom = new JSDOM(html, {
        url,
        runScripts: 'dangerously',
        pretendToBeVisual: true,
        virtualConsole,
        beforeParse(win) {
            win.fetch = async (input, init = {}) => {
                const target = String(input).startsWith('http')
                    ? String(input)
                    : BASE + String(input);
                const headers = { ...(init.headers ?? {}) };
                if (cookieJar.length) headers.cookie = cookieJar.join('; ');

                const res = await fetch(target, { ...init, headers, redirect: 'manual' });
                const setCookie = res.headers.get('set-cookie');
                if (setCookie) cookieJar.push(setCookie.split(';')[0]);
                return res;
            };

            // Present in every real browser, absent from jsdom.
            win.TextEncoder = TextEncoder;
            win.TextDecoder = TextDecoder;
            win.matchMedia = () => ({
                matches: false,
                addEventListener() {},
                removeEventListener() {},
            });
        },
    });

    return { dom, notes, nav: () => navigatedTo };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ─────────────────────────────────────────────────────────────── login ── */

async function testLogin(password) {
    const jar = [];
    const html = await (await fetch(`${BASE}${PATH}/login`)).text();
    const { dom, nav } = makeDom(html, `${BASE}${PATH}/login`, jar);
    const win = dom.window;
    const doc = win.document;

    await wait(200);
    const bootRan = win.TABORA_BASE === PATH;

    doc.getElementById('password').value = password;
    doc.getElementById('submit').click();
    await wait(4000);

    const error = doc.getElementById('error');
    return {
        bootRan,
        navigated: nav() !== null,
        cookieSet: jar.some((c) => c.startsWith('tabora_session=')),
        errorShown: !error.hidden && error.textContent.trim().length > 0,
        cookie: jar[0],
    };
}

/* ─────────────────────────────────────────────────────────────── panel ── */

async function testPanel(cookie) {
    const html = await (await fetch(`${BASE}${PATH}/panel`, { headers: { cookie } })).text();
    const { dom } = makeDom(html, `${BASE}${PATH}/panel`, [cookie]);
    const win = dom.window;
    const doc = win.document;

    await wait(5000);

    // Anything carrying [hidden] must actually be invisible. A component rule
    // that sets `display` silently outranks the attribute, which once left two
    // modals stacked over the dashboard on load.
    const wronglyVisible = [...doc.querySelectorAll('[hidden]')]
        .filter((el) => win.getComputedStyle(el).display !== 'none')
        .map((el) => el.id || el.className);

    return {
        bootRan: win.TABORA_BASE === PATH,
        wronglyVisible,
        modalCount: doc.querySelectorAll('.modal-backdrop').length,
        hasPasswordModal: !!doc.getElementById('passModal'),
        tabs: doc.querySelectorAll('.tab').length,
        portChips: doc.querySelectorAll('#portChips input').length,
        subLinks: doc.querySelectorAll('#subList .sub-item').length,
        uuidFilled: (doc.getElementById('fUuid')?.value ?? '').length > 10,
        pathFilled: (doc.getElementById('fPath')?.value ?? '').length > 0,
        hostFilled: (doc.getElementById('ovHost')?.textContent ?? '—') !== '—',
        leftoverPlaceholder: /\{\{[A-Z_]+\}\}|__[A-Z_]+__/.test(html),
    };
}

/* ──────────────────────────────────────────────────────────────── main ── */

console.log(`\nUI test against ${BASE}${PATH}\n`);

const good = await testLogin(PASSWORD);
check('login: inline bootstrap script executed', good.bootRan);
check('login: correct password issues a session cookie', good.cookieSet);
check('login: correct password triggers navigation', good.navigated);
check('login: correct password shows no error', !good.errorShown);

const bad = await testLogin('definitely-the-wrong-password');
check('login: wrong password shows an error', bad.errorShown);
check('login: wrong password does not navigate', !bad.navigated);

if (good.cookie) {
    const panel = await testPanel(good.cookie);
    check('panel: inline bootstrap script executed', panel.bootRan);
    check('panel: tabs rendered', panel.tabs >= 5);
    check('panel: port chips generated', panel.portChips > 0);
    check('panel: subscription links rendered', panel.subLinks > 0);
    check('panel: UUID populated from the API', panel.uuidFilled);
    check('panel: secure path populated from the API', panel.pathFilled);
    check('panel: hostname populated from the API', panel.hostFilled);
    check('panel: no unsubstituted placeholders', !panel.leftoverPlaceholder);
    check(
        `panel: nothing with [hidden] is rendered${panel.wronglyVisible.length ? ' (' + panel.wronglyVisible.join(', ') + ')' : ''}`,
        panel.wronglyVisible.length === 0,
    );
    check('panel: change-password modal removed', !panel.hasPasswordModal);
} else {
    check('panel: could not authenticate, skipped', false);
}

pass.forEach((n) => console.log(`  ok   ${n}`));
fail.forEach((n) => console.log(`  FAIL ${n}`));
console.log(`\n  ${pass.length} passed, ${fail.length} failed\n`);

process.exit(fail.length ? 1 : 0);
