import { Settings } from '#types/settings';
import { handleVless } from '@protocols/vless';
import { handleTrojan, sha224Hex } from '@protocols/trojan';
import { UserService } from '@users/service';
import { getContext } from '@config/settings';
import { HttpStatus } from '@common/http';
import { P } from '@config/obfuscation';

/** Buffer this much per user before writing usage to storage. */
const FLUSH_THRESHOLD_BYTES = 512 * 1024;

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
    ctx?: ExecutionContext,
): Promise<Response> {
    if (settings.isPaused) {
        return new Response('Service unavailable', { status: 503 });
    }

    const { pathname } = getContext();
    const segment = pathname.split('/')[1]?.toLowerCase() ?? '';

    const trojanHash = sha224Hex(settings.trojanPassword);
    const { uuids, byUUID } = await users.credentials(settings.uuid, trojanHash);

    /**
     * Meter traffic per user.
     *
     * Counters are buffered in memory and flushed on a timer rather than
     * written per chunk: a busy connection produces thousands of frames a
     * second and a storage write for each would dominate the worker's CPU
     * budget. Losing at most a few seconds of accounting if the isolate is
     * evicted is an acceptable trade for that.
     */
    const pending = new Map<string, number>();

    /**
     * Keep the isolate alive until a write finishes.
     *
     * A WebSocket handler returns its 101 response immediately, so anything
     * started afterwards is only guaranteed to run if it is registered with
     * waitUntil. Without this the usage writes were issued and then discarded,
     * which is why quotas never moved.
     */
    const track = (promise: Promise<unknown>) => {
        if (ctx) ctx.waitUntil(promise);
        else void promise;
    };

    const flush = async (): Promise<void> => {
        if (!pending.size) return;
        const snapshot = [...pending];
        pending.clear();
        for (const [uuid, bytes] of snapshot) {
            const user = byUUID.get(uuid);
            if (user && bytes > 0) await users.recordUsage(user.id, bytes).catch(() => {});
        }
    };

    const onUsage = (uuid: string, bytes: number) => {
        // Only meter users the panel knows about; the panel-wide credential
        // has no user record to bill.
        if (!byUUID.has(uuid)) return;
        pending.set(uuid, (pending.get(uuid) ?? 0) + bytes);

        // Flush once a connection has moved a meaningful amount, so a
        // long-lived session still reports progress instead of only at the end.
        if ((pending.get(uuid) ?? 0) >= FLUSH_THRESHOLD_BYTES) track(flush());
    };

    // Per-user Trojan passwords hash to their own value.
    const trojanHashes = new Set<string>([trojanHash]);
    for (const uuid of uuids) trojanHashes.add(sha224Hex(uuid.replace(/-/g, '')));

    const enabled = settings.protocols.toLowerCase();

    if (segment === 'vl' || segment === P.VL) {
        if (!enabled.includes(P.VL)) return new Response('Not found', { status: 404 });
        return handleVless(request, settings, uuids, onUsage, () => track(flush()));
    }

    if (segment === 'tr' || segment === P.TR) {
        if (!enabled.includes(P.TR)) return new Response('Not found', { status: 404 });
        return handleTrojan(request, settings, trojanHashes);
    }

    // Unknown path: accept VLESS by default so clients using a custom path work.
    if (enabled.includes(P.VL)) return handleVless(request, settings, uuids, onUsage, () => track(flush()));
    if (enabled.includes(P.TR)) return handleTrojan(request, settings, trojanHashes);

    return new Response('Bad request', { status: HttpStatus.BAD_REQUEST });
}

export { sha224Hex };
