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
        'scan.relay.hint': 'Relays carry your traffic when a site sits behind Cloudflare. Tested from the worker, with a browser fallback.',
        'scan.netfail': 'Could not reach the panel API (blocked or offline). Continuing from this browser.',
        'scan.relay.local': 'Worker probe blocked — testing relays from your network.',
        'scan.relay.none': 'No relay answered. Try again, or paste a working ProxyIP in Settings.',
        'scan.clean.kicker': 'CLEAN IP',
        'scan.clean.title': 'Find low-ping Worker fronts',
        'scan.clean.run': 'Scan from my network',
        'scan.clean.stop': 'Stop',
        'scan.clean.apply': 'Pin selected',
        'scan.clean.keep': 'Keep',
        'scan.clean.eq': '{n} IPs = {n} configs',
        'scan.clean.configs': 'Configs',
        'scan.clean.ticker': 'Probing {ip}',
        'scan.clean.confirm': 'Confirming the shortlist',
        'scan.clean.keepHint': 'Each kept IP is exactly one config — ports and protocols do not multiply.',
        'scan.clean.appliedN': '{n} configs locked to {n} IPs',
        'scan.clean.depth.quick': 'Quick',
        'scan.clean.depth.smart': 'Smart',
        'scan.clean.depth.deep': 'Deep',
        'scan.clean.hint': 'Multi-wave scan from your own network: previous winners, verified fronts, a baked catalogue, nearby /24s, then a wider sample. Ranking favours steady low ping \u2014 lossy IPs are never kept. Each pinned IPv4 becomes exactly one config.',
        'scan.clean.healthy': 'Healthy',
        'scan.clean.selected': 'Selected',
        'scan.clean.best': 'Best',
        'scan.clean.spread': 'Nets',
        'scan.clean.pinned': 'Pinned clean IPs',
        'scan.clean.pinnedHint': 'Each of these is the address of one config. They stay fixed until you scan again.',
        'scan.clean.clear': 'Clear',
        'scan.clean.cleared': 'Clean IPs cleared \u2014 configs fall back to the worker hostname',
        'scan.clean.none': 'No healthy Worker fronts from this network. Try Deep, or another network.',
        'scan.clean.early': 'Enough healthy IPs \u2014 skipped the wider sample',
        'scan.clean.using': 'Using {n} of {m} healthy IPs',
        'scan.running': 'Testing…',
        'scan.progress': 'Tested {done} of {total}',
        'scan.done': '{n} working address(es) found',
        'scan.applied': 'Applied — your links now use these',
        'scan.unreachable': 'unreachable',
        'stat.users': 'Total users', 'stat.active': 'Active', 'stat.paused': 'Paused',
        'stat.traffic': 'Total traffic', 'stat.today': 'Today', 'stat.expired': 'Expired',
        'ov.kicker': 'COMMAND DECK', 'ov.greet': 'Welcome back',
        'ov.greetSub': 'Pulse of users, traffic and the edge — right here.',
        'ov.system': 'System', 'ov.host': 'Hostname', 'ov.colo': 'Edge node',
        'ov.storage': 'Storage', 'ov.ip': 'Your IP', 'ov.quick': 'Quick actions',
        'tg.title': 'Telegram',
        'tg.linked': 'Linked',
        'tg.unlinked': 'Not linked',
        'tg.owner': 'Linked account',
        'tg.hint.linked': 'This panel can be managed from the Tabora Telegram bot — stats, users, pause — without opening the dashboard.',
        'tg.hint.unlinked': 'Update this panel from the Telegram bot to manage users, traffic and the kill switch from chat.',
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
        'scan.relay.hint': 'وقتی سایتی پشت کلادفلر باشد، رله‌ها ترافیک شما را عبور می‌دهند. اول از ورکر، اگر مسدود شد از مرورگر.',
        'scan.netfail': 'ارتباط با API پنل قطع شد (مسدود یا آفلاین). اسکن از همین مرورگر ادامه پیدا می‌کند.',
        'scan.relay.local': 'تست از سمت ورکر مسدود شد — رله‌ها از شبکه شما تست می‌شوند.',
        'scan.relay.none': 'هیچ رله‌ای جواب نداد. دوباره امتحان کنید یا در تنظیمات یک ProxyIP سالم بگذارید.',
        'scan.clean.kicker': 'آی‌پی تمیز',
        'scan.clean.title': 'پیدا کردن لبه‌های کم‌پینگ',
        'scan.clean.run': 'اسکن از شبکه من',
        'scan.clean.stop': 'توقف',
        'scan.clean.apply': 'ثابت کردن انتخاب‌شده‌ها',
        'scan.clean.keep': 'تعداد',
        'scan.clean.eq': '{n} آی‌پی = {n} کانفیگ',
        'scan.clean.configs': 'کانفیگ',
        'scan.clean.ticker': 'در حال سنجش {ip}',
        'scan.clean.confirm': 'تایید فهرست برتر',
        'scan.clean.keepHint': 'هر آی‌پی نگه داشته‌شده دقیقاً یک کانفیگ است — پورت و پروتکل ضرب نمی‌شوند.',
        'scan.clean.appliedN': '{n} کانفیگ روی {n} آی‌پی قفل شد',
        'scan.clean.depth.quick': 'سریع',
        'scan.clean.depth.smart': 'هوشمند',
        'scan.clean.depth.deep': 'عمیق',
        'scan.clean.hint': 'اسکن چندموجی از شبکه خودتان: برنده‌های قبلی، لبه‌های تاییدشده، کاتالوگ پخته، همسایه‌های /۲۴، بعد نمونهٔ گسترده‌تر. رتبه‌بندی پینگ پایدار را ترجیح می‌دهد — آی‌پی‌های پُراتلاف هرگز نگه داشته نمی‌شوند. هر آی‌پی ثابت دقیقاً یک کانفیگ می‌شود.',
        'scan.clean.healthy': 'سالم',
        'scan.clean.selected': 'انتخاب‌شده',
        'scan.clean.best': 'بهترین',
        'scan.clean.spread': 'ساب‌نت',
        'scan.clean.pinned': 'آی‌پی‌های تمیز ثابت',
        'scan.clean.pinnedHint': 'هر کدام آدرس یک کانفیگ است. تا اسکن بعدی ثابت می‌مانند.',
        'scan.clean.clear': 'پاک کردن',
        'scan.clean.cleared': 'آی‌پی‌های تمیز پاک شد — کانفیگ‌ها به نام ورکر برمی‌گردند',
        'scan.clean.none': 'از این شبکه هیچ لبهٔ سالمی پیدا نشد. حالت عمیق یا شبکه دیگری را امتحان کنید.',
        'scan.clean.early': 'به اندازه کافی آی‌پی سالم — نمونهٔ گسترده‌تر رد شد',
        'scan.clean.using': '{n} از {m} آی‌پی سالم استفاده می‌شود',
        'scan.running': 'در حال تست…',
        'scan.progress': '{done} از {total} تست شد',
        'scan.done': '{n} آدرس سالم پیدا شد',
        'scan.applied': 'اعمال شد — لینک‌های شما از این آدرس‌ها استفاده می‌کنند',
        'scan.unreachable': 'در دسترس نیست',
        'stat.users': 'کل کاربران', 'stat.active': 'فعال', 'stat.paused': 'متوقف',
        'stat.traffic': 'ترافیک کل', 'stat.today': 'امروز', 'stat.expired': 'منقضی',
        'ov.kicker': 'اتاق فرمان', 'ov.greet': 'سلام، فرمانده',
        'ov.greetSub': 'نبض کاربرها، ترافیک و لبه — همین‌جا.',
        'ov.system': 'سیستم', 'ov.host': 'نام میزبان', 'ov.colo': 'نود لبه',
        'ov.storage': 'ذخیره‌سازی', 'ov.ip': 'آی‌پی شما', 'ov.quick': 'اقدامات سریع',
        'tg.title': 'تلگرام',
        'tg.linked': 'متصل',
        'tg.unlinked': 'قطع',
        'tg.owner': 'حساب متصل',
        'tg.hint.linked': 'این پنل را می‌توان از ربات تلگرام تابورا مدیریت کرد — آمار، کاربرها، توقف — بدون باز کردن داشبورد.',
        'tg.hint.unlinked': 'این پنل را از ربات تلگرام بروزرسانی کنید تا کاربرها، ترافیک و کلید قطع را از چت مدیریت کنید.',
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
    try { renderTelegram(); } catch { /* not loaded yet */ }
    try { renderCleanResults(); } catch { /* not loaded yet */ }
    try { renderCleanPinned(); } catch { /* not loaded yet */ }
    try { updateKeepEq(); } catch { /* not loaded yet */ }
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
    let res;
    try {
        res = await fetch(api(path), {
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
            credentials: 'same-origin',
            ...options,
        });
    } catch (err) {
        const m = String(err && err.message ? err.message : err);
        const net = /failed to fetch|networkerror|load failed|network request failed/i.test(m);
        const wrapped = new Error(net ? t('scan.netfail') : m);
        wrapped.network = net;
        throw wrapped;
    }

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

/** Try several same-origin paths. Adblockers often cancel URLs that contain "scan". */
async function requestAny(paths, options = {}) {
    let last;
    for (const path of paths) {
        try {
            return await request(path, options);
        } catch (err) {
            last = err;
            if (String(err && err.message) === 'unauthorized') throw err;
        }
    }
    throw last;
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
    renderTelegram();
}

function renderTelegram() {
    const card = $('#tgCard');
    if (!card) return;
    const tg = meta.telegram ?? {};
    const linked = !!tg.linked;
    card.classList.toggle('linked', linked);
    const pill = $('#tgPill');
    if (pill) {
        pill.textContent = t(linked ? 'tg.linked' : 'tg.unlinked');
        pill.className = `pill ${linked ? 'linked' : 'unlinked'}`;
    }
    const hint = $('#tgHint');
    if (hint) hint.textContent = t(linked ? 'tg.hint.linked' : 'tg.hint.unlinked');
    const row = $('#tgMeta');
    const owner = $('#tgOwner');
    if (row && owner) {
        row.hidden = !linked;
        owner.textContent = tg.owner ? `#${tg.owner}` : '—';
    }
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
        const initial = String(u.name || '?').replace(/[^0-9A-Za-z\u0600-\u06FF]/g, '').slice(0, 2) || '?';

        return `
        <div class="user-row">
          <div class="user-ava">${escapeHtml(initial)}</div>
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
        renderCleanPinned();
    } catch (err) {
        console.error('Could not render pinned clean IPs:', err);
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
let cleanRanked = [];
let cleanAbort = false;
let cleanKeepTouched = false;

const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const isV4 = (a) => IPV4_RE.test(a);

const FRONT_RANGES = [
    '104.16.0.0/14',
    '104.20.0.0/15',
    '104.24.0.0/14',
    '162.159.0.0/16',
    '188.114.96.0/20',
];
const FRONT_SEEDS = [
    '104.16.10.10', '104.17.147.22', '104.18.26.90', '104.19.3.80',
    '104.21.83.62', '104.24.0.10', '104.25.1.1', '162.159.36.1',
    '162.159.46.1', '188.114.97.3', '188.114.98.224',
    '172.67.100.100', '172.67.135.76', '172.67.200.200',
];
const DEFAULT_RELAYS = [
    'proxyip.cmliussss.net:443',
    'proxyip.fxxk.dedyn.io:443',
    'proxyip.aliyun.fxxk.dedyn.io:443',
    'proxyip.oracle.fxxk.dedyn.io:443',
    'proxyip.digitalocean.fxxk.dedyn.io:443',
    'proxyip.multi.fxxk.dedyn.io:443',
];
const COMMUNITY_FRONTS = (
    '104.16.1.195,104.16.4.103,104.16.6.65,104.16.8.3,104.16.25.72,104.16.29.8,' +
    '104.16.32.142,104.16.72.175,104.16.106.32,104.16.119.47,104.16.169.7,' +
    '104.16.183.101,104.16.206.227,104.16.219.230,104.16.242.124,104.16.246.91,' +
    '104.16.250.250,104.17.20.55,104.17.42.10,104.17.44.130,104.17.47.58,' +
    '104.17.80.176,104.17.88.212,104.17.101.35,104.17.177.224,104.17.225.199,' +
    '104.17.229.103,104.17.231.69,104.17.232.114,104.18.10.128,104.18.22.254,' +
    '104.18.27.8,104.18.40.89,104.18.53.172,104.18.71.193,104.18.72.191,' +
    '104.18.83.84,104.18.190.52,104.18.220.84,104.19.20.140,104.19.28.32,' +
    '104.19.54.50,104.19.55.158,104.19.75.119,104.19.99.238,104.19.154.46,' +
    '104.19.155.206,104.19.160.142,104.19.180.169,104.19.240.189,104.19.244.250,' +
    '104.19.250.20,104.19.255.51,104.20.2.1,104.20.9.79,104.20.19.160,' +
    '104.20.21.111,104.20.62.55,104.20.66.92,104.20.75.10,104.20.77.131,' +
    '104.20.149.108,104.20.151.9,104.20.156.248,104.20.157.73,104.20.181.114,' +
    '104.20.224.95,104.20.251.248,104.21.11.206,104.21.19.124,104.21.24.116,' +
    '104.21.33.129,104.21.51.208,104.21.55.49,104.21.65.250,104.21.83.92,' +
    '104.21.93.170,104.21.95.137,104.21.209.83,104.21.211.74,104.21.225.94,' +
    '104.21.228.32,104.21.231.123,104.24.1.69,104.24.24.243,104.24.62.187,' +
    '104.24.84.148,104.24.137.130,104.24.145.43,104.24.154.5,104.24.160.221,' +
    '104.24.161.123,104.24.172.243,104.24.183.89,104.24.185.137,104.24.189.34,' +
    '104.24.194.105,104.24.225.78,104.25.33.15,104.25.35.227,104.25.63.151,' +
    '104.25.64.147,104.25.92.198,104.25.99.169,104.25.105.122,104.25.134.44,' +
    '104.25.193.8,104.25.225.41,104.25.235.38,104.26.192.144,104.27.1.129,' +
    '104.27.1.133,104.27.5.173,104.27.23.251,104.27.35.232,104.27.38.85,' +
    '104.27.44.196,104.27.62.243,104.27.65.143,104.27.96.222,104.27.97.42,' +
    '104.27.97.174,104.27.101.40,104.27.115.85,104.27.122.56,104.27.196.92,' +
    '104.27.203.169,162.159.1.94,162.159.25.11,162.159.32.35,162.159.62.69,' +
    '162.159.250.246,188.114.99.29'
).split(',');
const HOSTS = [10, 16, 22, 36, 62, 80, 100, 147, 200];
const SECONDS_104 = [16, 17, 18, 19, 20, 21, 24, 25, 26, 27];
const THIRDS_104 = [0, 10, 26, 50, 83, 100, 147, 200];
const THIRDS_162 = [36, 46, 64, 134, 192, 200];

function ipToInt(ip) {
    const o = String(ip).split('.').map(Number);
    if (o.length !== 4 || o.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
    return ((o[0] << 24) | (o[1] << 16) | (o[2] << 8) | o[3]) >>> 0;
}

function parseCidr(cidr) {
    const [ip, bitsRaw] = String(cidr).split('/');
    const bits = Number(bitsRaw);
    const n = ipToInt(ip);
    if (n === null || !Number.isInteger(bits) || bits < 8 || bits > 32) return null;
    return { base: n, size: 2 ** (32 - bits) };
}

function isWorkerFrontIpLocal(ip) {
    if (FRONT_SEEDS.includes(ip)) return true;
    const n = ipToInt(ip);
    if (n === null) return false;
    for (const cidr of FRONT_RANGES) {
        const range = parseCidr(cidr);
        if (!range) continue;
        const mask = range.size >= 2 ** 32 ? 0 : (~(range.size - 1)) >>> 0;
        if ((n & mask) === (range.base & mask)) return true;
    }
    return false;
}

const toIp = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');

function sampleFromRangesLocal(count, ranges) {
    const parsed = ranges.map(parseCidr).filter(Boolean);
    if (!parsed.length || count <= 0) return [];
    const out = new Set();
    const maxAttempts = count * 10;
    for (let i = 0; i < maxAttempts && out.size < count; i++) {
        const range = parsed[i % parsed.length];
        const stride = Math.max(1, Math.floor(range.size / Math.max(count, 2)));
        const slot = Math.floor(i / parsed.length);
        const jitterN = Math.floor(Math.random() * Math.min(stride, 17));
        const offset = 1 + ((slot * stride + jitterN) % Math.max(1, range.size - 2));
        let n = (range.base + offset) >>> 0;
        const host = n & 255;
        if (host < 16 || host > 240) n = (n & ~255) | (16 + ((i * 13) % 224));
        out.add(toIp(n));
    }
    return [...out];
}

const CLEAN_CATALOG = (() => {
    const out = new Set([...FRONT_SEEDS, ...COMMUNITY_FRONTS]);
    for (const second of SECONDS_104) {
        for (const third of THIRDS_104) {
            for (const host of HOSTS) out.add(`104.${second}.${third}.${host}`);
        }
    }
    for (const third of THIRDS_162) {
        for (const host of HOSTS) out.add(`162.159.${third}.${host}`);
    }
    for (let third = 96; third <= 110; third++) {
        for (const host of HOSTS) out.add(`188.114.${third}.${host}`);
    }
    return [...out].filter(isWorkerFrontIpLocal);
})();

function pickCleanIpsLocal(count, seen) {
    if (count <= 0) return [];
    const buckets = new Map();
    for (const ip of CLEAN_CATALOG) {
        if (seen.has(ip)) continue;
        const key = ip.split('.').slice(0, 2).join('.');
        const bucket = buckets.get(key);
        if (bucket) bucket.push(ip);
        else buckets.set(key, [ip]);
    }
    const keys = [...buckets.keys()];
    const out = [];
    while (out.length < count) {
        let added = false;
        for (const key of keys) {
            const bucket = buckets.get(key);
            if (!bucket?.length) continue;
            const pick = bucket.shift();
            if (!pick || seen.has(pick)) continue;
            seen.add(pick);
            out.push(pick);
            added = true;
            if (out.length >= count) break;
        }
        if (!added) break;
    }
    return out;
}

function takeUniqueLocal(list, seen) {
    const out = [];
    for (const ip of list) {
        if (seen.has(ip) || !isWorkerFrontIpLocal(ip)) continue;
        seen.add(ip);
        out.push(ip);
    }
    return out;
}

function neighborsOfLocal(origin, count) {
    const parts = origin.split('.').map(Number);
    if (parts.length !== 4) return [];
    const [a, b, c] = parts;
    const out = [];
    for (let i = 0; out.length < count && i < 64; i++) {
        const host = 16 + ((i * 17 + 23) % 224);
        const ip = `${a}.${b}.${c}.${host}`;
        if (ip === origin || !isWorkerFrontIpLocal(ip)) continue;
        if (!out.includes(ip)) out.push(ip);
    }
    return out;
}

function expandAroundLocal(winners, per = 6, cap = 24) {
    const seen = new Set(winners);
    const out = [];
    for (const ip of winners) {
        for (const n of neighborsOfLocal(ip, per)) {
            if (seen.has(n)) continue;
            seen.add(n);
            out.push(n);
            if (out.length >= cap) return out;
        }
    }
    return out;
}

function pickDiverseLocal(rows, keep) {
    const out = [];
    const taken = new Set();
    const used16 = new Set();
    const used24 = new Set();
    const net16 = (ip) => ip.split('.').slice(0, 2).join('.');
    const net24 = (ip) => ip.split('.').slice(0, 3).join('.');
    const take = (pred) => {
        for (const row of rows) {
            if (out.length >= keep) return;
            if (taken.has(row.address)) continue;
            if (!pred(row)) continue;
            taken.add(row.address);
            used16.add(net16(row.address));
            used24.add(net24(row.address));
            out.push(row);
        }
    };
    take((row) => !used16.has(net16(row.address)));
    take((row) => !used24.has(net24(row.address)));
    take(() => true);
    return out;
}

function planScanLocal(previous, depth, keep) {
    const seen = new Set();
    const waves = [];
    const WAVE = {
        memory: { label: 'Previous winners', labelFa: 'برنده‌های قبلی' },
        seeds: { label: 'Verified fronts', labelFa: 'لبه‌های تاییدشده' },
        catalog: { label: 'Clean catalogue', labelFa: 'کاتالوگ تمیز' },
        neighbors: { label: 'Nearby subnet', labelFa: 'همسایه‌های ساب‌نت' },
        explore: { label: 'Wider sample', labelFa: 'نمونهٔ گسترده‌تر' },
    };
    const memory = takeUniqueLocal(
        (previous || []).filter(isWorkerFrontIpLocal).slice(0, Math.max(12, keep)),
        seen,
    );
    if (memory.length) waves.push({ id: 'memory', ...WAVE.memory, addresses: memory });
    const seeds = takeUniqueLocal(FRONT_SEEDS, seen);
    if (seeds.length) waves.push({ id: 'seeds', ...WAVE.seeds, addresses: seeds });
    const catalogWant = depth === 'quick'
        ? Math.max(24, keep * 3)
        : depth === 'deep'
            ? Math.max(72, keep * 6)
            : Math.max(48, keep * 4);
    const catalog = pickCleanIpsLocal(Math.min(180, catalogWant), seen);
    if (catalog.length) waves.push({ id: 'catalog', ...WAVE.catalog, addresses: catalog });
    if (depth !== 'quick') {
        const exploreWant = depth === 'deep' ? Math.max(40, keep * 3) : Math.max(24, keep * 2);
        const explore = takeUniqueLocal(sampleFromRangesLocal(Math.min(96, exploreWant), FRONT_RANGES), seen);
        if (explore.length) waves.push({ id: 'explore', ...WAVE.explore, addresses: explore });
    }
    return waves;
}

function localPlanPayload(depth, keep, previous) {
    const waves = planScanLocal(previous, depth, keep);
    return {
        waves,
        sample: waves.flatMap((w) => w.addresses),
        domains: [],
        depth,
        keep,
        probesPerIp: depth === 'quick' ? 3 : depth === 'deep' ? 6 : 5,
        scoutProbes: 2,
        confirmProbes: depth === 'quick' ? 2 : depth === 'deep' ? 4 : 3,
        concurrency: depth === 'deep' ? 5 : 6,
        earlyStop: depth !== 'deep',
        keepMax: 30,
        catalogSize: CLEAN_CATALOG.length,
        probePath: '/cdn-cgi/trace',
    };
}

function medianLocal(values) {
    if (!values.length) return -1;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function jitterLocal(values) {
    if (values.length < 2) return 0;
    const deltas = [];
    for (let i = 1; i < values.length; i++) deltas.push(Math.abs(values[i] - values[i - 1]));
    return Math.round(medianLocal(deltas));
}

function gradeOfLocal(score) {
    if (score <= 80) return 'S';
    if (score <= 140) return 'A';
    if (score <= 220) return 'B';
    if (score <= 350) return 'C';
    return 'D';
}

function rankCleanLocal(measurements, keep) {
    const rows = [];
    for (const m of measurements) {
        const ip = String(m.address ?? '').trim();
        if (!isWorkerFrontIpLocal(ip)) continue;
        const samples = Array.isArray(m.samples) ? m.samples.map(Number) : [];
        const good = samples.filter((s) => s >= 0);
        const lossRate = samples.length ? 1 - good.length / samples.length : 1;
        if (!good.length) continue;
        const med = medianLocal(good);
        const jit = jitterLocal(good);
        const score = med + 2 * jit + 500 * lossRate;
        rows.push({
            address: ip,
            medianMs: med,
            jitterMs: jit,
            lossRate: Number(lossRate.toFixed(3)),
            score: Math.round(score),
            grade: gradeOfLocal(score),
            ok: true,
            samplesHint: samples.length,
        });
    }
    const minSuccesses = rows.reduce((n, r) => Math.max(n, r.samplesHint), 0) >= 5 ? 3 : 2;
    const healthy = rows
        .filter((r) => {
            if (!r.ok || r.medianMs <= 0 || r.lossRate > 0.34) return false;
            const successes = Math.round((1 - r.lossRate) * r.samplesHint);
            return successes >= minSuccesses;
        })
        .sort((a, b) => a.score - b.score);
    return pickDiverseLocal(healthy, Math.max(1, keep)).map(({ samplesHint, ...row }) => row);
}

function parseRelayTarget(entry) {
    const raw = String(entry || '').trim();
    if (!raw) return null;
    const m = raw.match(/^(.*):(\d+)$/);
    return m ? { host: m[1], port: Number(m[2]), raw: `${m[1]}:${m[2]}` } : { host: raw, port: 443, raw };
}


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

async function scanRelaysFromBrowser() {
    const configured = Array.isArray(settings.proxyIPs) ? settings.proxyIPs : [];
    const seen = new Set();
    const targets = [];
    for (const entry of [...configured, ...DEFAULT_RELAYS]) {
        const parsed = parseRelayTarget(entry);
        if (!parsed || seen.has(parsed.raw)) continue;
        seen.add(parsed.raw);
        targets.push(parsed);
    }
    const results = [];
    const queue = [...targets];
    const workers = Array.from({ length: Math.min(4, queue.length || 1) }, async () => {
        for (;;) {
            const target = queue.shift();
            if (!target) return;
            const ms = await probeEndpoint(target.host, target.port, 4500);
            results.push({
                address: target.host,
                port: target.port,
                ok: ms >= 0,
                latency: ms,
                error: ms >= 0 ? undefined : t('scan.unreachable'),
            });
        }
    });
    await Promise.all(workers);
    results.sort((a, b) => {
        if (a.ok !== b.ok) return a.ok ? -1 : 1;
        return a.latency - b.latency;
    });
    return results;
}

/** Relays are probed from the worker first; the browser is the durable fallback. */
async function scanRelays() {
    const btn = $('#scanRelays');
    const box = $('#relayResults');
    btn.disabled = true;
    box.innerHTML = `<p class="empty">${t('scan.running')}</p>`;

    try {
        let results = [];
        let usedLocal = false;
        try {
            const res = await requestAny(['/relays', '/scan'], {
                method: 'POST',
                body: JSON.stringify({ source: 'relay', mode: 'tcp', timeoutMs: 4000, concurrency: 6 }),
            });
            results = res.results ?? [];
        } catch {
            usedLocal = true;
            notify(t('scan.relay.local'), 'warn', 5000);
            results = await scanRelaysFromBrowser();
        }
        renderProbeRows(box, results);
        relayBest = results.filter((r) => r.ok).map((r) => `${r.address}:${r.port}`);
        $('#applyRelays').disabled = relayBest.length === 0;
        if (relayBest.length) {
            notify(t('scan.done').replace('{n}', String(relayBest.length)));
        } else {
            notify(t('scan.relay.none'), 'warn', 6000);
        }
    } catch (err) {
        box.innerHTML = `<p class="empty">${escapeHtml(err.message)}</p>`;
    } finally {
        btn.disabled = false;
    }
}

function currentDepth() {
    return document.querySelector('.scan-depth.active')?.dataset.depth || 'smart';
}

function currentKeep() {
    const n = Number($('#cleanKeep')?.value);
    return Number.isFinite(n) ? Math.min(30, Math.max(1, Math.floor(n))) : 8;
}

function updateKeepEq() {
    const n = currentKeep();
    const el = $('#cleanKeepEq');
    if (el) el.textContent = t('scan.clean.eq').replaceAll('{n}', String(n));
    const val = $('#cleanKeepVal');
    if (val) val.textContent = String(n);
}

function clearBlips() {
    const box = $('#scanBlips');
    if (box) box.innerHTML = '';
}

function pingBlip(ip, ok) {
    const box = $('#scanBlips');
    if (!box) return;
    const parts = String(ip).split('.').map(Number);
    const h = parts.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
    const angle = (h * 47) % 360;
    const radius = 18 + (h % 30);
    const el = document.createElement('i');
    el.className = `scan-blip ${ok ? 'ok' : 'miss'}`;
    el.style.setProperty('--a', `${angle}deg`);
    el.style.setProperty('--r', `${radius}%`);
    box.appendChild(el);
    while (box.children.length > 56) box.firstElementChild.remove();
}

function setTicker(message) {
    const el = $('#cleanTicker');
    if (el) el.textContent = message || '';
}

function waveLabel(wave) {
    return lang === 'fa' ? (wave.labelFa || wave.label) : (wave.label || wave.id);
}

function renderWaves(waves, active) {
    const box = $('#cleanWaves');
    if (!box) return;
    box.innerHTML = waves.map((w, i) => {
        const cls = w.skipped ? 'skip' : i === active ? 'active' : i < active ? 'done' : '';
        return `<span class="scan-wave ${cls}"><b>${escapeHtml(waveLabel(w))}</b> ${w.addresses?.length ?? 0}</span>`;
    }).join('');
}

function diverseHealthyCount(measurements, minSuccesses) {
    const nets = new Set();
    for (const m of measurements) {
        const good = (m.samples || []).filter((s) => s >= 0);
        if (good.length < minSuccesses) continue;
        const loss = 1 - good.length / Math.max(m.samples.length, 1);
        if (loss > 0.34) continue;
        nets.add(String(m.address).split('.').slice(0, 3).join('.'));
    }
    return nets.size;
}

function localWinners(measurements, n) {
    const rows = measurements.map((m) => {
        const good = (m.samples || []).filter((s) => s >= 0).sort((a, b) => a - b);
        const med = good.length ? good[Math.floor(good.length / 2)] : 99999;
        return { address: m.address, med, ok: good.length >= 2 };
    }).filter((r) => r.ok).sort((a, b) => a.med - b.med);
    const used = new Set();
    const out = [];
    for (const r of rows) {
        const net16 = r.address.split('.').slice(0, 2).join('.');
        if (used.has(net16)) continue;
        used.add(net16);
        out.push(r.address);
        if (out.length >= n) break;
    }
    if (out.length < n) {
        const used24 = new Set(out.map((ip) => ip.split('.').slice(0, 3).join('.')));
        for (const r of rows) {
            if (out.includes(r.address)) continue;
            const net24 = r.address.split('.').slice(0, 3).join('.');
            if (used24.has(net24)) continue;
            used24.add(net24);
            out.push(r.address);
            if (out.length >= n) break;
        }
    }
    return out;
}

function setScanProgress(done, total, message) {
    const wrap = $('#cleanProgressWrap');
    const bar = $('#cleanBar');
    const prog = $('#cleanProgress');
    if (wrap) wrap.hidden = false;
    if (bar) bar.style.width = `${total ? Math.round((done / total) * 100) : 0}%`;
    if (prog) prog.textContent = message;
}

async function measureIp(ip, probes) {
    const samples = [];
    for (let i = 0; i < probes; i++) {
        if (cleanAbort) break;
        const ms = await probeEndpoint(ip, 443, 3800);
        samples.push(ms);
        pingBlip(ip, ms >= 0);
        setTicker(t('scan.clean.ticker').replace('{ip}', ip));
    }
    return { address: ip, samples };
}

async function scanWave(wave, probes, measurements, seen, onTick, concurrency) {
    const queue = (wave.addresses || []).filter((ip) => {
        if (seen.has(ip) || !isV4(ip)) return false;
        seen.add(ip);
        return true;
    });
    if (!queue.length) return;
    const workers = Array.from({ length: Math.min(concurrency || 4, queue.length) }, async () => {
        for (;;) {
            if (cleanAbort) return;
            const ip = queue.shift();
            if (!ip) return;
            measurements.push(await measureIp(ip, probes));
            onTick();
        }
    });
    await Promise.all(workers);
}

/**
 * Multi-wave clean-IP scan from this browser.
 *
 * Scout (2 probes) → /24 neighbours of winners → wider sample if needed →
 * confirm the shortlist with extra probes. Smart mode skips explore once
 * it already has `keep` diverse healthy IPs. Planning, expand and ranking
 * all run in this browser so a blocked `/api/scan*` cannot abort the scan.
 * The keep slider only decides how many healthy IPs to pin.
 * N pinned IPv4s become exactly N configs.
 */
async function scanCleanIPs() {
    const btn = $('#scanClean');
    const stopBtn = $('#stopClean');
    const box = $('#cleanResults');
    const hero = $('#scanHero');
    const keep = currentKeep();
    const depth = currentDepth();

    cleanAbort = false;
    cleanRanked = [];
    cleanKeepTouched = false;
    btn.disabled = true;
    if (stopBtn) stopBtn.hidden = false;
    if (hero) hero.classList.add('scanning');
    box.innerHTML = '';
    $('#applyClean').disabled = true;
    $('#cleanStats').hidden = true;
    clearBlips();
    setTicker('');

    try {
        const previous = (settings.cleanIPs || []).filter((a) => isV4(a) && isWorkerFrontIpLocal(a));
        const plan = localPlanPayload(depth, keep, previous);
        const waves = [...(plan.waves || [])];
        const scoutProbes = Number(plan.scoutProbes) || 2;
        const confirmProbes = Number(plan.confirmProbes) || (depth === 'quick' ? 2 : 3);
        const concurrency = Number(plan.concurrency) || 6;
        const earlyStop = plan.earlyStop !== false;
        const minSuccesses = 2;
        const measurements = [];
        const seen = new Set();
        let insertedNeighbors = false;

        renderWaves(waves, 0);

        const totalOf = () => waves.reduce((n, w) => n + (w.skipped ? 0 : (w.addresses?.length || 0)), 0);

        for (let wi = 0; wi < waves.length; wi++) {
            if (cleanAbort) break;
            const wave = waves[wi];

            if (wave.id === 'explore' && earlyStop && diverseHealthyCount(measurements, minSuccesses) >= keep) {
                wave.skipped = true;
                renderWaves(waves, wi);
                notify(t('scan.clean.early'));
                continue;
            }

            renderWaves(waves, wi);
            await scanWave(wave, scoutProbes, measurements, seen, () => {
                setScanProgress(
                    measurements.length,
                    totalOf(),
                    t('scan.progress')
                        .replace('{done}', String(measurements.length))
                        .replace('{total}', String(totalOf())),
                );
            }, concurrency);

            if (!insertedNeighbors && wave.id === 'catalog' && !cleanAbort) {
                const winners = localWinners(measurements, Math.min(8, Math.max(4, Math.ceil(keep / 2))));
                if (winners.length) {
                    try {
                        const expanded = {
                            addresses: expandAroundLocal(winners, 6, Math.min(48, Math.max(16, keep * 2))),
                            label: 'Nearby subnet',
                            labelFa: 'همسایه‌های ساب‌نت',
                        };
                        const addrs = (expanded.addresses || []).filter((ip) => !seen.has(ip) && isWorkerFrontIpLocal(ip));
                        if (addrs.length) {
                            waves.splice(wi + 1, 0, {
                                id: 'neighbors',
                                label: expanded.label || 'Nearby /24',
                                labelFa: expanded.labelFa || 'همسایه‌های /۲۴',
                                addresses: addrs,
                            });
                            insertedNeighbors = true;
                            renderWaves(waves, wi);
                        }
                    } catch { /* expand is optional — catalogue results still count */ }
                }
            }
        }

        if (!cleanAbort && measurements.length) {
            const winners = localWinners(measurements, Math.min(keep * 2, 24));
            if (winners.length && confirmProbes > 0) {
                waves.push({
                    id: 'confirm',
                    label: 'Confirm winners',
                    labelFa: 'تایید برنده‌ها',
                    addresses: winners,
                });
                renderWaves(waves, waves.length - 1);
                setTicker(t('scan.clean.confirm'));
                const extraSeen = new Set();
                const queue = [...winners];
                const workers = Array.from({ length: Math.min(3, queue.length) }, async () => {
                    for (;;) {
                        if (cleanAbort) return;
                        const ip = queue.shift();
                        if (!ip) return;
                        const extra = await measureIp(ip, confirmProbes);
                        const existing = measurements.find((m) => m.address === ip);
                        if (existing) existing.samples.push(...extra.samples);
                        else measurements.push(extra);
                        extraSeen.add(ip);
                        setScanProgress(extraSeen.size, winners.length, t('scan.clean.confirm'));
                    }
                });
                await Promise.all(workers);
            }
        }

        $('#cleanProgressWrap').hidden = true;
        $('#cleanProgress').textContent = '';
        setTicker('');

        if (!measurements.length) {
            box.innerHTML = `<p class="empty">${escapeHtml(t('scan.clean.none'))}</p>`;
            return;
        }

        cleanRanked = rankCleanLocal(measurements, 30);
        renderCleanResults();

        if (cleanRanked.length) {
            notify(t('scan.done').replace('{n}', String(cleanRanked.length)));
        } else {
            notify(t('scan.clean.none'), 'warn', 6000);
        }
    } catch (err) {
        box.innerHTML = `<p class="empty">${escapeHtml(err.message)}</p>`;
    } finally {
        btn.disabled = false;
        if (stopBtn) stopBtn.hidden = true;
        if (hero) hero.classList.remove('scanning');
        const wrap = $('#cleanProgressWrap');
        if (wrap) wrap.hidden = true;
        setTicker('');
    }
}

function selectedCleanIps() {
    return $$('#cleanResults input[type=checkbox]:checked').map((el) => el.value).filter(Boolean);
}

function updateCleanStats() {
    const stats = $('#cleanStats');
    if (!stats) return;
    const selected = selectedCleanIps();
    const best = cleanRanked[0];
    const nets = new Set(cleanRanked.map((r) => r.address.split('.').slice(0, 3).join('.')));
    stats.hidden = cleanRanked.length === 0;
    const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
    set('#cleanStatHealthy', String(cleanRanked.length));
    set('#cleanStatSelected', String(selected.length));
    set('#cleanStatConfigs', String(selected.length));
    set('#cleanStatBest', best && best.medianMs > 0 ? `${best.medianMs} ms` : '—');
    set('#cleanStatSpread', String(nets.size));
    updateKeepEq();
    const apply = $('#applyClean');
    if (apply) apply.disabled = selected.length === 0;
}

function applyKeepSelection() {
    const n = currentKeep();
    const boxes = $$('#cleanResults input[type=checkbox]');
    boxes.forEach((el, i) => { el.checked = i < n; });
    $$('#cleanResults .scan-row').forEach((row, i) => row.classList.toggle('picked', i < n));
    updateCleanStats();
}

function renderCleanResults() {
    const box = $('#cleanResults');
    if (!box) return;
    if (!cleanRanked.length) {
        if (!box.querySelector('.scan-row')) box.innerHTML = '<p class="empty">—</p>';
        updateCleanStats();
        return;
    }

    const maxMs = Math.max(...cleanRanked.map((r) => r.medianMs), 1);
    const n = currentKeep();
    box.innerHTML = cleanRanked.map((r, i) => {
        const width = Math.max(8, Math.round((1 - (r.medianMs / (maxMs * 1.15))) * 100));
        const checked = i < n ? 'checked' : '';
        const picked = i < n ? 'picked' : '';
        const net16 = r.address.split('.').slice(0, 2).join('.');
        const net24 = r.address.split('.').slice(0, 3).join('.');
        return `
        <label class="scan-row ${picked}">
          <input type="checkbox" value="${escapeHtml(r.address)}" ${checked}>
          <span class="scan-idx">${i + 1}</span>
          <span class="game-grade ${GRADE_CLASS[r.grade] ?? ''}">${escapeHtml(r.grade)}</span>
          <span class="scan-addr-wrap">
            <span class="game-addr">${escapeHtml(r.address)}</span>
            <span class="scan-chips"><i>${escapeHtml(net16)}</i><i>${escapeHtml(net24)}</i></span>
          </span>
          <span class="scan-lat">
            <b><bdi>${r.medianMs} ms</bdi></b>
            <span class="scan-bar"><i style="width:${width}%"></i></span>
            <small>${escapeHtml(t('game.jitter'))} <bdi>${r.jitterMs} ms</bdi>
              · ${escapeHtml(t('game.loss'))} <bdi>${Math.round(r.lossRate * 100)}%</bdi></small>
          </span>
        </label>`;
    }).join('');
    updateCleanStats();
}

function renderCleanPinned() {
    const card = $('#cleanPinnedCard');
    const box = $('#cleanPinned');
    if (!card || !box) return;
    const ips = (settings.cleanIPs || []).filter(isV4);
    if (!ips.length) {
        card.hidden = true;
        box.innerHTML = '';
        return;
    }
    card.hidden = false;
    box.innerHTML = ips.map((ip) => `<span class="scan-pill">${escapeHtml(ip)}</span>`).join('');
}

async function applyRelays() {
    await request('/settings', {
        method: 'PUT',
        body: JSON.stringify({ proxyIPs: relayBest.slice(0, 3) }),
    });
    notify(t('scan.applied'));
    await loadAll();
}

async function persistCleanIPs(payload) {
    try {
        return await requestAny(['/fronts/apply', '/scan/apply'], {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    } catch {
        const cleanIPs = payload.clear ? [] : (payload.addresses || []);
        await request('/settings', {
            method: 'PUT',
            body: JSON.stringify({ cleanIPs }),
        });
        return { applied: true, cleanIPs };
    }
}

async function applyCleanIPs() {
    const picked = selectedCleanIps();
    if (!picked.length) return;
    await persistCleanIPs({ addresses: picked });
    notify(t('scan.clean.appliedN').replaceAll('{n}', String(picked.length)));
    await loadAll();
}

async function clearCleanIPs() {
    await persistCleanIPs({ clear: true });
    notify(t('scan.clean.cleared'));
    await loadAll();
}

function initCleanKeep() {
    const saved = Number(localStorage.getItem('tabora.scanKeep'));
    const el = $('#cleanKeep');
    if (!el) return;
    if (Number.isFinite(saved) && saved >= 1 && saved <= 30) el.value = String(saved);
    updateKeepEq();
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
    $('#scanClean')?.addEventListener('click', () => scanCleanIPs().catch((e) => notify(e.message, 'error')));
    $('#stopClean')?.addEventListener('click', () => { cleanAbort = true; });
    $('#applyClean')?.addEventListener('click', () => applyCleanIPs().catch((e) => notify(e.message, 'error')));
    $('#clearClean')?.addEventListener('click', () => {
        if (!confirm(t('scan.clean.clear') + '?')) return;
        clearCleanIPs().catch((e) => notify(e.message, 'error'));
    });
    $$('.scan-depth').forEach((btn) => btn.addEventListener('click', () => {
        $$('.scan-depth').forEach((b) => b.classList.toggle('active', b === btn));
    }));
    $('#cleanKeep')?.addEventListener('input', () => {
        const el = $('#cleanKeep');
        if (el) localStorage.setItem('tabora.scanKeep', el.value);
        updateKeepEq();
        if (cleanRanked.length) applyKeepSelection();
    });
    $('#cleanResults')?.addEventListener('change', (e) => {
        if (e.target?.type === 'checkbox') {
            e.target.closest('.scan-row')?.classList.toggle('picked', e.target.checked);
            updateCleanStats();
        }
    });
    initCleanKeep();

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

document.addEventListener('pointermove', (e) => {
    document.documentElement.style.setProperty('--mx', e.clientX + 'px');
    document.documentElement.style.setProperty('--my', e.clientY + 'px');
});

})();
