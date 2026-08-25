import { Settings } from '#types/settings';
import { UserService, isUsable } from '@users/service';
import { getContext } from '@config/settings';
import { resolveBuildContext, renderInfoLabels } from '@cores/shared';
import { buildBase64Subscription, buildPlainSubscription } from '@cores/uri';
import { buildClashConfig } from '@cores/clash';
import { buildSingboxConfig } from '@cores/singbox';
import { BROWSER_UA_MARKERS, CLIENT_UA_MARKERS, PROJECT } from '@config/obfuscation';
import { subscriptionResponse, htmlResponse, notFound } from '@common/http';
import { gunzipBase64, formatBytes, formatDate } from '@common/utils';
import { renderTemplate } from '@common/template';

type Format = 'auto' | 'base64' | 'plain' | 'clash' | 'singbox';

/** Pick the output format from ?format= / ?app=, falling back to UA sniffing. */
function resolveFormat(explicit: string, userAgent: string): Format {
    const requested = explicit.toLowerCase();

    if (['base64', 'b64', 'v2ray', 'xray'].includes(requested)) return 'base64';
    if (['plain', 'raw', 'uri'].includes(requested)) return 'plain';
    if (['clash', 'mihomo', 'meta', 'verge', 'stash'].includes(requested)) return 'clash';
    if (['singbox', 'sing-box', 'sb', 'husi', 'hiddify'].includes(requested)) return 'singbox';

    const ua = userAgent.toLowerCase();
    if (/clash|mihomo|meta|verge|stash|flclash/.test(ua)) return 'clash';
    if (/sing-?box|husi|hiddify|karing|nekobox/.test(ua)) return 'singbox';
    return 'base64';
}

const looksLikeClient = (ua: string): boolean =>
    CLIENT_UA_MARKERS.some((marker) => ua.includes(marker));

const looksLikeBrowser = (ua: string, accept: string, dest: string): boolean =>
    (dest === 'document' || accept.includes('text/html')) &&
    BROWSER_UA_MARKERS.some((marker) => ua.includes(marker));

export async function handleSubscription(
    request: Request,
    settings: Settings,
    users: UserService,
): Promise<Response> {
    const ctx = getContext();
    const ua = ctx.userAgent.toLowerCase();
    const accept = (request.headers.get('Accept') ?? '').toLowerCase();
    const dest = (request.headers.get('Sec-Fetch-Dest') ?? '').toLowerCase();

    // Identify the subscriber. Without ?u= we serve the panel-wide credentials.
    const requested = ctx.searchParams.get('u') ?? ctx.searchParams.get('sub') ?? '';
    const user = requested ? await users.get(requested) : null;

    if (requested && !user) return notFound('Subscription not found.');

    if (user) {
        const enriched = await users.enrich(user);
        if (!isUsable(enriched.status)) {
            return subscriptionResponse('', `${PROJECT.slug}.txt`, 'text/plain; charset=utf-8', {
                'Subscription-Userinfo': buildUserInfoHeader(enriched.usage.totalBytes, user.limitBytes, user.expiryMs),
            });
        }
    }

    // A human in a browser gets the status page; clients get raw config.
    const allowlisted =
        settings.subUserAgent.trim().length > 0 &&
        ua.includes(settings.subUserAgent.trim().toLowerCase());

    if (!allowlisted && !looksLikeClient(ua) && looksLikeBrowser(ua, accept, dest)) {
        return renderSubscriptionPage(settings, users, user);
    }

    const usage = user ? (await users.getUsage(user.id)) : null;
    const buildCtx = resolveBuildContext(settings, user);
    const infoLabels = renderInfoLabels(settings, user, usage?.totalBytes ?? 0);

    const format = resolveFormat(
        ctx.searchParams.get('format') ?? ctx.searchParams.get('app') ?? '',
        ua,
    );

    const headers: Record<string, string> = {};
    if (user) {
        headers['Subscription-Userinfo'] = buildUserInfoHeader(
            usage?.totalBytes ?? 0, user.limitBytes, user.expiryMs,
        );
        headers['Profile-Update-Interval'] = '12';
        headers['Profile-Title'] = user.name;
    }

    switch (format) {
        case 'clash':
            return subscriptionResponse(
                buildClashConfig(buildCtx),
                `${PROJECT.slug}-clash.yaml`,
                'text/yaml; charset=utf-8',
                headers,
            );

        case 'singbox':
            return subscriptionResponse(
                buildSingboxConfig(buildCtx),
                `${PROJECT.slug}-singbox.json`,
                'application/json; charset=utf-8',
                headers,
            );

        case 'plain':
            return subscriptionResponse(
                buildPlainSubscription(buildCtx, infoLabels),
                `${PROJECT.slug}.txt`,
                'text/plain; charset=utf-8',
                headers,
            );

        default:
            return subscriptionResponse(
                buildBase64Subscription(buildCtx, infoLabels),
                `${PROJECT.slug}.txt`,
                'text/plain; charset=utf-8',
                headers,
            );
    }
}

/** Standard `Subscription-Userinfo` header understood by most clients. */
function buildUserInfoHeader(used: number, limit: number, expiryMs: number): string {
    const parts = [`upload=0`, `download=${used}`, `total=${limit || 0}`];
    if (expiryMs) parts.push(`expire=${Math.floor(expiryMs / 1000)}`);
    return parts.join('; ');
}

/** Human-facing status page with live quota figures. */
async function renderSubscriptionPage(
    settings: Settings,
    users: UserService,
    user: Awaited<ReturnType<UserService['get']>>,
): Promise<Response> {
    if (!SUBSCRIPTION_HTML) {
        return subscriptionResponse('Subscription page unavailable.', 'info.txt');
    }

    const ctx = getContext();
    const html = await gunzipBase64(SUBSCRIPTION_HTML);

    const usage = user ? await users.getUsage(user.id) : null;
    const enriched = user ? await users.enrich(user) : null;

    const used = usage?.totalBytes ?? 0;
    const limit = user?.limitBytes ?? 0;
    const percent = limit ? Math.min(100, (used / limit) * 100) : 0;

    const base = user?.panelUrl?.trim()
        ? normaliseOrigin(user.panelUrl.trim())
        : ctx.origin;
    const subUrl = `${base}/${settings.securePath}/sub${user ? `?u=${encodeURIComponent(user.name)}` : ''}`;

    const out = renderTemplate(html, {
        NAME: user?.name ?? settings.namePrefix,
        STATUS: enriched?.status ?? 'active',
        USED: formatBytes(used),
        LIMIT: limit ? formatBytes(limit) : '\u221e',
        PERCENT: percent.toFixed(1),
        EXPIRY: user?.expiryMs ? formatDate(user.expiryMs) : '\u221e',
        SUB_URL: subUrl,
        SUB_CLASH: `${subUrl}${subUrl.includes('?') ? '&' : '?'}format=clash`,
        SUB_SINGBOX: `${subUrl}${subUrl.includes('?') ? '&' : '?'}format=singbox`,
        PROJECT: PROJECT.name,
        VERSION,
    });

    return htmlResponse(out);
}

function normaliseOrigin(value: string): string {
    const withScheme = /^https?:\/\//.test(value) ? value : `https://${value}`;
    try {
        return new URL(withScheme).origin;
    } catch {
        return value;
    }
}
