(() => {
'use strict';

const BASE = window.TABORA_BASE || '';
const api = (path) => `${BASE}/api${path}`;

/* ═══════════════════════════════════ i18n ═══════════════════════════════ */

const I18N = {
    en: {
        'tab.overview': 'Overview', 'tab.subs': 'Links', 'tab.users': 'Users',
        'tab.settings': 'Settings', 'tab.logs': 'Logs',
        'stat.users': 'Total users', 'stat.active': 'Active', 'stat.paused': 'Paused',
        'stat.traffic': 'Total traffic', 'stat.today': 'Today', 'stat.expired': 'Expired',
        'ov.system': 'System', 'ov.host': 'Hostname', 'ov.colo': 'Edge node',
        'ov.storage': 'Storage', 'ov.ip': 'Your IP', 'ov.quick': 'Quick actions',
        'ov.addUser': 'Add user', 'ov.export': 'Export backup',
        'ov.import': 'Import backup', 'ov.enforce': 'Enforce quotas',
        'sub.title': 'Subscription links',
        'sub.hint': 'Panel-wide links. For per-user links, open a user in the Users tab.',
        'sub.qr': 'QR code',
        'usr.title': 'Users', 'usr.add': '+ Add user', 'usr.all': 'All',
        'usr.active': 'Active', 'usr.paused': 'Paused', 'usr.expired': 'Expired',
        'usr.loading': 'Loading…',
        'set.identity': 'Identity & access', 'set.path': 'Secret path',
        'set.fallback': 'Decoy site', 'set.changePass': 'Change panel password',
        'set.protocol': 'Protocol & transport', 'set.protocols': 'Protocols',
        'set.ports': 'Ports', 'set.fp': 'TLS fingerprint', 'set.ech': 'Enable ECH',
        'set.network': 'Network & DNS', 'set.proxyMode': 'Proxy IP mode',
        'set.cleanIps': 'Clean IPs / domains', 'set.sub': 'Subscription output',
        'set.prefix': 'Name prefix', 'set.max': 'Max configs',
        'set.template': 'Name template', 'set.ua': 'Browser bypass User-Agent',
        'set.routing': 'Routing rules', 'set.bypassIran': 'Bypass Iran',
        'set.bypassLan': 'Bypass LAN / private', 'set.blockAds': 'Block ads',
        'set.blockPorn': 'Block adult content', 'set.bypassRules': 'Custom direct rules',
        'set.blockRules': 'Custom block rules', 'set.ops': 'Operations',
        'set.kill': 'Kill switch (pause all proxy traffic)',
        'set.save': 'Save settings', 'set.reset': 'Reset to defaults',
        'log.title': 'Activity log', 'log.refresh': 'Refresh', 'log.clear': 'Clear',
    },
    fa: {
        'tab.overview': 'نمای کلی', 'tab.subs': 'لینک‌ها', 'tab.users': 'کاربران',
        'tab.settings': 'تنظیمات', 'tab.logs': 'گزارش‌ها',
        'stat.users': 'کل کاربران', 'stat.active': 'فعال', 'stat.paused': 'متوقف',
        'stat.traffic': 'ترافیک کل', 'stat.today': 'امروز', 'stat.expired': 'منقضی',
        'ov.system': 'سیستم', 'ov.host': 'نام میزبان', 'ov.colo': 'نود لبه',
        'ov.storage': 'ذخیره‌سازی', 'ov.ip': 'آی‌پی شما', 'ov.quick': 'اقدامات سریع',
        'ov.addUser': 'افزودن کاربر', 'ov.export': 'خروجی پشتیبان',
        'ov.import': 'بازیابی پشتیبان', 'ov.enforce': 'اعمال محدودیت‌ها',
        'sub.title': 'لینک‌های اشتراک',
        'sub.hint': 'لینک‌های عمومی پنل. برای لینک اختصاصی هر کاربر، به تب کاربران بروید.',
        'sub.qr': 'کد QR',
        'usr.title': 'کاربران', 'usr.add': '+ کاربر جدید', 'usr.all': 'همه',
        'usr.active': 'فعال', 'usr.paused': 'متوقف', 'usr.expired': 'منقضی',
        'usr.loading': 'در حال بارگذاری…',
        'set.identity': 'هویت و دسترسی', 'set.path': 'مسیر مخفی',
        'set.fallback': 'سایت استتار', 'set.changePass': 'تغییر رمز پنل',
        'set.protocol': 'پروتکل و انتقال', 'set.protocols': 'پروتکل‌ها',
        'set.ports': 'پورت‌ها', 'set.fp': 'اثر انگشت TLS', 'set.ech': 'فعال‌سازی ECH',
        'set.network': 'شبکه و DNS', 'set.proxyMode': 'حالت Proxy IP',
        'set.cleanIps': 'آی‌پی/دامنه تمیز', 'set.sub': 'خروجی اشتراک',
        'set.prefix': 'پیشوند نام', 'set.max': 'حداکثر کانفیگ',
        'set.template': 'الگوی نام', 'set.ua': 'یوزر-ایجنت عبور مرورگر',
        'set.routing': 'قوانین مسیریابی', 'set.bypassIran': 'عبور مستقیم ایران',
        'set.bypassLan': 'عبور مستقیم شبکه محلی', 'set.blockAds': 'مسدودسازی تبلیغات',
        'set.blockPorn': 'مسدودسازی محتوای بزرگسال', 'set.bypassRules': 'قوانین مستقیم سفارشی',
        'set.blockRules': 'قوانین مسدودسازی سفارشی', 'set.ops': 'عملیات',
        'set.kill': 'کلید قطع اضطراری (توقف کل ترافیک)',
        'set.save': 'ذخیره تنظیمات', 'set.reset': 'بازگشت به پیش‌فرض',
        'log.title': 'گزارش فعالیت', 'log.refresh': 'بروزرسانی', 'log.clear': 'پاک‌سازی',
    },
};

let lang = localStorage.getItem('tabora.lang') || 'en';

function applyLang() {
    const dict = I18N[lang] || I18N.en;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
        const value = dict[el.dataset.i18n];
        if (value) el.textContent = value;
    });
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    $('#langLabel').textContent = lang.toUpperCase();
    localStorage.setItem('tabora.lang', lang);
}

/* ══════════════════════════════════ helpers ═════════════════════════════ */

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function notify(message, kind = 'ok', ttl = 3800) {
    const el = document.createElement('div');
    el.className = `alert ${kind}`;
    el.textContent = message;
    $('#alerts').appendChild(el);
    setTimeout(() => {
        el.classList.add('fade');
        setTimeout(() => el.remove(), 320);
    }, ttl);
}

async function request(path, options = {}) {
    const res = await fetch(api(path), {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });

    if (res.status === 401) {
        window.location.href = `${BASE}/login`;
        throw new Error('unauthorized');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
        const detail = Array.isArray(data.body)
            ? data.body.map((e) => `${e.field}: ${e.messages.join(' ')}`).join('\n')
            : '';
        throw new Error(detail || data.message || `Request failed (${res.status})`);
    }
    return data.body;
}

function formatBytes(bytes) {
    if (!bytes || bytes < 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function copy(text) {
    try {
        await navigator.clipboard.writeText(text);
        notify('Copied to clipboard');
    } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        notify('Copied to clipboard');
    }
}

const randomHex = (n) => [...crypto.getRandomValues(new Uint8Array(n))]
    .map((b) => b.toString(16).padStart(2, '0')).join('');

/* ═════════════════════════════════ QR code ══════════════════════════════ */
/* Compact QR encoder — byte mode, error level L, auto version up to 10.    */

const QR = (() => {
    const EC_BLOCKS = { 1:[1,26,19],2:[1,44,34],3:[1,70,55],4:[1,100,80],5:[1,134,108],
        6:[2,86,68],7:[2,98,78],8:[2,121,97],9:[2,146,116],10:[2,86,68] };
    const CAPACITY = { 1:17,2:32,3:53,4:78,5:106,6:134,7:154,8:192,9:230,10:271 };
    const ALIGN = { 1:[],2:[6,18],3:[6,22],4:[6,26],5:[6,30],6:[6,34],7:[6,22,38],
        8:[6,24,42],9:[6,26,46],10:[6,28,50] };

    const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
    (() => { let x = 1;
        for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
        for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
    })();

    const mul = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];

    function generatorPoly(degree) {
        let poly = [1];
        for (let i = 0; i < degree; i++) {
            const next = new Array(poly.length + 1).fill(0);
            for (let j = 0; j < poly.length; j++) {
                next[j] ^= poly[j];
                next[j + 1] ^= mul(poly[j], EXP[i]);
            }
            poly = next;
        }
        return poly;
    }

    function ecc(data, ecLen) {
        const gen = generatorPoly(ecLen);
        const res = new Array(ecLen).fill(0);
        for (const byte of data) {
            const factor = byte ^ res[0];
            res.shift();
            res.push(0);
            for (let i = 0; i < ecLen; i++) res[i] ^= mul(gen[i + 1], factor);
        }
        return res;
    }

    return function encode(text) {
        const bytes = new TextEncoder().encode(text);
        let version = 0;
        for (let v = 1; v <= 10; v++) { if (bytes.length <= CAPACITY[v]) { version = v; break; } }
        if (!version) return null;

        const [, total, dataLen] = EC_BLOCKS[version];
        const size = version * 4 + 17;

        // Bit stream: mode(4) + length(8/16) + payload + terminator
        const bits = [];
        const push = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1); };
        push(4, 4);
        push(bytes.length, version < 10 ? 8 : 16);
        for (const b of bytes) push(b, 8);
        for (let i = 0; i < 4 && bits.length < dataLen * 8; i++) bits.push(0);
        while (bits.length % 8) bits.push(0);

        const data = [];
        for (let i = 0; i < bits.length; i += 8) {
            data.push(bits.slice(i, i + 8).reduce((acc, bit) => (acc << 1) | bit, 0));
        }
        const PAD = [0xec, 0x11];
        while (data.length < dataLen) data.push(PAD[data.length % 2]);

        const codewords = [...data, ...ecc(data, total - dataLen)];

        // Matrix
        const m = Array.from({ length: size }, () => new Array(size).fill(null));

        const finder = (r, c) => {
            for (let i = -1; i <= 7; i++) for (let j = -1; j <= 7; j++) {
                const y = r + i, x = c + j;
                if (y < 0 || y >= size || x < 0 || x >= size) continue;
                const edge = i >= 0 && i <= 6 && (j === 0 || j === 6) ||
                             j >= 0 && j <= 6 && (i === 0 || i === 6);
                const core = i >= 2 && i <= 4 && j >= 2 && j <= 4;
                m[y][x] = edge || core ? 1 : 0;
            }
        };
        finder(0, 0); finder(0, size - 7); finder(size - 7, 0);

        for (const r of ALIGN[version]) for (const c of ALIGN[version]) {
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

        // Reserve format areas
        for (let i = 0; i < 9; i++) {
            if (m[8][i] === null) m[8][i] = 0;
            if (m[i][8] === null) m[i][8] = 0;
        }
        for (let i = size - 8; i < size; i++) {
            if (m[8][i] === null) m[8][i] = 0;
            if (m[i][8] === null) m[i][8] = 0;
        }

        // Place data, mask 0
        let bitIndex = 0;
        const nextBit = () => {
            const byte = codewords[bitIndex >> 3];
            const bit = byte === undefined ? 0 : (byte >> (7 - (bitIndex & 7))) & 1;
            bitIndex++;
            return bit;
        };

        let upward = true;
        for (let col = size - 1; col > 0; col -= 2) {
            if (col === 6) col--;
            for (let i = 0; i < size; i++) {
                const row = upward ? size - 1 - i : i;
                for (const c of [col, col - 1]) {
                    if (m[row][c] !== null) continue;
                    const masked = nextBit() ^ ((row + c) % 2 === 0 ? 1 : 0);
                    m[row][c] = masked;
                }
            }
            upward = !upward;
        }

        // Format info: EC level L (01) + mask 0 (000)
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

        return m.map((row) => row.map((v) => v || 0));
    };
})();

function drawQR(canvas, text) {
    // Canvas can be unavailable (older embedded webviews). A missing QR code
    // must never stop the rest of the dashboard from rendering.
    let ctx;
    try {
        ctx = canvas?.getContext('2d');
    } catch {
        ctx = null;
    }
    if (!ctx) return;

    const matrix = QR(text);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!matrix) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('URL too long for QR', canvas.width / 2, canvas.height / 2);
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

/* ══════════════════════════════════ state ═══════════════════════════════ */

let settings = {};
let meta = {};
let usersCache = [];

/* ═════════════════════════════════ overview ═════════════════════════════ */

function renderStats(stats) {
    $('#stTotal').textContent   = stats.total;
    $('#stActive').textContent  = stats.active;
    $('#stPaused').textContent  = stats.paused;
    $('#stExpired').textContent = stats.expired;
    $('#stTraffic').textContent = formatBytes(stats.totalBytes);
    $('#stToday').textContent   = formatBytes(stats.todayBytes);
}

function renderMeta() {
    $('#ovHost').textContent = meta.hostname || '—';
    $('#ovColo').textContent = meta.colo || '—';
    $('#ovStorage').textContent = meta.hasD1 ? 'D1 (SQLite)'
        : meta.hasKV ? 'KV' : 'None — settings will not persist';
}

/* ═══════════════════════════════ subscriptions ══════════════════════════ */

function renderSubscriptions() {
    const base = meta.subscriptionBase || '';
    const links = [
        ['Auto',     base],
        ['Base64',   `${base}?format=base64`],
        ['Clash',    `${base}?format=clash`],
        ['Sing-box', `${base}?format=singbox`],
        ['Plain',    `${base}?format=plain`],
    ];

    $('#subList').innerHTML = links.map(([name, url]) => `
        <div class="sub-item">
          <span class="sub-name">${name}</span>
          <span class="sub-url" title="${escapeHtml(url)}">${escapeHtml(url)}</span>
          <button class="btn tiny" data-copy="${escapeHtml(url)}">Copy</button>
          <button class="btn tiny" data-qr="${escapeHtml(url)}">QR</button>
        </div>`).join('');

    drawQR($('#qrCanvas'), base);
    $('#qrCaption').textContent = base;
}

/* ══════════════════════════════════ users ═══════════════════════════════ */

function renderUsers() {
    const query  = $('#userSearch').value.trim().toLowerCase();
    const filter = $('#userFilter').value;

    const rows = usersCache.filter((u) => {
        if (filter === 'active'  && u.status !== 'active') return false;
        if (filter === 'paused'  && u.status !== 'paused') return false;
        if (filter === 'expired' && !['expired', 'quota-exceeded', 'daily-limit', 'auto-disabled'].includes(u.status)) return false;
        if (!query) return true;
        return [u.name, u.uuid, u.notes].some((v) => String(v).toLowerCase().includes(query));
    });

    if (!rows.length) {
        $('#userList').innerHTML = '<p class="empty">No users found.</p>';
        return;
    }

    $('#userList').innerHTML = rows.map((u) => {
        const used = u.usage.totalBytes;
        const limit = u.limitBytes;
        const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
        const over = limit && used >= limit;
        const subUrl = `${meta.subscriptionBase}?u=${encodeURIComponent(u.name)}`;

        return `
        <div class="user-row">
          <div class="user-main">
            <div class="user-name">
              ${escapeHtml(u.name)}
              <span class="pill ${u.status}">${u.status}</span>
            </div>
            <div class="user-meta">
              <span>${formatBytes(used)}${limit ? ` / ${formatBytes(limit)}` : ' / ∞'}</span>
              <span>${u.expiryMs ? new Date(u.expiryMs).toISOString().slice(0, 10) : '∞'}</span>
              <span title="${escapeHtml(u.uuid)}">${escapeHtml(u.uuid.slice(0, 8))}…</span>
            </div>
            ${limit ? `<div class="bar ${over ? 'over' : ''}"><i style="width:${pct}%"></i></div>` : ''}
          </div>
          <div class="user-actions">
            <button class="btn tiny" data-copy="${escapeHtml(subUrl)}">Link</button>
            <button class="btn tiny" data-qr="${escapeHtml(subUrl)}">QR</button>
            <button class="btn tiny" data-edit="${u.id}">Edit</button>
            <button class="btn tiny" data-toggle="${u.id}">${u.isPaused ? 'Resume' : 'Pause'}</button>
            <button class="btn tiny" data-reset="${u.id}">Reset</button>
            <button class="btn tiny danger" data-del="${u.id}">Delete</button>
          </div>
        </div>`;
    }).join('');
}

async function loadUsers() {
    try {
        const data = await request('/users');
        usersCache = data.users;
        renderStats(data.stats);
        renderUsers();
    } catch (err) {
        notify(err.message, 'error');
    }
}

/* ═════════════════════════════════ settings ═════════════════════════════ */

const PORT_OPTIONS = [443, 8443, 2053, 2083, 2087, 2096, 80, 8080, 2052, 2082, 2086, 2095, 8880];

function renderPortChips() {
    $('#portChips').innerHTML = PORT_OPTIONS.map((port) => `
        <label class="chip"><input type="checkbox" value="${port}"><span>${port}</span></label>
    `).join('');
}

function fillSettingsForm() {
    const set = (id, value) => { const el = $(id); if (el) el.value = value ?? ''; };
    const check = (id, value) => { const el = $(id); if (el) el.checked = Boolean(value); };

    set('#fUuid', settings.uuid);
    set('#fTrojan', settings.trojanPassword);
    set('#fPath', settings.securePath);
    set('#fFallback', settings.fallback);
    set('#fFingerprint', settings.fingerprint);
    set('#fEchName', settings.echServerName);
    set('#fRemoteDns', settings.remoteDNS);
    set('#fLocalDns', settings.localDNS);
    set('#fProxyMode', settings.proxyIpMode);
    set('#fPrefix', settings.namePrefix);
    set('#fMax', settings.maxConfigs);
    set('#fTemplate', settings.nameTemplate);
    set('#fSubUa', settings.subUserAgent);
    set('#fLogLevel', settings.logLevel);

    set('#fProxyIps', (settings.proxyIPs || []).join('\n'));
    set('#fNat64', (settings.nat64Prefixes || []).join('\n'));
    set('#fCleanIps', (settings.cleanIPs || []).join('\n'));
    set('#fBypassRules', (settings.customBypassRules || []).join('\n'));
    set('#fBlockRules', (settings.customBlockRules || []).join('\n'));

    check('#fEch', settings.enableECH);
    check('#fTfo', settings.enableTFO);
    check('#fIpv6', settings.enableIPv6);
    check('#fBypassIran', settings.bypassIran);
    check('#fBypassLan', settings.bypassLAN);
    check('#fBlockAds', settings.blockAds);
    check('#fBlockPorn', settings.blockPorn);
    check('#fBlockQuic', settings.blockUDP443);
    check('#fPaused', settings.isPaused);

    const active = String(settings.protocols || '').toLowerCase();
    $$('#protocolChips input').forEach((el) => { el.checked = active.includes(el.value); });

    const ports = settings.ports || [];
    $$('#portChips input').forEach((el) => { el.checked = ports.includes(Number(el.value)); });
}

function collectSettings() {
    const val = (id) => $(id)?.value ?? '';
    const checked = (id) => Boolean($(id)?.checked);

    return {
        uuid: val('#fUuid').trim(),
        trojanPassword: val('#fTrojan').trim(),
        securePath: val('#fPath').trim(),
        fallback: val('#fFallback').trim(),
        protocols: $$('#protocolChips input:checked').map((el) => el.value).join(','),
        ports: $$('#portChips input:checked').map((el) => Number(el.value)),
        fingerprint: val('#fFingerprint'),
        enableECH: checked('#fEch'),
        echServerName: val('#fEchName').trim(),
        enableTFO: checked('#fTfo'),
        remoteDNS: val('#fRemoteDns').trim(),
        localDNS: val('#fLocalDns').trim(),
        proxyIpMode: val('#fProxyMode'),
        enableIPv6: checked('#fIpv6'),
        proxyIPs: val('#fProxyIps'),
        nat64Prefixes: val('#fNat64'),
        cleanIPs: val('#fCleanIps'),
        namePrefix: val('#fPrefix').trim(),
        maxConfigs: Number(val('#fMax')) || 30,
        nameTemplate: val('#fTemplate'),
        subUserAgent: val('#fSubUa').trim(),
        bypassIran: checked('#fBypassIran'),
        bypassLAN: checked('#fBypassLan'),
        blockAds: checked('#fBlockAds'),
        blockPorn: checked('#fBlockPorn'),
        blockUDP443: checked('#fBlockQuic'),
        customBypassRules: val('#fBypassRules'),
        customBlockRules: val('#fBlockRules'),
        isPaused: checked('#fPaused'),
        logLevel: val('#fLogLevel'),
    };
}

/* ═══════════════════════════════════ logs ═══════════════════════════════ */

async function loadLogs() {
    try {
        const data = await request('/logs?limit=100');
        if (!data.logs.length) {
            $('#logList').innerHTML = '<p class="empty">No activity yet.</p>';
            return;
        }
        $('#logList').innerHTML = data.logs.map((row) => `
            <div class="log-row">
              <span class="log-time">${new Date(row.ts).toLocaleString()}</span>
              <span class="log-type">${escapeHtml(row.type)}</span>
              <span class="log-detail">${escapeHtml(row.detail)}</span>
            </div>`).join('');
    } catch (err) {
        notify(err.message, 'error');
    }
}

/* ═════════════════════════════════ modals ═══════════════════════════════ */

function openUserModal(user) {
    $('#userModalTitle').textContent = user ? 'Edit user' : 'Add user';
    $('#uId').value    = user?.id ?? '';
    $('#uName').value  = user?.name ?? '';
    $('#uUuid').value  = user?.uuid ?? '';
    $('#uLimit').value = user?.limitBytes ? (user.limitBytes / 1024 ** 3).toFixed(2) : '';
    $('#uDaily').value = user?.dailyLimitBytes ? (user.dailyLimitBytes / 1024 ** 3).toFixed(2) : '';
    $('#uDays').value  = '';
    $('#uNotes').value = user?.notes ?? '';
    $('#userModal').hidden = false;
}

const closeUserModal = () => { $('#userModal').hidden = true; };

/* ══════════════════════════════════ init ════════════════════════════════ */

async function loadAll() {
    const data = await request('/settings');
    settings = data.settings;
    meta = data.meta;

    // Populate the form first: it is the part users actually depend on.
    // Anything decorative runs afterwards and is individually guarded.
    fillSettingsForm();
    renderMeta();
    renderStats(data.stats);

    try {
        renderSubscriptions();
    } catch (err) {
        console.error('Could not render subscription links:', err);
    }

    if (!meta.persistent) {
        notify('No D1 or KV binding found — settings will not persist.', 'warn', 9000);
    }
}

function bindEvents() {
    // Tabs
    $$('.tab').forEach((tab) => tab.addEventListener('click', () => {
        $$('.tab').forEach((t) => t.classList.toggle('active', t === tab));
        $$('.panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === tab.dataset.tab));
        if (tab.dataset.tab === 'users') loadUsers();
        if (tab.dataset.tab === 'logs') loadLogs();
    }));

    // Theme + language
    $('#themeBtn').addEventListener('click', () => {
        const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        localStorage.setItem('tabora.theme', next);
    });

    $('#langBtn').addEventListener('click', () => {
        lang = lang === 'en' ? 'fa' : 'en';
        applyLang();
    });

    $('#logoutBtn').addEventListener('click', async () => {
        await request('/logout', { method: 'POST' }).catch(() => {});
        window.location.href = `${BASE}/login`;
    });

    // Delegated: copy / QR / user row actions
    document.addEventListener('click', async (event) => {
        const el = event.target.closest('[data-copy],[data-qr],[data-edit],[data-toggle],[data-reset],[data-del],[data-gen]');
        if (!el) return;

        if (el.dataset.copy) return copy(el.dataset.copy);

        if (el.dataset.qr) {
            drawQR($('#qrCanvas'), el.dataset.qr);
            $('#qrCaption').textContent = el.dataset.qr;
            $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === 'subscriptions'));
            $$('.panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === 'subscriptions'));
            return;
        }

        if (el.dataset.gen === 'uuid')  return void ($('#fUuid').value = crypto.randomUUID());
        if (el.dataset.gen === 'uuser') return void ($('#uUuid').value = crypto.randomUUID());
        if (el.dataset.gen === 'pass')  return void ($('#fTrojan').value = randomHex(16));

        const id = el.dataset.edit || el.dataset.toggle || el.dataset.reset || el.dataset.del;
        if (!id) return;

        try {
            if (el.dataset.edit) {
                openUserModal(usersCache.find((u) => u.id === id));
            } else if (el.dataset.toggle) {
                await request(`/users?id=${id}&action=toggle`, { method: 'POST' });
                notify('User updated');
                loadUsers();
            } else if (el.dataset.reset) {
                if (!confirm('Reset traffic counters for this user?')) return;
                await request(`/users?id=${id}&action=reset-usage`, { method: 'POST' });
                notify('Usage reset');
                loadUsers();
            } else if (el.dataset.del) {
                if (!confirm('Delete this user permanently?')) return;
                await request(`/users?id=${id}`, { method: 'DELETE' });
                notify('User deleted');
                loadUsers();
            }
        } catch (err) {
            notify(err.message, 'error');
        }
    });

    // User search / filter
    $('#userSearch').addEventListener('input', renderUsers);
    $('#userFilter').addEventListener('change', renderUsers);
    $('#addUserBtn').addEventListener('click', () => openUserModal(null));
    $('#qaAddUser').addEventListener('click', () => {
        $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === 'users'));
        $$('.panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === 'users'));
        loadUsers().then(() => openUserModal(null));
    });

    $('#closeUserModal').addEventListener('click', closeUserModal);
    $('#cancelUser').addEventListener('click', closeUserModal);
    $('#userModal').addEventListener('click', (e) => { if (e.target.id === 'userModal') closeUserModal(); });

    $('#userForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const id = $('#uId').value;
        const payload = {
            name: $('#uName').value.trim(),
            uuid: $('#uUuid').value.trim(),
            limitGb: Number($('#uLimit').value) || 0,
            dailyLimitGb: Number($('#uDaily').value) || 0,
            notes: $('#uNotes').value,
        };
        const days = Number($('#uDays').value);
        if (days > 0) payload.expiryDays = days;

        try {
            await request(id ? `/users?id=${id}` : '/users', {
                method: id ? 'PUT' : 'POST',
                body: JSON.stringify(payload),
            });
            notify(id ? 'User updated' : 'User created');
            closeUserModal();
            loadUsers();
        } catch (err) {
            notify(err.message, 'error');
        }
    });

    // Settings form
    $('#settingsForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const btn = $('#saveBtn');
        btn.disabled = true;
        try {
            settings = await request('/settings', {
                method: 'PUT',
                body: JSON.stringify(collectSettings()),
            });
            notify('Settings saved');
            // The secret path may have changed — reload against the new base.
            if (settings.securePath && !BASE.endsWith(settings.securePath)) {
                notify('Secret path changed — redirecting…', 'warn');
                setTimeout(() => { window.location.href = `/${settings.securePath}/panel`; }, 1400);
            }
        } catch (err) {
            notify(err.message, 'error', 7000);
        } finally {
            btn.disabled = false;
        }
    });

    $('#resetBtn').addEventListener('click', async () => {
        if (!confirm('Restore all settings to their defaults?')) return;
        try {
            settings = await request('/settings/reset', { method: 'POST' });
            fillSettingsForm();
            notify('Settings restored');
        } catch (err) {
            notify(err.message, 'error');
        }
    });

    // Backup
    $('#qaExport').addEventListener('click', () => { window.location.href = api('/export'); });
    $('#qaImport').addEventListener('click', () => $('#importFile').click());
    $('#importFile').addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const payload = JSON.parse(await file.text());
            const result = await request('/import', { method: 'POST', body: JSON.stringify(payload) });
            notify(`Backup restored (${result.restoredUsers} new user(s))`);
            await loadAll();
        } catch (err) {
            notify(err.message, 'error', 7000);
        } finally {
            event.target.value = '';
        }
    });

    $('#qaEnforce').addEventListener('click', async () => {
        try {
            const result = await request('/users?action=enforce&id=all', { method: 'POST' });
            notify(`${result.disabled.length} user(s) disabled.`);
            loadUsers();
        } catch (err) {
            notify(err.message, 'error');
        }
    });

    // Logs
    $('#refreshLogs').addEventListener('click', loadLogs);
    $('#clearLogs').addEventListener('click', async () => {
        if (!confirm('Clear the activity log?')) return;
        await request('/logs', { method: 'DELETE' }).catch((e) => notify(e.message, 'error'));
        loadLogs();
    });
}

/* ───────────────────────────────── bootstrap ──────────────────────────── */

document.documentElement.dataset.theme = localStorage.getItem('tabora.theme') || 'dark';
renderPortChips();
applyLang();
bindEvents();

loadAll()
    .then(() => request('/my-ip').then((geo) => {
        $('#ovIp').textContent = geo?.query
            ? `${geo.query} · ${geo.country ?? ''} ${geo.city ?? ''}`.trim()
            : (geo?.ip ?? '—');
    }).catch(() => {}))
    .catch((err) => notify(err.message, 'error', 8000));

})();
