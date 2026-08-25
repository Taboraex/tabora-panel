import { Store } from '@storage/db';
import { sha256Hex, randomHex } from '@common/utils';

const PASSWORD_KEY = 'admin-password';

interface StoredPassword {
    hash: string;
    salt: string;
}

async function hashPassword(password: string, salt: string): Promise<string> {
    // Iterated SHA-256. Workers has WebCrypto PBKDF2 available too, but this
    // keeps the dependency surface minimal and is adequate for a single admin
    // credential that is also rate-limited by Cloudflare.
    let digest = `${salt}:${password}`;
    for (let i = 0; i < 10_000; i++) digest = await sha256Hex(digest);
    return digest;
}

/** Constant-time-ish comparison to avoid trivial timing leaks. */
function safeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}

export async function setPassword(store: Store, password: string): Promise<void> {
    const salt = randomHex(16);
    const hash = await hashPassword(password, salt);
    await store.putJSON(PASSWORD_KEY, { hash, salt } satisfies StoredPassword);
}

/**
 * Verify a password against the stored hash. If nothing is stored yet we fall
 * back to the env value so a fresh deploy can log in immediately, then persist
 * the hash for subsequent checks.
 */
export async function verifyPassword(
    store: Store,
    env: Env,
    password: string,
): Promise<boolean> {
    const stored = await store.getJSON<StoredPassword>(PASSWORD_KEY);

    if (!stored) {
        const envPassword = env.ADMIN_PASSWORD || 'admin';
        if (!safeEqual(password, envPassword)) return false;
        if (store.isPersistent) await setPassword(store, password);
        return true;
    }

    const candidate = await hashPassword(password, stored.salt);
    return safeEqual(candidate, stored.hash);
}

export async function isPasswordStored(store: Store): Promise<boolean> {
    return (await store.getJSON<StoredPassword>(PASSWORD_KEY)) !== null;
}

/** True while the panel is still using the default credential. */
export async function isDefaultPassword(store: Store, env: Env): Promise<boolean> {
    const stored = await store.getJSON<StoredPassword>(PASSWORD_KEY);
    if (!stored) return (env.ADMIN_PASSWORD || 'admin') === 'admin';
    return verifyPassword(store, env, 'admin');
}
