import { Settings } from '#types/settings';
import { handleVless } from '@protocols/vless';
import { handleTrojan, sha224Hex } from '@protocols/trojan';
import { UserService } from '@users/service';
import { getContext } from '@config/settings';
import { HttpStatus } from '@common/http';
import { P } from '@config/obfuscation';

/**
 * Route an inbound WebSocket upgrade to the right protocol handler.
 *
 * Paths are intentionally short and generic (`/vl`, `/tr`); the real access
 * control is the credential inside the first frame, not the URL.
 */
export async function handleWebSocket(
    request: Request,
    settings: Settings,
    users: UserService,
): Promise<Response> {
    if (settings.isPaused) {
        return new Response('Service unavailable', { status: 503 });
    }

    const { pathname } = getContext();
    const segment = pathname.split('/')[1]?.toLowerCase() ?? '';

    const trojanHash = sha224Hex(settings.trojanPassword);
    const { uuids } = await users.credentials(settings.uuid, trojanHash);

    // Per-user Trojan passwords hash to their own value.
    const trojanHashes = new Set<string>([trojanHash]);
    for (const uuid of uuids) trojanHashes.add(sha224Hex(uuid.replace(/-/g, '')));

    const enabled = settings.protocols.toLowerCase();

    if (segment === 'vl' || segment === P.VL) {
        if (!enabled.includes(P.VL)) return new Response('Not found', { status: 404 });
        return handleVless(request, settings, uuids);
    }

    if (segment === 'tr' || segment === P.TR) {
        if (!enabled.includes(P.TR)) return new Response('Not found', { status: 404 });
        return handleTrojan(request, settings, trojanHashes);
    }

    // Unknown path: accept VLESS by default so clients using a custom path work.
    if (enabled.includes(P.VL)) return handleVless(request, settings, uuids);
    if (enabled.includes(P.TR)) return handleTrojan(request, settings, trojanHashes);

    return new Response('Bad request', { status: HttpStatus.BAD_REQUEST });
}

export { sha224Hex };
