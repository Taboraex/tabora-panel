import { Store } from '@storage/db';

/**
 * Login throttling.
 *
 * Without this an attacker can try passwords as fast as the network allows.
 * The panel is a single-credential system reachable from anywhere, so an
 * unthrottled login form is the most realistic way in — far more so than
 * anything involving the source code being readable.
 *
 * Two independent buckets are tracked:
 *   - per client IP, which stops one host hammering the form;
 *   - a global counter, which stops a distributed attempt from slipping
 *     through by using a fresh IP for every guess.
 *
 * Counters live in KV with a TTL, so they expire on their own and cost
 * nothing to clean up. On a non-persistent store (local dev) throttling is
 * skipped rather than failing closed.
 */

/** Attempts allowed from a single IP before it is locked out. */
const IP_LIMIT = 8;
/** Attempts allowed across all IPs in the same window. */
const GLOBAL_LIMIT = 40;
/** Sliding window length, in seconds. */
const WINDOW_SECONDS = 900; // 15 minutes

const ipKey = (ip: string) => `login-attempts:ip:${ip}`;
const globalKey = () => 'login-attempts:global';

export interface ThrottleState {
    /** True when the request should be rejected without checking the password. */
    blocked: boolean;
    /** Seconds the caller should wait, for the Retry-After header. */
    retryAfter: number;
    /** Attempts remaining for this IP, for the log line. */
    remaining: number;
}

interface Counter {
    count: number;
    /** Epoch seconds when this window began. */
    since: number;
}

async function readCounter(store: Store, key: string): Promise<Counter> {
    const stored = await store.getJSON<Counter>(key);
    const now = Math.floor(Date.now() / 1000);

    // Treat an expired or malformed window as a fresh one.
    if (!stored || typeof stored.count !== 'number' || now - stored.since >= WINDOW_SECONDS) {
        return { count: 0, since: now };
    }
    return stored;
}

/**
 * Check whether a login attempt is allowed. Does not record the attempt —
 * call `recordFailure` for that, so successful logins do not consume budget.
 */
export async function checkLoginAllowed(store: Store, ip: string): Promise<ThrottleState> {
    if (!store.isPersistent) {
        return { blocked: false, retryAfter: 0, remaining: IP_LIMIT };
    }

    const now = Math.floor(Date.now() / 1000);
    const [perIp, global] = await Promise.all([
        readCounter(store, ipKey(ip)),
        readCounter(store, globalKey()),
    ]);

    const ipBlocked = perIp.count >= IP_LIMIT;
    const globalBlocked = global.count >= GLOBAL_LIMIT;

    if (!ipBlocked && !globalBlocked) {
        return { blocked: false, retryAfter: 0, remaining: IP_LIMIT - perIp.count };
    }

    const since = ipBlocked ? perIp.since : global.since;
    return {
        blocked: true,
        retryAfter: Math.max(1, WINDOW_SECONDS - (now - since)),
        remaining: 0,
    };
}

/** Record one failed attempt against both buckets. */
export async function recordFailure(store: Store, ip: string): Promise<void> {
    if (!store.isPersistent) return;

    const [perIp, global] = await Promise.all([
        readCounter(store, ipKey(ip)),
        readCounter(store, globalKey()),
    ]);

    await Promise.all([
        store.putJSON(ipKey(ip), { count: perIp.count + 1, since: perIp.since }, WINDOW_SECONDS),
        store.putJSON(globalKey(), { count: global.count + 1, since: global.since }, WINDOW_SECONDS),
    ]);
}

/** Clear an IP's budget after a successful sign-in. */
export async function clearFailures(store: Store, ip: string): Promise<void> {
    if (!store.isPersistent) return;
    await store.delete(ipKey(ip));
}
