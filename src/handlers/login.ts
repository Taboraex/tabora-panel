import { Store } from '@storage/db';
import { Settings } from '#types/settings';
import { verifyPassword, setPassword, isPasswordStored } from '@auth/password';
import { issueToken, sessionCookie, clearCookie, verifySession, rotateSecret } from '@auth/jwt';
import {
    HttpStatus, respond, ok, badRequest, unauthorized, methodNotAllowed, htmlResponse,
} from '@common/http';
import { gunzipBase64 } from '@common/utils';
import { renderTemplate } from '@common/template';
import { PROJECT } from '@config/obfuscation';
import { logActivity } from './logs';
import { getContext } from '@config/settings';

export async function handleLogin(
    request: Request,
    store: Store,
    env: Env,
    settings: Settings,
): Promise<Response> {
    if (request.method === 'GET') return renderLoginPage(settings);
    if (request.method !== 'POST') return methodNotAllowed();

    let body: { password?: string };
    try {
        body = (await request.json()) as { password?: string };
    } catch {
        return badRequest('Invalid request body.');
    }

    if (!body.password) return badRequest('Password is required.');

    const valid = await verifyPassword(store, env, body.password);
    const ctx = getContext();

    if (!valid) {
        await logActivity(store, 'login-failed', `ip=${ctx.clientIp} ua=${ctx.userAgent.slice(0, 80)}`);
        return unauthorized('Incorrect password.');
    }

    const token = await issueToken(store, 'admin');
    await logActivity(store, 'login', `ip=${ctx.clientIp}`);

    return respond(true, HttpStatus.OK, 'Signed in.', null, {
        'Set-Cookie': sessionCookie(token),
    });
}

export function handleLogout(): Response {
    return respond(true, HttpStatus.OK, 'Signed out.', null, {
        'Set-Cookie': clearCookie(),
    });
}

export async function handleChangePassword(
    request: Request,
    store: Store,
    env: Env,
): Promise<Response> {
    if (request.method !== 'POST') return methodNotAllowed();

    const authed = await verifySession(request, store);
    const hasPassword = await isPasswordStored(store);

    // Allow the very first password to be set without a session.
    if (hasPassword && !authed) return unauthorized();

    let body: { current?: string; password?: string };
    try {
        body = (await request.json()) as { current?: string; password?: string };
    } catch {
        return badRequest('Invalid request body.');
    }

    if (!body.password || body.password.length < 6) {
        return badRequest('New password must be at least 6 characters.');
    }

    if (hasPassword) {
        const currentValid = await verifyPassword(store, env, body.current ?? '');
        if (!currentValid) return badRequest('Current password is incorrect.');
    }

    await setPassword(store, body.password);
    await rotateSecret(store); // invalidate every existing session
    await logActivity(store, 'password-changed', '');

    return respond(true, HttpStatus.OK, 'Password updated. Please sign in again.', null, {
        'Set-Cookie': clearCookie(),
    });
}

async function renderLoginPage(settings: Settings): Promise<Response> {
    if (!LOGIN_HTML) {
        return new Response('Login page unavailable.', { status: 500 });
    }

    const html = renderTemplate(await gunzipBase64(LOGIN_HTML), {
        PROJECT: PROJECT.name,
        VERSION,
        BASE: `/${settings.securePath}`,
    });

    return htmlResponse(html);
}

export { ok };
