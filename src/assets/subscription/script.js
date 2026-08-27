(() => {
'use strict';

/* Minimal QR encoder (byte mode, EC level L, versions 1–10, mask 0). */
const QR = (() => {
    const EC = { 1:[26,19],2:[44,34],3:[70,55],4:[100,80],5:[134,108],
                 6:[172,136],7:[196,156],8:[242,194],9:[292,232],10:[346,274] };
    const CAP = { 1:17,2:32,3:53,4:78,5:106,6:134,7:154,8:192,9:230,10:271 };
    const ALIGN = { 1:[],2:[6,18],3:[6,22],4:[6,26],5:[6,30],6:[6,34],
                    7:[6,22,38],8:[6,24,42],9:[6,26,46],10:[6,28,50] };

    const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
    let x = 1;
    for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
    const mul = (a, b) => (!a || !b) ? 0 : EXP[LOG[a] + LOG[b]];

    function gen(deg) {
        let p = [1];
        for (let i = 0; i < deg; i++) {
            const n = new Array(p.length + 1).fill(0);
            for (let j = 0; j < p.length; j++) { n[j] ^= p[j]; n[j + 1] ^= mul(p[j], EXP[i]); }
            p = n;
        }
        return p;
    }

    function ecc(data, len) {
        const g = gen(len), r = new Array(len).fill(0);
        for (const b of data) {
            const f = b ^ r[0];
            r.shift(); r.push(0);
            for (let i = 0; i < len; i++) r[i] ^= mul(g[i + 1], f);
        }
        return r;
    }

    return (text) => {
        const bytes = new TextEncoder().encode(text);
        let v = 0;
        for (let i = 1; i <= 10; i++) if (bytes.length <= CAP[i]) { v = i; break; }
        if (!v) return null;

        const [total, dataLen] = EC[v];
        const size = v * 4 + 17;

        const bits = [];
        const push = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1); };
        push(4, 4);
        push(bytes.length, v < 10 ? 8 : 16);
        for (const b of bytes) push(b, 8);
        for (let i = 0; i < 4 && bits.length < dataLen * 8; i++) bits.push(0);
        while (bits.length % 8) bits.push(0);

        const data = [];
        for (let i = 0; i < bits.length; i += 8) {
            data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
        }
        const PAD = [0xec, 0x11];
        while (data.length < dataLen) data.push(PAD[data.length % 2]);

        const cw = [...data, ...ecc(data, total - dataLen)];
        const m = Array.from({ length: size }, () => new Array(size).fill(null));

        const finder = (r, c) => {
            for (let i = -1; i <= 7; i++) for (let j = -1; j <= 7; j++) {
                const y = r + i, xx = c + j;
                if (y < 0 || y >= size || xx < 0 || xx >= size) continue;
                const edge = (i >= 0 && i <= 6 && (j === 0 || j === 6)) ||
                             (j >= 0 && j <= 6 && (i === 0 || i === 6));
                m[y][xx] = edge || (i >= 2 && i <= 4 && j >= 2 && j <= 4) ? 1 : 0;
            }
        };
        finder(0, 0); finder(0, size - 7); finder(size - 7, 0);

        for (const r of ALIGN[v]) for (const c of ALIGN[v]) {
            if (m[r][c] !== null) continue;
            for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
                m[r + i][c + j] = Math.max(Math.abs(i), Math.abs(j)) !== 1 ? 1 : 0;
            }
        }

        for (let i = 8; i < size - 8; i++) {
            if (m[6][i] === null) m[6][i] = i % 2 === 0 ? 1 : 0;
            if (m[i][6] === null) m[i][6] = i % 2 === 0 ? 1 : 0;
        }
        m[size - 8][8] = 1;

        for (let i = 0; i < 9; i++) {
            if (m[8][i] === null) m[8][i] = 0;
            if (m[i][8] === null) m[i][8] = 0;
        }
        for (let i = size - 8; i < size; i++) {
            if (m[8][i] === null) m[8][i] = 0;
            if (m[i][8] === null) m[i][8] = 0;
        }

        let bi = 0;
        const next = () => {
            const byte = cw[bi >> 3];
            const bit = byte === undefined ? 0 : (byte >> (7 - (bi & 7))) & 1;
            bi++;
            return bit;
        };

        let up = true;
        for (let col = size - 1; col > 0; col -= 2) {
            if (col === 6) col--;
            for (let i = 0; i < size; i++) {
                const row = up ? size - 1 - i : i;
                for (const c of [col, col - 1]) {
                    if (m[row][c] !== null) continue;
                    m[row][c] = next() ^ ((row + c) % 2 === 0 ? 1 : 0);
                }
            }
            up = !up;
        }

        const FORMAT = 0x77c4;
        for (let i = 0; i < 15; i++) {
            const bit = (FORMAT >> i) & 1;
            if (i < 6) m[8][i] = bit;
            else if (i < 8) m[8][i + 1] = bit;
            else if (i === 8) m[7][8] = bit;
            else m[14 - i][8] = bit;
            if (i < 8) m[size - 1 - i][8] = bit;
            else m[8][size - 15 + i] = bit;
        }

        return m.map((row) => row.map((c) => c || 0));
    };
})();

function drawQR(canvas, text) {
    const matrix = QR(text);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!matrix) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Link too long — copy instead', canvas.width / 2, canvas.height / 2);
        return;
    }

    const size = matrix.length;
    const scale = Math.floor(canvas.width / (size + 2));
    const offset = Math.floor((canvas.width - size * scale) / 2);

    ctx.fillStyle = '#000';
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (matrix[r][c]) ctx.fillRect(offset + c * scale, offset + r * scale, scale, scale);
        }
    }
}

/* ── page wiring ───────────────────────────────────────────────────────── */

/**
 * Template values reach this script HTML-escaped.
 *
 * renderTemplate escapes for HTML *and* for a JS string literal, which is the
 * right default — it is what stops a hostile setting breaking out of either
 * context. But a subscription URL legitimately contains `&`, so it arrives as
 * `&amp;` and every multi-parameter link (?gaming=1&format=clash) would be
 * handed to the client apps broken. Decoding here keeps the escaping strict at
 * the boundary and correct at the point of use.
 */
const decodeEntities = (value) => String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const RAW = window.TABORA_SUB || {};
const S = {
    ...RAW,
    sub: decodeEntities(RAW.sub),
    clash: decodeEntities(RAW.clash),
    singbox: decodeEntities(RAW.singbox),
    plain: decodeEntities(RAW.plain),
    name: decodeEntities(RAW.name),
};

/* ── i18n ──────────────────────────────────────────────────────────────── */

const I18N = {
    en: {
        'mode.gaming': 'Gaming',
        'usage.traffic': 'Traffic', 'usage.used': 'used', 'usage.expires': 'Expires',
        'apps.title': 'Open in your app',
        'apps.hint': 'Tap your app — it opens and imports the subscription automatically.',
        'apps.opening': 'Opening {app}\u2026',
        'apps.fallback': "If nothing opened, the app isn't installed. The link was copied instead.",
        'copy.title': 'Copy',
        'copy.sub': 'Subscription link', 'copy.sub.d': 'Auto-updates in your app',
        'copy.vless': 'VLESS config', 'copy.vless.d': 'Single server, paste anywhere',
        'copy.clash': 'Clash link', 'copy.singbox': 'Sing-box link',
        'copy.all': 'Copy all configs', 'copy.all.d': 'Every server as plain text',
        'copy.ok': 'Copied', 'copy.fail': 'Could not copy — select the link manually',
        'copy.loading': 'Fetching\u2026',
        'copy.empty': 'Nothing to copy yet',
        'qr.title': 'Scan to import', 'qr.sub': 'Subscription', 'qr.vless': 'VLESS',
        'qr.hint': 'Open your client and scan the code.',
        'qr.long': 'Too long for a QR — use Copy instead',
        'adv.title': 'Raw links',
        'cleanip.title': 'My Clean IPs',
        'cleanip.hint': 'Set custom Clean IPs to optimize speed and stability for your network.',
        'cleanip.scan': 'Scan & Test IPs',
        'cleanip.save': 'Save Clean IPs',
        'cleanip.reset': 'Reset',
        'cleanip.badgeDefault': 'Panel Default',
        'cleanip.badgeCustom': 'Custom IPs',
        'cleanip.saved': 'Clean IPs saved successfully! Links updated.',
        'cleanip.resetToast': 'Reset to panel default Clean IPs.',
        'cleanip.applyTop': 'Apply Top 5',
        'cleanip.scanning': 'Scanning clean IPs from your browser\u2026',
        'cleanip.scannedDone': 'Scan finished! Found {count} working clean IPs.',
    },
    fa: {
        'mode.gaming': 'گیمینگ',
        'usage.traffic': 'ترافیک', 'usage.used': 'مصرف شده', 'usage.expires': 'انقضا',
        'apps.title': 'باز کردن در برنامه',
        'apps.hint': 'روی برنامه‌ات بزن — خودش باز می‌شود و کانفیگ را وارد می‌کند.',
        'apps.opening': 'در حال باز کردن {app}\u2026',
        'apps.fallback': 'اگر چیزی باز نشد، برنامه نصب نیست. لینک به‌جایش کپی شد.',
        'copy.title': 'کپی',
        'copy.sub': 'لینک ساب', 'copy.sub.d': 'در برنامه خودکار به‌روز می‌شود',
        'copy.vless': 'کانفیگ VLESS', 'copy.vless.d': 'یک سرور، هرجا بچسبان',
        'copy.clash': 'لینک Clash', 'copy.singbox': 'لینک Sing-box',
        'copy.all': 'کپی همه کانفیگ‌ها', 'copy.all.d': 'همه سرورها به‌صورت متن',
        'copy.ok': 'کپی شد', 'copy.fail': 'کپی نشد — لینک را دستی انتخاب کنید',
        'copy.loading': 'در حال دریافت\u2026',
        'copy.empty': 'هنوز چیزی برای کپی نیست',
        'qr.title': 'اسکن برای ورود', 'qr.sub': 'اشتراک', 'qr.vless': 'VLESS',
        'qr.hint': 'برنامه‌ات را باز کن و کد را اسکن کن.',
        'qr.long': 'برای QR طولانی است — از کپی استفاده کن',
        'adv.title': 'لینک‌های خام',
        'cleanip.title': 'آی‌پی‌های تمیز من',
        'cleanip.hint': 'آی‌پی تمیز اختصاصی خود را وارد کنید تا بهترین سرعت و پایداری را روی شبکه خود داشته باشید.',
        'cleanip.scan': 'اسکن و تست آی‌پی‌ها',
        'cleanip.save': 'ذخیره آی‌پی‌ها',
        'cleanip.reset': 'بازنشانی',
        'cleanip.badgeDefault': 'پیش‌فرض پنل',
        'cleanip.badgeCustom': 'آی‌پی اختصاصی',
        'cleanip.saved': 'آی‌پی‌های تمیز با موفقیت ذخیره شدند! لینک‌ها به‌روز شدند.',
        'cleanip.resetToast': 'آی‌پی‌ها به حالت پیش‌فرض پنل بازنشانی شدند.',
        'cleanip.applyTop': 'انتخاب ۵ تای برتر',
        'cleanip.scanning': 'در حال اسکن آی‌پی‌های تمیز از مرورگر شما\u2026',
        'cleanip.scannedDone': 'اسکن پایان یافت! {count} آی‌پی تمیز فعال پیدا شد.',
    },
};

const storedLang = localStorage.getItem('tabora.lang');
let lang = storedLang || ((navigator.language || '').startsWith('fa') ? 'fa' : 'en');
if (!I18N[lang]) lang = 'en';

const t = (key) => (I18N[lang] || I18N.en)[key] ?? I18N.en[key] ?? key;

function applyLang() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    document.getElementById('langBtn').textContent = lang === 'fa' ? 'FA' : 'EN';
    for (const el of document.querySelectorAll('[data-i18n]')) {
        el.textContent = t(el.dataset.i18n);
    }
}

document.getElementById('langBtn').addEventListener('click', () => {
    lang = lang === 'fa' ? 'en' : 'fa';
    localStorage.setItem('tabora.lang', lang);
    applyLang();
});

/* ── toast ─────────────────────────────────────────────────────────────── */

const toast = document.getElementById('toast');
let toastTimer;

function showToast(message, kind = 'ok') {
    toast.textContent = message;
    toast.className = `toast ${kind}`;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2600);
}

async function writeClipboard(text) {
    // navigator.clipboard needs a secure context and can be blocked; the
    // textarea path is the fallback that still works on older mobile browsers.
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.top = '-1000px';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            ta.remove();
            return ok;
        } catch {
            return false;
        }
    }
}

/* ── deep links ────────────────────────────────────────────────────────── */

/**
 * Per-app import schemes.
 *
 * Each app registers its own scheme and expects the subscription URL in its
 * own shape, so this cannot be one generic link:
 *
 *   Hiddify  hiddify://install-sub?url=<enc>   documented in their URL-Scheme wiki
 *   v2rayNG  v2rayng://install-sub?url=<enc>   handled by UrlSchemeActivity
 *   V2Box    v2box://install-sub?url=<enc>     added in V2Box 3.1.2
 *   Happ     happ://add/<raw url>              path-style, not a query parameter
 *
 * Hiddify and Happ also accept the sing-box JSON profile, but the plain
 * subscription is the most compatible choice for all four, so every app gets
 * the same source URL and picks its own format from the User-Agent.
 */
/**
 * Per-app import schemes.
 *
 * Two things vary per app and both matter:
 *
 * 1. The scheme shape. Hiddify, v2rayNG and V2Box take the URL as an encoded
 *    `url=` query parameter; Happ takes it as a path segment.
 *
 *      Hiddify  hiddify://install-sub?url=<enc>   (their URL-Scheme wiki)
 *      v2rayNG  v2rayng://install-sub?url=<enc>   (UrlSchemeActivity)
 *      V2Box    v2box://install-sub?url=<enc>     (added in V2Box 3.1.2)
 *      Happ     happ://add/<raw url>
 *
 * 2. The `format` we pin onto the subscription URL. This is not cosmetic —
 *    these importers fetch over plain HTTP with a generic WebView/Dart
 *    User-Agent and `Accept: text/html`, which the worker cannot tell apart
 *    from a real browser. Without an explicit ?format= it would serve them the
 *    human status page and the app fails with "unable to determine config
 *    format". Sending the format each app parses natively also skips the
 *    server's UA guesswork entirely.
 */
const APPS = {
    hiddify: {
        label: 'Hiddify',
        // Hiddify is sing-box based and imports that profile directly.
        format: 'singbox',
        build: (url, name) =>
            `hiddify://install-sub?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`,
    },
    v2rayng: {
        label: 'v2rayNG',
        // Xray core: wants the base64 URI list.
        format: 'base64',
        build: (url, name) =>
            `v2rayng://install-sub?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`,
    },
    v2box: {
        label: 'V2Box',
        format: 'base64',
        build: (url, name) =>
            `v2box://install-sub?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`,
    },
    happ: {
        label: 'Happ',
        format: 'base64',
        // Happ takes the URL as a path segment rather than a query parameter.
        build: (url) => `happ://add/${url}`,
    },
};

/** Pin an explicit format onto the subscription URL for a given app. */
function subUrlFor(app) {
    const base = S.sub;
    return `${base}${base.includes('?') ? '&' : '?'}format=${app.format}`;
}

/**
 * Open a deep link, and fall back to the clipboard when nothing handles it.
 *
 * There is no reliable way to ask a browser whether a scheme is registered.
 * The usual trick is to note that a successful hand-off backgrounds the page:
 * if the document is still visible a moment later, nothing opened. Copying the
 * link then means the tap is never a dead end.
 */
function openInApp(key) {
    const app = APPS[key];
    if (!app) return;

    const url = subUrlFor(app);
    const deepLink = app.build(url, S.name || 'Tabora');

    showToast(t('apps.opening').replace('{app}', app.label));

    let handedOff = false;
    const noteHandoff = () => { if (document.hidden) handedOff = true; };
    document.addEventListener('visibilitychange', noteHandoff);

    // A hidden iframe avoids the "page cannot be displayed" interstitial some
    // browsers show when navigating straight to an unknown scheme.
    const frame = document.createElement('iframe');
    frame.style.display = 'none';
    frame.src = deepLink;
    document.body.appendChild(frame);

    // Some browsers only honour a top-level navigation, so try that too.
    setTimeout(() => { if (!handedOff) window.location.href = deepLink; }, 100);

    setTimeout(async () => {
        document.removeEventListener('visibilitychange', noteHandoff);
        frame.remove();
        if (handedOff || document.hidden) return;
        const ok = await writeClipboard(url);
        showToast(ok ? t('apps.fallback') : t('copy.fail'), 'warn');
    }, 1600);
}

/* ── config fetching ───────────────────────────────────────────────────── */

let plainCache = null;

/** The plain endpoint returns one URI per line; used for VLESS and copy-all. */
async function loadPlain() {
    if (plainCache !== null) return plainCache;
    // User-Agent is a forbidden header for fetch(), so the format has to be
    // requested in the query string — S.plain already carries ?format=plain.
    const res = await fetch(S.plain, { cache: 'no-store', credentials: 'omit' });
    if (!res.ok) throw new Error('fetch failed');
    const text = (await res.text()).trim();
    // Some clients receive base64; detect and decode so the UI always has URIs.
    plainCache = /^[A-Za-z0-9+/=\s]+$/.test(text) && !text.includes('://')
        ? atob(text.replace(/\s/g, ''))
        : text;
    return plainCache;
}

const firstVless = (text) =>
    text.split('\n').map((l) => l.trim()).find((l) => l.startsWith('vless://')) || '';

/* ── copy actions ──────────────────────────────────────────────────────── */

async function resolveCopy(key) {
    if (key === 'sub') return S.sub;
    if (key === 'clash') return S.clash;
    if (key === 'singbox') return S.singbox;

    const text = await loadPlain();
    if (key === 'all') return text;
    if (key === 'vless') return firstVless(text);
    return '';
}

document.getElementById('copyGrid').addEventListener('click', async (event) => {
    const btn = event.target.closest('[data-copy-key]');
    if (!btn) return;

    const key = btn.dataset.copyKey;
    const needsFetch = key === 'vless' || key === 'all';
    if (needsFetch) { btn.classList.add('busy'); showToast(t('copy.loading')); }

    try {
        const value = await resolveCopy(key);
        if (!value) { showToast(t('copy.empty'), 'warn'); return; }
        const ok = await writeClipboard(value);
        showToast(ok ? t('copy.ok') : t('copy.fail'), ok ? 'ok' : 'warn');
        if (ok) {
            btn.classList.add('done');
            setTimeout(() => btn.classList.remove('done'), 1200);
        }
    } catch {
        showToast(t('copy.fail'), 'warn');
    } finally {
        btn.classList.remove('busy');
    }
});

document.getElementById('apps').addEventListener('click', (event) => {
    const btn = event.target.closest('[data-app]');
    if (btn) openInApp(btn.dataset.app);
});

/* ── QR ────────────────────────────────────────────────────────────────── */

const canvas = document.getElementById('qr');

function renderQr(text) {
    if (!text) return;
    drawQR(canvas, text);
}

document.getElementById('qrSwitch').addEventListener('click', async (event) => {
    const btn = event.target.closest('[data-qr]');
    if (!btn) return;

    for (const seg of document.querySelectorAll('#qrSwitch .seg')) {
        seg.classList.toggle('active', seg === btn);
    }

    if (btn.dataset.qr === 'sub') { renderQr(S.sub); return; }

    try {
        const uri = firstVless(await loadPlain());
        if (uri) renderQr(uri);
        else showToast(t('copy.empty'), 'warn');
    } catch {
        showToast(t('copy.fail'), 'warn');
    }
});

/* ── Clean IP Management & Scanner ─────────────────────────────────────── */

let userCleanIps = [];
let scannedCleanIps = [];

const cleanIpInput = document.getElementById('cleanIpInput');
const cleanIpBadge = document.getElementById('cleanIpBadge');
const btnScanCleanIps = document.getElementById('btnScanCleanIps');
const btnSaveCleanIps = document.getElementById('btnSaveCleanIps');
const btnResetCleanIps = document.getElementById('btnResetCleanIps');
const scanResultsArea = document.getElementById('scanResultsArea');
const scanStatusText = document.getElementById('scanStatusText');
const scanList = document.getElementById('scanList');
const btnApplyTopScanned = document.getElementById('btnApplyTopScanned');

async function loadUserCleanIps() {
    if (!S.name) return;
    try {
        const subBase = S.sub.split('?')[0].replace(/\/sub$/, '');
        const res = await fetch(`${subBase}/sub/clean-ips?u=${encodeURIComponent(S.name)}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        userCleanIps = data.cleanIPs || [];
        if (cleanIpInput) {
            cleanIpInput.value = userCleanIps.join(', ');
        }
        updateCleanIpBadge(data.isCustom);
    } catch {
        /* best effort */
    }
}

function updateCleanIpBadge(isCustom) {
    if (!cleanIpBadge) return;
    if (isCustom) {
        cleanIpBadge.textContent = t('cleanip.badgeCustom');
        cleanIpBadge.className = 'pill';
    } else {
        cleanIpBadge.textContent = t('cleanip.badgeDefault');
        cleanIpBadge.className = 'pill paused';
    }
}

async function saveUserCleanIps(ips, isReset = false) {
    if (!S.name) return;
    if (btnSaveCleanIps) btnSaveCleanIps.classList.add('busy');
    try {
        const subBase = S.sub.split('?')[0].replace(/\/sub$/, '');
        const payload = isReset ? { clear: true } : { cleanIPs: ips };
        const res = await fetch(`${subBase}/sub/clean-ips?u=${encodeURIComponent(S.name)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to save clean IPs');
        const data = await res.json();
        userCleanIps = data.cleanIPs || [];
        if (cleanIpInput) {
            cleanIpInput.value = userCleanIps.join(', ');
        }
        updateCleanIpBadge(data.isCustom);
        plainCache = null; // Clear cached VLESS configs so new IPs are fetched
        showToast(isReset ? t('cleanip.resetToast') : t('cleanip.saved'));
    } catch {
        showToast(t('copy.fail'), 'warn');
    } finally {
        if (btnSaveCleanIps) btnSaveCleanIps.classList.remove('busy');
    }
}

btnSaveCleanIps?.addEventListener('click', () => {
    const raw = (cleanIpInput?.value || '').trim();
    const ips = raw.split(/[\s,\n]+/).filter(Boolean);
    saveUserCleanIps(ips, false);
});

btnResetCleanIps?.addEventListener('click', () => {
    saveUserCleanIps([], true);
});

/* Browser-based probe against Cloudflare clean IPs */
async function probeIp(ip, probes = 3, timeoutMs = 2000) {
    const times = [];
    for (let i = 0; i < probes; i++) {
        const start = performance.now();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            await fetch(`https://${ip}/cdn-cgi/trace?_=${Date.now()}_${i}`, {
                mode: 'no-cors',
                cache: 'no-store',
                signal: controller.signal,
            });
            clearTimeout(timer);
            times.push(Math.round(performance.now() - start));
        } catch {
            clearTimeout(timer);
            times.push(-1);
        }
    }
    const good = times.filter((t) => t >= 0);
    if (!good.length) return { ip, latency: -1, loss: 1 };
    good.sort((a, b) => a - b);
    const median = good[Math.floor(good.length / 2)];
    return { ip, latency: median, loss: 1 - good.length / times.length };
}

btnScanCleanIps?.addEventListener('click', async () => {
    if (scanResultsArea) scanResultsArea.hidden = false;
    if (scanStatusText) scanStatusText.textContent = t('cleanip.scanning');
    if (scanList) scanList.innerHTML = '';
    btnScanCleanIps.classList.add('busy');

    try {
        const subBase = S.sub.split('?')[0].replace(/\/sub$/, '');
        let candidates = [
            '104.16.10.10', '104.17.147.22', '104.18.26.90', '104.19.3.80',
            '104.21.83.62', '104.24.0.10', '162.159.36.1', '188.114.97.3'
        ];

        try {
            const res = await fetch(`${subBase}/api/scan/repository`, { cache: 'no-store' });
            if (res.ok) {
                const repoData = await res.json();
                if (repoData.ips && repoData.ips.length) {
                    candidates = [...new Set([...repoData.ips.slice(0, 30), ...candidates])];
                }
            }
        } catch {
            /* best effort */
        }

        if (cleanIpInput && cleanIpInput.value) {
            const userIps = cleanIpInput.value.split(/[\s,\n]+/).filter(Boolean);
            candidates = [...new Set([...userIps, ...candidates])];
        }

        scannedCleanIps = [];
        const results = [];

        const batchSize = 4;
        for (let i = 0; i < candidates.length; i += batchSize) {
            const batch = candidates.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map((ip) => probeIp(ip)));
            for (const res of batchResults) {
                if (res.latency > 0) {
                    results.push(res);
                }
            }
        }

        results.sort((a, b) => a.latency - b.latency);
        scannedCleanIps = results;

        if (scanStatusText) {
            scanStatusText.textContent = t('cleanip.scannedDone').replace('{count}', results.length);
        }

        if (scanList) {
            if (!results.length) {
                scanList.innerHTML = `<div class="hint" style="text-align:center">${t('copy.empty')}</div>`;
            } else {
                scanList.innerHTML = results.map((r) => {
                    const slowClass = r.latency > 250 ? 'slow' : '';
                    return `<div class="scan-item" data-ip="${r.ip}">
                        <span>${r.ip}</span>
                        <span class="latency ${slowClass}">⚡ ${r.latency}ms</span>
                    </div>`;
                }).join('');
            }
        }
    } catch {
        if (scanStatusText) scanStatusText.textContent = t('copy.fail');
    } finally {
        btnScanCleanIps.classList.remove('busy');
    }
});

scanList?.addEventListener('click', (e) => {
    const item = e.target.closest('.scan-item');
    if (!item) return;
    const ip = item.dataset.ip;
    if (!ip || !cleanIpInput) return;

    let current = cleanIpInput.value.split(/[\s,\n]+/).filter(Boolean);
    if (current.includes(ip)) {
        current = current.filter((x) => x !== ip);
        item.classList.remove('selected');
    } else {
        current.push(ip);
        item.classList.add('selected');
    }
    cleanIpInput.value = current.join(', ');
});

btnApplyTopScanned?.addEventListener('click', () => {
    if (!scannedCleanIps.length || !cleanIpInput) return;
    const top = scannedCleanIps.slice(0, 5).map((r) => r.ip);
    cleanIpInput.value = top.join(', ');
    saveUserCleanIps(top, false);
});

/* ── raw links ─────────────────────────────────────────────────────────── */

const rawRows = [
    ['Subscription', S.sub],
    ['Clash', S.clash],
    ['Sing-box', S.singbox],
];
document.getElementById('rawList').innerHTML = rawRows
    .map(([label, url]) => `<div class="raw-row"><span>${label}</span><code>${url}</code></div>`)
    .join('');

/* ── boot ──────────────────────────────────────────────────────────────── */

const statusEl = document.getElementById('status');
statusEl.className = `pill ${(statusEl.dataset.status || '').trim()}`;

const bar = document.getElementById('bar');
if (parseFloat(bar.style.width) >= 100) bar.parentElement.classList.add('over');

if (S.gaming) document.getElementById('modePill').hidden = false;

applyLang();
renderQr(S.sub);
loadUserCleanIps();

})();
