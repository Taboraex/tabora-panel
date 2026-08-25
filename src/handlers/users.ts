import { UserService } from '@users/service';
import { Store } from '@storage/db';
import { User } from '#types/settings';
import {
    ok, badRequest, notFound, methodNotAllowed,
} from '@common/http';
import { gbToBytes, daysFromNow, parsePorts, parseList, isValidUUID } from '@common/utils';
import { logActivity } from './logs';

interface UserPayload {
    name?: string;
    uuid?: string;
    notes?: string;
    limitGb?: number;
    dailyLimitGb?: number;
    expiryDays?: number;
    expiryMs?: number;
    isPaused?: boolean;
    protocols?: string;
    ports?: string | number[];
    cleanIPs?: string | string[];
    panelUrl?: string;
    maxConfigs?: number;
}

function toPatch(payload: UserPayload): Partial<User> {
    const patch: Partial<User> = {};

    if (payload.name !== undefined) patch.name = payload.name.trim();
    if (payload.uuid !== undefined && payload.uuid) patch.uuid = payload.uuid.trim().toLowerCase();
    if (payload.notes !== undefined) patch.notes = payload.notes;
    if (payload.limitGb !== undefined) patch.limitBytes = gbToBytes(Number(payload.limitGb) || 0);
    if (payload.dailyLimitGb !== undefined) {
        patch.dailyLimitBytes = gbToBytes(Number(payload.dailyLimitGb) || 0);
    }
    if (payload.expiryMs !== undefined) patch.expiryMs = Number(payload.expiryMs) || 0;
    else if (payload.expiryDays !== undefined) {
        const days = Number(payload.expiryDays) || 0;
        patch.expiryMs = days > 0 ? daysFromNow(days) : 0;
    }
    if (payload.isPaused !== undefined) patch.isPaused = Boolean(payload.isPaused);
    if (payload.protocols !== undefined) patch.protocols = payload.protocols;
    if (payload.ports !== undefined) patch.ports = parsePorts(payload.ports);
    if (payload.cleanIPs !== undefined) patch.cleanIPs = parseList(payload.cleanIPs);
    if (payload.panelUrl !== undefined) patch.panelUrl = payload.panelUrl.trim();
    if (payload.maxConfigs !== undefined) patch.maxConfigs = Number(payload.maxConfigs) || 0;

    return patch;
}

export async function handleUsers(
    request: Request,
    store: Store,
    users: UserService,
): Promise<Response> {
    const url = new URL(request.url);
    const id = url.searchParams.get('id') ?? '';
    const action = url.searchParams.get('action') ?? '';

    switch (request.method) {
        case 'GET': {
            if (id) {
                const user = await users.get(id);
                if (!user) return notFound('User not found.');
                return ok(await users.enrich(user));
            }
            const list = await users.list(url.searchParams.get('q') ?? '');
            return ok({ users: list, total: list.length, stats: await users.stats() });
        }

        case 'POST': {
            // Action endpoints operate on an existing user.
            if (action && id) return handleAction(action, id, store, users);

            let payload: UserPayload;
            try {
                payload = (await request.json()) as UserPayload;
            } catch {
                return badRequest('Invalid request body.');
            }

            const name = payload.name?.trim();
            if (!name) return badRequest('Name is required.');
            if (payload.uuid && !isValidUUID(payload.uuid)) {
                return badRequest('UUID must be a valid v4 UUID.');
            }

            const existing = await users.get(name);
            if (existing) return badRequest('A user with that name already exists.');

            const created = await users.create({ name, ...toPatch(payload) });
            await logActivity(store, 'user-created', created.name);
            return ok(await users.enrich(created), 'User created.');
        }

        case 'PUT': {
            if (!id) return badRequest('Missing user id.');

            let payload: UserPayload;
            try {
                payload = (await request.json()) as UserPayload;
            } catch {
                return badRequest('Invalid request body.');
            }

            if (payload.uuid && !isValidUUID(payload.uuid)) {
                return badRequest('UUID must be a valid v4 UUID.');
            }

            const updated = await users.update(id, toPatch(payload));
            if (!updated) return notFound('User not found.');
            await logActivity(store, 'user-updated', updated.name);
            return ok(await users.enrich(updated), 'User updated.');
        }

        case 'DELETE': {
            if (!id) return badRequest('Missing user id.');
            const user = await users.get(id);
            if (!user) return notFound('User not found.');
            await users.remove(user.id);
            await logActivity(store, 'user-deleted', user.name);
            return ok(null, 'User deleted.');
        }

        default:
            return methodNotAllowed();
    }
}

async function handleAction(
    action: string,
    id: string,
    store: Store,
    users: UserService,
): Promise<Response> {
    switch (action) {
        case 'toggle': {
            const user = await users.toggle(id);
            if (!user) return notFound('User not found.');
            await logActivity(store, 'user-toggled', `${user.name} → ${user.isPaused ? 'paused' : 'active'}`);
            return ok(await users.enrich(user), user.isPaused ? 'User paused.' : 'User resumed.');
        }

        case 'reset-usage': {
            const user = await users.get(id);
            if (!user) return notFound('User not found.');
            await users.resetUsage(user.id);
            await logActivity(store, 'usage-reset', user.name);
            return ok(await users.enrich(user), 'Usage reset.');
        }

        case 'enforce': {
            const disabled = await users.enforceQuotas();
            if (disabled.length) await logActivity(store, 'quota-enforced', disabled.join(', '));
            return ok({ disabled }, `${disabled.length} user(s) disabled.`);
        }

        default:
            return badRequest(`Unknown action: ${action}`);
    }
}
