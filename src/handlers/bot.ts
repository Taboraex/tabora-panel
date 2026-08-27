import { Settings } from '#types/settings';
import { Store } from '@storage/db';
import { UserService } from '@users/service';
import { saveSettings, getContext } from '@config/settings';
import { ok, badRequest, unauthorized, notFound, methodNotAllowed } from '@common/http';
import { formatBytes, isValidUUID } from '@common/utils';
import { logActivity } from './logs';

/**
 * Machine API for the Telegram launcher.
 *
 * Authenticated with `X-Tabora-Key` matching the `BOT_KEY` secret the
 * launcher injected at install/upgrade. Lives under the secret path so the
 * decoy still hides the panel from scanners. A wrong or missing key is a
 * 401 — never a 404 that would confirm the route exists to a guesser who
 * already knows the path.
 */

export async function sendTelegramMessage(
    botToken: string,
    chatId: string | number,
    text: string,
    parseMode: 'HTML' | 'Markdown' = 'HTML',
): Promise<boolean> {
    if (!botToken || !chatId) return false;
    try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: parseMode,
            }),
        });
        return res.ok;
    } catch {
        return false;
    }
}

export function timingEqual(a: string, b: string): boolean {
    if (a.length !== b.length || a.length === 0) return false;
    let x = 0;
    for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return x === 0;
}

export function botAuthorized(request: Request, env: Env): boolean {
    const want = env.BOT_KEY ?? '';
    const got = request.headers.get('X-Tabora-Key') ?? '';
    return timingEqual(want, got);
}

export async function handleBot(
    request: Request,
    env: Env,
    settings: Settings,
    store: Store,
    users: UserService,
    subroute: string,
): Promise<Response> {
    if (!botAuthorized(request, env)) return unauthorized('Invalid bot key.');

    const url = new URL(request.url);
    const id = url.searchParams.get('id') ?? '';
    const action = url.searchParams.get('action') ?? '';
    const name = url.searchParams.get('u') ?? '';

    if (subroute === 'status' || subroute === 'health' || subroute === '') {
        if (request.method !== 'GET') return methodNotAllowed();
        const stats = await users.stats();
        const ctx = getContext();
        return ok({
            version: VERSION,
            hostname: ctx.hostname,
            colo: ctx.colo,
            paused: settings.isPaused,
            owner: env.TELEGRAM_OWNER ?? '',
            stats: {
                ...stats,
                totalFormatted: formatBytes(stats.totalBytes),
                todayFormatted: formatBytes(stats.todayBytes),
            },
            subscriptionBase: `${ctx.origin}/${settings.securePath}/sub`,
            panelUrl: `${ctx.origin}/${settings.securePath}/panel`,
        });
    }

    if (subroute === 'pause') {
        if (request.method !== 'POST') return methodNotAllowed();
        let body: { paused?: unknown } = {};
        try { body = (await request.json()) as { paused?: unknown }; } catch { /* empty */ }
        const paused = body.paused === undefined ? !settings.isPaused : Boolean(body.paused);
        await saveSettings(store, settings, { isPaused: paused });
        await logActivity(store, 'bot-pause', paused ? 'paused' : 'resumed');
        return ok({ paused });
    }

    if (subroute === 'users') {
        if (request.method === 'GET') {
            const list = await users.list();
            return ok({
                users: list.slice(0, 40).map((u) => ({
                    id: u.id,
                    name: u.name,
                    status: u.status,
                    usage: formatBytes(u.usage.totalBytes),
                    today: formatBytes(u.usage.dailyBytes),
                    expiryMs: u.expiryMs,
                })),
                total: list.length,
            });
        }

        if (request.method === 'POST' && action && id) {
            if (action === 'toggle') {
                const user = await users.toggle(id);
                if (!user) return notFound('User not found.');
                await logActivity(store, 'bot-user-toggled', user.name);
                return ok(await users.enrich(user));
            }
            if (action === 'reset-usage') {
                const user = await users.get(id);
                if (!user) return notFound('User not found.');
                await users.resetUsage(user.id);
                await logActivity(store, 'bot-usage-reset', user.name);
                return ok(await users.enrich(user));
            }
            if (action === 'delete') {
                const user = await users.get(id);
                if (!user) return notFound('User not found.');
                await users.remove(user.id);
                await logActivity(store, 'bot-user-deleted', user.name);
                return ok({ deleted: user.name });
            }
            return badRequest(`Unknown action: ${action}`);
        }

        if (request.method === 'POST') {
            let payload: { name?: unknown; limitGb?: unknown; expiryDays?: unknown };
            try {
                payload = (await request.json()) as typeof payload;
            } catch {
                return badRequest('Invalid JSON body');
            }
            const userName = String(payload.name ?? '').trim().slice(0, 64);
            if (!userName) return badRequest('Name is required.');
            if (await users.get(userName)) return badRequest('A user with that name already exists.');

            const limitGb = Number(payload.limitGb) || 0;
            const expiryDays = Number(payload.expiryDays) || 0;
            const created = await users.create({
                name: userName,
                limitBytes: limitGb > 0 ? Math.round(limitGb * 1024 ** 3) : 0,
                expiryMs: expiryDays > 0 ? Date.now() + expiryDays * 86_400_000 : 0,
            });
            await logActivity(store, 'bot-user-created', created.name);
            const ctx = getContext();
            return ok({
                user: await users.enrich(created),
                subUrl: `${ctx.origin}/${settings.securePath}/sub?u=${encodeURIComponent(created.name)}`,
            });
        }

        return methodNotAllowed();
    }

    if (subroute === 'sub') {
        if (request.method !== 'GET') return methodNotAllowed();
        const ctx = getContext();
        const base = `${ctx.origin}/${settings.securePath}/sub`;
        if (!name) return ok({ url: base });
        const user = await users.get(name);
        if (!user) return notFound('User not found.');
        return ok({
            url: `${base}?u=${encodeURIComponent(user.name)}`,
            name: user.name,
            uuid: isValidUUID(user.uuid) ? user.uuid : undefined,
        });
    }

    if (subroute === 'support') {
        if (request.method !== 'GET') return methodNotAllowed();
        const ctx = getContext();
        return ok({
            welcomeMessage: '🎫 **بخش پشتیبانی و راهنمای تابورا**\n\nلطفاً گزینه مورد نظر خود را انتخاب کنید یا پیام خود را برای مدیریت ارسال کنید.',
            ticketMode: 'bot_tickets',
            owner: env.TELEGRAM_OWNER ?? '',
            menu: [
                { id: 'ticket', label: '📩 ارسال تیکت و پیام به مدیریت', icon: '📩' },
                { id: 'guides', label: '📚 راهنمای اتصال برنامه‌ها', icon: '📚' },
                { id: 'cleanip', label: '⚡ راهنمای اسکن آی‌پی تمیز', icon: '⚡' },
                { id: 'faq', label: '❓ سوالات متداول و عیب‌یابی', icon: '❓' },
                { id: 'operators', label: '🌐 وضعیت شبکه اپراتورها', icon: '🌐' },
            ],
            operators: [
                { name: 'همراه اول (MCI)', status: 'فعال / نیازمند اسکن آی‌پی تمیز' },
                { name: 'ایرانسل (MTN)', status: 'فعال / پایداری بالا' },
                { name: 'رایتل (RTL)', status: 'فعال / پایداری بالا' },
                { name: 'شاتل (Shatel)', status: 'فعال / سرعت عالی' },
                { name: 'مخابرات (Mokhaberat)', status: 'فعال / نیازمند اسکن آی‌پی تمیز' },
            ],
            subscriptionBase: `${ctx.origin}/${settings.securePath}/sub`,
        });
    }

    if (subroute === 'support/guides') {
        if (request.method !== 'GET') return methodNotAllowed();
        return ok({
            guides: [
                {
                    app: 'Hiddify',
                    title: 'راهنمای برنامه Hiddify (پیشنهادی)',
                    steps: [
                        '۱. نرم‌افزار Hiddify را نصب و باز کنید.',
                        '۲. روی دکمه "باز کردن در برنامه" در صفحه اشتراک بزنید یا لینک ساب را کپی کنید.',
                        '۳. در برنامه روی دکمه + (افزودن اشتراک) زده و گزینه Paste from Clipboard را انتخاب کنید.',
                        '۴. روی دکمه اتصال بزنید.',
                    ],
                },
                {
                    app: 'v2rayNG',
                    title: 'راهنمای برنامه v2rayNG (اندروید)',
                    steps: [
                        '۱. لینک ساب یا کانفیگ VLESS را کپی کنید.',
                        '۲. برنامه v2rayNG را باز کرده و روی آیکون + در بالای صفحه بزنید.',
                        '۳. گزینه Import config from Clipboard را انتخاب کنید.',
                        '۴. روی آیکون اتصال بزنید.',
                    ],
                },
                {
                    app: 'V2Box & Happ',
                    title: 'راهنمای برنامه V2Box و Happ (آیفون / iOS)',
                    steps: [
                        '۱. صفحه اشتراک خود را در مرورگر باز کنید.',
                        '۲. روی لوگوی V2Box یا Happ کلیک کنید تا به صورت خودکار پیکربندی شود.',
                        '۳. جهت به‌روزرسانی، روی نام اشتراک کشیده و Update را بزنید.',
                    ],
                },
                {
                    app: 'Clash & Sing-box',
                    title: 'راهنمای Clash و Sing-box (ویندوز / مک / دسکتاپ)',
                    steps: [
                        '۱. لینک Clash یا Sing-box را از بخش کپی لینک‌های صفحه اشتراک دریافت کنید.',
                        '۲. در نرم‌افزار Clash Verge یا Sing-box گزینه Profiles/Import را بزنید.',
                        '۳. لینک را وارد کرده و حالت را روی Rule یا Global قرار دهید.',
                    ],
                },
                {
                    app: 'CleanIP',
                    title: 'راهنمای اسکن و انتخاب آی‌پی تمیز کلادفلر',
                    steps: [
                        '۱. لینک ساب خود را باز کرده و به بخش "آی‌پی‌های تمیز من" بروید.',
                        '۲. روی دکمه "اسکن و تست آی‌پی‌ها" بزنید تا مرورگر سرعت لبه‌های کلادفلر را روی نت شما تست کند.',
                        '۳. روی "ذخیره آی‌پی‌ها" کلیک کنید تا تمام کانفیگ‌های شما با بهترین آی‌پی به‌روزرسانی شوند.',
                    ],
                },
            ],
        });
    }

    if (subroute === 'support/faq') {
        if (request.method !== 'GET') return methodNotAllowed();
        return ok({
            faqs: [
                {
                    q: 'چرا کانفیگ من متصل نمی‌شود یا قطعی دارد؟',
                    a: '۱. باقی‌مانده حجم و تاریخ انقضا را چک کنید.\n۲. وارد لینک ساب شده و اسکن آی‌پی تمیز را اجرا کنید.\n۳. در نرم‌افزار خود روی Update Subscription کلیک کنید.',
                },
                {
                    q: 'کدام برنامه برای همراه اول یا ایرانسل بهتر است؟',
                    a: 'برنامه‌های Hiddify و v2rayNG بیشترین سازگاری و سرعت را روی شبکه‌های همراه اول و ایرانسل ارائه می‌دهند.',
                },
                {
                    q: 'چگونه سرعت و پایداری اتصال را حداکثر کنم؟',
                    a: 'با رفتن به صفحه اختصاصی اشتراک و استفاده از بخش "آی‌پی‌های تمیز من"، آی‌پی‌های کم‌تأخیر اپراتور خودتان را اسکن و ذخیره کنید.',
                },
                {
                    q: 'ارور Timeout یا Unreachable به چه معناست؟',
                    a: 'این ارور یعنی آی‌پی فعلی در شبکه اپراتور شما اختلال دارد. با یک اسکن تازه آی‌پی تمیز در صفحه ساب، مشکل بلافاصله رفع می‌شود.',
                },
            ],
        });
    }

    if (subroute === 'support/ticket') {
        if (request.method !== 'POST') return methodNotAllowed();
        let payload: {
            userIdentifier?: unknown;
            userName?: unknown;
            messageText?: unknown;
            chatId?: unknown;
        };
        try {
            payload = (await request.json()) as typeof payload;
        } catch {
            return badRequest('Invalid JSON body');
        }

        const messageText = String(payload.messageText ?? '').trim();
        if (!messageText) return badRequest('Message text is required.');

        const userName = String(payload.userName ?? payload.userIdentifier ?? 'کاربر').trim();
        const chatId = String(payload.chatId ?? '');
        const ticketId = `TCK-${Date.now().toString().slice(-6)}`;

        await logActivity(store, 'bot-ticket-created', `${userName} (${chatId}): ${messageText.slice(0, 100)}`);

        // Notify admin via Telegram if BOT_TOKEN and TELEGRAM_OWNER are set
        const botToken = env.BOT_TOKEN ?? env.TELEGRAM_BOT_TOKEN ?? '';
        const ownerId = env.TELEGRAM_OWNER ?? '';

        if (botToken && ownerId) {
            const adminMsg =
                `🎫 <b>تیکت پشتیبانی جدید [${ticketId}]</b>\n\n` +
                `👤 <b>کاربر:</b> ${userName}\n` +
                `🆔 <b>شناسه چت:</b> <code>${chatId}</code>\n\n` +
                `💬 <b>متن پیام:</b>\n${messageText}\n\n` +
                `✍️ جهت پاسخ به این تیکت، دستور زیر را ارسال کنید:\n` +
                `<code>/reply ${chatId} پاسخ شما</code>`;

            await sendTelegramMessage(botToken, ownerId, adminMsg);
        }

        return ok({
            ticketId,
            status: 'sent',
            message: 'تیکت شما با موفقیت برای مدیریت ارسال شد. به‌زودی پاسخ آن را دریافت خواهید کرد.',
        });
    }

    if (subroute === 'support/reply') {
        if (request.method !== 'POST') return methodNotAllowed();
        let payload: {
            chatId?: unknown;
            replyText?: unknown;
            ticketId?: unknown;
        };
        try {
            payload = (await request.json()) as typeof payload;
        } catch {
            return badRequest('Invalid JSON body');
        }

        const chatId = String(payload.chatId ?? '').trim();
        const replyText = String(payload.replyText ?? '').trim();
        if (!chatId || !replyText) return badRequest('chatId and replyText are required.');

        const botToken = env.BOT_TOKEN ?? env.TELEGRAM_BOT_TOKEN ?? '';
        let sent = false;

        if (botToken) {
            const userMsg =
                `📩 <b>پاسخ پشتیبانی مدیریت</b>\n\n` +
                `💬 <b>پاسخ:</b>\n${replyText}\n\n` +
                `✨ با تشکر از شکیبایی شما.`;

            sent = await sendTelegramMessage(botToken, chatId, userMsg);
        }

        await logActivity(store, 'bot-ticket-replied', `To ${chatId}: ${replyText.slice(0, 100)}`);

        return ok({
            sent,
            chatId,
            message: sent ? 'پاسخ با موفقیت برای کاربر ارسال شد.' : 'پاسخ ثبت شد (امکان ارسال مستقیم تلگرام فراهم نبود).',
        });
    }

    return notFound();
}
