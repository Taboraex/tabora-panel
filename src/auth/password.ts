import { Store } from '@storage/db';
import { sha256Hex, randomHex } from '@common/utils';

const PASSWORD_KEY = 'admin-password';

interface StoredPassword {
    hash: string;
    salt: string;
    /** Absent on records written before PBKDF2 was adopted. */
    kdf?: 'pbkdf2';
    iterations?: number;
}

/**
 * PBKDF2-HMAC-SHA256, run by WebCrypto.
 *
 * The previous scheme chained 10k SHA-256 calls in JavaScript. That is both
 * slower per unit of attacker cost and far easier to accelerate on a GPU than
 * a real KDF. WebCrypto does the work natively, so we can afford many more
 * iterations while staying inside the Worker CPU budget.
 */
/**
 * Workers rejects PBKDF2 above 100k iterations ("iteration counts above
 * 100000 are not supported"), so that ceiling is the maximum available here.
 * It is still an order of magnitude more attacker cost than the 10k
 * JavaScript SHA-256 chain it replaces, and it runs natively.
 */
const PBKDF2_ITERATIONS = 100_000;

async function pbkdf2(password: string, salt: string, iterations: number): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'],
    );
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: encoder.encode(salt), iterations, hash: 'SHA-256' },
        key,
        256,
    );
    return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** The superseded scheme, kept so existing panels can still sign in. */
async function legacyHash(password: string, salt: string): Promise<string> {
    let digest = `${salt}:${password}`;
    for (let i = 0; i < 10_000; i++) digest = await sha256Hex(digest);
    return digest;
}

async function hashPassword(password: string, salt: string): Promise<string> {
    return pbkdf2(password, salt, PBKDF2_ITERATIONS);
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
    await store.putJSON(PASSWORD_KEY, {
        hash, salt, kdf: 'pbkdf2', iterations: PBKDF2_ITERATIONS,
    } satisfies StoredPassword);
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

    // Records written before the upgrade have no `kdf` marker. Verify them
    // with the old scheme, then transparently re-hash on success so each
    // panel migrates the first time its owner signs in.
    if (stored.kdf !== 'pbkdf2') {
        const legacy = await legacyHash(password, stored.salt);
        if (!safeEqual(legacy, stored.hash)) return false;
        if (store.isPersistent) await setPassword(store, password);
        return true;
    }

    const candidate = await pbkdf2(password, stored.salt, stored.iterations ?? PBKDF2_ITERATIONS);
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
