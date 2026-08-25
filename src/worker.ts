import '@common/utils'; // installs Array.prototype.concatIf

import { createStore } from '@storage/db';
import { initContext, loadSettings, getContext } from '@config/settings';
import { UserService } from '@users/service';
import { verifySession } from '@auth/jwt';
import { handleWebSocket } from '@handlers/websocket';
import { handleSubscription } from '@handlers/subscription';
import { renderFallback } from '@handlers/fallback';
import { handleLogin, handleLogout, handleChangePassword } from '@handlers/login';
import { handleUsers } from '@handlers/users';
import { handleLogs } from '@handlers/logs';
import {
    renderPanel,
    handleGetSettings,
    handleUpdateSettings,
    handleResetSettings,
    handleExport,
    handleImport,
    handleMyIp,
    handleStats,
} from '@handlers/panel';
import {
    corsPreflight, unauthorized, notFound, serverError, safeError, HttpStatus,
} from '@common/http';

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        try {
            const store = createStore(env);
            const reqCtx = initContext(request);
            const settings = await loadSettings(store, env);
            const users = new UserService(store);

            // 1. WebSocket upgrades are proxy traffic — handle before routing.
            if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
                return handleWebSocket(request, settings, users);
            }

            if (request.method === 'OPTIONS') return corsPreflight();

            // 2. Everything else must live under the secret path.
            const base = `/${settings.securePath}`;
            const path = reqCtx.pathname.replace(/\/+$/, '') || '/';

            if (path !== base && !path.startsWith(`${base}/`)) {
                return renderFallback(request, settings);
            }

            const route = path.slice(base.length).replace(/^\//, '');

            // 3. Public routes (no session required).
            switch (route) {
                case '':
                case 'panel':
                    return (await verifySession(request, store))
                        ? renderPanel(settings, store)
                        : Response.redirect(`${reqCtx.origin}${base}/login`, HttpStatus.FOUND);

                case 'login':
                    return handleLogin(request, store, env, settings);

                case 'sub':
                    return handleSubscription(request, settings, users);

                case 'api/set-password':
                    // Guarded internally: allowed unauthenticated only on first run.
                    return handleChangePassword(request, store, env);
            }

            // 4. Everything below requires a valid session.
            if (!(await verifySession(request, store))) return unauthorized();

            switch (route) {
                case 'api/settings':
                    return request.method === 'GET'
                        ? handleGetSettings(settings, store, users, env)
                        : handleUpdateSettings(request, settings, store);

                case 'api/settings/reset':
                    return handleResetSettings(request, store, env);

                case 'api/users':
                    return handleUsers(request, store, users);

                case 'api/stats':
                    return handleStats(users);

                case 'api/logs':
                    return handleLogs(request, store);

                case 'api/export':
                    return handleExport(settings, users);

                case 'api/import':
                    return handleImport(request, settings, store, users);

                case 'api/my-ip':
                    return handleMyIp();

                case 'api/logout':
                    return handleLogout();

                default:
                    return notFound();
            }
        } catch (error) {
            console.error('Unhandled error:', safeError(error));
            return serverError(safeError(error));
        }
    },
} satisfies ExportedHandler<Env>;
