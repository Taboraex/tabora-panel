(() => {
'use strict';

const BASE = window.TABORA_BASE || '';
const api = (path) => `${BASE}/api${path}`;

/* ═══════════════════════════════════ i18n ═══════════════════════════════ */

const I18N = {
    en: {
        'tab.overview': 'Overview', 'tab.subs': 'Links', 'tab.users': 'Users',
        'tab.settings': 'Settings', 'tab.logs': 'Logs', 'tab.scanner': 'Scanner',
        'tab.gaming': 'Gaming',
        'game.find.title': 'Find a low-ping route',
        'game.find.run': 'Measure edges',
        'game.find.stop': 'Stop',
        'game.find.hint': 'Each address is measured several times from your own connection. Ranking favours steady ping over fast ping — a stable 90 ms plays better than a 40\u2013200 ms swing.',
        'game.port': 'Port', 'game.proto': 'Protocol',
        'game.measuring': 'Measuring {done} of {total}\u2026',
        'game.found': 'Best route: {ms} ms, jitter {jit} ms (grade {grade})',
        'game.nores': 'No edge responded. Your network may be blocking direct IPs \u2014 try another port.',
        'game.pin': 'Pin',
        'game.pinned.title': 'Pinned profiles',
        'game.pinned.hint': 'A pinned profile locks one IP, one port and one protocol. No auto-select group is emitted, so your client cannot switch route in the middle of a match.',
        'game.none': 'Nothing pinned yet.',
        'game.pinned.ok': 'Pinned \u2014 your gaming links now use this route',
        'game.unpin': 'Remove',
        'game.opts.title': 'Behaviour',
        'game.opts.lock': 'Lock to profile (no auto-switching)',
        'game.opts.bypass': 'Skip relay hop for game traffic',
        'game.opts.split': 'Split tunnel \u2014 route only games',
        'game.opts.save': 'Save',
        'game.opts.saved': 'Gaming settings saved',
        'game.links.title': 'Gaming subscription',
        'game.links.hint': 'These links contain only your pinned profiles.',
        'game.honest.title': 'What this can and cannot do',
        'game.honest.body': 'Cloudflare Workers carry TCP, not UDP. Most competitive shooters send gameplay over UDP and will not pass through any Workers-based tunnel \u2014 no panel can change that. What a pinned profile does give you: a route that never changes, no DNS lookup at connect time, no mid-match switching, and no extra relay hop. That is a real and measurable win for TCP games, launchers, and matchmaking.',
        'game.jitter': 'jitter', 'game.loss': 'loss',
        'scan.relay.title': 'Relay health',
        'scan.relay.run': 'Test relays',
        'scan.relay.apply': 'Use fastest',
        'scan.relay.hint': 'Relays carry your traffic when a site sits behind Cloudflare. Tested from the worker.',
        'scan.clean.title': 'Clean IP scan',
        'scan.clean.run': 'Scan from my network',
        'scan.clean.apply': 'Use fastest',
        'scan.clean.hint': 'Runs in your browser, so results reflect your own connection. Cloudflare blocks the worker from testing its own edges, which is why this runs here.',
        'scan.running': 'Testing…',
        'scan.progress': 'Tested {done} of {total}',
        'scan.done': '{n} working address(es) found',
        'scan.applied': 'Applied — your links now use these',
        'scan.unreachable': 'unreachable',
        'pool.kicker': 'Proxy IP Pool',
        'pool.title': 'Fixed Cloudflare IPs by country',
        'pool.hint': 'Pick a country. Tabora probes only Cloudflare IPs that belong to that country, measures them from your own network, and locks the fastest ones into every config as a fixed address — no DNS shuffle, no random edge.',
        'pool.keep': 'Keep best',
        'pool.lock': 'Lock configs to these IPs only',
        'pool.scan': 'Scan & pick the best',
        'pool.stop': 'Stop',
        'pool.clear': 'Clear',
        'pool.active.title': 'Active pool',
        'pool.pick': 'Pick a country first',
        'pool.measuring': 'Probing {done} of {total}',
        'pool.none': 'No IP from that country answered. Try another country, or Best for me.',
        'pool.applied': '{flag} {name} · {ip} · {ms} ms — configs now use this route',
        'pool.cleared': 'Pool cleared — configs use the default addresses again',
        'pool.use': 'Use',
        'pool.best': 'BEST',
        'pool.pinned': 'Pinned {n} fixed IP(s)',
        'pool.locked': 'Configs are locked to these IPs',
        'pool.unlocked': 'These IPs lead the list; the worker hostname is still included',
        'pool.featured': 'Popular',
        'pool.auto': 'Best for me',
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
        'set.uuid': 'UUID (VLESS)', 'set.trojanPass': 'Trojan password',
        'set.vless': 'VLESS', 'set.trojan': 'Trojan', 'set.echName': 'ECH server name',
        'set.tfo': 'TCP Fast Open', 'set.remoteDns': 'Remote DNS (DoH)',
        'set.localDns': 'Local DNS', 'set.ipv6': 'Enable IPv6', 'set.proxyIps': 'Proxy IPs',
        'set.nat64': 'NAT64 prefixes', 'set.blockQuic': 'Block QUIC (UDP 443)',
        'set.logLevel': 'Log level',
        'um.name': 'Name *', 'um.uuid': 'UUID', 'um.limit': 'Traffic limit (GB)',
        'um.daily': 'Daily limit (GB)', 'um.expiry': 'Expires in (days)', 'um.notes': 'Notes',
        'usr.active': 'Active', 'usr.paused': 'Paused', 'usr.expired': 'Expired',
        'usr.quotaExceeded': 'Quota used', 'usr.dailyLimit': 'Daily limit',
        'usr.link': 'Link', 'usr.qr': 'QR', 'usr.edit': 'Edit',
        'usr.pause': 'Pause', 'usr.resume': 'Resume', 'usr.reset': 'Reset',
        'usr.delete': 'Delete', 'usr.copy': 'Copy',
        'usr.none': 'No users found.',
        'usr.search': 'Search by name, UUID or note…',
        'usr.unlimited': 'Unlimited', 'qr.title': 'Scan to import',
        'chart.title': 'Traffic', 'chart.7d': '7 days', 'chart.30d': '30 days',
        'chart.empty': 'No traffic recorded yet.', 'chart.peak': 'Peak',
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
        'tab.settings': 'تنظیمات', 'tab.logs': 'گزارش‌ها', 'tab.scanner': 'اسکنر',
        'tab.gaming': 'گیمینگ',
        'game.find.title': 'پیدا کردن مسیر با پینگ پایین',
        'game.find.run': 'اندازه‌گیری لبه‌ها',
        'game.find.stop': 'توقف',
        'game.find.hint': 'هر آی‌پی چند بار از روی اینترنت خودتان تست می‌شود. رتبه‌بندی به جای سرعت، ثبات را در اولویت می‌گذارد \u2014 پینگ ثابت ۹۰ از پینگ نوسانی ۴۰ تا ۲۰۰ بهتر بازی می‌دهد.',
        'game.port': 'پورت', 'game.proto': 'پروتکل',
        'game.measuring': 'اندازه‌گیری {done} از {total}\u2026',
        'game.found': 'بهترین مسیر: {ms} میلی‌ثانیه، نوسان {jit} (درجه {grade})',
        'game.nores': 'هیچ لبه‌ای جواب نداد. ممکن است شبکه شما آی‌پی مستقیم را ببندد \u2014 پورت دیگری را امتحان کنید.',
        'game.pin': 'ثابت کن',
        'game.pinned.title': 'پروفایل‌های ثابت',
        'game.pinned.hint': 'پروفایل ثابت یک آی‌پی، یک پورت و یک پروتکل را قفل می‌کند. هیچ گروه انتخاب خودکاری ساخته نمی‌شود، پس کلاینت شما وسط بازی مسیر را عوض نمی‌کند.',
        'game.none': 'هنوز چیزی ثابت نشده.',
        'game.pinned.ok': 'ثابت شد \u2014 لینک‌های گیمینگ حالا از این مسیر استفاده می‌کنند',
        'game.unpin': 'حذف',
        'game.opts.title': 'رفتار',
        'game.opts.lock': 'قفل روی پروفایل (بدون جابه‌جایی خودکار)',
        'game.opts.bypass': 'رد کردن رله برای ترافیک بازی',
        'game.opts.split': 'تونل جدا \u2014 فقط بازی‌ها از تونل رد شوند',
        'game.opts.save': 'ذخیره',
        'game.opts.saved': 'تنظیمات گیمینگ ذخیره شد',
        'game.links.title': 'اشتراک گیمینگ',
        'game.links.hint': 'این لینک‌ها فقط شامل پروفایل‌های ثابت شما هستند.',
        'game.honest.title': 'این بخش چه می‌تواند و چه نمی‌تواند',
        'game.honest.body': 'ورکرهای کلادفلر فقط TCP را عبور می‌دهند، نه UDP. بیشتر شوترهای رقابتی داده بازی را روی UDP می‌فرستند و از هیچ تونل مبتنی بر ورکر رد نمی‌شوند \u2014 هیچ پنلی نمی‌تواند این را تغییر دهد. کاری که پروفایل ثابت واقعاً می‌کند: مسیری که هرگز عوض نمی‌شود، بدون جست‌وجوی DNS هنگام اتصال، بدون تعویض وسط بازی و بدون پرش اضافه از رله. این برای بازی‌های TCP، لانچرها و مچ‌میکینگ یک برد واقعی و قابل اندازه‌گیری است.',
        'game.jitter': 'نوسان', 'game.loss': 'اتلاف',
        'scan.relay.title': 'سلامت رله‌ها',
        'scan.relay.run': 'تست رله‌ها',
        'scan.relay.apply': 'استفاده از سریع‌ترین',
        'scan.relay.hint': 'وقتی سایتی پشت کلادفلر باشد، رله‌ها ترافیک شما را عبور می‌دهند. تست از سمت ورکر انجام می‌شود.',
        'scan.clean.title': 'اسکن آی‌پی تمیز',
        'scan.clean.run': 'اسکن از شبکه من',
        'scan.clean.apply': 'استفاده از سریع‌ترین',
        'scan.clean.hint': 'این اسکن در مرورگر شما اجرا می‌شود تا نتیجه با اینترنت خودتان بخواند. کلادفلر اجازه نمی‌دهد ورکر لبه‌های خودش را تست کند، برای همین اینجا اجرا می‌شود.',
        'scan.running': 'در حال تست…',
        'scan.progress': '{done} از {total} تست شد',
        'scan.done': '{n} آدرس سالم پیدا شد',
        'scan.applied': 'اعمال شد — لینک‌های شما از این آدرس‌ها استفاده می‌کنند',
        'scan.unreachable': 'در دسترس نیست',
        'pool.kicker': 'استخر Proxy IP',
        'pool.title': 'آی‌پی ثابت کلادفلر بر اساس کشور',
        'pool.hint': 'یک کشور انتخاب کنید. تابورا فقط آی‌پی‌های کلادفلر همان کشور را از روی اینترنت خودتان تست می‌کند و سریع‌ترین‌ها را به‌عنوان آدرس ثابت داخل همه کانفیگ‌ها قفل می‌کند — بدون عوض شدن DNS و بدون لبه تصادفی.',
        'pool.keep': 'نگه‌داشتن بهترین‌ها',
        'pool.lock': 'قفل کانفیگ فقط روی همین آی‌پی‌ها',
        'pool.scan': 'اسکن و انتخاب بهترین',
        'pool.stop': 'توقف',
        'pool.clear': 'پاک کردن',
        'pool.active.title': 'استخر فعال',
        'pool.pick': 'اول یک کشور انتخاب کنید',
        'pool.measuring': 'تست {done} از {total}',
        'pool.none': 'هیچ آی‌پی از آن کشور جواب نداد. کشور دیگری یا «بهترین برای من» را امتحان کنید.',
        'pool.applied': '{flag} {name} · {ip} · {ms} میلی‌ثانیه — کانفیگ‌ها حالا از این مسیر استفاده می‌کنند',
        'pool.cleared': 'استخر پاک شد — کانفیگ‌ها دوباره از آدرس‌های پیش‌فرض استفاده می‌کنند',
        'pool.use': 'استفاده',
        'pool.best': 'بهترین',
        'pool.pinned': '{n} آی‌پی ثابت قفل شد',
        'pool.locked': 'کانفیگ‌ها فقط روی همین آی‌پی‌ها قفل شده‌اند',
        'pool.unlocked': 'این آی‌پی‌ها اول لیست‌اند؛ نام ورکر هنوز هست',
        'pool.featured': 'پیشنهادی',
        'pool.auto': 'بهترین برای من',
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
        'set.uuid': 'شناسه UUID (VLESS)', 'set.trojanPass': 'رمز Trojan',
        'set.vless': 'VLESS', 'set.trojan': 'Trojan', 'set.echName': 'نام سرور ECH',
        'set.tfo': 'TCP Fast Open', 'set.remoteDns': 'DNS راه دور (DoH)',
        'set.localDns': 'DNS محلی', 'set.ipv6': 'فعال‌سازی IPv6', 'set.proxyIps': 'آی‌پی‌های واسط',
        'set.nat64': 'پیشوندهای NAT64', 'set.blockQuic': 'مسدودسازی QUIC (UDP 443)',
        'set.logLevel': 'سطح گزارش',
        'um.name': 'نام *', 'um.uuid': 'شناسه UUID', 'um.limit': 'محدودیت ترافیک (گیگابایت)',
        'um.daily': 'محدودیت روزانه (گیگابایت)', 'um.expiry': 'انقضا (روز)', 'um.notes': 'یادداشت',
        'usr.active': 'فعال', 'usr.paused': 'متوقف', 'usr.expired': 'منقضی',
        'usr.quotaExceeded': 'اتمام حجم', 'usr.dailyLimit': 'سقف روزانه',
        'usr.link': 'لینک', 'usr.qr': 'کد QR', 'usr.edit': 'ویرایش',
        'usr.pause': 'توقف', 'usr.resume': 'ادامه', 'usr.reset': 'صفر کردن',
        'usr.delete': 'حذف', 'usr.copy': 'کپی',
        'usr.none': 'کاربری یافت نشد.',
        'usr.search': 'جستجو بر اساس نام، شناسه یا یادداشت…',
        'usr.unlimited': 'نامحدود', 'qr.title': 'برای افزودن اسکن کنید',
        'chart.title': 'مصرف ترافیک', 'chart.7d': '۷ روز', 'chart.30d': '۳۰ روز',
        'chart.empty': 'هنوز مصرفی ثبت نشده است.', 'chart.peak': 'بیشترین',
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

/** Map a backend status string onto its localised label. */
const STATUS_KEYS = {
    active: 'usr.active',
    paused: 'usr.paused',
    expired: 'usr.expired',
    'quota-exceeded': 'usr.quotaExceeded',
    'daily-limit': 'usr.dailyLimit',
    'auto-disabled': 'usr.paused',
};
const statusLabel = (status) => t(STATUS_KEYS[status] ?? 'usr.active');

/** Translate a key for use in dynamically generated markup. */
const t = (key) => (I18N[lang] || I18N.en)[key] ?? I18N.en[key] ?? key;

function applyLang() {
    const dict = I18N[lang] || I18N.en;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
        const value = dict[el.dataset.i18n];
        if (value) el.textContent = value;
    });
    // Placeholders are attributes, so they need their own pass.
    document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
        const value = dict[el.dataset.i18nPh];
        if (value) el.setAttribute('placeholder', value);
    });
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    $('#langLabel').textContent = lang.toUpperCase();
    localStorage.setItem('tabora.lang', lang);
}

/**
 * Re-render everything that JavaScript generated.
 *
 * applyLang can only translate markup that exists in the document with a
 * data-i18n attribute. Rows built from templates carry no such markers, so
 * without this a language switch leaves buttons and badges in the old
 * language until the next reload.
 */
function redrawDynamic() {
    try { renderGamingProfiles(); } catch { /* not loaded yet */ }
    try { renderCountryGrid(); } catch { /* not loaded yet */ }
    try { renderPoolActive(); } catch { /* not loaded yet */ }
    if (usersCache.length) renderUsers();
    if (meta.subscriptionBase) renderSubscriptions();
    // Logs are fetched and rendered together, so refetch only if that tab is
    // the one on screen.
    if (document.querySelector('.panel.active')?.dataset.panel === 'logs') loadLogs();
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
          <button class="btn tiny" data-copy="${escapeHtml(url)}">${t('usr.copy')}</button>
          <button class="btn tiny" data-qr="${escapeHtml(url)}">${t('usr.qr')}</button>
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
        $('#userList').innerHTML = `<p class="empty">${t('usr.none')}</p>`;
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
              <span class="pill ${u.status}">${statusLabel(u.status)}</span>
            </div>
            <div class="user-meta">
              <span>${formatBytes(used)}${limit ? ` / ${formatBytes(limit)}` : ' / ∞'}</span>
              <span>${u.expiryMs ? new Date(u.expiryMs).toISOString().slice(0, 10) : '∞'}</span>
              <span title="${escapeHtml(u.uuid)}">${escapeHtml(u.uuid.slice(0, 8))}…</span>
            </div>
            ${limit ? `<div class="bar ${over ? 'over' : ''}"><i style="width:${pct}%"></i></div>` : ''}
          </div>
          <div class="user-actions">
            <button class="btn tiny" data-copy="${escapeHtml(subUrl)}">${t('usr.link')}</button>
            <button class="btn tiny" data-qr="${escapeHtml(subUrl)}">${t('usr.qr')}</button>
            <button class="btn tiny" data-edit="${u.id}">${t('usr.edit')}</button>
            <button class="btn tiny" data-toggle="${u.id}">${u.isPaused ? t('usr.resume') : t('usr.pause')}</button>
            <button class="btn tiny" data-reset="${u.id}">${t('usr.reset')}</button>
            <button class="btn tiny danger" data-del="${u.id}">${t('usr.delete')}</button>
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

    try {
        renderGamingProfiles();
    } catch (err) {
        console.error('Could not render gaming profiles:', err);
    }

    try {
        await loadPoolMeta();
    } catch (err) {
        console.error('Could not load IP pool:', err);
    }

    // Decorative and independently guarded, like the block above.
    loadChart().catch((err) => console.error('Could not render chart:', err));

    if (!meta.persistent) {
        notify('No D1 or KV binding found — settings will not persist.', 'warn', 9000);
    }
}


/* ════════════════════════════════ chart ═════════════════════════════════ */

let chartDays = 30;

/**
 * Draw the traffic history as an inline SVG area chart.
 *
 * Hand-rolled rather than pulled from a charting library: the panel ships as
 * one self-contained file, and a CDN dependency would be both a size cost and
 * a availability risk in exactly the networks this tool is used on.
 */
function renderChart(history) {
    const box = $('#chartBox');

    if (!history.length || history.every((d) => d.bytes === 0)) {
        box.innerHTML = `<p class="empty">${t('chart.empty')}</p>`;
        return;
    }

    const W = 720, H = 180, PAD = 4;
    const peak = Math.max(...history.map((d) => d.bytes));
    const step = history.length > 1 ? W / (history.length - 1) : W;

    // Map a value to a y coordinate, leaving headroom above the peak.
    const y = (bytes) => H - PAD - (bytes / (peak * 1.15)) * (H - PAD * 2);

    const points = history.map((d, i) => [i * step, y(d.bytes)]);
    const line = points.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join('');
    const area = `${line}L${W},${H}L0,${H}Z`;

    const bars = history.map((d, i) => {
        const px = i * step;
        return `<rect class="chart-hit" x="${(px - step / 2).toFixed(1)}" y="0"
                 width="${step.toFixed(1)}" height="${H}"
                 data-day="${d.day}" data-bytes="${d.bytes}"></rect>`;
    }).join('');

    box.innerHTML = `
      <svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img"
           aria-label="${t('chart.title')}">
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--accent)" stop-opacity=".35"/>
            <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path d="${area}" fill="url(#chartFill)"/>
        <path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2"
              vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
        ${bars}
      </svg>
      <div class="chart-axis">
        <span>${history[0].day}</span>
        <span class="chart-peak">${t('chart.peak')}: ${formatBytes(peak)}</span>
        <span>${history[history.length - 1].day}</span>
      </div>
      <div class="chart-tip" id="chartTip" hidden></div>`;

    // Hover readout. Pointer events on wide invisible bars are far more
    // forgiving than trying to hit a 2px line.
    const tip = $('#chartTip');
    box.querySelectorAll('.chart-hit').forEach((hit) => {
        hit.addEventListener('mouseenter', () => {
            tip.hidden = false;
            tip.textContent = `${hit.dataset.day} · ${formatBytes(Number(hit.dataset.bytes))}`;
        });
    });
    box.addEventListener('mouseleave', () => { tip.hidden = true; });
}

async function loadChart() {
    try {
        const data = await request(`/usage-history?days=${chartDays}`);
        renderChart(data.history ?? []);
    } catch {
        $('#chartBox').innerHTML = `<p class="empty">${t('chart.empty')}</p>`;
    }
}

/* ═══════════════════════════════════ QR ═════════════════════════════════ */

let qrModalUrl = '';

function openQrModal(url) {
    qrModalUrl = url;
    drawQR($('#qrModalCanvas'), url);
    $('#qrModalCaption').textContent = url;
    $('#qrModal').hidden = false;
}

const closeQrModal = () => { $('#qrModal').hidden = true; };


/* ═════════════════════════════════ gaming ═══════════════════════════════ */

let gameRanked = [];
let gameAbort = false;

const GRADE_CLASS = { S: 'grade-s', A: 'grade-a', B: 'grade-b', C: 'grade-c', D: 'grade-d' };

/**
 * Time one TLS handshake against a bare Cloudflare IP.
 *
 * The certificate is issued for the worker's domain, so requesting an IP
 * literal always fails validation — but the failure only happens *after* TCP
 * and TLS have completed, so the elapsed time is a genuine round-trip
 * measurement. That means a rejected promise is a success for our purposes;
 * only an abort (timeout) means the edge is actually unreachable.
 */
function probeEndpoint(ip, port, timeoutMs = 3000) {
    return new Promise((resolve) => {
        const started = performance.now();
        const controller = new AbortController();
        let settled = false;

        const timer = setTimeout(() => { controller.abort(); }, timeoutMs);
        const finish = (ms) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(ms);
        };

        fetch(`https://${ip}:${port}/cdn-cgi/trace`, {
            mode: 'no-cors',
            cache: 'no-store',
            signal: controller.signal,
            redirect: 'manual',
        })
            .then(() => finish(Math.round(performance.now() - started)))
            .catch(() => {
                // Aborted = never answered. Anything else = the stack replied.
                finish(controller.signal.aborted ? -1 : Math.round(performance.now() - started));
            });
    });
}

/** Measure every candidate several times, then have the worker rank them. */
async function runGamingScan() {
    const btn = $('#gameScan');
    const stopBtn = $('#gameStop');
    const box = $('#gameResults');
    const prog = $('#gameProgress');

    gameAbort = false;
    btn.disabled = true;
    stopBtn.hidden = false;
    box.innerHTML = '';
    gameRanked = [];

    try {
        const { addresses = [], probesPerIp = 5 } = await request('/gaming/candidates');
        const port = Number($('#gamePort').value) || 443;
        const total = addresses.length;
        const measurements = [];
        let done = 0;

        // Two at a time: more parallelism makes the samples contend for
        // bandwidth and inflates the very numbers we are trying to measure.
        const queue = [...addresses];
        const workers = Array.from({ length: 2 }, async () => {
            for (;;) {
                if (gameAbort) return;
                const ip = queue.shift();
                if (!ip) return;

                const samples = [];
                for (let i = 0; i < probesPerIp; i++) {
                    if (gameAbort) break;
                    samples.push(await probeEndpoint(ip, port));
                }

                measurements.push({ address: ip, port, samples });
                done++;
                prog.textContent = t('game.measuring')
                    .replace('{done}', String(done))
                    .replace('{total}', String(total));
            }
        });
        await Promise.all(workers);

        if (!measurements.length) { prog.textContent = ''; return; }

        const { ranked = [], best = null } = await request('/gaming/rank', {
            method: 'POST',
            body: JSON.stringify({ measurements }),
        });

        gameRanked = ranked;
        renderGameResults(ranked);
        prog.textContent = '';

        if (best) {
            notify(t('game.found')
                .replace('{ms}', String(best.medianMs))
                .replace('{jit}', String(best.jitterMs))
                .replace('{grade}', best.grade));
        } else {
            notify(t('game.nores'), 'warn', 6000);
        }
    } catch (err) {
        box.innerHTML = `<p class="empty">${escapeHtml(err.message)}</p>`;
        prog.textContent = '';
    } finally {
        btn.disabled = false;
        stopBtn.hidden = true;
    }
}

function renderGameResults(rows) {
    const box = $('#gameResults');
    const usable = rows.filter((r) => r.ok);

    if (!usable.length) {
        box.innerHTML = `<p class="empty">${escapeHtml(t('game.nores'))}</p>`;
        return;
    }

    box.innerHTML = usable.map((r) => `
        <div class="game-row">
          <span class="game-grade ${GRADE_CLASS[r.grade] ?? ''}">${escapeHtml(r.grade)}</span>
          <span class="game-addr">${escapeHtml(r.address)}<small>:${r.port}</small></span>
          <span class="game-metrics">
            <b><bdi>${r.medianMs} ms</bdi></b>
            <small>${escapeHtml(t('game.jitter'))} <bdi>${r.jitterMs} ms</bdi></small>
            <small>${escapeHtml(t('game.loss'))} <bdi>${Math.round(r.lossRate * 100)}%</bdi></small>
          </span>
          <button class="btn tiny primary" data-pin="${escapeHtml(r.address)}" data-port="${r.port}"
                  data-grade="${escapeHtml(r.grade)}" data-median="${r.medianMs}"
                  data-jitter="${r.jitterMs}" data-loss="${Math.round(r.lossRate * 100)}">
            ${escapeHtml(t('game.pin'))}
          </button>
        </div>`).join('');
}

async function pinProfile(dataset) {
    await request('/gaming/pin', {
        method: 'POST',
        body: JSON.stringify({
            name: `${dataset.pin}`,
            address: dataset.pin,
            port: Number(dataset.port),
            protocol: $('#gameProto').value,
            medianMs: Number(dataset.median),
            jitterMs: Number(dataset.jitter),
            lossPct: Number(dataset.loss),
            grade: dataset.grade,
        }),
    });
    notify(t('game.pinned.ok'));
    await loadAll();
}

async function unpinProfile(id) {
    await request('/gaming/unpin', { method: 'POST', body: JSON.stringify({ id }) });
    await loadAll();
}

function renderGamingProfiles() {
    const box = $('#gamePinned');
    const profiles = settings.gaming?.profiles ?? [];
    $('#gameCount').textContent = String(profiles.length);

    const linksCard = $('#gameLinksCard');
    if (linksCard) linksCard.hidden = profiles.length === 0;

    if (!profiles.length) {
        box.innerHTML = `<p class="empty">${escapeHtml(t('game.none'))}</p>`;
    } else {
        box.innerHTML = profiles.map((p) => `
            <div class="game-row pinned">
              <span class="game-grade ${GRADE_CLASS[p.grade] ?? ''}">${escapeHtml(p.grade)}</span>
              <span class="game-addr">${escapeHtml(p.address)}<small>:${p.port} · ${escapeHtml(p.protocol)}</small></span>
              <span class="game-metrics">
                <b><bdi>${p.medianMs >= 0 ? `${p.medianMs} ms` : '—'}</bdi></b>
                <small>${escapeHtml(t('game.jitter'))} <bdi>${p.jitterMs} ms</bdi></small>
              </span>
              <button class="btn tiny danger" data-unpin="${escapeHtml(p.id)}">${escapeHtml(t('game.unpin'))}</button>
            </div>`).join('');
    }

    // Subscription links carrying only the pinned routes.
    const base = meta.subscriptionBase ?? '';
    const links = $('#gameLinks');
    if (links && base) {
        const rows = [
            ['Xray / v2rayNG', `${base}?gaming=1`],
            ['Clash / Mihomo', `${base}?gaming=1&format=clash`],
            ['Sing-box / Hiddify', `${base}?gaming=1&format=singbox`],
        ];
        links.innerHTML = rows.map(([label, url]) => `
            <div class="sub-row">
              <span class="sub-label">${escapeHtml(label)}</span>
              <input class="sub-url" readonly value="${escapeHtml(url)}">
              <button class="btn tiny" data-copy="${escapeHtml(url)}">${escapeHtml(t('usr.copy'))}</button>
              <button class="btn tiny" data-qr="${escapeHtml(url)}">QR</button>
            </div>`).join('');
    }

    const g = settings.gaming ?? {};
    if ($('#gLock')) $('#gLock').checked = g.lockToProfile !== false;
    if ($('#gBypass')) $('#gBypass').checked = g.bypassRelay !== false;
    if ($('#gSplit')) $('#gSplit').checked = !!g.splitTunnel;
}

function renderGamingPorts() {
    const sel = $('#gamePort');
    if (!sel || sel.options.length) return;
    for (const port of [443, 2053, 2083, 2087, 2096, 8443]) {
        const opt = document.createElement('option');
        opt.value = String(port);
        opt.textContent = String(port);
        sel.appendChild(opt);
    }
}

async function saveGamingOptions() {
    await request('/settings', {
        method: 'PUT',
        body: JSON.stringify({
            gaming: {
                ...(settings.gaming ?? {}),
                lockToProfile: $('#gLock').checked,
                bypassRelay: $('#gBypass').checked,
                splitTunnel: $('#gSplit').checked,
            },
        }),
    });
    notify(t('game.opts.saved'));
    await loadAll();
}

/* ═════════════════════════════════ scanner ══════════════════════════════ */

let relayBest = [];
let cleanBest = [];

const fmtMs = (ms) => `${ms} ms`;

function renderProbeRows(container, rows, unit = 'ms') {
    if (!rows.length) {
        container.innerHTML = '<p class="empty">—</p>';
        return;
    }
    container.innerHTML = rows.map((r) => {
        const label = r.ok ? `${r.latency} ${unit}` : (r.error ?? 'failed');
        return `<div class="log-row">
            <span class="log-type ${r.ok ? '' : 'danger'}">${r.ok ? '●' : '○'}</span>
            <span class="log-detail">${escapeHtml(r.address)}</span>
            <span class="log-time">${escapeHtml(label)}</span>
        </div>`;
    }).join('');
}

/** Relay probing happens worker-side — relays are outside Cloudflare's network. */
async function scanRelays() {
    const btn = $('#scanRelays');
    const box = $('#relayResults');
    btn.disabled = true;
    box.innerHTML = `<p class="empty">${t('scan.running')}</p>`;

    try {
        const res = await request('/scan', {
            method: 'POST',
            body: JSON.stringify({ source: 'relay', mode: 'tcp', timeoutMs: 5000, concurrency: 6 }),
        });
        const results = res.results ?? [];
        renderProbeRows(box, results);
        relayBest = results.filter((r) => r.ok).map((r) => `${r.address}:${r.port}`);
        $('#applyRelays').disabled = relayBest.length === 0;
        notify(t('scan.done').replace('{n}', String(relayBest.length)));
    } catch (err) {
        box.innerHTML = `<p class="empty">${escapeHtml(err.message)}</p>`;
    } finally {
        btn.disabled = false;
    }
}

/**
 * Clean-IP probing happens here in the browser.
 *
 * A worker cannot open sockets to Cloudflare's own edges, and even if it
 * could, its latency would describe the datacentre rather than the operator's
 * network. Timing an image fetch from the browser measures the path that
 * actually matters.
 */
async function scanCleanIPs() {
    const btn = $('#scanClean');
    const box = $('#cleanResults');
    const prog = $('#cleanProgress');
    btn.disabled = true;
    box.innerHTML = '';
    cleanBest = [];

    try {
        const { domains = [] } = await request('/scan/candidates');
        const results = [];
        let done = 0;

        // Small concurrency: browsers cap connections per host anyway.
        const queue = [...domains];
        const workers = Array.from({ length: 4 }, async () => {
            for (;;) {
                const host = queue.shift();
                if (!host) return;
                results.push(await probeFromBrowser(host));
                done++;
                prog.textContent = t('scan.progress')
                    .replace('{done}', String(done))
                    .replace('{total}', String(domains.length));
                renderProbeRows(box, [...results].sort(sortProbes));
            }
        });
        await Promise.all(workers);

        results.sort(sortProbes);
        renderProbeRows(box, results);
        cleanBest = results.filter((r) => r.ok).map((r) => r.address);
        $('#applyClean').disabled = cleanBest.length === 0;
        prog.textContent = '';
        notify(t('scan.done').replace('{n}', String(cleanBest.length)));
    } catch (err) {
        box.innerHTML = `<p class="empty">${escapeHtml(err.message)}</p>`;
    } finally {
        btn.disabled = false;
    }
}

const sortProbes = (a, b) => (a.ok === b.ok ? a.latency - b.latency : (a.ok ? -1 : 1));

/**
 * Time a request to one candidate edge.
 *
 * /cdn-cgi/trace is blocked by CORS, so we cannot read the response — but a
 * no-cors fetch still completes the TCP + TLS round trip, and that timing is
 * exactly what we want. A failure means the edge is unreachable from here.
 */
function probeFromBrowser(host, timeoutMs = 5000) {
    return new Promise((resolve) => {
        const started = performance.now();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        fetch(`https://${host}/cdn-cgi/trace`, {
            mode: 'no-cors',
            cache: 'no-store',
            signal: controller.signal,
        })
            .then(() => {
                clearTimeout(timer);
                resolve({ address: host, ok: true, latency: Math.round(performance.now() - started) });
            })
            .catch(() => {
                clearTimeout(timer);
                resolve({ address: host, ok: false, latency: -1, error: t('scan.unreachable') });
            });
    });
}

async function applyRelays() {
    await request('/settings', {
        method: 'PUT',
        body: JSON.stringify({ proxyIPs: relayBest.slice(0, 3) }),
    });
    notify(t('scan.applied'));
    await loadAll();
}

async function applyCleanIPs() {
    await request('/scan/apply', {
        method: 'POST',
        body: JSON.stringify({ addresses: cleanBest.slice(0, 10) }),
    });
    notify(t('scan.applied'));
    await loadAll();
}

/* ══════════════════════════════ proxy ip pool ═══════════════════════════ */

let poolCountries = [];
let poolSelected = '';
let poolAbort = false;
let poolRanked = [];

const countryLabel = (c) => {
    if (!c) return '';
    if (c.code === 'AUTO') return t('pool.auto');
    return lang === 'fa' ? (c.nameFa || c.name) : c.name;
};

async function loadPoolMeta() {
    const data = await request('/scan/pool');
    poolCountries = data.countries ?? [];
    if (!poolSelected && data.pool?.country) poolSelected = data.pool.country;
    if ($('#poolKeep') && data.pool?.keep) $('#poolKeep').value = String(data.pool.keep);
    if ($('#poolLock')) $('#poolLock').checked = data.pool?.lockToPool !== false;
    renderCountryGrid();
    renderPoolActive();
}

function renderCountryGrid() {
    const box = $('#countryGrid');
    if (!box) return;
    if (!poolCountries.length) {
        box.innerHTML = '';
        return;
    }

    box.innerHTML = poolCountries.map((c) => {
        const selected = c.code === poolSelected ? ' selected' : '';
        const featured = c.featured ? ' featured' : '';
        const star = c.featured && c.code !== 'AUTO'
            ? `<span class="country-star" title="${escapeHtml(t('pool.featured'))}">★</span>`
            : '';
        const colo = c.code === 'AUTO' ? 'AUTO' : (c.colo || '');
        return `<button type="button" class="country-card${selected}${featured}" data-country="${escapeHtml(c.code)}">
            ${star}
            <span class="country-flag">${c.flag}</span>
            <span class="country-name">${escapeHtml(countryLabel(c))}</span>
            <span class="country-colo">${escapeHtml(colo)}</span>
        </button>`;
    }).join('');

    const scanBtn = $('#poolScan');
    if (scanBtn) scanBtn.disabled = !poolSelected;
}

function selectPoolCountry(code) {
    poolSelected = code;
    renderCountryGrid();
}

function renderPoolActive() {
    const card = $('#poolActiveCard');
    const box = $('#poolActive');
    if (!card || !box) return;

    const pool = settings.ipPool;
    const entries = pool?.enabled ? (pool.entries ?? []) : [];
    if (!entries.length) {
        card.hidden = true;
        box.innerHTML = '';
        return;
    }

    card.hidden = false;
    const country = poolCountries.find((c) => c.code === pool.country);
    const flag = country?.flag || '🌐';
    const name = countryLabel(country) || pool.country;
    const when = pool.scannedAt ? new Date(pool.scannedAt).toLocaleString() : '';
    const lockNote = pool.lockToPool ? t('pool.locked') : t('pool.unlocked');

    box.innerHTML = `
      <div class="pool-active-head">
        <span class="pool-active-flag">${flag}</span>
        <div>
          <div class="pool-active-title">${escapeHtml(name)}</div>
          <div class="pool-active-sub">${escapeHtml(lockNote)}${when ? ` · ${escapeHtml(when)}` : ''}</div>
        </div>
      </div>
      <div class="pool-pills">
        ${entries.map((e, i) => `
          <span class="pool-pill">
            <b>#${i + 1}</b>
            ${escapeHtml(e.address)}
            <span>${e.latency} ms</span>
          </span>`).join('')}
      </div>`;
}

function renderPoolResults(rows) {
    const box = $('#poolResults');
    if (!box) return;
    const usable = rows.filter((r) => r.ok);
    if (!usable.length) {
        box.innerHTML = `<p class="empty">${escapeHtml(t('pool.none'))}</p>`;
        return;
    }

    const peak = Math.max(...usable.map((r) => r.medianMs), 1);
    box.innerHTML = usable.map((r, i) => {
        const pct = Math.max(8, Math.round((r.medianMs / peak) * 100));
        const speed = r.medianMs < 80 ? '' : r.medianMs < 160 ? ' mid' : ' slow';
        const best = i === 0 ? ' best' : '';
        return `<div class="pool-row${best}">
          <span class="pool-rank">${i === 0 ? '★' : i + 1}</span>
          <span class="game-grade ${GRADE_CLASS[r.grade] ?? ''}">${escapeHtml(r.grade)}</span>
          <span class="pool-ip">${escapeHtml(r.address)}<small>${escapeHtml(r.colo && r.colo !== '*' ? r.colo : '')}</small></span>
          <span class="pool-lat">
            <b><bdi>${r.medianMs} ms</bdi></b>
            <span class="pool-lat-bar${speed}"><i style="width:${pct}%"></i></span>
          </span>
          <button class="btn tiny${i === 0 ? ' primary' : ''}" data-pool-use="${escapeHtml(r.address)}"
                  data-median="${r.medianMs}" data-grade="${escapeHtml(r.grade)}">
            ${escapeHtml(i === 0 ? t('pool.best') : t('pool.use'))}
          </button>
        </div>`;
    }).join('');
}

async function runPoolScan() {
    if (!poolSelected) {
        notify(t('pool.pick'), 'warn');
        return;
    }

    const btn = $('#poolScan');
    const stopBtn = $('#poolStop');
    const hero = $('#poolHero');
    const live = $('#poolLive');
    const prog = $('#poolProgress');
    const bar = $('#poolBar');
    const progText = $('#poolProgText');
    const progIp = $('#poolProgIp');
    const box = $('#poolResults');

    poolAbort = false;
    poolRanked = [];
    btn.disabled = true;
    stopBtn.hidden = false;
    hero.classList.add('scanning');
    live.hidden = false;
    prog.hidden = false;
    box.innerHTML = '';
    bar.style.width = '0%';

    try {
        const keep = Number($('#poolKeep').value) || 3;
        const { addresses = [], probesPerIp = 3, country } = await request(
            `/scan/pool/candidates?country=${encodeURIComponent(poolSelected)}&count=32`,
        );
        const total = addresses.length;
        const measurements = [];
        let done = 0;

        const queue = [...addresses];
        const workers = Array.from({ length: 4 }, async () => {
            for (;;) {
                if (poolAbort) return;
                const ip = queue.shift();
                if (!ip) return;
                progIp.textContent = ip;

                const samples = [];
                for (let i = 0; i < probesPerIp; i++) {
                    if (poolAbort) break;
                    samples.push(await probeEndpoint(ip, 443, 3500));
                }
                measurements.push({ address: ip, samples });
                done++;
                const pct = Math.round((done / total) * 100);
                bar.style.width = `${pct}%`;
                progText.textContent = t('pool.measuring')
                    .replace('{done}', String(done))
                    .replace('{total}', String(total));
            }
        });
        await Promise.all(workers);

        if (!measurements.length) {
            box.innerHTML = `<p class="empty">${escapeHtml(t('pool.none'))}</p>`;
            return;
        }

        const result = await request('/scan/pool/apply', {
            method: 'POST',
            body: JSON.stringify({
                country: poolSelected,
                keep,
                lockToPool: $('#poolLock').checked,
                measurements,
            }),
        });

        poolRanked = result.ranked ?? [];
        renderPoolResults(poolRanked);
        settings.ipPool = result.pool;
        if (result.entries) settings.cleanIPs = result.entries.map((e) => e.address);
        fillSettingsForm();
        renderPoolActive();

        const best = result.best;
        if (best) {
            notify(t('pool.applied')
                .replace('{flag}', country?.flag || result.country?.flag || '')
                .replace('{name}', countryLabel(country || result.country) || poolSelected)
                .replace('{ip}', best.address)
                .replace('{ms}', String(best.latency)));
        } else {
            notify(t('pool.none'), 'warn', 6000);
        }
    } catch (err) {
        box.innerHTML = `<p class="empty">${escapeHtml(err.message)}</p>`;
    } finally {
        btn.disabled = !poolSelected;
        stopBtn.hidden = true;
        hero.classList.remove('scanning');
        live.hidden = true;
        prog.hidden = true;
        progIp.textContent = '';
        progText.textContent = '';
    }
}

async function applySinglePoolIp(address) {
    const row = poolRanked.find((r) => r.address === address && r.ok);
    if (!row) return;
    const result = await request('/scan/pool/apply', {
        method: 'POST',
        body: JSON.stringify({
            country: poolSelected || settings.ipPool?.country || 'AUTO',
            keep: 1,
            lockToPool: $('#poolLock').checked,
            measurements: [{
                address: row.address,
                samples: [row.medianMs, row.medianMs, row.medianMs],
            }],
        }),
    });
    settings.ipPool = result.pool;
    fillSettingsForm();
    renderPoolActive();
    notify(t('pool.applied')
        .replace('{flag}', result.country?.flag || '')
        .replace('{name}', countryLabel(result.country) || '')
        .replace('{ip}', address)
        .replace('{ms}', String(row.medianMs)));
}

async function clearPool() {
    await request('/scan/pool/clear', { method: 'POST' });
    settings.ipPool = { enabled: false, country: '', lockToPool: true, keep: 3, entries: [], scannedAt: 0 };
    renderPoolActive();
    $('#poolResults').innerHTML = '';
    notify(t('pool.cleared'));
    await loadAll();
}

function bindEvents() {
    $$('[data-range]').forEach((btn) => btn.addEventListener('click', () => {
        chartDays = Number(btn.dataset.range);
        $$('[data-range]').forEach((b) => b.classList.toggle('active', b === btn));
        loadChart();
    }));

    $('#closeQrModal')?.addEventListener('click', closeQrModal);
    $('#qrModalCopy')?.addEventListener('click', () => copy(qrModalUrl));
    $('#qrModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'qrModal') closeQrModal();
    });
    // Escape should dismiss whichever modal is open.
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeQrModal();
    });

    renderGamingPorts();
    $('#gameScan')?.addEventListener('click', () => runGamingScan());
    $('#gameStop')?.addEventListener('click', () => { gameAbort = true; });
    $('#gameSaveOpts')?.addEventListener('click',
        () => saveGamingOptions().catch((e) => notify(e.message, 'error')));

    $('#scanRelays')?.addEventListener('click', scanRelays);
    $('#applyRelays')?.addEventListener('click', () => applyRelays().catch((e) => notify(e.message, 'error')));
    $('#scanClean')?.addEventListener('click', scanCleanIPs);
    $('#applyClean')?.addEventListener('click', () => applyCleanIPs().catch((e) => notify(e.message, 'error')));
    $('#poolScan')?.addEventListener('click', () => runPoolScan().catch((e) => notify(e.message, 'error')));
    $('#poolStop')?.addEventListener('click', () => { poolAbort = true; });
    $('#poolClear')?.addEventListener('click', () => clearPool().catch((e) => notify(e.message, 'error')));
    $('#countryGrid')?.addEventListener('click', (event) => {
        const card = event.target.closest('[data-country]');
        if (card) selectPoolCountry(card.dataset.country);
    });

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
        // Lists are built in JS, so a language switch has to rebuild them —
        // applyLang only touches elements that carry a data-i18n attribute.
        redrawDynamic();
    });

    $('#logoutBtn').addEventListener('click', async () => {
        await request('/logout', { method: 'POST' }).catch(() => {});
        window.location.href = `${BASE}/login`;
    });

    // Delegated: copy / QR / user row actions
    document.addEventListener('click', async (event) => {
        const poolUse = event.target.closest('[data-pool-use]');
        if (poolUse) {
            poolUse.disabled = true;
            applySinglePoolIp(poolUse.dataset.poolUse)
                .catch((err) => notify(err.message, 'error'))
                .finally(() => { poolUse.disabled = false; });
            return;
        }

        const pinEl = event.target.closest('[data-pin],[data-unpin]');
        if (pinEl) {
            pinEl.disabled = true;
            try {
                if (pinEl.dataset.unpin) await unpinProfile(pinEl.dataset.unpin);
                else await pinProfile(pinEl.dataset);
            } catch (err) {
                notify(err.message, 'error');
            } finally {
                pinEl.disabled = false;
            }
            return;
        }

        const el = event.target.closest('[data-copy],[data-qr],[data-edit],[data-toggle],[data-reset],[data-del],[data-gen]');
        if (!el) return;

        if (el.dataset.copy) return copy(el.dataset.copy);

        if (el.dataset.qr) {
            // Show the code where the user already is. Jumping them to another
            // tab lost their place and made it look like the click misfired.
            openQrModal(el.dataset.qr);
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
